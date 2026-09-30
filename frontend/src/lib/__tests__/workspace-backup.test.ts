import { TAX_POSITION_PASSPORT_EXAMPLE } from "@taxsorted/engine/uk/passport";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CHECKLIST_SCHEMA, emptyChecklistProgress } from "@/app/checkup/checklist-state";
import { createRecordsStore } from "../records";
import { createEmptyPassportDraft } from "../passport-store";
import { createEmploymentSource, createPreparationDraft, derivePreparationReview } from "../return-preparation";
import {
  WORKSPACE_BACKUP_MAX_BYTES, WORKSPACE_BACKUP_SCHEMA, exportWorkspaceBackup,
  parseWorkspaceBackup, summariseWorkspaceBackup, workspaceBackupDigest,
  type WorkspaceBackup, type WorkspaceBackupContents,
} from "../workspace-backup";

const NOW = "2026-09-30T12:00:00.000Z";
let contents: WorkspaceBackupContents;
let plain: string;
let sourceBackend: Map<string, unknown>;
const empty = (): WorkspaceBackupContents => ({ books: null, passport: null, preparations: { "2025-26": null, "2026-27": null }, checklist: null });
const changed = (change: (value: WorkspaceBackup) => void): string => {
  const value = JSON.parse(plain) as WorkspaceBackup;
  change(value);
  return JSON.stringify(value);
};

beforeAll(async () => {
  sourceBackend = new Map();
  const books = createRecordsStore(sourceBackend);
  const record = await books.add({ date: "2026-05-01", amount: 12345, kind: "income", category: "turnover", source: "self-employment", description: "Synthetic private café receipt" });
  await books.review(record.id, { expectedRevision: 1, reviewState: "ready", amount: 12300 });
  const passport = createEmptyPassportDraft(NOW);
  passport.revision = 3;
  passport.answeredIncomeSourceIds = ["employment"];
  passport.incomeSources.employment = "yes";
  passport.mtdIncomeTaxPosition = structuredClone(TAX_POSITION_PASSPORT_EXAMPLE.positions[0]);
  const earlier = createPreparationDraft("2025-26", "prepare-return", NOW);
  earlier.revision = 2;
  earlier.circumstances.employment = "yes";
  earlier.employmentSources = [{ ...createEmploymentSource("synthetic-employer-1"), employerName: "Synthetic employer", sourceLabel: "Synthetic P60", documentYear: "2025-26", pay: "123.40", tax: "-12.34", notes: "Synthetic private note", reviewed: true }];
  const current = createPreparationDraft("2026-27", "organise-records", NOW);
  current.revision = 1;
  current.circumstances.employment = "unknown";
  current.employmentSources = [createEmploymentSource("synthetic-inactive-source")];
  contents = {
    books: await books.state(), passport,
    preparations: { "2025-26": earlier, "2026-27": current },
    checklist: { schema: CHECKLIST_SCHEMA, audience: "individuals", checked: emptyChecklistProgress() },
  };
  plain = await exportWorkspaceBackup(contents, NOW);
});

