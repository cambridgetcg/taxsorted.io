import { BOOKS_BACKUP_SCHEMA, restoredBooks } from "@/lib/books-backup";
import { BOOKS_STORAGE_KEY, BOOKS_LEGACY_STORAGE_KEY, BOOKS_MIGRATION_CLOSED_KEY } from "@/lib/books-storage";
import { LOCAL_BOOKS_SCHEMA, type LocalBooksState } from "@/lib/local-books";
import { PASSPORT_STORAGE_KEY, type TaxPositionPassportDraft } from "@/lib/passport-store";
import { PREPARATION_YEARS, type PreparationDraft } from "@/lib/return-preparation";
import { preparationStorageKey } from "@/lib/return-preparation-store";
import { parseSavedChecklist } from "@/app/checkup/checklist-state";
import {
  exportWorkspaceBackup, parseWorkspaceBackup, summariseWorkspaceBackup, workspaceBackupDigest,
  type WorkspaceBackup, type WorkspaceBackupContents, type WorkspaceBackupSummary,
} from "@/lib/workspace-backup";
import {
  activateWorkspace, readWorkspaceSnapshot, replaceWorkspace, WORKSPACE_CHECKLIST_KEY,
  type WorkspaceSnapshot,
} from "@/lib/workspace-storage";

export interface WorkspaceRestorePreview {
  existing: WorkspaceBackupSummary;
  incoming: WorkspaceBackupSummary;
  exportedAt: string;
  /** Exact saved snapshot to encrypt and download before replacement. */
  existingBackup: string;
  expectedSnapshot: WorkspaceSnapshot;
  expectedBackupDigest: string;
}

function unreadable(section: string): never {
  throw new Error(`Saved ${section} could not be read. Nothing has been replaced. Open that tool to resolve the saved-data problem before backing up or restoring.`);
}

/** Read raw slots without creating drafts or silently migrating older Books. */
async function snapshotBackup(snapshot: WorkspaceSnapshot): Promise<{ json: string; backup: WorkspaceBackup }> {
  const values = snapshot.values;
  const books = values[BOOKS_STORAGE_KEY];
  const closed = values[BOOKS_MIGRATION_CLOSED_KEY];
  if (closed !== undefined && closed !== true && closed !== false) unreadable("Money records");
  if (books !== undefined && (!books || typeof books !== "object" || (books as LocalBooksState).schema !== LOCAL_BOOKS_SCHEMA)) {
    throw new Error("Open Money records first to check or upgrade its saved format, then return to workspace backups. Nothing has been replaced.");
  }
  // An old tab may have appended records since its last migration. Refuse to
  // close that baseline until Books has incorporated every identifiable entry.
  const legacy = closed === true ? undefined : values[BOOKS_LEGACY_STORAGE_KEY];
  if (legacy !== undefined) {
    if (!Array.isArray(legacy) || legacy.some(record => !record || typeof record.id !== "string" || !record.id)) unreadable("Money records");
    const events = (books as LocalBooksState | undefined)?.events;
    if (legacy.some(record => !Array.isArray(events) || !events.some(event => event.id === record.id))) {
      throw new Error("Open Money records first to include earlier saved records, then return to workspace backups. Nothing has been replaced.");
    }
  }
  const checklistRaw = values[WORKSPACE_CHECKLIST_KEY];
  const checklist = checklistRaw === undefined || checklistRaw === null ? null
    : typeof checklistRaw === "string" ? parseSavedChecklist(checklistRaw) : unreadable("My tax year checklist");
  if (checklistRaw !== undefined && checklistRaw !== null && !checklist) unreadable("My tax year checklist");
  const preparations = Object.fromEntries(PREPARATION_YEARS.map(year => {
    const raw = values[preparationStorageKey(year)];
    if (raw === null) unreadable(`${year} preparation`);
    return [year, raw === undefined ? null : raw];
  })) as WorkspaceBackupContents["preparations"];
  const contents: WorkspaceBackupContents = {
    books: books === undefined ? null : books as LocalBooksState,
    passport: (values[PASSPORT_STORAGE_KEY] ?? null) as TaxPositionPassportDraft | null,
    preparations, checklist,
  };
  // Export validates the original graph before serialisation, including values
  // such as NaN or undefined which JSON.stringify would otherwise hide.
  const json = await exportWorkspaceBackup(contents);
  return { json, backup: await parseWorkspaceBackup(json) };
}

async function captureSavedWorkspace() {
  const snapshot = await readWorkspaceSnapshot();
  const captured = await snapshotBackup(snapshot);
  // Validate first; only this explicit user action adopts the complete workspace.
  // The transaction compares all slots, including the legacy migration baseline.
  const activated = await activateWorkspace(snapshot);
  return { ...captured, snapshot: activated };
}

export async function captureWorkspaceBackup(): Promise<{ json: string; summary: WorkspaceBackupSummary; exportedAt: string }> {
  const { json, backup } = await captureSavedWorkspace();
  return { json, summary: summariseWorkspaceBackup(backup), exportedAt: backup.exportedAt };
}

export async function previewWorkspaceRestore(json: string): Promise<WorkspaceRestorePreview> {
  // Invalid incoming files must not trigger even an otherwise safe migration.
  const incoming = await parseWorkspaceBackup(json);
  const expectedBackupDigest = await workspaceBackupDigest(incoming);
  const existing = await captureSavedWorkspace();
  return {
    existing: summariseWorkspaceBackup(existing.backup), incoming: summariseWorkspaceBackup(incoming),
    exportedAt: incoming.exportedAt, existingBackup: existing.json,
    expectedSnapshot: existing.snapshot, expectedBackupDigest,
  };
}

export async function restoreWorkspaceBackup(json: string, preview: WorkspaceRestorePreview): Promise<void> {
  const expected = structuredClone(preview.expectedSnapshot);
  const expectedDigest = preview.expectedBackupDigest;
  const incoming = await parseWorkspaceBackup(json);
  if (await workspaceBackupDigest(incoming) !== expectedDigest) {
    throw new Error("The chosen backup changed after preview. Preview it again and save a new safety copy before restoring.");
  }
  const current = (await snapshotBackup(expected)).backup;
  const contents: WorkspaceBackupContents = {
    books: incoming.books === null ? null : restoredBooks({
      schema: BOOKS_BACKUP_SCHEMA, exportedAt: incoming.exportedAt, books: incoming.books,
    }, current.books?.storeRevision ?? 0),
    passport: incoming.passport,
    preparations: incoming.preparations,
    checklist: incoming.checklist,
  };
  // Revalidate all transformations before opening a write transaction.
  await exportWorkspaceBackup(contents);
  const values: Record<string, unknown> = {
    [BOOKS_STORAGE_KEY]: contents.books ?? undefined,
    [BOOKS_LEGACY_STORAGE_KEY]: undefined,
    [BOOKS_MIGRATION_CLOSED_KEY]: true,
    [PASSPORT_STORAGE_KEY]: contents.passport ?? undefined,
    ...Object.fromEntries(PREPARATION_YEARS.map(year => [preparationStorageKey(year), contents.preparations[year] as PreparationDraft | null ?? undefined])),
    // An explicit null prevents a cleared checklist falling back to old localStorage.
    [WORKSPACE_CHECKLIST_KEY]: contents.checklist === null ? null : JSON.stringify(contents.checklist),
  };
  await replaceWorkspace(expected, values);
}
