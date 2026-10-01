// Shared workspace reads against a deterministic IndexedDB request harness.
// This proves the readonly transaction boundary, not native-browser behaviour.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TAX_POSITION_PASSPORT_EXAMPLE } from "@taxsorted/engine/uk/passport";
import type { SourceType } from "@taxsorted/engine/uk/itsa";
import {
  BOOKS_LEGACY_STORAGE_KEY,
  BOOKS_MIGRATION_CLOSED_KEY,
  BOOKS_STORAGE_KEY,
} from "../books-storage";
import {
  emptyLocalBooks,
  ensurePrimaryLedger,
  eventFromRecord,
  LEGACY_LOCAL_BOOKS_SCHEMA,
  type LocalBooksState,
  type ReviewState,
} from "../local-books";
import { createEmptyPassportDraft, PASSPORT_STORAGE_KEY } from "../passport-store";
import {
  createEmploymentSource,
  createPreparationDraft,
  type EmploymentSource,
  type PreparationYear,
} from "../return-preparation";
import { preparationStorageKey } from "../return-preparation-store";
import { readTaxYearProgress, TAX_YEAR_PERIOD } from "../tax-year-progress";
import { WORKSPACE_KEYS, WORKSPACE_SCHEMA, WORKSPACE_STORAGE_KEY } from "../workspace-storage";

const database = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  modes: [] as IDBTransactionMode[],
  keys: [] as string[],
  failOpen: false,
  failKey: "",
  forbidden: vi.fn(() => { throw new Error("Unexpected side effect"); }),
}));

vi.mock("idb-keyval", async importOriginal => {
  const actual = await importOriginal<typeof import("idb-keyval")>();
  return {
    ...actual,
    // Keep the shared workspace transaction and error propagation, while
    // modelling this test's source database.
    createStore: (name: string, objectStore: string) => {
      if (name !== "keyval-store" || objectStore !== "keyval") throw new Error("Unexpected database");
      return async <T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => T) => {
        database.modes.push(mode);
        if (mode !== "readonly") database.forbidden();
        if (database.failOpen) throw new DOMException("Private source details", "SecurityError");
        const snapshot = structuredClone(database.values);
        let pending = 0;
        const transaction = { oncomplete: null as null | (() => void), onerror: null as null | (() => void), onabort: null as null | (() => void), abort() { transaction.onabort?.(); } };
        const store = {
          transaction,
          get(key: string) {
            pending += 1;
            database.keys.push(key);
            const request = {
              result: snapshot.get(key),
              error: new DOMException("Private source details", "UnknownError"),
              onsuccess: null as null | (() => void),
              onerror: null as null | (() => void),
            };
            queueMicrotask(() => {
              if (database.failKey === key) { request.onerror?.(); transaction.onerror?.(); }
              else request.onsuccess?.();
              pending -= 1;
              if (pending === 0) queueMicrotask(() => transaction.oncomplete?.());
            });
            return request;
          },
          put: database.forbidden,
          delete: database.forbidden,
          clear: database.forbidden,
        };
        return operation(store as unknown as IDBObjectStore);
      };
    },
    set: database.forbidden,
    setMany: database.forbidden,
    del: database.forbidden,
    delMany: database.forbidden,
    clear: database.forbidden,
    update: database.forbidden,
  };
});

const NOW = "2026-09-30T12:00:00.000Z";
const SAVED_AT = "2025-02-01T12:00:00.000Z";
const ZERO = { records: 0, checked: 0, needsReview: 0, excluded: 0, businesses: 0, unconfirmedBusinesses: 0 };

function books() {
  return emptyLocalBooks({ replicaId: "private-installation-id", createdAt: SAVED_AT });
}

function addRecord(
  state: LocalBooksState,
  date = "2026-05-01",
  reviewState: ReviewState = "ready",
  activity: SourceType = "self-employment",
  ledgerId?: string,
) {
  const ledger = ledgerId
    ? state.ledgers.find(ledger => ledger.id === ledgerId)!
    : ensurePrimaryLedger(state, activity);
  const id = `private-record-${state.events.length}`;
  const event = eventFromRecord({
    date,
    amount: 987654,
    kind: "income",
    category: activity === "self-employment" ? "turnover" : "periodAmount",
    source: activity,
    description: "Private payer description",
  }, {
    id,
    ledgerId: ledger.id,
    now: SAVED_AT,
    reviewState,
    origin: { kind: "manual" },
    contentDigest: `private-digest-${id}`,
  });
  state.events.push(event);
  return event;
}

