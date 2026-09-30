"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { WorkspaceBackupSummary } from "@/lib/workspace-backup";
import { WORKSPACE_BACKUP_FILE_MAX_BYTES, WORKSPACE_BACKUP_PASSWORD_MIN_LENGTH, decryptWorkspaceBackup, encryptWorkspaceBackup, inspectWorkspaceBackupFile, validateWorkspaceBackupPassword } from "@/lib/workspace-backup-encryption";
import { captureWorkspaceBackup, previewWorkspaceRestore, restoreWorkspaceBackup, type WorkspaceRestorePreview } from "@/lib/workspace-backup-store";

type Capture = Awaited<ReturnType<typeof captureWorkspaceBackup>>;
type Selection = { json: string; name: string; preview: WorkspaceRestorePreview };
type Busy = "reading" | "checking" | "unlocking" | "saving" | "restoring" | null;

const PASSWORD_ACK = "I understand that TaxSorted cannot reset this password or recover the backup without it.";
const REPLACE_ACK = "I have checked that the safety copy was saved, and I understand that restoring replaces all saved work listed above, including areas marked Not saved in the backup.";

function download(json: string, name: string) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const anchor = document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}

function facts(summary: WorkspaceBackupSummary): [string, string][] {
  return [
    ["Books", summary.books ? `${summary.books.records} money records · ${summary.books.businesses} businesses` : "Not saved"],
    ["Tax Passport", summary.passport ? `${summary.passport.answeredSources} of ${summary.passport.totalSources} income-source questions answered${summary.passport.hasMtdCheck ? " · saved MTD check" : ""}` : "Not saved"],
    ...Object.entries(summary.preparations).map(([year, draft]): [string, string] => [`${year} preparation`, draft ? `${draft.employmentSources} employment entries` : "Not saved"]),
    ["Personal checklists", summary.checklist ? `${summary.checklist.checked} checkmarks across all audiences` : "Not saved"],
  ];
}

function Summary({ current, incoming }: { current: WorkspaceBackupSummary; incoming?: WorkspaceBackupSummary }) {
  const rows = facts(current);
  const other = incoming ? new Map(facts(incoming)) : null;
  return <div className="overflow-x-auto rounded-xl border border-line">
    <table className="w-full text-left text-sm">
      <caption className="sr-only">{incoming ? "Current saved workspace and selected backup" : "Saved work included in this workspace backup"}</caption>
      <thead className="bg-paper"><tr><th scope="col" className="p-3">Saved work</th><th scope="col" className="p-3">Currently here</th>{other ? <th scope="col" className="p-3">In the backup</th> : null}</tr></thead>
      <tbody>{rows.map(([label, value]) => <tr key={label} className="border-t border-line"><th scope="row" className="p-3 font-medium text-ink">{label}</th><td className="p-3">{value}</td>{other ? <td className="p-3">{other.get(label)}</td> : null}</tr>)}</tbody>
    </table>
  </div>;
}

