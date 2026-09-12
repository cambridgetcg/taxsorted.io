import { describe, expect, it } from "vitest";
import { ACCOUNTING_SYNC_SCHEMA } from "@taxsorted/engine/accounting-sync";
import {
  BOOKS_BACKUP_MAX_BYTES, BOOKS_BACKUP_MAX_ITEMS, parseBooksBackup, type BooksBackup,
} from "../books-backup";
import { createRecordsStore, type RecordsBackend } from "../records";
import { BOOKS_STORAGE_KEY, BOOKS_LEGACY_STORAGE_KEY, BOOKS_MIGRATION_CLOSED_KEY } from "../books-storage";
import { accountingPageDigest, normalizeSyntheticAccountingPage } from "../synthetic-accounting-normalizer";

const INCOME = { date: "2026-05-01", amount: 12345, kind: "income" as const, category: "turnover", source: "self-employment" as const };
const NOW = "2026-09-12T10:00:00.000Z";

async function populatedBooks() {
  const backend = new Map<string, unknown>();
  const store = createRecordsStore(backend);
  const added = await store.add(INCOME);
  await store.review(added.id, { expectedRevision: 1, reviewState: "ready", amount: 12300, description: "Corrected amount" });
  const excluded = await store.add({ date: "2026-05-02", amount: 2500, kind: "expense", category: "other", source: "uk-property", effect: "decrease" });
  await store.review(excluded.id, { expectedRevision: 1, reviewState: "excluded" });
  await store.importMany([{ record: { ...INCOME, date: "2026-05-03" }, origin: { kind: "bank-csv", externalId: "bank-row-1", accountScope: "bank-1" }, contentDigest: "bank-digest" }]);
  await store.importMany([{ record: { ...INCOME, amount: 54321 }, origin: { kind: "bank-csv", externalId: "bank-row-1", accountScope: "bank-1" }, contentDigest: "changed-bank-digest" }]);
  const localReplicaId = (await store.state()).replica.id;
  const binding = await store.bindProviderConnection({
    expectedLocalReplicaId: localReplicaId, sourceConnectionId: "source-1", entityId: "entity-1", entityName: "Example owner",
    syncReplicaId: "server-replica-1", provider: "synthetic", environment: "sandbox", organisationId: "org-1", organisationName: "Example business", activity: "self-employment", capabilities: [], boundAt: NOW,
  });
  const payloads = [{ id: "provider-1", type: "bank-transaction", revision: "1", updatedAt: NOW, date: "2026-05-04", direction: "inflow", amountMinor: 7800, currency: "GBP", description: "A provider receipt", status: "reconciled" }];
  const normalized = await normalizeSyntheticAccountingPage(payloads, { organisationId: "org-1", organisationName: "Example business", observedAt: NOW, activity: "self-employment" });
  const run = { id: "run-1", sourceConnectionId: binding.sourceConnectionId, syncReplicaId: binding.syncReplicaId, localReplicaId, dataset: "bank-transactions", kind: "initial" as const, fence: "1", startedAt: NOW };
  const manifest = { schema: ACCOUNTING_SYNC_SCHEMA, id: "manifest-1", runId: run.id, sourceConnectionId: run.sourceConnectionId, replicaId: run.syncReplicaId, dataset: run.dataset, sequence: 0, fence: run.fence, digest: await accountingPageDigest(payloads), recordCount: 1, currentCursor: null, nextCursor: "cursor-1", coverageMarker: "coverage-1", dirtyGeneration: "0", final: true, expiresAt: "2099-09-12T10:00:00.000Z" };
  await store.commitProviderPage({ run, manifest, ...normalized, committedAt: NOW });
  await store.markProviderPageAcknowledged({ localReplicaId, runId: run.id, manifestId: manifest.id, digest: manifest.digest, acknowledgedAt: NOW });
  await store.completeProviderSync({ localReplicaId, runId: run.id, checkpoint: { sourceConnectionId: binding.sourceConnectionId, syncReplicaId: binding.syncReplicaId, dataset: run.dataset, completedRunId: run.id, committedCursor: manifest.nextCursor, coverageMarker: manifest.coverageMarker, dirtyGeneration: "0", pageCount: 1, completedAt: NOW, recordCount: 1 }, finishedAt: NOW });
  await store.linkLedgerToEntity(added.ledgerId, { entityId: "entity-1", entityName: "Example owner", hmrcBusinessId: "hmrc-1" });
  for (const ledger of (await store.state()).ledgers) await store.confirmLedger(ledger.id);
  return { backend, store, json: await store.exportBackup() };
}

