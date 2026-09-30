import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { workspaceTestDb as db } from "./workspace-idb-harness";
import { captureWorkspaceBackup, previewWorkspaceRestore, restoreWorkspaceBackup } from "../workspace-backup-store";
import { exportWorkspaceBackup, parseWorkspaceBackup, type WorkspaceBackupContents } from "../workspace-backup";
import { readWorkspaceSnapshot, createWorkspaceSession, WORKSPACE_KEYS, WORKSPACE_STORAGE_KEY, WORKSPACE_CHECKLIST_KEY } from "../workspace-storage";
import { createEmptyPassportDraft, createPassportStore, PASSPORT_STORAGE_KEY } from "../passport-store";
import { createPreparationDraft } from "../return-preparation";
import { createReturnPreparationStore, preparationStorageKey } from "../return-preparation-store";
import { BOOKS_STORAGE_KEY, BOOKS_LEGACY_STORAGE_KEY } from "../books-storage";
import { createRecordsStore } from "../records";
import { CHECKLIST_SCHEMA, emptyChecklistProgress, type SavedChecklist } from "@/app/checkup/checklist-state";

vi.mock("idb-keyval", async importOriginal => ({
  ...await importOriginal<typeof import("idb-keyval")>(),
  createStore: () => db.store,
}));
const NOW = "2026-09-30T12:00:00.000Z";
const empty: WorkspaceBackupContents = { books: null, passport: null, preparations: { "2025-26": null, "2026-27": null }, checklist: null };
beforeEach(() => {
  db.reset();
  vi.stubGlobal("BroadcastChannel", undefined);
  vi.stubGlobal("navigator", { locks: { request: async (_name: string, action: () => Promise<unknown>) => action() } });
});
afterEach(() => vi.unstubAllGlobals());

async function populated() {
  const books = createRecordsStore(new Map());
  const record = await books.add({ date: "2026-05-01", amount: 12345, kind: "income", category: "turnover", source: "self-employment", description: "Synthetic saved receipt" });
  await books.linkLedgerToEntity(record.ledgerId, { entityId: "synthetic-entity", entityName: "Synthetic owner", hmrcBusinessId: "synthetic-business" });
  await books.confirmLedger(record.ledgerId);
  const passport = { ...createEmptyPassportDraft(NOW), revision: 1 };
  const old = { ...createPreparationDraft("2025-26", "prepare-return", NOW), revision: 1 };
  const current = { ...createPreparationDraft("2026-27", "organise-records", NOW), revision: 1 };
  const checklist: SavedChecklist = { schema: CHECKLIST_SCHEMA, audience: "landlords", checked: emptyChecklistProgress() };
  const contents: WorkspaceBackupContents = { books: await books.state(), passport, preparations: { "2025-26": old, "2026-27": current }, checklist };
  db.values.set(BOOKS_STORAGE_KEY, contents.books);
  db.values.set(PASSPORT_STORAGE_KEY, passport);
  db.values.set(preparationStorageKey("2025-26"), old);
  db.values.set(preparationStorageKey("2026-27"), current);
  db.values.set(WORKSPACE_CHECKLIST_KEY, JSON.stringify(checklist));
  return contents;
}

