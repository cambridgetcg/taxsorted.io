// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BooksBackup } from "../books-backup";
import { createRecordsStore } from "@/lib/records";
import { BOOKS_BACKUP_MAX_BYTES, parseBooksBackup } from "@/lib/books-backup";
import { BOOKS_BACKUP_FILE_MAX_BYTES, decryptBooksBackup, encryptBooksBackup, inspectBooksBackupFile } from "@/lib/books-backup-encryption";
import * as backupEncryption from "@/lib/books-backup-encryption";

const INCOME = { date: "2026-05-01", amount: 12345, kind: "income" as const, category: "turnover", source: "self-employment" as const };
const downloads: Blob[] = [];
const PASSWORD = "synthetic backup phrase only";
const REPLACE_ACK = "I have saved the current Books and understand that restoring will replace them with this backup.";
const PASSWORD_ACK = "I understand that TaxSorted cannot reset this password or recover the backup without it.";
const originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");

beforeEach(() => {
  downloads.length = 0;
  window.history.replaceState({}, "", "/");
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { value: vi.fn(), configurable: true });
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL(blob: Blob) { downloads.push(blob); return "blob:books-backup-test"; }
    static revokeObjectURL = vi.fn();
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
  if (originalScrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

function file(json: string, name = "books-backup.json") {
  const selected = new File([json], name, { type: "application/json" });
  Object.defineProperty(selected, "text", { value: async () => json, configurable: true });
  return selected;
}

function choose(selected: File) {
  fireEvent.change(screen.getByLabelText("Choose a Books backup to restore"), { target: { files: [selected] } });
}

function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

async function setup({ expanded = false } = {}) {
  const backend = new Map();
  const store = createRecordsStore(backend);
  const current = await store.add(INCOME);
  const source = createRecordsStore(new Map());
  const incoming = await source.add({ ...INCOME, amount: 9900 });
  await source.review(incoming.id, { expectedRevision: 1, reviewState: "ready" });
  await source.confirmLedger(incoming.ledgerId);
  const json = await source.exportBackup();
  const refreshed = vi.fn(async () => undefined);
  const view = render(<BooksBackup store={store} onRestored={refreshed} expanded={expanded} />);
  if (!expanded) fireEvent.click(screen.getByText("Back up or restore your Books"));
  return { backend, store, current, incoming, json, refreshed, ...view };
}

function setExportPassword(password = PASSWORD, repeated = password) {
  fireEvent.change(screen.getByLabelText("Backup password", { exact: true }), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Repeat backup password"), { target: { value: repeated } });
  fireEvent.click(screen.getByRole("checkbox", { name: PASSWORD_ACK }));
}

async function saveAndConfirm() {
  setExportPassword();
  fireEvent.click(screen.getByRole("button", { name: "Download the Books currently here" }));
  await waitFor(() => expect(screen.getByRole("checkbox", { name: REPLACE_ACK })).toBeEnabled());
  fireEvent.click(screen.getByRole("checkbox", { name: REPLACE_ACK }));
}

function delayNextBackupOperation(operation: "encryptBooksBackup" | "decryptBooksBackup") {
  let release!: () => void;
  let begun!: () => void;
  let finished!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { begun = resolve; });
  const completed = new Promise<void>(resolve => { finished = resolve; });
  const run = backupEncryption[operation];
  vi.spyOn(backupEncryption, operation).mockImplementationOnce(async (...args) => {
    begun();
    await gate;
    // Keep the full production crypto cost. Completion includes authentication
    // and payload validation, so negative assertions cannot outrun the crypto.
    try { return await run(...args); } finally { finished(); }
  });
  return { release, started, completed };
}

describe("Books backup and restore controls", () => {
  it("shows separate save and restore sections immediately in the dedicated view", async () => {
    await setup({ expanded: true });
    expect(screen.getByRole("heading", { name: "Save current Books" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Restore a backup" })).toBeVisible();
    expect(screen.getByLabelText("Choose a Books backup to restore")).toBeVisible();
    expect(screen.getByRole("link", { name: "Restore a backup" })).toHaveAttribute("href", "#restore-books-backup");
    expect(screen.getByRole("region", { name: "Books backup and restore controls" }).closest("details")).toBeNull();
  });

  it("focuses a directly requested restore section once after mounting without interrupting later typing", async () => {
    window.history.replaceState({}, "", "/books/workspace/backups#restore-books-backup");
    await setup({ expanded: true });
    const restore = screen.getByRole("region", { name: "Restore a backup" });
    await waitFor(() => expect(restore).toHaveFocus());
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: "start" });
    expect(vi.mocked(HTMLElement.prototype.scrollIntoView).mock.contexts[0]).toBe(restore);
    const password = screen.getByLabelText("Backup password", { exact: true });
    password.focus();
    fireEvent.change(password, { target: { value: "synthetic draft" } });
    expect(password).toHaveFocus();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledOnce();
  });

  it.each(["", "#unrelated"])("does not move focus for ordinary Backups navigation with fragment %s", async fragment => {
    window.history.replaceState({}, "", `/books/workspace/backups${fragment}`);
    const focused = document.createElement("button");
    document.body.appendChild(focused);
    focused.focus();
    try {
      await setup({ expanded: true });
      expect(focused).toHaveFocus();
      expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    } finally { focused.remove(); }
  });

  it("downloads only an encrypted backup by default and clears the transient password controls", async () => {
    const { current } = await setup();
    const downloadButton = screen.getByRole("button", { name: "Download a Books backup" });
    expect(downloadButton).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Password-protected file" })).toBeChecked();
    expect(screen.getByText(/does not encrypt the Books stored in this app/)).toBeInTheDocument();
    expect(screen.getByText(/does not include your Tax Passport, return-preparation drafts, checklist/)).toBeInTheDocument();
    setExportPassword();
    fireEvent.click(downloadButton);
    await screen.findByText(/Backup download started/);
    expect(downloads).toHaveLength(1);
    const saved = await blobText(downloads[0]);
    expect(inspectBooksBackupFile(saved)).toBe("encrypted");
    expect(saved).not.toContain(current.id);
    expect(saved).not.toContain('"books"');
    expect((await parseBooksBackup(await decryptBooksBackup(saved, PASSWORD))).books.events[0].id).toBe(current.id);
    expect(screen.getByLabelText("Backup password", { exact: true })).toHaveValue("");
    expect(screen.getByLabelText("Repeat backup password")).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: PASSWORD_ACK })).not.toBeChecked();
    expect(screen.queryByRole("checkbox", { name: REPLACE_ACK })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("status")).toHaveFocus());
  });

  it("previews, downloads the existing records and requires deliberate confirmation before replacement", async () => {
    const { store, current, incoming, json, refreshed } = await setup();
    choose(file(json));
    await screen.findByRole("heading", { name: "Check before replacing your Books" });
    expect(screen.getByText("Unencrypted backup.")).toBeInTheDocument();
    const preview = screen.getByRole("region", { name: "Check before replacing your Books" });
    const safetyCopy = within(preview).getByRole("group", { name: "Backup file protection" });
    const confirmation = within(preview).getByRole("checkbox", { name: REPLACE_ACK });
    expect(safetyCopy.compareDocumentPosition(confirmation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Save current Books" })).not.toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Current Books and selected backup" })).toHaveTextContent("Earlier record versions");
    expect(screen.getByText(/Every business needs confirmation again/)).toBeInTheDocument();
    const replace = screen.getByRole("button", { name: "Replace these Books with the backup" });
    expect(replace).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: REPLACE_ACK })).toBeDisabled();
    expect((await store.state()).events[0].id).toBe(current.id);
    await saveAndConfirm();
    expect((await parseBooksBackup(await decryptBooksBackup(await blobText(downloads[0]), PASSWORD))).books.events[0].id).toBe(current.id);
    fireEvent.click(replace);
    await screen.findByText(/Your Books were replaced/);
    expect((await store.state()).events[0]).toMatchObject({ id: incoming.id, cash: { amount: 9900 }, reviewState: "ready" });
    expect(await store.list()).toEqual([]);
    expect(refreshed).toHaveBeenCalledOnce();
    expect(screen.queryByRole("checkbox", { name: REPLACE_ACK })).not.toBeInTheDocument();
  });

  it("does not replace records changed after the safety copy and requires a new preview", async () => {
    const { store, json } = await setup();
    choose(file(json));
    await screen.findByRole("checkbox", { name: REPLACE_ACK });
    await saveAndConfirm();
    const newer = await store.add({ ...INCOME, amount: 700 });
    fireEvent.click(screen.getByRole("button", { name: "Replace these Books with the backup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("changed after the preview");
    expect((await store.state()).events.some(event => event.id === newer.id)).toBe(true);
    expect(screen.queryByRole("checkbox", { name: REPLACE_ACK })).not.toBeInTheDocument();
  });

  it("rejects malformed files and checks file size before reading any contents", async () => {
    const { backend } = await setup();
    const before = structuredClone([...backend]);
    choose(file("not json"));
    expect(await screen.findByRole("alert")).toHaveTextContent("not valid JSON");
    const huge = file("unused");
    const read = vi.fn(async () => "unused");
    Object.defineProperty(huge, "text", { value: read });
    Object.defineProperty(huge, "size", { value: BOOKS_BACKUP_FILE_MAX_BYTES + 1 });
    choose(huge);
    expect(await screen.findByRole("alert")).toHaveTextContent("no larger than 14 MB");
    expect(read).not.toHaveBeenCalled();
    const oversizedPlain = file(await createRecordsStore(new Map()).exportBackup());
    Object.defineProperty(oversizedPlain, "size", { value: BOOKS_BACKUP_MAX_BYTES + 1 });
    choose(oversizedPlain);
    expect(await screen.findByRole("alert")).toHaveTextContent("no larger than 10 MB");
    choose(file(JSON.stringify({ schema: "unknown/1" })));
    expect(await screen.findByRole("alert")).toHaveTextContent("not a supported TaxSorted Books backup");
    expect([...backend]).toEqual(before);
    expect(screen.queryByRole("checkbox", { name: REPLACE_ACK })).not.toBeInTheDocument();
  });

  it("keeps confirmation disabled when the current-backup download fails", async () => {
    const { json, backend } = await setup();
    const before = structuredClone([...backend]);
    choose(file(json));
    await screen.findByRole("checkbox", { name: REPLACE_ACK });
    vi.mocked(HTMLAnchorElement.prototype.click).mockImplementation(() => { throw new Error("Download blocked"); });
    setExportPassword();
    fireEvent.click(screen.getByRole("button", { name: "Download the Books currently here" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Download blocked");
    expect(screen.getByRole("checkbox", { name: REPLACE_ACK })).toBeDisabled();
    expect([...backend]).toEqual(before);
  });

  it("clears confirmation when another file is selected or restore is cancelled", async () => {
    const { json, backend } = await setup();
    const before = structuredClone([...backend]);
    choose(file(json));
    await screen.findByRole("checkbox", { name: REPLACE_ACK });
    await saveAndConfirm();
    choose(file(json, "another-file.json"));
    await screen.findByRole("checkbox", { name: REPLACE_ACK });
    expect(screen.getByRole("checkbox", { name: REPLACE_ACK })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: REPLACE_ACK })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel restore" }));
    expect(screen.queryByRole("checkbox", { name: REPLACE_ACK })).not.toBeInTheDocument();
    expect([...backend]).toEqual(before);
  });

  it("distinguishes a completed restore from a failed view refresh", async () => {
    const { store, incoming, json, refreshed } = await setup();
    refreshed.mockRejectedValueOnce(new Error("View failed"));
    choose(file(json));
    await screen.findByRole("checkbox", { name: REPLACE_ACK });
    await saveAndConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Replace these Books with the backup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("backup was restored");
    expect((await store.state()).events[0].id).toBe(incoming.id);
  });

  it("requires an explicit unencrypted choice and acknowledgement, then protects a legacy restore safety copy by default", async () => {
    const { json, current } = await setup();
    fireEvent.click(screen.getByRole("radio", { name: "Unencrypted file" }));
    const downloadButton = screen.getByRole("button", { name: "Download a Books backup" });
    expect(downloadButton).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I understand this file is unencrypted/ }));
    fireEvent.click(downloadButton);
    await screen.findByText(/Backup download started. This file is unencrypted/);
    expect((await parseBooksBackup(await blobText(downloads[0]))).books.events[0].id).toBe(current.id);
    choose(file(json));
    await screen.findByRole("heading", { name: "Check before replacing your Books" });
    expect(screen.getByRole("radio", { name: "Password-protected file" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Unencrypted file" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download the Books currently here" })).toBeDisabled();
    await saveAndConfirm();
    expect(inspectBooksBackupFile(await blobText(downloads[1]))).toBe("encrypted");
  });

  it("validates new passwords and never falls back to plaintext when encryption fails", async () => {
    const { backend } = await setup();
    const before = structuredClone([...backend]);
    setExportPassword("short");
    fireEvent.click(screen.getByRole("button", { name: "Download a Books backup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least 12 characters");
    fireEvent.change(screen.getByLabelText("Backup password", { exact: true }), { target: { value: PASSWORD } });
    fireEvent.click(screen.getByRole("button", { name: "Download a Books backup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("passwords do not match");
    fireEvent.change(screen.getByLabelText("Repeat backup password"), { target: { value: PASSWORD } });
    vi.spyOn(crypto.subtle, "encrypt").mockRejectedValueOnce(new Error("Synthetic crypto failure"));
    fireEvent.click(screen.getByRole("button", { name: "Download a Books backup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to password-protect");
    expect(downloads).toEqual([]);
    expect(screen.getByRole("radio", { name: "Password-protected file" })).toBeChecked();
    expect([...backend]).toEqual(before);
  });

  it("unlocks a real encrypted backup on device, rejects a wrong password and still requires the protected safety copy", async () => {
    const { backend, store, incoming, json } = await setup();
    const before = structuredClone([...backend]);
    choose(file(await encryptBooksBackup(json, PASSWORD), "protected.json"));
    const password = await screen.findByLabelText("Password for this backup");
    expect(screen.queryByLabelText("Backup password", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Repeat backup password")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Check before replacing your Books" })).not.toBeInTheDocument();
    fireEvent.change(password, { target: { value: "wrong synthetic password" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock preview" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to unlock this backup");
    expect(password).toHaveValue("");
    expect([...backend]).toEqual(before);
    expect(downloads).toEqual([]);
    fireEvent.change(password, { target: { value: PASSWORD } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock preview" }));
    await screen.findByRole("heading", { name: "Check before replacing your Books" });
    expect(screen.getByText("Password-protected backup unlocked on this device.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Password for this backup")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace these Books with the backup" })).toBeDisabled();
    expect([...backend]).toEqual(before);
    await saveAndConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Replace these Books with the backup" }));
    await screen.findByText(/Your Books were replaced/);
    expect((await store.state()).events[0].id).toBe(incoming.id);
  });

  it("rejects a tampered encrypted file without altering current Books or downloading anything", async () => {
    const { backend, json } = await setup();
    const before = structuredClone([...backend]);
    const tampered = JSON.parse(await encryptBooksBackup(json, PASSWORD));
    tampered.ciphertext = (tampered.ciphertext[0] === "A" ? "B" : "A") + tampered.ciphertext.slice(1);
    choose(file(JSON.stringify(tampered)));
    fireEvent.change(await screen.findByLabelText("Password for this backup"), { target: { value: PASSWORD } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock preview" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to unlock this backup");
    expect(screen.queryByRole("checkbox", { name: REPLACE_ACK })).not.toBeInTheDocument();
    expect([...backend]).toEqual(before);
    expect(downloads).toEqual([]);
  });

  it("encrypts the exact preview snapshot even when Books change during backup preparation", async () => {
    const { store, current, json } = await setup();
    choose(file(json));
    await screen.findByRole("checkbox", { name: REPLACE_ACK });
    const pause = delayNextBackupOperation("encryptBooksBackup");
    setExportPassword();
    fireEvent.click(screen.getByRole("button", { name: "Download the Books currently here" }));
    await pause.started;
    const newer = await store.add({ ...INCOME, amount: 321 });
    await act(async () => { pause.release(); await pause.completed; });
    await waitFor(() => expect(screen.getByRole("checkbox", { name: REPLACE_ACK })).toBeEnabled());
    const snapshot = await parseBooksBackup(await decryptBooksBackup(await blobText(downloads[0]), PASSWORD));
    expect(snapshot.books.events.map(event => event.id)).toEqual([current.id]);
    fireEvent.click(screen.getByRole("checkbox", { name: REPLACE_ACK }));
    fireEvent.click(screen.getByRole("button", { name: "Replace these Books with the backup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("changed after the preview");
    expect((await store.state()).events.some(event => event.id === newer.id)).toBe(true);
  });

  it("ignores an unlock that finishes after a different file is chosen", async () => {
    const { backend, store, json } = await setup();
    const before = structuredClone([...backend]);
    choose(file(await encryptBooksBackup(json, PASSWORD), "old-encrypted.json"));
    fireEvent.change(await screen.findByLabelText("Password for this backup"), { target: { value: PASSWORD } });
    const preview = vi.spyOn(store, "previewRestore");
    const pause = delayNextBackupOperation("decryptBooksBackup");
    fireEvent.click(screen.getByRole("button", { name: "Unlock preview" }));
    await pause.started;
    choose(file(json, "new-plain.json"));
    await screen.findByRole("heading", { name: "Check before replacing your Books" });
    await act(async () => { pause.release(); await pause.completed; });
    expect(screen.getByText(/Backup: new-plain.json/)).toBeInTheDocument();
    expect(screen.queryByText(/old-encrypted.json/)).not.toBeInTheDocument();
    expect(preview).toHaveBeenCalledExactlyOnceWith(json);
    expect(screen.getByRole("checkbox", { name: REPLACE_ACK })).toBeDisabled();
    expect([...backend]).toEqual(before);
  });

  it("cancels an in-flight encrypted safety copy without downloading or retaining the password", async () => {
    const { json, backend } = await setup();
    const before = structuredClone([...backend]);
    choose(file(json));
    await screen.findByRole("checkbox", { name: REPLACE_ACK });
    const pause = delayNextBackupOperation("encryptBooksBackup");
    setExportPassword();
    fireEvent.click(screen.getByRole("button", { name: "Download the Books currently here" }));
    await pause.started;
    fireEvent.click(screen.getByRole("button", { name: "Cancel restore" }));
    await act(async () => { pause.release(); await pause.completed; });
    expect(downloads).toEqual([]);
    expect(screen.getByLabelText("Backup password", { exact: true })).toHaveValue("");
    expect(screen.getByLabelText("Repeat backup password")).toHaveValue("");
    expect(screen.queryByRole("checkbox", { name: REPLACE_ACK })).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect([...backend]).toEqual(before);
  });

  it("does not download when encryption finishes after the controls unmount", async () => {
    const { unmount } = await setup();
    const pause = delayNextBackupOperation("encryptBooksBackup");
    setExportPassword();
    fireEvent.click(screen.getByRole("button", { name: "Download a Books backup" }));
    await pause.started;
    unmount();
    await act(async () => { pause.release(); await pause.completed; });
    expect(downloads).toEqual([]);
  });

  it("resets passwords and previews when the store changes and ignores the earlier store's export", async () => {
    const { rerender, refreshed, json } = await setup();
    choose(file(json));
    await screen.findByRole("checkbox", { name: REPLACE_ACK });
    const pause = delayNextBackupOperation("encryptBooksBackup");
    setExportPassword();
    fireEvent.click(screen.getByRole("button", { name: "Download the Books currently here" }));
    await pause.started;
    const other = createRecordsStore(new Map());
    rerender(<BooksBackup store={other} onRestored={refreshed} />);
    fireEvent.click(screen.getByText("Back up or restore your Books"));
    await act(async () => { pause.release(); await pause.completed; });
    expect(downloads).toEqual([]);
    expect(screen.queryByRole("checkbox", { name: REPLACE_ACK })).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Backup password", { exact: true })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Download a Books backup" })).toBeDisabled();
    expect((await other.state()).events).toEqual([]);
  });
});