describe("complete Books backups", () => {
  it("roundtrips emitted money, source evidence, imports and review history into a fresh, unlinked installation", async () => {
    const source = await populatedBooks();
    const original = await source.store.state();
    const backend = new Map<string, unknown>([["unrelated-preference", "keep"], ["taxsorted-synthetic-accounting-demo:taxsorted-local-books-v2", { untouched: true }]]);
    const target = createRecordsStore(backend);
    const oldEvent = await target.add({ ...INCOME, amount: 999 });
    const preview = await target.previewRestore(source.json);
    expect(preview.incoming).toMatchObject({ records: 4, revisions: 2, imports: 3, sourceVersions: 1, connections: 1, syncRuns: 1, checkpoints: 1, linkedBusinesses: 1 });
    expect((await parseBooksBackup(preview.existingBackup)).books.events[0].id).toBe(oldEvent.id);
    await target.restoreBackup(source.json, preview);
    const restored = await target.state();
    expect(restored.replica.id).not.toBe(original.replica.id);
    expect(restored.replica.id).not.toBe(preview.expectedReplicaId);
    expect(restored.storeRevision).toBe(preview.expectedStoreRevision + 1);
    for (const field of ["events", "history", "imports", "rawProviderVersions", "normalizedProviderVersions", "conflictCases"] as const) expect(restored[field]).toEqual(original[field]);
    expect(restored.events.some(event => event.id === oldEvent.id)).toBe(false);
    expect(restored.ledgers.every(ledger => ledger.scopeState === "needs-confirmation" && !ledger.ownerEntityId && !ledger.hmrcBusinessId && !ledger.scopeConfirmedAt)).toBe(true);
    expect(restored.providerBindings).toEqual([]);
    expect(restored.syncRuns).toEqual([]);
    expect(restored.datasetCheckpoints).toEqual([]);
    expect(await target.list()).toEqual([]);
    await target.confirmLedger(original.events[0].ledgerId);
    expect((await target.list())[0]).toMatchObject({ amount: 12300 });
    expect(backend.get("unrelated-preference")).toBe("keep");
    expect(backend.get("taxsorted-synthetic-accounting-demo:taxsorted-local-books-v2")).toEqual({ untouched: true });
    expect(await source.store.state()).toEqual(original);
    expect((await parseBooksBackup(await target.exportBackup())).books.events).toEqual(original.events);
  });

  it("can restore into a cleared disposable store, and repeated restores never clone the replica", async () => {
    const { backend, store, json } = await populatedBooks();
    backend.clear();
    await store.restoreBackup(json, await store.previewRestore(json));
    const first = await store.state();
    await store.restoreBackup(json, await store.previewRestore(json));
    expect((await store.state()).replica.id).not.toBe(first.replica.id);
    expect((await store.state()).events).toEqual(first.events);
  });

  const invalid: [string, (backup: BooksBackup) => void][] = [
    ["unsupported file version", b => { (b as { schema: string }).schema = "taxsorted.books-backup/2"; }],
    ["unsupported store version", b => { (b.books as { schema: string }).schema = "taxsorted.local-books/99"; }],
    ["unknown fields", b => { Object.assign(b.books.events[0], { attachment: "unexpected" }); }],
    ["missing arrays", b => { delete (b.books as Partial<typeof b.books>).history; }],
    ["duplicate records", b => { b.books.events.push(b.books.events[0]); }],
    ["duplicate businesses", b => { b.books.ledgers.push(b.books.ledgers[0]); }],
    ["duplicate revisions", b => { b.books.history.push(b.books.history[0]); }],
    ["duplicate source versions", b => { b.books.rawProviderVersions.push(b.books.rawProviderVersions[0]); }],
    ["unknown ledger", b => { b.books.events[0].ledgerId = "missing"; }],
    ["missing history", b => { b.books.history = []; }],
    ["bad history reference", b => { b.books.history[0].eventId = "missing"; }],
    ["changed historical source", b => { b.books.history[0].before.origin.externalId = "another-source"; }],
    ["bad import reference", b => { b.books.imports[0].addedEventIds = ["missing"]; }],
    ["conflict linked to unrelated record", b => { b.books.imports[1].conflicts[0].existingEventId = b.books.events[0].id; }],
    ["bad source reference", b => { b.books.normalizedProviderVersions[0].rawVersionId = "missing"; }],
    ["bad mapped record", b => { b.books.normalizedProviderVersions[0].mappedEventId = "missing"; }],
    ["source mapped to unrelated record", b => { b.books.normalizedProviderVersions[0].mappedEventId = b.books.events[0].id; }],
    ["source from a different organisation", b => { b.books.rawProviderVersions[0].identity.organisationId = "someone-else"; }],
    ["bad reversal reference", b => { b.books.events[0].reversalOf = { eventId: "missing", revision: 1 }; }],
    ["bad duplicate reference", b => { b.books.events[0].possibleDuplicateOf = ["missing"]; }],
    ["bad checkpoint reference", b => { b.books.datasetCheckpoints[0].completedRunId = "missing"; }],
    ["changed source payload", b => { b.books.rawProviderVersions[0].payload = { changed: true }; }],
    ["changed page digest", b => { b.books.syncRuns[0].pages[0].manifest.digest = `sha256:${"0".repeat(64)}`; }],
    ["negative cash", b => { b.books.events[0].cash.amount = -1; }],
    ["fractional cash", b => { b.books.events[0].cash.amount = 1.5; }],
    ["unsafe cash", b => { b.books.events[0].cash.amount = Number.MAX_SAFE_INTEGER + 1; }],
    ["invalid date", b => { b.books.events[0].occurredOn = "2026-02-30"; }],
    ["invalid timestamp", b => { b.exportedAt = "not a time"; }],
    ["invalid review state", b => { Object.assign(b.books.events[0], { reviewState: "filed" }); }],
    ["invalid provider", b => { Object.assign(b.books.rawProviderVersions[0].identity, { provider: "unknown" }); }],
    ["too many items", b => { b.books.events = Array(BOOKS_BACKUP_MAX_ITEMS + 1).fill(null); }],
  ];
  it.each(invalid)("rejects %s without changing existing storage", async (_name, change) => {
    const { backend, store, json } = await populatedBooks();
    const before = structuredClone([...backend]);
    const backup = JSON.parse(json) as BooksBackup;
    change(backup);
    await expect(store.previewRestore(JSON.stringify(backup))).rejects.toThrow();
    expect([...backend]).toEqual(before);
  });

  it("rejects malformed, oversized, unsafe-key and deeply nested JSON before writing", async () => {
    const { store, backend, json } = await populatedBooks();
    const before = structuredClone([...backend]);
    for (const malformed of ["{", "null", "[]", " ".repeat(BOOKS_BACKUP_MAX_BYTES + 1), '{"__proto__": {"polluted": true}}', json.replace('"payload": {', '"payload": {"constructor": "unsafe",')]) await expect(store.previewRestore(malformed)).rejects.toThrow();
    const backup = JSON.parse(json) as BooksBackup;
    let nested: unknown = null;
    for (let index = 0; index < 40; index++) nested = { nested };
    backup.books.rawProviderVersions[0].payload = nested;
    await expect(store.previewRestore(JSON.stringify(backup))).rejects.toThrow(/nested data/);
    expect([...backend]).toEqual(before);
  });

  it("checks the actual file again at replacement, including the previewed file identity", async () => {
    const { store, backend, json } = await populatedBooks();
    const preview = await store.previewRestore(json);
    const before = structuredClone([...backend]);
    await expect(store.restoreBackup("{}", preview)).rejects.toThrow();
    const changed = JSON.parse(json) as BooksBackup;
    changed.books.events[0].description = "Different file";
    await expect(store.restoreBackup(JSON.stringify(changed), preview)).rejects.toThrow(/selected backup changed/);
    expect([...backend]).toEqual(before);
  });

  it("rejects another store instance's changes made after preflight", async () => {
    const { store, backend, json } = await populatedBooks();
    const preview = await store.previewRestore(json);
    await createRecordsStore(backend).add({ ...INCOME, amount: 777 });
    const before = structuredClone([...backend]);
    await expect(store.restoreBackup(json, preview)).rejects.toThrow(/changed after the preview/);
    expect([...backend]).toEqual(before);
  });

  it("does not report a failed restore when a subscriber throws after commit", async () => {
    const { store, json } = await populatedBooks();
    const preview = await store.previewRestore(json);
    let notified = false;
    store.subscribe(() => { throw new Error("Broken view"); });
    store.subscribe(() => { notified = true; });
    await expect(store.restoreBackup(json, preview)).resolves.toBeUndefined();
    expect(notified).toBe(true);
    expect((await store.state()).replica.id).not.toBe(preview.expectedReplicaId);
  });

  it("guards v1 changes after preflight and prevents stale-v1 resurrection after restore", async () => {
    const { store, backend, json } = await populatedBooks();
    const oldRecord = { ...INCOME, id: "legacy-record" };
    backend.set(BOOKS_LEGACY_STORAGE_KEY, [oldRecord]);
    const preview = await store.previewRestore(json);
    expect((await parseBooksBackup(preview.existingBackup)).books.events.some(event => event.id === oldRecord.id)).toBe(true);
    backend.set(BOOKS_LEGACY_STORAGE_KEY, [oldRecord, { ...oldRecord, id: "late-legacy" }]);
    const before = structuredClone([...backend]);
    await expect(store.restoreBackup(json, preview)).rejects.toThrow(/changed after the preview/);
    expect([...backend]).toEqual(before);
    await store.restoreBackup(json, await store.previewRestore(json));
    expect(backend.has(BOOKS_LEGACY_STORAGE_KEY)).toBe(false);
    expect(backend.get(BOOKS_MIGRATION_CLOSED_KEY)).toBe(true);
    backend.set(BOOKS_LEGACY_STORAGE_KEY, [oldRecord, { ...oldRecord, id: "later-old-tab" }]);
    expect((await createRecordsStore(backend).state()).events.some(event => event.id.includes("legacy") || event.id === "later-old-tab")).toBe(false);
  });

  it.each(["QuotaExceededError", "AbortError"])("keeps all keys intact when a %s interrupts replacement", async (name) => {
    const { json } = await populatedBooks();
    const data = new Map<string, unknown>();
    const backend: RecordsBackend = {
      get: key => data.get(key), set: (key, value) => data.set(key, structuredClone(value)), delete: key => data.delete(key),
      transaction: async operation => {
        const draft = new Map(structuredClone([...data]));
        operation(draft);
        expect(draft.get(BOOKS_MIGRATION_CLOSED_KEY)).toBe(true);
        // All three operations staged, but persistence never commits.
        throw new DOMException("Simulated interrupted write", name);
      },
    };
    const store = createRecordsStore(backend);
    await store.add(INCOME);
    data.set(BOOKS_LEGACY_STORAGE_KEY, [{ ...INCOME, id: "legacy-record" }]);
    const preview = await store.previewRestore(json);
    const before = structuredClone([...data]);
    await expect(store.restoreBackup(json, preview)).rejects.toMatchObject({ name });
    expect([...data]).toEqual(before);
    expect(data.get(BOOKS_STORAGE_KEY)).toEqual(JSON.parse(preview.existingBackup).books);
  });
});