describe("complete workspace recovery orchestration", () => {
  it("captures absence without creating empty drafts or Books", async () => {
    const captured = await captureWorkspaceBackup();
    expect(await parseWorkspaceBackup(captured.json)).toMatchObject(empty);
    expect(captured.summary.books).toBeNull();
    expect((await readWorkspaceSnapshot()).values[BOOKS_STORAGE_KEY]).toBeUndefined();
  });

  it("preserves every supported saved section in the safety copy and retires restored Books links", async () => {
    const original = await populated();
    const incoming = await exportWorkspaceBackup(original, NOW);
    const preview = await previewWorkspaceRestore(incoming);
    expect(await parseWorkspaceBackup(preview.existingBackup)).toMatchObject(original);
    expect(preview.incoming).toMatchObject({ books: { records: 1, businesses: 1 }, preparations: { "2025-26": { employmentSources: 0 }, "2026-27": { employmentSources: 0 } } });
    await restoreWorkspaceBackup(incoming, preview);
    const restored = await parseWorkspaceBackup((await captureWorkspaceBackup()).json);
    expect(restored.passport).toEqual(original.passport);
    expect(restored.preparations).toEqual(original.preparations);
    expect(restored.checklist).toEqual(original.checklist);
    expect(restored.books?.events).toEqual(original.books?.events);
    expect(restored.books?.replica.id).not.toBe(original.books?.replica.id);
    expect(restored.books?.ledgers[0]).toMatchObject({ scopeState: "needs-confirmation" });
    expect(restored.books?.ledgers[0].ownerEntityId).toBeUndefined();
    expect(restored.books?.ledgers[0].hmrcBusinessId).toBeUndefined();
    expect((await readWorkspaceSnapshot()).generation).not.toBe(preview.expectedSnapshot.generation);
  });

  it("restores explicit absence for all sections without reviving an old checklist", async () => {
    await populated();
    const json = await exportWorkspaceBackup(empty, NOW);
    await restoreWorkspaceBackup(json, await previewWorkspaceRestore(json));
    const snapshot = await readWorkspaceSnapshot();
    for (const key of [WORKSPACE_KEYS[0], WORKSPACE_KEYS[1], WORKSPACE_KEYS[3], WORKSPACE_KEYS[4], WORKSPACE_KEYS[5]]) expect(snapshot.values[key]).toBeUndefined();
    expect(snapshot.values[WORKSPACE_CHECKLIST_KEY]).toBeNull();
    expect(await parseWorkspaceBackup((await captureWorkspaceBackup()).json)).toMatchObject(empty);
  });

  it.each(["{", JSON.stringify({ schema: "unsupported" })])("does not read or activate storage for invalid incoming content", async json => {
    await expect(previewWorkspaceRestore(json)).rejects.toThrow();
    expect(db.modes).toEqual([]);
    expect(db.values.size).toBe(0);
  });

  it.each([
    [BOOKS_STORAGE_KEY, null], [PASSPORT_STORAGE_KEY, { malformed: true }],
    [preparationStorageKey("2025-26"), null], [preparationStorageKey("2026-27"), { malformed: true }],
    [WORKSPACE_CHECKLIST_KEY, "{}"], [BOOKS_LEGACY_STORAGE_KEY, { malformed: true }],
  ])("leaves damaged current data untouched at %s", async (key, value) => {
    db.values.set(key as string, value);
    const before = structuredClone(db.values);
    await expect(captureWorkspaceBackup()).rejects.toThrow();
    expect(db.values).toEqual(before);
    expect(db.values.has(WORKSPACE_STORAGE_KEY)).toBe(false);
  });

  it("requires unmerged legacy Books to be opened before adoption", async () => {
    await populated();
    db.values.set(BOOKS_LEGACY_STORAGE_KEY, [{ id: "unmerged" }]);
    await expect(captureWorkspaceBackup()).rejects.toThrow(/Open Money records first/);
    expect(db.values.has(WORKSPACE_STORAGE_KEY)).toBe(false);
  });

  it("refuses an intervening section write after preview and keeps all newer work", async () => {
    await populated();
    const json = await exportWorkspaceBackup(empty, NOW);
    const preview = await previewWorkspaceRestore(json);
    await createWorkspaceSession().update(WORKSPACE_CHECKLIST_KEY, () => null);
    const before = structuredClone(db.values);
    await expect(restoreWorkspaceBackup(json, preview)).rejects.toThrow(/workspace changed/);
    expect(db.values).toEqual(before);
  });

  it("refuses a different backup after preview", async () => {
    const contents = await populated();
    const preview = await previewWorkspaceRestore(await exportWorkspaceBackup(empty, NOW));
    const before = structuredClone(db.values);
    await expect(restoreWorkspaceBackup(await exportWorkspaceBackup(contents, NOW), preview)).rejects.toThrow(/backup changed/);
    expect(db.values).toEqual(before);
  });

  it("rolls back every section on a failed replacement commit", async () => {
    await populated();
    const json = await exportWorkspaceBackup(empty, NOW);
    const preview = await previewWorkspaceRestore(json);
    const before = structuredClone(db.values);
    db.failCommit = true;
    await expect(restoreWorkspaceBackup(json, preview)).rejects.toThrow();
    expect(db.values).toEqual(before);
  });

  it("allows open editors across first backup, then rejects their saves after a restore with matching revisions", async () => {
    await populated();
    const passport = createPassportStore();
    const preparation = createReturnPreparationStore("2025-26");
    const first = await passport.load();
    const draft = await preparation.load();
    const captured = await captureWorkspaceBackup();
    const saved = await passport.save(first!);
    const preview = await previewWorkspaceRestore(captured.json);
    await restoreWorkspaceBackup(captured.json, preview);
    await expect(passport.save(saved)).rejects.toThrow(/workspace changed/);
    await expect(preparation.save(draft!)).rejects.toThrow(/workspace changed/);
  });
});