export function WorkspaceBackup() {
  const [capture, setCapture] = useState<Capture | null>(null);
  const [locked, setLocked] = useState<{ json: string; name: string } | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const operation = useRef<Busy>(null);
  const generation = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const unlockInput = useRef<HTMLInputElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const returnToStart = useRef(false);

  useEffect(() => () => { generation.current += 1; }, []);
  useEffect(() => {
    if (error) alert.current?.focus();
    else if (message) status.current?.focus();
    else if (selected || capture) previewHeading.current?.focus();
    else if (locked) unlockInput.current?.focus();
    else if (returnToStart.current && !busy) {
      returnToStart.current = false;
      startButton.current?.focus();
    }
  }, [error, message, selected, capture, locked, busy]);

  function clearPasswords() {
    setPassword(""); setRepeatPassword(""); setUnlockPassword(""); setAcknowledged(false);
  }

  function reset() {
    generation.current += 1;
    operation.current = null;
    setBusy(null); setCapture(null); setLocked(null); setSelected(null);
    setDownloaded(false); setConfirmed(false); setError(null); setMessage(null); setRestored(false);
    clearPasswords();
    if (fileInput.current) fileInput.current.value = "";
  }

  function begin(next: Exclude<Busy, null>) {
    operation.current = next;
    setBusy(next); setError(null); setMessage(null);
    return generation.current;
  }

  function finish(request: number) {
    if (generation.current === request) { operation.current = null; setBusy(null); }
  }

  function cancel() {
    if (operation.current === "restoring") return;
    reset();
    returnToStart.current = true;
  }

  async function prepare() {
    if (operation.current) return;
    reset();
    const request = begin("reading");
    try {
      const value = await captureWorkspaceBackup();
      if (generation.current === request) setCapture(value);
    } catch (caught) {
      if (generation.current === request) setError(caught instanceof Error ? caught.message : "Your saved workspace could not be read. No backup was made.");
    } finally { finish(request); }
  }

  async function choose(file?: File) {
    if (operation.current === "restoring") return;
    // Choosing another file also cancels any older read or encryption operation.
    reset();
    if (!file) return;
    const request = begin("checking");
    try {
      if (file.size > WORKSPACE_BACKUP_FILE_MAX_BYTES) throw new Error("Choose a workspace backup no larger than 17 MiB.");
      const json = await file.text();
      if (generation.current !== request) return;
      inspectWorkspaceBackupFile(json);
      setLocked({ json, name: file.name });
    } catch (caught) {
      if (generation.current === request) setError(caught instanceof Error ? caught.message : "This file could not be read as a protected workspace backup.");
    } finally { finish(request); }
  }

  async function unlock() {
    if (!locked || operation.current) return;
    const request = begin("unlocking");
    try {
      const json = await decryptWorkspaceBackup(locked.json, unlockPassword);
      if (generation.current !== request) return;
      const preview = await previewWorkspaceRestore(json);
      if (generation.current !== request) return;
      setSelected({ json, name: locked.name, preview }); setLocked(null);
    } catch (caught) {
      if (generation.current === request) setError(caught instanceof Error ? caught.message : "This backup could not be unlocked or compared. Your saved work has not been replaced.");
    } finally {
      if (generation.current === request) setUnlockPassword("");
      finish(request);
    }
  }

  async function save() {
    if (operation.current || (!capture && !selected)) return;
    const request = begin("saving");
    setDownloaded(false); setConfirmed(false);
    try {
      validateWorkspaceBackupPassword(password);
      if (password !== repeatPassword) throw new Error("The backup passwords do not match. Enter the same password twice.");
      if (!acknowledged) throw new Error("Confirm that you understand the password cannot be reset before downloading.");
      // Never recapture here: a safety copy must match the exact restore preview.
      const json = selected ? selected.preview.existingBackup : capture!.json;
      const encrypted = await encryptWorkspaceBackup(json, password);
      if (generation.current !== request) return;
      download(encrypted, selected ? "taxsorted-workspace-safety-copy.encrypted.json" : "taxsorted-workspace-backup.encrypted.json");
      if (selected) setDownloaded(true);
      setMessage("Protected download started. Check that the file was saved somewhere you can find again, and keep its password safe separately.");
    } catch (caught) {
      if (generation.current === request) setError(caught instanceof Error ? caught.message : "The protected backup could not be downloaded. No saved work was replaced.");
    } finally {
      if (generation.current === request) clearPasswords();
      finish(request);
    }
  }

  async function replace() {
    if (operation.current || !selected || !downloaded || !confirmed) return;
    const request = begin("restoring");
    try {
      await restoreWorkspaceBackup(selected.json, selected.preview);
      if (generation.current !== request) return;
      reset(); setRestored(true);
      setMessage("Your saved workspace was replaced. Reload TaxSorted before opening your restored work. Reload other open TaxSorted tabs too; earlier editors may still show old or unsaved work.");
    } catch (caught) {
      if (generation.current !== request) return;
      // Any failed or stale replacement requires a new preview and safety copy.
      reset();
      setError(caught instanceof Error ? caught.message : "The workspace could not be restored. Choose the backup again to review the current saved work before retrying.");
    } finally { finish(request); }
  }

  const exportControls = <fieldset disabled={!!busy} className="space-y-4 rounded-xl border border-line bg-white p-4 sm:p-5">
    <legend className="px-1 font-semibold text-ink">{selected ? "Protect the safety copy" : "Protect your workspace backup"}</legend>
    <p id="workspace-password-help">Choose a long, unique phrase of at least {WORKSPACE_BACKUP_PASSWORD_MIN_LENGTH} characters. Keep it separately from the file. TaxSorted cannot reset it.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block font-semibold text-ink">Backup password<input type="password" value={password} autoComplete="off" spellCheck={false} aria-describedby="workspace-password-help" onChange={event => setPassword(event.currentTarget.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-line p-2 font-normal" /></label>
      <label className="block font-semibold text-ink">Repeat backup password<input type="password" value={repeatPassword} autoComplete="off" spellCheck={false} onChange={event => setRepeatPassword(event.currentTarget.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-line p-2 font-normal" /></label>
    </div>
    <label className="flex items-start gap-3"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.currentTarget.checked)} className="mt-1 size-5 shrink-0" /><span>{PASSWORD_ACK}</span></label>
    <Button type="button" disabled={!!busy || !password || !repeatPassword || !acknowledged} onClick={() => void save()} className="whitespace-normal">{selected ? "Download protected safety copy" : "Download protected workspace backup"}</Button>
  </fieldset>;

  return <section aria-label="Workspace backup and restore controls" className="mt-9 space-y-7 text-sm leading-6 text-ink-soft">
    <div className="rounded-2xl border border-accent/25 bg-accent-soft p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">What this copy includes</h2>
      <p className="mt-2">Saved Books and their history, your saved Tax Passport, preparation drafts for 2025–26 and 2026–27, and saved personal checklists for every audience.</p>
      <p className="mt-2">Save your work in each tool first. Unsaved forms, original documents and receipt attachments, account sign-in details, provider permissions and app preferences are not included. Nothing is uploaded or filed.</p>
      <p className="mt-2">Opening this page reads no saved tax data. Preparing a backup or unlocking a restore preview reads the saved work on this device. Password protection encrypts the downloaded file; it does not encrypt the live app or browser profile.</p>
      <Link href="/books/workspace/backups" className="mt-2 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4">Only need Books, or have an older Books backup? →</Link>
    </div>

    {!locked && !selected && !capture && !restored ? <section aria-labelledby="workspace-save-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 id="workspace-save-title" className="text-xl font-semibold text-ink">Back up saved work</h2>
      <p className="mt-2 mb-4">Read one snapshot of this workspace, check what is included, then choose a password and download it.</p>
      <Button ref={startButton} type="button" disabled={!!busy} onClick={() => void prepare()} className="whitespace-normal">Prepare a workspace backup</Button>
    </section> : null}

    {capture ? <section className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="workspace-save-preview">
      <h2 id="workspace-save-preview" ref={previewHeading} tabIndex={-1} className="text-xl font-semibold text-ink">Check your saved workspace</h2>
      <p>Snapshot read {new Date(capture.exportedAt).toLocaleString("en-GB")}. Later changes are not included in this copy. Cancel and prepare again for a newer snapshot.</p>
      <Summary current={capture.summary} />
      {exportControls}
      <Button variant="outline" type="button" onClick={cancel}>Cancel backup</Button>
    </section> : null}

    {!restored ? <section aria-labelledby="workspace-restore-title" className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 id="workspace-restore-title" className="text-xl font-semibold text-ink">Restore saved work</h2>
      <p>Restoring replaces all four areas together. It does not merge work. Areas marked “Not saved” in the backup replace any saved work in those areas with an empty starting point.</p>
      <p>Save or finish work in other open TaxSorted tabs first. You will need to reload those tabs after restoring.</p>
      <div>
        <label htmlFor="workspace-backup-file" className="block font-semibold text-ink">Choose a workspace backup to restore</label>
        <p id="workspace-file-help" className="mt-1">Choose a password-protected TaxSorted workspace file (.json), up to 17 MiB. Books-only backups and ordinary Passport or preparation exports use different formats.</p>
        <input ref={fileInput} id="workspace-backup-file" type="file" accept=".json,application/json" aria-describedby="workspace-file-help" disabled={busy === "restoring"} onChange={event => void choose(event.currentTarget.files?.[0])} className="mt-2 block w-full min-w-0 rounded-lg border border-line bg-white p-3 text-ink" />
      </div>
      {locked ? <div className="space-y-4 rounded-xl border border-line bg-white p-4">
        <h3 className="text-lg font-semibold text-ink">Unlock and compare</h3>
        <p className="break-words">Selected file: {locked.name}. Unlocking checks the backup and reads your currently saved workspace for comparison. Nothing is replaced yet.</p>
        <label className="block font-semibold text-ink">Password for this backup<input ref={unlockInput} type="password" value={unlockPassword} disabled={!!busy} autoComplete="off" spellCheck={false} onChange={event => setUnlockPassword(event.currentTarget.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-line p-2 font-normal" /></label>
        <div className="flex flex-wrap gap-3"><Button type="button" disabled={!!busy || !unlockPassword} onClick={() => void unlock()}>Unlock workspace preview</Button><Button type="button" variant="outline" onClick={cancel}>Cancel restore</Button></div>
      </div> : null}
      {selected ? <div className="space-y-4 border-t border-line pt-5">
        <h3 ref={previewHeading} id="workspace-restore-preview" tabIndex={-1} className="text-xl font-semibold text-ink">Check before replacing saved work</h3>
        <p className="break-words">Backup: {selected.name}. Saved {new Date(selected.preview.exportedAt).toLocaleString("en-GB")}.</p>
        <Summary current={selected.preview.existing} incoming={selected.preview.incoming} />
        <p>Books retain their record decisions and evidence history. Confirm each business again and reconnect providers before preparing figures to file. Restoring does not make tax information complete or ready to file.</p>
        <h4 className="text-lg font-semibold text-ink">Keep a safety copy of the work currently here</h4>
        <p>This protected copy uses the exact current snapshot shown above. Choose its password separately from the backup you are restoring. If saved work changes after this preview, replacement will stop and you will need to start again.</p>
        {exportControls}
        <label className="flex items-start gap-3"><input type="checkbox" checked={confirmed} disabled={!downloaded || !!busy} onChange={event => setConfirmed(event.currentTarget.checked)} className="mt-1 size-5 shrink-0" /><span>{REPLACE_ACK}</span></label>
        <div className="flex flex-wrap gap-3"><Button type="button" disabled={!downloaded || !confirmed || !!busy} onClick={() => void replace()} className="whitespace-normal">Replace saved workspace</Button><Button type="button" variant="outline" disabled={busy === "restoring"} onClick={cancel}>Cancel restore</Button></div>
      </div> : null}
    </section> : null}

    {busy ? <p role="status">{busy === "reading" ? "Reading saved work on this device…" : busy === "checking" ? "Checking the selected file…" : busy === "unlocking" ? "Unlocking and comparing saved work…" : busy === "saving" ? "Encrypting your backup on this device…" : "Replacing the saved workspace…"}</p> : null}
    {(busy === "reading" || busy === "checking") ? <Button type="button" variant="outline" onClick={cancel}>Cancel backup operation</Button> : null}
    {error ? <p ref={alert} role="alert" tabIndex={-1} className="rounded-xl border border-line bg-paper p-4 text-ink">{error}</p> : null}
    {message ? <p ref={status} role="status" tabIndex={-1} className="rounded-xl border border-line bg-paper p-4 text-ink">{message}</p> : null}
    {restored ? <div className="space-y-3"><p>Reloading clears unsaved work still held in this tab’s memory. Saved restored work stays on this device.</p><Button type="button" onClick={() => window.location.reload()}>Reload TaxSorted</Button></div> : null}
  </section>;
}
