// Real idb-keyval getMany against a deterministic request harness. This proves
// the readonly transaction boundary, not native-browser IndexedDB behaviour.
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
import { readTaxYearProgress, TAX_YEAR_PERIOD } from "../tax-year-progress";

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
    // Keep the real getMany implementation, including its readonly mode and
    // request error propagation, while modelling this test's source database.
    createStore: (name: string, objectStore: string) => {
      if (name !== "keyval-store" || objectStore !== "keyval") throw new Error("Unexpected database");
      return async <T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => T) => {
        database.modes.push(mode);
        if (mode !== "readonly") database.forbidden();
        if (database.failOpen) throw new DOMException("Private source details", "SecurityError");
        const snapshot = structuredClone(database.values);
        const store = {
          get(key: string) {
            database.keys.push(key);
            const request = {
              result: snapshot.get(key),
              error: new DOMException("Private source details", "UnknownError"),
              onsuccess: null as null | (() => void),
              onerror: null as null | (() => void),
            };
            queueMicrotask(() => {
              if (database.failKey === key) request.onerror?.();
              else request.onsuccess?.();
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
  it("reads exactly the four source keys together without creating records or conflating missing with zero", async () => {
    expect(database.modes).toEqual([]);
    expect(await readTaxYearProgress()).toEqual({
      period: { id: "2026-27", label: "2026–27", start: "2026-04-06", end: "2027-04-05" },
      readAt: NOW,
      books: { status: "missing" },
      passport: { status: "missing" },
    });
    expect(database.modes).toEqual(["readonly"]);
    expect(database.keys).toEqual([
      BOOKS_STORAGE_KEY, BOOKS_LEGACY_STORAGE_KEY, BOOKS_MIGRATION_CLOSED_KEY, PASSPORT_STORAGE_KEY,
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
