// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceBackup } from "../workspace-backup";
import { createEmptyPassportDraft } from "@/lib/passport-store";
import { createEmploymentSource, createPreparationDraft } from "@/lib/return-preparation";
import { exportWorkspaceBackup, parseWorkspaceBackup, summariseWorkspaceBackup, type WorkspaceBackupContents } from "@/lib/workspace-backup";
import * as encryption from "@/lib/workspace-backup-encryption";
import type { WorkspaceRestorePreview } from "@/lib/workspace-backup-store";

const stores = vi.hoisted(() => ({ capture: vi.fn(), preview: vi.fn(), restore: vi.fn() }));
vi.mock("@/lib/workspace-backup-store", () => ({ captureWorkspaceBackup: stores.capture, previewWorkspaceRestore: stores.preview, restoreWorkspaceBackup: stores.restore }));

const PASSWORD = "synthetic workspace backup phrase";
const NOW = "2026-09-30T12:00:00.000Z";
const PASSWORD_ACK = "I understand that TaxSorted cannot reset this password or recover the backup without it.";
const REPLACE_ACK = /I have checked that the safety copy was saved/;
const downloads: Blob[] = [];
let currentJson: string;
let incomingJson: string;
let encryptedFile: string;
let preview: WorkspaceRestorePreview;

function empty(): WorkspaceBackupContents {
  return { books: null, passport: null, preparations: { "2025-26": null, "2026-27": null }, checklist: null };
}