describe("complete saved workspace format", () => {
  it("roundtrips all four domains, both years, historical MTD evidence, notes and signed decimal strings", async () => {
    const parsed = await parseWorkspaceBackup(plain);
    expect(parsed).toEqual({ schema: WORKSPACE_BACKUP_SCHEMA, exportedAt: NOW, ...contents });
    expect(parsed.books?.history).toHaveLength(1);
    expect(parsed.preparations["2025-26"]?.employmentSources[0]).toMatchObject({ pay: "123.40", tax: "-12.34", notes: "Synthetic private note" });
    expect(parsed.preparations["2026-27"]?.employmentSources[0]).toMatchObject({ pay: "", tax: "", reviewed: false });
    expect(parsed.passport?.mtdIncomeTaxPosition).toEqual(TAX_POSITION_PASSPORT_EXAMPLE.positions[0]);
  });

  it("keeps absent domains and each absent year explicit, without creating empty drafts or Books", async () => {
    expect(await parseWorkspaceBackup(await exportWorkspaceBackup(empty(), NOW))).toEqual({ schema: WORKSPACE_BACKUP_SCHEMA, exportedAt: NOW, ...empty() });
    expect(summariseWorkspaceBackup(await parseWorkspaceBackup(await exportWorkspaceBackup(empty(), NOW)))).toEqual(empty());
  });

  it("returns counts without private names, descriptions, figures, notes or income facts", async () => {
    const summary = summariseWorkspaceBackup(await parseWorkspaceBackup(plain));
    expect(summary).toMatchObject({ books: { records: 1, checked: 1, revisions: 1 }, passport: { answeredSources: 1, totalSources: 5, hasMtdCheck: true }, preparations: { "2025-26": { employmentSources: 1 }, "2026-27": { employmentSources: 1 } }, checklist: { audience: "individuals", checked: 0 } });
    const json = JSON.stringify(summary);
    for (const privateText of ["Synthetic", "123.40", "-12.34", "incomeSources", "notes", "employerName"]) expect(json).not.toContain(privateText);
  });

  it("preserves inactive entries and does not turn stored current-year review into filing readiness", async () => {
    const value = JSON.parse(plain) as WorkspaceBackup;
    const current = value.preparations["2026-27"]!;
    current.circumstances.employment = "yes";
    current.employmentSources = [{ ...value.preparations["2025-26"]!.employmentSources[0], documentYear: "2026-27" }];
    const loaded = await parseWorkspaceBackup(JSON.stringify(value));
    expect(loaded.preparations["2026-27"]!.employmentSources[0].reviewed).toBe(true);
    expect(derivePreparationReview(loaded.preparations["2026-27"]!, "2026-09-30").employment.reviewed).toBe(0);
    expect(derivePreparationReview(contents.preparations["2026-27"]!, "2026-09-30").employment.inactive).toBe(1);
  });

  it("does not read browser storage or mutate saved source state during parsing and export", async () => {
    const baseline = structuredClone(sourceBackend);
    const get = vi.fn(() => { throw new Error("Unexpected IndexedDB access"); });
    vi.stubGlobal("indexedDB", { open: get });
    try {
      await exportWorkspaceBackup(contents, NOW);
      await parseWorkspaceBackup(plain);
      await expect(parseWorkspaceBackup(changed(value => { value.preparations["2025-26"]!.year = "2026-27"; }))).rejects.toThrow();
      expect(get).not.toHaveBeenCalled();
      expect(sourceBackend).toEqual(baseline);
    } finally { vi.unstubAllGlobals(); }
  });

  it("fingerprints canonical content independently of object member order", async () => {
    const value = await parseWorkspaceBackup(plain);
    const reordered = Object.fromEntries(Object.entries(value).reverse());
    expect(await workspaceBackupDigest(value)).toBe(await workspaceBackupDigest(reordered));
    const change = structuredClone(value);
    change.preparations["2025-26"]!.employmentSources[0].notes += " changed";
    expect(await workspaceBackupDigest(change)).not.toBe(await workspaceBackupDigest(value));
  });

  it.each([
    ["unknown schema", (v: WorkspaceBackup) => { (v as { schema: string }).schema = "taxsorted.workspace-backup/99"; }],
    ["missing domain", (v: WorkspaceBackup) => { delete (v as Partial<WorkspaceBackup>).passport; }],
    ["unknown domain", (v: WorkspaceBackup) => { Object.assign(v, { session: "synthetic-not-a-session" }); }],
    ["missing year", (v: WorkspaceBackup) => { delete (v.preparations as Partial<WorkspaceBackup["preparations"]>)["2026-27"]; }],
    ["unknown year", (v: WorkspaceBackup) => { Object.assign(v.preparations, { "2027-28": null }); }],
    ["mismatched year", (v: WorkspaceBackup) => { v.preparations["2025-26"]!.year = "2026-27"; }],
    ["unsaved preparation", (v: WorkspaceBackup) => { v.preparations["2025-26"]!.revision = 0; }],
    ["malformed amount", (v: WorkspaceBackup) => { v.preparations["2025-26"]!.employmentSources[0].tax = "12R"; }],
    ["unsaved Passport", (v: WorkspaceBackup) => { v.passport!.revision = 0; }],
    ["unsafe Passport revision", (v: WorkspaceBackup) => { v.passport!.revision = Number.MAX_SAFE_INTEGER + 1; }],
    ["extra Passport field", (v: WorkspaceBackup) => { Object.assign(v.passport!, { extra: "synthetic" }); }],
    ["extra MTD position field", (v: WorkspaceBackup) => { Object.assign(v.passport!.mtdIncomeTaxPosition!, { extra: "synthetic" }); }],
    ["unknown Passport answer", (v: WorkspaceBackup) => { Object.assign(v.passport!.incomeSources, { employment: "maybe" }); }],
    ["Passport timestamp rollover", (v: WorkspaceBackup) => { v.passport!.createdAt = "2026-02-30T12:00:00.000Z"; }],
    ["missing Books history", (v: WorkspaceBackup) => { v.books!.history = []; }],
    ["dangling Books ledger", (v: WorkspaceBackup) => { v.books!.events[0].ledgerId = "missing"; }],
    ["unknown checklist service", (v: WorkspaceBackup) => { Object.assign(v.checklist!.checked, { individuals: ["unrecognised-service"] }); }],
    ["extra checklist field", (v: WorkspaceBackup) => { Object.assign(v.checklist!, { session: "synthetic" }); }],
    ["invalid export timestamp", (v: WorkspaceBackup) => { v.exportedAt = "2026-02-30T12:00:00.000Z"; }],
  ])("rejects %s instead of silently dropping or repairing it", async (_label, change) => {
    await expect(parseWorkspaceBackup(changed(change))).rejects.toThrow(/invalid or unsupported/);
  });

  it("rejects duplicate and escaped duplicate payload members, including hidden deep values", async () => {
    for (const json of [plain.replace('"schema":', '"schema":"ignored","schema":'), plain.replace('"schema":', '"sch\\u0065ma":"ignored","schema":'), plain.replace('"books":', `"books":${"[".repeat(45)}null${"]".repeat(45)},"books":`)]) {
      await expect(parseWorkspaceBackup(json)).rejects.toThrow(/invalid or unsupported/);
    }
  });

  it("rejects prototype keys, unsafe nested numbers and oversized payloads", async () => {
    await expect(parseWorkspaceBackup(plain.replace('"schema":', '"__proto__":{},"schema":'))).rejects.toThrow();
    await expect(parseWorkspaceBackup(plain.replace('"revision": 3', '"revision":1e400'))).rejects.toThrow();
    await expect(parseWorkspaceBackup(" ".repeat(WORKSPACE_BACKUP_MAX_BYTES + 1))).rejects.toThrow(/12 MB/);
    await expect(parseWorkspaceBackup('"' + "é".repeat(WORKSPACE_BACKUP_MAX_BYTES / 2) + '"')).rejects.toThrow(/12 MB/);
  });

  it.each([
    ["undefined property", (v: WorkspaceBackupContents) => { Object.assign(v.passport!, { hidden: undefined }); }],
    ["non-finite number", (v: WorkspaceBackupContents) => { v.books!.events[0].cash.amount = Number.NaN; }],
    ["Date prototype", (v: WorkspaceBackupContents) => { Object.assign(v.passport!, { createdAt: new Date(NOW) }); }],
    ["sparse array", (v: WorkspaceBackupContents) => { v.preparations["2025-26"]!.employmentSources = new Array(1); }],
    ["array extra property", (v: WorkspaceBackupContents) => { Object.assign(v.books!.events, { hidden: "synthetic" }); }],
    ["bigint", (v: WorkspaceBackupContents) => { Object.assign(v.passport!, { revision: BigInt(1) }); }],
    ["non-enumerable property", (v: WorkspaceBackupContents) => { Object.defineProperty(v.passport!, "hidden", { value: "synthetic" }); }],
    ["symbol property", (v: WorkspaceBackupContents) => { Object.assign(v.passport!, { [Symbol("hidden")]: "synthetic" }); }],
    ["custom prototype", (v: WorkspaceBackupContents) => { Object.setPrototypeOf(v.passport!, { hidden: "synthetic" }); }],
    ["cyclic object", (v: WorkspaceBackupContents) => { Object.assign(v.passport!, { cycle: v.passport }); }],
  ])("refuses original %s before serialization can alter it", async (_label, change) => {
    const value = structuredClone(contents);
    change(value);
    await expect(exportWorkspaceBackup(value, NOW)).rejects.toThrow(/invalid or unsupported/);
  });

  it("does not invoke accessors or toJSON while validating original saved values", async () => {
    const value = structuredClone(contents);
    const getter = vi.fn(() => "synthetic");
    Object.defineProperty(value.passport!, "hidden", { get: getter, enumerable: true });
    await expect(exportWorkspaceBackup(value, NOW)).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    const toJSON = vi.fn(() => null);
    const other = structuredClone(contents);
    Object.assign(other.passport!, { toJSON });
    await expect(exportWorkspaceBackup(other, NOW)).rejects.toThrow();
    expect(toJSON).not.toHaveBeenCalled();
  });

  it("validates export metadata before JSON serialization can convert it", async () => {
    await expect(exportWorkspaceBackup(empty(), new Date(NOW) as unknown as string)).rejects.toThrow(/invalid or unsupported/);
    await expect(exportWorkspaceBackup(empty(), "2026-02-30T12:00:00.000Z")).rejects.toThrow(/invalid or unsupported/);
  });
});