function passport() {
  const draft = createEmptyPassportDraft(SAVED_AT);
  draft.revision = 1;
  return draft;
}

function preparation(year: PreparationYear = "2025-26") {
  const draft = createPreparationDraft(year, "prepare-return", SAVED_AT);
  draft.revision = 1;
  return draft;
}

function employment(patch: Partial<EmploymentSource> = {}): EmploymentSource {
  return {
    ...createEmploymentSource("private-employment-id"),
    employerName: "Private employer",
    sourceLabel: "Private document label",
    notes: "Private employment notes",
    documentYear: "2025-26",
    pay: "987654.32",
    tax: "12345.67",
    ...patch,
  };
}

beforeEach(() => {
  database.values.clear();
  database.modes.length = database.keys.length = 0;
  database.failOpen = false;
  database.failKey = "";
  database.forbidden.mockClear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  vi.stubGlobal("BroadcastChannel", database.forbidden);
  vi.stubGlobal("fetch", database.forbidden);
  vi.stubGlobal("localStorage", { getItem: database.forbidden, setItem: database.forbidden, removeItem: database.forbidden });
});

afterEach(() => {
  expect(database.forbidden).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("explicit local tax-year progress read", () => {
  it("reads canonical saved progress while ignoring older direct-key writes", async () => {
    const canonicalBooks = books();
    addRecord(canonicalBooks, "2026-05-01", "needs-review");
    database.values.set(WORKSPACE_STORAGE_KEY, {
      schema: WORKSPACE_SCHEMA, generation: "restored-generation",
      values: { ...Object.fromEntries(WORKSPACE_KEYS.map(key => [key, undefined])), [BOOKS_STORAGE_KEY]: canonicalBooks, [PASSPORT_STORAGE_KEY]: passport() },
    });
    database.values.set(BOOKS_STORAGE_KEY, { schema: "old-tab-data" });
    database.values.set(PASSPORT_STORAGE_KEY, { schema: "old-tab-data" });
    const result = await readTaxYearProgress();
    expect(result.books).toMatchObject({ status: "saved", activities: { "self-employment": { records: 1, needsReview: 1 } } });
    expect(result.passport.status).toBe("saved");
    expect(database.modes).toEqual(["readonly"]);
  });
  it("reads the source keys and only the selected preparation key together without creating records or conflating missing with zero", async () => {
    expect(database.modes).toEqual([]);
    expect(await readTaxYearProgress()).toEqual({
      period: { id: "2026-27", label: "2026–27", start: "2026-04-06", end: "2027-04-05" },
      readAt: NOW,
      books: { status: "missing" },
      passport: { status: "missing" },
      preparation: { year: "2025-26", status: "missing" },
    });
    expect(database.modes).toEqual(["readonly"]);
    expect(database.keys).toEqual([
      WORKSPACE_STORAGE_KEY, BOOKS_STORAGE_KEY, BOOKS_LEGACY_STORAGE_KEY, BOOKS_MIGRATION_CLOSED_KEY, PASSPORT_STORAGE_KEY,
      preparationStorageKey("2025-26"),
    ]);
    expect(database.values.size).toBe(0);
  });

  it("reports a valid empty saved Books source separately from missing storage", async () => {
    database.values.set(BOOKS_STORAGE_KEY, books());
    expect((await readTaxYearProgress()).books).toEqual({
      status: "saved", activities: { "self-employment": ZERO, "uk-property": ZERO },
    });
  });

  it("includes both tax-year boundaries and excludes the adjacent dates", async () => {
    const state = books();
    addRecord(state, "2026-04-05", "needs-review");
    addRecord(state, "2026-04-06", "ready");
    addRecord(state, "2027-04-05", "excluded");
    addRecord(state, "2027-04-06", "needs-review");
    database.values.set(BOOKS_STORAGE_KEY, state);
    expect((await readTaxYearProgress()).books).toEqual({
      status: "saved",
      activities: {
        "self-employment": { records: 2, checked: 1, needsReview: 0, excluded: 1, businesses: 1, unconfirmedBusinesses: 1 },
        "uk-property": ZERO,
      },
    });
  });

  it("keeps activity, saved review state, exclusions and business scope separate", async () => {
    const state = books();
    addRecord(state);
    addRecord(state, "2026-08-01", "needs-review");
    addRecord(state, "2026-08-02", "excluded");
    addRecord(state, "2026-05-01", "ready", "uk-property");
    const property = state.ledgers.find(ledger => ledger.activity === "uk-property")!;
    property.scopeState = "confirmed";
    property.scopeConfirmedAt = SAVED_AT;
    database.values.set(BOOKS_STORAGE_KEY, state);
    expect((await readTaxYearProgress()).books).toEqual({
      status: "saved",
      activities: {
        "self-employment": { records: 3, checked: 1, needsReview: 1, excluded: 1, businesses: 1, unconfirmedBusinesses: 1 },
        "uk-property": { records: 1, checked: 1, needsReview: 0, excluded: 0, businesses: 1, unconfirmedBusinesses: 0 },
      },
    });
  });

  it("counts distinct represented businesses, including excluded-only ones, without attributing empty or other-year ledgers", async () => {
    const state = books();
    const primary = ensurePrimaryLedger(state, "self-employment");
    state.ledgers.push(
      { ...primary, id: "other-business", scopeState: "confirmed", scopeConfirmedAt: SAVED_AT },
      { ...primary, id: "empty-business" },
    );
    addRecord(state);
    addRecord(state);
    addRecord(state, "2026-07-01", "excluded", "self-employment", "other-business");
    addRecord(state, "2025-07-01", "ready", "uk-property");
    database.values.set(BOOKS_STORAGE_KEY, state);
    expect((await readTaxYearProgress()).books).toMatchObject({
      activities: {
        "self-employment": { records: 3, businesses: 2, unconfirmedBusinesses: 1 },
        "uk-property": ZERO,
      },
    });
  });

  it("counts records once even when a record has multiple tax postings", async () => {
    const state = books();
    const event = addRecord(state);
    event.postings.push({ ...event.postings[0] });
    database.values.set(BOOKS_STORAGE_KEY, state);
    expect((await readTaxYearProgress()).books).toMatchObject({ activities: { "self-employment": { records: 1, checked: 1 } } });
  });

  it("does not ask for scope confirmation for an excluded-only business alongside another activity", async () => {
    const state = books();
    addRecord(state, "2026-05-01", "excluded");
    addRecord(state, "2026-05-02", "ready", "uk-property");
    database.values.set(BOOKS_STORAGE_KEY, state);
    expect((await readTaxYearProgress()).books).toEqual({
      status: "saved",
      activities: {
        "self-employment": { records: 1, checked: 0, needsReview: 0, excluded: 1, businesses: 1, unconfirmedBusinesses: 0 },
        "uk-property": { records: 1, checked: 1, needsReview: 0, excluded: 0, businesses: 1, unconfirmedBusinesses: 1 },
      },
    });
    // An excluded event must not prevent a later non-excluded event in the
    // same ledger from being counted as needing confirmation.
    addRecord(state, "2026-05-03", "needs-review");
    expect((await readTaxYearProgress()).books).toMatchObject({
      activities: { "self-employment": { records: 2, unconfirmedBusinesses: 1 } },
    });
  });

  it("matches Passport's existing missing semantics for a null stored value", async () => {
    database.values.set(PASSPORT_STORAGE_KEY, null);
    expect((await readTaxYearProgress()).passport).toEqual({ status: "missing" });
  });

  it("returns only status, counts and permitted dates; never source details or identifiers", async () => {
    const state = books();
    addRecord(state);
    state.ledgers[0].name = "Private business name";
    database.values.set(BOOKS_STORAGE_KEY, state);
    const draft = passport();
    draft.incomeSources.employment = "yes";
    draft.answeredIncomeSourceIds = ["employment"];
    database.values.set(PASSPORT_STORAGE_KEY, draft);
    const before = structuredClone(database.values);
    const result = await readTaxYearProgress();
    expect(result).toEqual({
      period: TAX_YEAR_PERIOD,
      readAt: NOW,
      books: {
        status: "saved",
        activities: {
          "self-employment": { records: 1, checked: 1, needsReview: 0, excluded: 0, businesses: 1, unconfirmedBusinesses: 1 },
          "uk-property": ZERO,
        },
      },
      passport: {
        status: "saved", savedAt: SAVED_AT,
        sourceQuestions: { total: 5, unanswered: 4, explicitlyUnknown: 0 },
        evidence: { held: 0, missing: 0, notChecked: 8, notExpected: 0 },
        hasMtdCheck: false,
      },
      preparation: { year: "2025-26", status: "missing" },
    });
    expect(JSON.stringify(result)).not.toMatch(/Private|private-|987654|employment":"yes/);
    expect(database.values).toEqual(before);
  });

  it("keeps a prior-year Passport timestamp and distinguishes untouched unknown defaults from explicit Not sure", async () => {
    const draft = passport();
    draft.answeredIncomeSourceIds = ["employment", "self-employment", "other-or-complex"];
    draft.incomeSources.employment = "yes";
    draft.incomeSources["other-or-complex"] = "no";
    draft.evidence["employment-pay-and-tax"] = "held";
    draft.evidence["self-employment-records"] = "missing";
    database.values.set(PASSPORT_STORAGE_KEY, draft);
    expect((await readTaxYearProgress()).passport).toEqual({
      status: "saved", savedAt: SAVED_AT,
      sourceQuestions: { total: 5, unanswered: 2, explicitlyUnknown: 1 },
      evidence: { held: 1, missing: 1, notChecked: 6, notExpected: 0 },
      hasMtdCheck: false,
    });
  });

  it("matches Passport's effective not-expected evidence for explicit no answers without rewriting saved labels", async () => {
    const draft = passport();
    draft.answeredIncomeSourceIds = ["employment", "self-employment", "uk-property", "foreign-property", "other-or-complex"];
    for (const id of draft.answeredIncomeSourceIds) draft.incomeSources[id] = "no";
    draft.evidence["employment-pay-and-tax"] = "missing";
    database.values.set(PASSPORT_STORAGE_KEY, draft);
    const before = structuredClone(draft);
    expect((await readTaxYearProgress()).passport).toEqual({
      status: "saved", savedAt: SAVED_AT,
      sourceQuestions: { total: 5, unanswered: 0, explicitlyUnknown: 0 },
      evidence: { held: 0, missing: 0, notChecked: 0, notExpected: 8 },
      hasMtdCheck: false,
    });
    expect(database.values.get(PASSPORT_STORAGE_KEY)).toEqual(before);
  });

  it("reports an attached validated MTD check only as presence without exposing or recomputing its facts", async () => {
    const draft = passport();
    draft.mtdIncomeTaxPosition = structuredClone(TAX_POSITION_PASSPORT_EXAMPLE.positions[0]);
    database.values.set(PASSPORT_STORAGE_KEY, draft);
    expect((await readTaxYearProgress()).passport).toEqual({
      status: "saved", savedAt: SAVED_AT,
      sourceQuestions: { total: 5, unanswered: 5, explicitlyUnknown: 0 },
      evidence: { held: 0, missing: 0, notChecked: 8, notExpected: 0 },
      hasMtdCheck: true,
    });
  });

  it.each(["2026-02-30", "2026-13-01", "2026-4-06"])("rejects malformed Books dates before using date ordering: %s", async date => {
    const state = books();
    addRecord(state, date);
    database.values.set(BOOKS_STORAGE_KEY, state);
    database.values.set(PASSPORT_STORAGE_KEY, passport());
    const result = await readTaxYearProgress();
    expect(result.books).toEqual({ status: "invalid" });
    expect(result.passport.status).toBe("saved");
  });

  it.each(["missing-ledger", "duplicate-event", "bad-scope", "bad-review", "bad-posting", "bad-history"])("rejects malformed internal Books structures: %s", async damage => {
    const state = books();
    const event = addRecord(state);
    if (damage === "missing-ledger") event.ledgerId = "private-missing-ledger";
    if (damage === "duplicate-event") state.events.push(structuredClone(event));
    if (damage === "bad-scope") state.ledgers[0].scopeState = "confirmed";
    if (damage === "bad-review") Object.assign(event, { reviewState: "filed" });
    if (damage === "bad-posting") event.postings[0].category = "private-invalid-category";
    if (damage === "bad-history") Object.assign(state, { history: [null] });
    database.values.set(BOOKS_STORAGE_KEY, state);
    expect((await readTaxYearProgress()).books).toEqual({ status: "invalid" });
  });

  it.each([null, {}, { schema: "taxsorted.local-books/999" }])("does not interpret an unknown Books envelope as an empty source: %j", async value => {
    database.values.set(BOOKS_STORAGE_KEY, value);
    expect((await readTaxYearProgress()).books).toEqual({ status: "invalid" });
  });

  it.each(["unknown-schema", "duplicate-answer", "missing-mtd", "bad-mtd", "bad-evidence", "bad-date"])("keeps malformed Passport failures separate from valid Books: %s", async damage => {
    const draft = passport();
    if (damage === "unknown-schema") Object.assign(draft, { schema: "future" });
    if (damage === "duplicate-answer") draft.answeredIncomeSourceIds = ["employment", "employment"];
    if (damage === "missing-mtd") Reflect.deleteProperty(draft, "mtdIncomeTaxPosition");
    if (damage === "bad-mtd") Object.assign(draft, { mtdIncomeTaxPosition: {} });
    if (damage === "bad-evidence") Object.assign(draft.evidence, { "employment-pay-and-tax": "verified" });
    if (damage === "bad-date") draft.updatedAt = "private-bad-date";
    database.values.set(PASSPORT_STORAGE_KEY, draft);
    database.values.set(BOOKS_STORAGE_KEY, books());
    const result = await readTaxYearProgress();
    expect(result.passport).toEqual({ status: "invalid" });
    expect(result.books.status).toBe("saved");
  });

  it.each(["open", "request"])("returns unavailable, never zero or raw details, on a %s read failure", async failure => {
    database.failOpen = failure === "open";
    database.failKey = failure === "request" ? PASSPORT_STORAGE_KEY : "";
    database.values.set(BOOKS_STORAGE_KEY, books());
    expect(await readTaxYearProgress()).toEqual({
      period: TAX_YEAR_PERIOD, readAt: NOW,
      books: { status: "unavailable" }, passport: { status: "unavailable" },
      preparation: { year: "2025-26", status: "unavailable" },
    });
  });

  it("does not subscribe or cache: a returned snapshot stays unchanged until another explicit read", async () => {
    database.values.set(BOOKS_STORAGE_KEY, books());
    const first = await readTaxYearProgress();
    const changed = books();
    addRecord(changed);
    database.values.set(BOOKS_STORAGE_KEY, changed);
    expect(first.books).toMatchObject({ activities: { "self-employment": { records: 0 } } });
    expect(database.modes).toEqual(["readonly"]);
    expect((await readTaxYearProgress()).books).toMatchObject({ activities: { "self-employment": { records: 1 } } });
    expect(database.modes).toEqual(["readonly", "readonly"]);
  });
});

describe("selected preparation progress", () => {
  it.each(["2025-26", "2026-27"] as const)("reads only %s and leaves Books on its independent 2026–27 period", async year => {
    const draft = preparation(year);
    const otherYear = year === "2025-26" ? "2026-27" : "2025-26";
    database.values.set(preparationStorageKey(year), draft);
    database.values.set(preparationStorageKey(otherYear), { private: "unselected malformed draft" });
    const before = structuredClone(database.values);
    const result = await readTaxYearProgress(year);
    expect(result.period).toEqual(TAX_YEAR_PERIOD);
    expect(result.preparation).toEqual({
      year, status: "saved", savedAt: SAVED_AT, purpose: "prepare-return",
      circumstances: { unanswered: 8, explicitlyUnknown: 0 },
      evidence: { missing: 0, collected: 0, reviewed: 0, unresolved: 0 },
      employment: { active: false, total: 0, reviewed: 0, unresolved: 0, inactive: 0, unsupported: 0 },
      overlapWarnings: 0,
    });
    expect(database.keys).toContain(preparationStorageKey(year));
    expect(database.keys).not.toContain(preparationStorageKey(otherYear));
    expect(database.modes).toEqual(["readonly"]);
    expect(database.values).toEqual(before);
  });

  it.each(["2024-25", "", "2026–27", "2026-27/other", null])("rejects unsupported year %j before any storage access", async year => {
    await expect(readTaxYearProgress(year as PreparationYear)).rejects.toThrow("Choose a supported preparation year.");
    expect(database.modes).toEqual([]);
    expect(database.keys).toEqual([]);
  });

  it("uses the canonical selected year and ignores stale direct-key writes and an invalid unselected year", async () => {
    const draft = preparation("2026-27");
    draft.purpose = "organise-records";
    database.values.set(WORKSPACE_STORAGE_KEY, {
      schema: WORKSPACE_SCHEMA,
      generation: "private-workspace-generation",
      values: {
        ...Object.fromEntries(WORKSPACE_KEYS.map(key => [key, undefined])),
        [BOOKS_STORAGE_KEY]: books(),
        [PASSPORT_STORAGE_KEY]: passport(),
        [preparationStorageKey("2026-27")]: draft,
        [preparationStorageKey("2025-26")]: { private: "unselected damaged contents" },
      },
    });
    database.values.set(preparationStorageKey("2026-27"), { schema: "private-stale-direct-write" });
    const before = structuredClone(database.values);
    const result = await readTaxYearProgress("2026-27");
    expect(result.preparation).toMatchObject({ year: "2026-27", status: "saved", purpose: "organise-records" });
    expect(result.books.status).toBe("saved");
    expect(result.passport.status).toBe("saved");
    expect(database.keys).not.toContain(preparationStorageKey("2025-26"));
    expect(JSON.stringify(result)).not.toMatch(/private|damaged|stale|schema|revision|generation/);
    expect(database.values).toEqual(before);
  });

  it("counts active evidence topics, unanswered and Not sure separately without returning source details", async () => {
    const draft = preparation();
    draft.circumstances = {
      employment: "yes", trading: "yes", property: "yes", pension: "yes",
      "savings-investments": "yes", "other-income": "unknown", "life-changes": null, "hmrc-letter": "no",
    };
    draft.evidence = {
      trading: "missing", property: "collected", pension: "reviewed", "savings-investments": "unresolved",
      "other-income": "reviewed", "life-changes": "reviewed", "hmrc-letter": "reviewed",
    };
    draft.employmentSources = [
      employment({ reviewed: true }),
      employment({ id: "private-second-id", documentType: "P45", reviewed: false }),
    ];
    database.values.set(preparationStorageKey("2025-26"), draft);
    const before = structuredClone(database.values);
    const result = await readTaxYearProgress();
    expect(result.preparation).toEqual({
      year: "2025-26", status: "saved", savedAt: SAVED_AT, purpose: "prepare-return",
      circumstances: { unanswered: 1, explicitlyUnknown: 1 },
      evidence: { missing: 1, collected: 1, reviewed: 1, unresolved: 2 },
      employment: { active: true, total: 2, reviewed: 1, unresolved: 1, inactive: 0, unsupported: 1 },
      overlapWarnings: 1,
    });
    expect(JSON.stringify(result)).not.toMatch(/Private|private-|987654|12345|P45|sourceLabel|employerName|documentYear|notes|employmentSources|warnings|revision/);
    expect(database.values).toEqual(before);
  });

  it.each([null, "unknown", "no"] as const)("keeps employment sources inactive when the answer is %j", async answer => {
    const draft = preparation();
    draft.circumstances.employment = answer;
    draft.employmentSources = [employment({ reviewed: true }), employment({ id: "private-other", documentType: "other" })];
    database.values.set(preparationStorageKey("2025-26"), draft);
    expect((await readTaxYearProgress()).preparation).toEqual({
      year: "2025-26", status: "saved", savedAt: SAVED_AT, purpose: "prepare-return",
      circumstances: { unanswered: answer === null ? 8 : 7, explicitlyUnknown: answer === "unknown" ? 1 : 0 },
      evidence: { missing: 0, collected: 0, reviewed: 0, unresolved: 0 },
      employment: { active: false, total: 2, reviewed: 0, unresolved: 0, inactive: 2, unsupported: 0 },
      overlapWarnings: 1,
    });
  });

  it.each([
    { label: "no employment document", sources: [], evidence: { missing: 1, collected: 0, reviewed: 0, unresolved: 0 }, reviewed: 0 },
    { label: "complete unreviewed P60", sources: [employment()], evidence: { missing: 0, collected: 1, reviewed: 0, unresolved: 0 }, reviewed: 0 },
    { label: "reviewed P60", sources: [employment({ reviewed: true })], evidence: { missing: 0, collected: 0, reviewed: 1, unresolved: 0 }, reviewed: 1 },
    { label: "incomplete P60", sources: [employment({ pay: "" })], evidence: { missing: 0, collected: 0, reviewed: 0, unresolved: 1 }, reviewed: 0 },
    { label: "wrong-year P60", sources: [employment({ documentYear: "2026-27" })], evidence: { missing: 0, collected: 0, reviewed: 0, unresolved: 1 }, reviewed: 0 },
  ])("matches the existing review for $label", async ({ sources, evidence, reviewed }) => {
    const draft = preparation();
    draft.circumstances.employment = "yes";
    draft.employmentSources = sources;
    database.values.set(preparationStorageKey("2025-26"), draft);
    expect((await readTaxYearProgress()).preparation).toMatchObject({
      status: "saved", evidence,
      employment: { active: true, total: sources.length, reviewed, unresolved: sources.length - reviewed, inactive: 0, unsupported: 0 },
    });
  });

  it("does not count a future reviewed P60 flag until that preparation year has ended", async () => {
    const draft = preparation("2026-27");
    draft.circumstances.employment = "yes";
    draft.employmentSources = [employment({ documentYear: "2026-27", reviewed: true })];
    database.values.set(preparationStorageKey("2026-27"), draft);
    const before = structuredClone(draft);
    expect((await readTaxYearProgress("2026-27")).preparation).toMatchObject({
      status: "saved", evidence: { missing: 0, collected: 0, reviewed: 0, unresolved: 1 },
      employment: { reviewed: 0, unresolved: 1 },
    });
    vi.setSystemTime(new Date("2027-04-05T23:59:59.999Z"));
    expect((await readTaxYearProgress("2026-27")).preparation).toMatchObject({ employment: { reviewed: 0, unresolved: 1 } });
    vi.setSystemTime(new Date("2027-04-06T00:00:00.000Z"));
    expect((await readTaxYearProgress("2026-27")).preparation).toMatchObject({
      evidence: { missing: 0, collected: 0, reviewed: 1, unresolved: 0 }, employment: { reviewed: 1, unresolved: 0 },
    });
    expect(database.values.get(preparationStorageKey("2026-27"))).toEqual(before);
  });

  it.each(["P45", "other"] as const)("counts active %s documents as unsupported and unresolved", async documentType => {
    const draft = preparation();
    draft.circumstances.employment = "yes";
    draft.employmentSources = [employment({ documentType })];
    database.values.set(preparationStorageKey("2025-26"), draft);
    expect((await readTaxYearProgress()).preparation).toMatchObject({
      status: "saved", evidence: { missing: 0, collected: 0, reviewed: 0, unresolved: 1 },
      employment: { active: true, total: 1, reviewed: 0, unresolved: 1, inactive: 0, unsupported: 1 },
    });
  });

  it.each(["wrong-year", "unsaved", "negative-revision", "fractional-revision", "unsafe-revision", "bad-schema", "bad-date", "reviewed-unsupported", "private-extra-field"])("reports invalid %s preparation independently of valid Books and Passport", async damage => {
    const draft = preparation();
    if (damage === "wrong-year") draft.year = "2026-27";
    if (damage === "unsaved") draft.revision = 0;
    if (damage === "negative-revision") draft.revision = -1;
    if (damage === "fractional-revision") draft.revision = 1.5;
    if (damage === "unsafe-revision") draft.revision = Number.MAX_SAFE_INTEGER + 1;
    if (damage === "bad-schema") Object.assign(draft, { schema: "private-future-schema" });
    if (damage === "bad-date") draft.updatedAt = "private-invalid-date";
    if (damage === "reviewed-unsupported") draft.employmentSources = [employment({ documentType: "P45", reviewed: true })];
    if (damage === "private-extra-field") Object.assign(draft, { private: "private extra value" });
    database.values.set(preparationStorageKey("2025-26"), draft);
    database.values.set(BOOKS_STORAGE_KEY, books());
    database.values.set(PASSPORT_STORAGE_KEY, passport());
    const before = structuredClone(database.values);
    const result = await readTaxYearProgress();
    expect(result.preparation).toEqual({ year: "2025-26", status: "invalid" });
    expect(result.books.status).toBe("saved");
    expect(result.passport.status).toBe("saved");
    expect(JSON.stringify(result)).not.toContain("private");
    expect(database.values).toEqual(before);
  });

  it.each([null, {}, "private malformed source"])("treats saved %j as invalid rather than missing", async value => {
    database.values.set(preparationStorageKey("2025-26"), value);
    expect((await readTaxYearProgress()).preparation).toEqual({ year: "2025-26", status: "invalid" });
  });

  it("preserves valid preparation when Books and Passport values are malformed", async () => {
    database.values.set(BOOKS_STORAGE_KEY, { private: "bad Books" });
    database.values.set(PASSPORT_STORAGE_KEY, { private: "bad Passport" });
    database.values.set(preparationStorageKey("2025-26"), preparation());
    const result = await readTaxYearProgress();
    expect(result.books.status).toBe("invalid");
    expect(result.passport.status).toBe("invalid");
    expect(result.preparation.status).toBe("saved");
  });

  it("reports unavailable for all sources if the selected preparation request aborts the shared read", async () => {
    database.values.set(BOOKS_STORAGE_KEY, books());
    database.values.set(PASSPORT_STORAGE_KEY, passport());
    database.values.set(preparationStorageKey("2026-27"), preparation("2026-27"));
    database.failKey = preparationStorageKey("2026-27");
    expect(await readTaxYearProgress("2026-27")).toEqual({
      period: TAX_YEAR_PERIOD, readAt: NOW,
      books: { status: "unavailable" }, passport: { status: "unavailable" },
      preparation: { year: "2026-27", status: "unavailable" },
    });
  });

  it("keeps a returned preparation summary unchanged until another explicit read", async () => {
    const draft = preparation();
    database.values.set(preparationStorageKey("2025-26"), draft);
    const first = await readTaxYearProgress();
    draft.circumstances.employment = "yes";
    expect(first.preparation).toMatchObject({ circumstances: { unanswered: 8 }, evidence: { missing: 0 } });
    expect((await readTaxYearProgress()).preparation).toMatchObject({ circumstances: { unanswered: 7 }, evidence: { missing: 1 } });
    expect(database.modes).toEqual(["readonly", "readonly"]);
  });
});

describe("legacy Books conservatism without migrations", () => {
  it("recognises the prior envelope without manufacturing current records", async () => {
    database.values.set(BOOKS_STORAGE_KEY, {
      schema: LEGACY_LOCAL_BOOKS_SCHEMA, storeRevision: 1,
      ledgers: [], events: [], history: [], imports: [],
    });
    const before = structuredClone(database.values);
    expect((await readTaxYearProgress()).books).toEqual({ status: "legacy" });
    expect(database.values).toEqual(before);
  });

  it.each([[], [{ id: "legacy-record" }]].map(legacy => ({ legacy })))("does not migrate a legacy-only array, including an empty one: $legacy", async ({ legacy }) => {
    database.values.set(BOOKS_LEGACY_STORAGE_KEY, legacy);
    const before = structuredClone(database.values);
    expect((await readTaxYearProgress()).books).toEqual({ status: "legacy" });
    expect(database.values).toEqual(before);
  });

  it("pauses current counts when an older writer has appended an unseen record", async () => {
    const state = books();
    const known = addRecord(state);
    database.values.set(BOOKS_STORAGE_KEY, state);
    database.values.set(BOOKS_LEGACY_STORAGE_KEY, [{ id: known.id }, { id: "pending-legacy", date: "2020-01-01" }]);
    const before = structuredClone(database.values);
    expect((await readTaxYearProgress()).books).toEqual({ status: "legacy" });
    expect(database.values).toEqual(before);
  });

  it("allows already merged legacy IDs without double-counting or blocking forever", async () => {
    const state = books();
    const known = addRecord(state);
    database.values.set(BOOKS_STORAGE_KEY, state);
    database.values.set(BOOKS_LEGACY_STORAGE_KEY, [{ id: known.id }, { id: known.id }]);
    expect((await readTaxYearProgress()).books).toMatchObject({ activities: { "self-employment": { records: 1 } } });
  });

  it.each([undefined, "malformed retired data", [{ id: "retired-record" }]].map(legacy => ({ legacy })))("honours a closed migration baseline without resurrecting it: $legacy", async ({ legacy }) => {
    database.values.set(BOOKS_MIGRATION_CLOSED_KEY, true);
    database.values.set(BOOKS_LEGACY_STORAGE_KEY, legacy);
    expect((await readTaxYearProgress()).books).toEqual({ status: "missing" });
    database.values.set(BOOKS_STORAGE_KEY, books());
    expect((await readTaxYearProgress()).books).toMatchObject({ status: "saved", activities: { "self-employment": ZERO } });
  });

  it.each([null, {}, [null], [{}], [{ id: 12 }]].map(legacy => ({ legacy })))("does not silently drop malformed active legacy storage: $legacy", async ({ legacy }) => {
    database.values.set(BOOKS_STORAGE_KEY, books());
    database.values.set(BOOKS_LEGACY_STORAGE_KEY, legacy);
    expect((await readTaxYearProgress()).books).toEqual({ status: "invalid" });
  });

  it("does not treat a malformed migration flag as permission to ignore older records", async () => {
    database.values.set(BOOKS_STORAGE_KEY, books());
    database.values.set(BOOKS_MIGRATION_CLOSED_KEY, "true");
    expect((await readTaxYearProgress()).books).toEqual({ status: "invalid" });
  });
});