beforeAll(async () => {
  vi.stubGlobal("crypto", webcrypto);
  const current = empty();
  current.passport = { ...createEmptyPassportDraft(NOW), revision: 1 };
  const draft = createPreparationDraft("2025-26", "prepare-return", NOW);
  draft.revision = 1;
  draft.employmentSources = [{ ...createEmploymentSource("synthetic-employer"), notes: "Synthetic private saved preparation" }];
  current.preparations["2025-26"] = draft;
  currentJson = await exportWorkspaceBackup(current, NOW);
  incomingJson = await exportWorkspaceBackup(empty(), NOW);
  encryptedFile = await encryption.encryptWorkspaceBackup(incomingJson, PASSWORD);
});

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", webcrypto);
  downloads.length = 0;
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL(blob: Blob) { downloads.push(blob); return "blob:workspace-backup-test"; }
    static revokeObjectURL = vi.fn();
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  // The component must pass this exact store-owned object back, never rebuild it.
  preview = {
    existing: summariseWorkspaceBackup(await parseWorkspaceBackup(currentJson)),
    incoming: summariseWorkspaceBackup(await parseWorkspaceBackup(incomingJson)),
    exportedAt: NOW,
    existingBackup: currentJson,
    expectedSnapshot: { testOnlyOpaqueGuard: true } as unknown as WorkspaceRestorePreview["expectedSnapshot"],
    expectedBackupDigest: "synthetic-store-owned-digest",
  };
  stores.capture.mockReset().mockResolvedValue({ json: currentJson, summary: preview.existing, exportedAt: NOW });
  stores.preview.mockReset().mockResolvedValue(preview);
  stores.restore.mockReset().mockResolvedValue(undefined);
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function file(json = encryptedFile, name = "workspace.encrypted.json") {
  const result = new File([json], name, { type: "application/json" });
  Object.defineProperty(result, "text", { value: vi.fn(async () => json), configurable: true });
  return result;
}
function choose(selected = file()) {
  fireEvent.change(screen.getByLabelText("Choose a workspace backup to restore"), { target: { files: [selected] } });
}
function setPassword(password = PASSWORD, repeated = password) {
  fireEvent.change(screen.getByLabelText("Backup password", { exact: true }), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Repeat backup password"), { target: { value: repeated } });
  fireEvent.click(screen.getByRole("checkbox", { name: PASSWORD_ACK }));
}
async function prepare() {
  fireEvent.click(screen.getByRole("button", { name: "Prepare a workspace backup" }));
  await screen.findByRole("heading", { name: "Check your saved workspace" });
}
async function unlock(password = PASSWORD) {
  choose();
  const input = await screen.findByLabelText("Password for this backup");
  fireEvent.change(input, { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Unlock workspace preview" }));
}
async function restorePreview() {
  await unlock();
  await screen.findByRole("heading", { name: "Check before replacing saved work" });
}
async function safetyCopy() {
  setPassword();
  fireEvent.click(screen.getByRole("button", { name: "Download protected safety copy" }));
  await waitFor(() => expect(screen.getByRole("checkbox", { name: REPLACE_ACK })).toBeEnabled());
}
function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsText(blob);
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { resolve, promise };
}

describe("Workspace backup and restore", () => {
  it("opens without reading saved work and makes scope, exclusions and Books-only recovery visible", () => {
    render(<WorkspaceBackup />);
    expect(stores.capture).not.toHaveBeenCalled(); expect(stores.preview).not.toHaveBeenCalled(); expect(stores.restore).not.toHaveBeenCalled();
    expect(screen.getByText(/Opening this page reads no saved tax data/)).toBeVisible();
    expect(screen.getByText(/Unsaved forms, original documents/)).toBeVisible();
    expect(screen.getByRole("link", { name: /Only need Books/ })).toHaveAttribute("href", "/books/workspace/backups");
    expect(screen.queryByLabelText("Backup password", { exact: true })).not.toBeInTheDocument();
  });

  it("reads on request, distinguishes absence from a saved empty Passport and does not display private draft facts", async () => {
    render(<WorkspaceBackup />); await prepare();
    expect(stores.capture).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Check your saved workspace" })).toHaveFocus();
    expect(screen.getByText("0 of 5 income-source questions answered")).toBeVisible();
    expect(screen.getByText("1 employment entries")).toBeVisible();
    expect(screen.getAllByText("Not saved")).toHaveLength(3);
    expect(screen.queryByText("Synthetic private saved preparation")).not.toBeInTheDocument();
  });

  it("downloads an encrypted copy of exactly the explicitly captured snapshot and clears passwords", async () => {
    render(<WorkspaceBackup />); await prepare(); setPassword();
    fireEvent.click(screen.getByRole("button", { name: "Download protected workspace backup" }));
    await screen.findByText(/Protected download started/);
    expect(stores.capture).toHaveBeenCalledOnce(); expect(downloads).toHaveLength(1);
    const encrypted = await blobText(downloads[0]);
    expect(encrypted).not.toContain("Synthetic private saved preparation");
    expect(await encryption.decryptWorkspaceBackup(encrypted, PASSWORD)).toBe(currentJson);
    expect(screen.getByLabelText("Backup password", { exact: true })).toHaveValue("");
    expect(screen.getByLabelText("Repeat backup password")).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: PASSWORD_ACK })).not.toBeChecked();
  });

  it("fails visibly when saved data cannot be captured instead of exporting an empty workspace", async () => {
    stores.capture.mockRejectedValueOnce(new Error("Saved data needs review before it can be backed up."));
    render(<WorkspaceBackup />);
    fireEvent.click(screen.getByRole("button", { name: "Prepare a workspace backup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Saved data needs review");
    expect(downloads).toEqual([]); expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("rejects an oversized file before reading it or inspecting current saved work", async () => {
    render(<WorkspaceBackup />);
    const large = file(); Object.defineProperty(large, "size", { value: encryption.WORKSPACE_BACKUP_FILE_MAX_BYTES + 1 });
    choose(large);
    expect(await screen.findByRole("alert")).toHaveTextContent("17 MiB");
    expect(large.text).not.toHaveBeenCalled(); expect(stores.preview).not.toHaveBeenCalled();
  });

  it.each(["plain workspace", "Books-only"])("rejects a %s file before asking for a password or reading saved work", async kind => {
    render(<WorkspaceBackup />);
    choose(file(kind === "plain workspace" ? incomingJson : JSON.stringify({ schema: "taxsorted.books-backup/1" })));
    expect(await screen.findByRole("alert")).toHaveTextContent(/encrypted TaxSorted workspace backup/);
    expect(stores.preview).not.toHaveBeenCalled(); expect(screen.queryByLabelText("Password for this backup")).not.toBeInTheDocument();
  });

  it("selects an encrypted file without reading current data, then previews only after deliberate unlock", async () => {
    render(<WorkspaceBackup />); choose();
    const input = await screen.findByLabelText("Password for this backup");
    expect(input).toHaveFocus(); expect(stores.preview).not.toHaveBeenCalled(); expect(stores.capture).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: PASSWORD } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock workspace preview" }));
    await screen.findByRole("heading", { name: "Check before replacing saved work" });
    expect(stores.preview).toHaveBeenCalledExactlyOnceWith(incomingJson);
    expect(stores.restore).not.toHaveBeenCalled();
  });

  it("observes wrong-password rejection, clears the password and never reads or replaces current records", async () => {
    render(<WorkspaceBackup />); await unlock("wrong synthetic password");
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to unlock this backup");
    expect(screen.getByLabelText("Password for this backup")).toHaveValue("");
    expect(stores.preview).not.toHaveBeenCalled(); expect(stores.restore).not.toHaveBeenCalled(); expect(downloads).toEqual([]);
  });

  it("requires a protected exact-snapshot safety copy and confirmation before returning the opaque preview to storage", async () => {
    render(<WorkspaceBackup />); await restorePreview();
    expect(screen.getByRole("button", { name: "Replace saved workspace" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: REPLACE_ACK })).toBeDisabled();
    await safetyCopy();
    expect(await encryption.decryptWorkspaceBackup(await blobText(downloads[0]), PASSWORD)).toBe(currentJson);
    expect(stores.capture).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Replace saved workspace" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: REPLACE_ACK }));
    fireEvent.click(screen.getByRole("button", { name: "Replace saved workspace" }));
    await screen.findByRole("button", { name: "Reload TaxSorted" });
    expect(stores.restore).toHaveBeenCalledExactlyOnceWith(incomingJson, preview);
    expect(stores.restore.mock.calls[0][1]).toBe(preview);
    expect(screen.getByText(/Reload other open TaxSorted tabs too/)).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Backup password", { exact: true })).not.toBeInTheDocument();
  });

  it("invalidates preview and safety-copy confirmation when the store rejects changes since preview", async () => {
    stores.restore.mockRejectedValueOnce(new Error("Your saved workspace changed after the preview. Choose the backup again."));
    render(<WorkspaceBackup />); await restorePreview(); await safetyCopy();
    fireEvent.click(screen.getByRole("checkbox", { name: REPLACE_ACK }));
    fireEvent.click(screen.getByRole("button", { name: "Replace saved workspace" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("changed after the preview");
    expect(screen.queryByRole("button", { name: "Replace saved workspace" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: REPLACE_ACK })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Choose a workspace backup to restore")).toHaveValue("");
  });

  it("refuses mismatched passwords without creating a download and clears both fields", async () => {
    render(<WorkspaceBackup />); await prepare(); setPassword(PASSWORD, "a different synthetic phrase");
    fireEvent.click(screen.getByRole("button", { name: "Download protected workspace backup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("passwords do not match");
    expect(downloads).toEqual([]); expect(screen.getByLabelText("Backup password", { exact: true })).toHaveValue("");
  });

  it("cancels a pending capture and ignores its late result after a fresh request", async () => {
    const late = deferred<Awaited<ReturnType<typeof stores.capture>>>();
    stores.capture.mockReturnValueOnce(late.promise);
    render(<WorkspaceBackup />);
    fireEvent.click(screen.getByRole("button", { name: "Prepare a workspace backup" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel backup operation" }));
    expect(screen.getByRole("button", { name: "Prepare a workspace backup" })).toHaveFocus();
    await prepare();
    await act(async () => { late.resolve({ json: incomingJson, summary: preview.incoming, exportedAt: NOW }); await late.promise; });
    expect(screen.getByText("1 employment entries")).toBeVisible(); expect(downloads).toEqual([]);
  });

  it("cancels a pending unlock without starting a late current-data read", async () => {
    const late = deferred<string>();
    vi.spyOn(encryption, "decryptWorkspaceBackup").mockReturnValueOnce(late.promise);
    render(<WorkspaceBackup />); await unlock();
    fireEvent.click(screen.getByRole("button", { name: "Cancel restore" }));
    await act(async () => { late.resolve(incomingJson); await late.promise; });
    expect(stores.preview).not.toHaveBeenCalled(); expect(screen.queryByLabelText("Password for this backup")).not.toBeInTheDocument();
  });

  it("cancels a pending safety-copy encryption without a download or retained preview", async () => {
    render(<WorkspaceBackup />); await restorePreview();
    const late = deferred<string>(); vi.spyOn(encryption, "encryptWorkspaceBackup").mockReturnValueOnce(late.promise);
    setPassword(); fireEvent.click(screen.getByRole("button", { name: "Download protected safety copy" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel restore" }));
    await act(async () => { late.resolve(encryptedFile); await late.promise; });
    expect(downloads).toEqual([]); expect(screen.queryByRole("table")).not.toBeInTheDocument(); expect(screen.queryByLabelText("Backup password", { exact: true })).not.toBeInTheDocument();
  });

  it("ignores encryption completion after navigation unmounts the page", async () => {
    const view = render(<WorkspaceBackup />); await prepare();
    const late = deferred<string>(); vi.spyOn(encryption, "encryptWorkspaceBackup").mockReturnValueOnce(late.promise);
    setPassword(); fireEvent.click(screen.getByRole("button", { name: "Download protected workspace backup" }));
    view.unmount();
    await act(async () => { late.resolve(encryptedFile); await late.promise; });
    expect(downloads).toEqual([]); expect(stores.restore).not.toHaveBeenCalled();
  });

  it("drops a late restore preview when another file is selected", async () => {
    const late = deferred<WorkspaceRestorePreview>(); stores.preview.mockReturnValueOnce(late.promise);
    render(<WorkspaceBackup />); await unlock();
    await waitFor(() => expect(stores.preview).toHaveBeenCalledOnce());
    choose(file(encryptedFile, "another-workspace.encrypted.json"));
    await screen.findByText(/Selected file: another-workspace/);
    await act(async () => { late.resolve(preview); await late.promise; });
    expect(screen.queryByRole("heading", { name: "Check before replacing saved work" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Password for this backup")).toHaveValue("");
    expect(stores.restore).not.toHaveBeenCalled();
  });

  it("does not start a second restore or allow cancellation once replacement has begun", async () => {
    const late = deferred<void>(); stores.restore.mockReturnValueOnce(late.promise);
    render(<WorkspaceBackup />); await restorePreview(); await safetyCopy();
    fireEvent.click(screen.getByRole("checkbox", { name: REPLACE_ACK }));
    const replace = screen.getByRole("button", { name: "Replace saved workspace" });
    fireEvent.click(replace); fireEvent.click(replace);
    expect(stores.restore).toHaveBeenCalledOnce(); expect(screen.getByRole("button", { name: "Cancel restore" })).toBeDisabled();
    expect(screen.getByLabelText("Choose a workspace backup to restore")).toBeDisabled();
    await act(async () => { late.resolve(); await late.promise; });
    await screen.findByRole("button", { name: "Reload TaxSorted" });
  });
});
