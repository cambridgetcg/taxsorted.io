"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BOOKS_BACKUP_MAX_BYTES, type BooksBackupSummary, type BooksRestorePreflight } from "@/lib/books-backup";
import { BOOKS_BACKUP_FILE_MAX_BYTES, BOOKS_BACKUP_PASSWORD_MIN_LENGTH, decryptBooksBackup, encryptBooksBackup, inspectBooksBackupFile, validateBackupPassword } from "@/lib/books-backup-encryption";
import type { RecordsStore } from "@/lib/records";

function download(json: string, name: string): void {
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

const summaryRows: [string, keyof BooksBackupSummary][] = [
  ["Businesses", "businesses"], ["Money records", "records"], ["Checked records", "checked"],
  ["Records to check", "toCheck"], ["Excluded records", "excluded"], ["Earlier record versions", "revisions"],
  ["Imports", "imports"], ["Original source versions", "sourceVersions"], ["Source conflicts", "conflicts"],
  ["Provider connections", "connections"], ["Provider update runs", "syncRuns"],
  ["Saved provider progress", "checkpoints"], ["Linked businesses", "linkedBusinesses"],
];

type BooksBackupProps = { store: RecordsStore; onRestored: () => Promise<void>; expanded?: boolean };

export function BooksBackup(props: BooksBackupProps) {
  const [scope, setScope] = useState({ store: props.store, version: 0 });
  if (scope.store !== props.store) setScope({ store: props.store, version: scope.version + 1 });
  // A different store gets fresh controls; no password, preview or in-flight
  // operation from the previous store can carry across the change.
  return <BooksBackupControls key={scope.version} {...props} />;
}

function BooksBackupControls({ store, onRestored, expanded = false }: BooksBackupProps) {
  const [selected, setSelected] = useState<{ json: string; name: string; kind: "plain" | "encrypted"; preview: BooksRestorePreflight } | null>(null);
  const [locked, setLocked] = useState<{ json: string; name: string } | null>(null);
  const [protection, setProtection] = useState<"protected" | "plain">("protected");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [recoveryAcknowledged, setRecoveryAcknowledged] = useState(false);
  const [plainAcknowledged, setPlainAcknowledged] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<"checking" | "unlocking" | "saving" | "restoring" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selection = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const unlockInput = useRef<HTMLInputElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const restoreSection = useRef<HTMLElement>(null);
  const restoreFragmentHandled = useRef(false);

  // Invalidate work still running when the component leaves the page. Passwords
  // live only in this component and the active crypto operation, never storage.
  useEffect(() => () => { selection.current += 1; }, [store]);
  useEffect(() => {
    if (restoreFragmentHandled.current) return;
    restoreFragmentHandled.current = true;
    // This component mounts after Books are loaded, when the fragment target
    // exists. Check once so typing and ordinary navigation keep their focus.
    if (expanded && window.location.hash === "#restore-books-backup") {
      restoreSection.current?.focus({ preventScroll: true });
      restoreSection.current?.scrollIntoView({ block: "start" });
    }
  }, [expanded]);
  useEffect(() => {
    if (error) alert.current?.focus();
    else if (message) status.current?.focus();
    else if (selected) previewHeading.current?.focus();
    else if (locked) unlockInput.current?.focus();
  }, [error, message, selected, locked]);

  const clearPasswords = () => {
    setPassword("");
    setRepeatPassword("");
    setUnlockPassword("");
    setRecoveryAcknowledged(false);
    setPlainAcknowledged(false);
  };

  const clearPreview = () => {
    selection.current += 1;
    setSelected(null);
    setLocked(null);
    setDownloaded(false);
    setConfirmed(false);
    setProtection("protected");
    clearPasswords();
  };

  const cancel = () => {
    clearPreview();
    setBusy(null);
    setError(null);
    setMessage(null);
    if (input.current) { input.current.value = ""; input.current.focus(); }
  };

  async function choose(file?: File) {
    clearPreview();
    setError(null);
    setMessage(null);
    setBusy(null);
    if (!file) return;
    const request = selection.current;
    setBusy("checking");
    try {
      if (file.size > BOOKS_BACKUP_FILE_MAX_BYTES) throw new Error("Choose a Books backup no larger than 14 MB. Unencrypted backups have a 10 MB limit.");
      const json = await file.text();
      if (selection.current !== request) return;
      if (inspectBooksBackupFile(json) === "encrypted") {
        setLocked({ json, name: file.name });
        return;
      }
      if (file.size > BOOKS_BACKUP_MAX_BYTES) throw new Error("Choose an unencrypted Books backup no larger than 10 MB.");
      const preview = await store.previewRestore(json);
      if (selection.current === request) setSelected({ json, name: file.name, kind: "plain", preview });
    } catch (caught) {
      if (selection.current === request) setError(caught instanceof Error ? caught.message : "This backup could not be read.");
    } finally {
      if (selection.current === request) setBusy(null);
    }
  }

  async function unlock() {
    if (!locked || busy) return;
    const request = selection.current;
    setBusy("unlocking");
    setError(null);
    setMessage(null);
    try {
      const json = await decryptBooksBackup(locked.json, unlockPassword);
      if (selection.current !== request) return;
      const preview = await store.previewRestore(json);
      if (selection.current !== request) return;
      setSelected({ json, name: locked.name, kind: "encrypted", preview });
      setLocked(null);
    } catch (caught) {
      if (selection.current === request) setError(caught instanceof Error ? caught.message : "This backup could not be unlocked.");
    } finally {
      if (selection.current === request) { setUnlockPassword(""); setBusy(null); }
    }
  }

  async function saveCurrent() {
    if (busy) return;
    const request = selection.current;
    const preview = selected;
    setBusy("saving");
    setError(null);
    setMessage(null);
    setDownloaded(false);
    setConfirmed(false);
    try {
      if ((preview || locked) && protection !== "protected") throw new Error("The copy of your current Books must be password-protected before restoring a backup.");
      if (protection === "protected") {
        validateBackupPassword(password);
        if (password !== repeatPassword) throw new Error("The backup passwords do not match. Enter the same password twice.");
        if (!recoveryAcknowledged) throw new Error("Confirm that you understand the password cannot be reset before downloading.");
      } else if (!plainAcknowledged) {
        throw new Error("Confirm that you understand the file is unencrypted before downloading.");
      }
      // Use the exact preflight snapshot, even if Books change while encryption
      // runs. The store's comparison guard still rejects a stale replacement.
      const json = preview ? preview.preview.existingBackup : await store.exportBackup();
      if (selection.current !== request) return;
      const contents = protection === "protected" ? await encryptBooksBackup(json, password) : json;
      if (selection.current !== request) return;
      download(contents, protection === "protected" ? "taxsorted-books-backup.encrypted.json" : "taxsorted-books-backup.unencrypted.json");
      if (preview) setDownloaded(true);
      clearPasswords();
      setMessage(protection === "protected"
        ? "Backup download started. This file is password-protected. Check that it was saved somewhere you can find again, and keep its password safe separately."
        : "Backup download started. This file is unencrypted: anyone who can open it can read your Books. Check that it was saved somewhere safe.");
    } catch (caught) {
      if (selection.current === request) setError(caught instanceof Error ? caught.message : "The backup could not be downloaded.");
    } finally { if (selection.current === request) setBusy(null); }
  }

  async function replace() {
    if (!selected || !downloaded || !confirmed || busy) return;
    setBusy("restoring");
    setError(null);
    setMessage(null);
    try {
      await store.restoreBackup(selected.json, selected.preview);
      clearPreview();
      if (input.current) input.current.value = "";
      setMessage("Your Books were replaced. Record decisions and source evidence were kept. Confirm each business again and reconnect any providers before preparing figures to file.");
      // A refresh failure is separate from the completed, atomic replacement.
      try { await onRestored(); } catch { setError("Your backup was restored, but this view could not refresh. Reload this page to see your Books."); }
    } catch (caught) {
      clearPreview();
      if (input.current) input.current.value = "";
      setError(caught instanceof Error ? caught.message : "The backup could not be restored. Your earlier Books are unchanged.");
    } finally { setBusy(null); }
  }

  const exportControls = (
        <fieldset disabled={!!busy} className="space-y-3 rounded-xl border border-line bg-white p-4">
          <legend className="px-1 font-semibold text-ink">Backup file protection</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2"><input type="radio" name="books-backup-protection" checked={protection === "protected"} onChange={() => { setProtection("protected"); clearPasswords(); }} /> Password-protected file</label>
            <label className="flex items-center gap-2"><input type="radio" name="books-backup-protection" checked={protection === "plain"} disabled={!!selected || !!locked} onChange={() => { if (!selected && !locked) { setProtection("plain"); clearPasswords(); } }} /> Unencrypted file</label>
          </div>
          {selected || locked ? <p>The copy of your current Books must be password-protected before you replace them.</p> : null}
          {protection === "protected" ? <>
            <p id="books-backup-password-help">Choose a long, unique phrase of at least {BOOKS_BACKUP_PASSWORD_MIN_LENGTH} characters. Keep it somewhere safe separately from the file. TaxSorted cannot reset this password or recover a backup without it.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block font-semibold text-ink">Backup password
                <input type="password" value={password} autoComplete="off" spellCheck={false} aria-describedby="books-backup-password-help" onChange={event => setPassword(event.currentTarget.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-line p-2 font-normal" />
              </label>
              <label className="block font-semibold text-ink">Repeat backup password
                <input type="password" value={repeatPassword} autoComplete="off" spellCheck={false} onChange={event => setRepeatPassword(event.currentTarget.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-line p-2 font-normal" />
              </label>
            </div>
            <label className="flex items-start gap-3 text-ink"><input type="checkbox" checked={recoveryAcknowledged} onChange={event => setRecoveryAcknowledged(event.currentTarget.checked)} className="mt-1 size-5 shrink-0" /><span>I understand that TaxSorted cannot reset this password or recover the backup without it.</span></label>
          </> : <>
            <p>An unencrypted file contains readable financial records and original source data. Anyone who can open the file can read your Books.</p>
            <label className="flex items-start gap-3 text-ink"><input type="checkbox" checked={plainAcknowledged} onChange={event => setPlainAcknowledged(event.currentTarget.checked)} className="mt-1 size-5 shrink-0" /><span>I understand this file is unencrypted and I am responsible for keeping it private.</span></label>
          </>}
          <Button type="button" variant="outline" disabled={!!busy || (protection === "protected" ? !password || !repeatPassword || !recoveryAcknowledged : !plainAcknowledged)} onClick={() => void saveCurrent()}>
            {selected ? "Download the Books currently here" : "Download a Books backup"}
          </Button>
        </fieldset>
  );

  const content = (
      <div className="space-y-5 text-sm leading-6 text-ink-soft">
        <p>Your Books stay in this app or browser on this device. Download a copy regularly and keep it somewhere safe. Password protection encrypts the downloaded file; it does not encrypt the Books stored in this app. Signing in does not save or move these records.</p>
        <p>This is a Books backup: money records, original source data, record decisions and earlier versions. It does not include your Tax Passport, return-preparation drafts, checklist, receipt attachments, account sign-in details or anything already held by HMRC. Files are checked and unlocked on this device and are not uploaded.</p>
        {!locked && !selected ? <section aria-labelledby="books-save-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="books-save-heading" className="text-xl font-semibold text-ink">Save current Books</h2>
            <a href="#restore-books-backup" className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4">Restore a backup</a>
          </div>
          <p>Create a portable copy of the Books saved here. Choose a new password for this download.</p>
          {exportControls}
          {busy === "saving" ? <>
            <p role="status">Preparing your backup on this device…</p>
            <Button type="button" variant="outline" onClick={cancel}>Cancel backup operation</Button>
          </> : null}
        </section> : null}
        <section ref={restoreSection} id="restore-books-backup" tabIndex={-1} aria-labelledby="books-restore-heading" className="scroll-mt-24 space-y-4 border-t border-line pt-5">
          <h2 id="books-restore-heading" className="text-xl font-semibold text-ink">Restore a backup</h2>
        <div>
          <label htmlFor="books-backup-file" className="block font-semibold text-ink">Choose a Books backup to restore</label>
          <p id="books-backup-file-help">Choose a TaxSorted Books backup (.json): up to 14 MB if password-protected, or 10 MB if unencrypted. Older complete-history downloads are not restore files. Restoring replaces all Books currently in this app or browser.</p>
          <input ref={input} id="books-backup-file" type="file" accept=".json,application/json" aria-describedby="books-backup-file-help" disabled={busy === "restoring"} onChange={event => void choose(event.currentTarget.files?.[0])} className="mt-2 block w-full rounded-lg border border-line bg-white p-3 text-ink" />
        </div>
        {busy && (busy !== "saving" || selected) ? <p role="status">{busy === "checking" ? "Checking your backup…" : busy === "unlocking" ? "Unlocking your backup on this device…" : busy === "saving" ? "Preparing your backup on this device…" : "Replacing your Books…"}</p> : null}
        {locked ? <section aria-labelledby="books-restore-unlock" className="space-y-3 rounded-xl border border-line bg-white p-4">
          <h2 id="books-restore-unlock" className="text-lg font-semibold text-ink">Unlock your backup</h2>
          <p className="break-words">Backup: {locked.name}. Enter its password to check what is inside. Your current Books will stay as they are until you confirm a replacement.</p>
          <label className="block font-semibold text-ink">Password for this backup
            <input ref={unlockInput} type="password" value={unlockPassword} disabled={!!busy} autoComplete="off" spellCheck={false} onChange={event => setUnlockPassword(event.currentTarget.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-line p-2 font-normal" />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={!!busy || !unlockPassword} onClick={() => void unlock()}>Unlock preview</Button>
            <Button type="button" variant="outline" onClick={cancel}>Cancel restore</Button>
          </div>
        </section> : null}
        {busy === "checking" ? <Button type="button" variant="outline" onClick={cancel}>Cancel backup operation</Button> : null}
        {selected ? (
          <section aria-labelledby="books-restore-preview" className="space-y-4 rounded-xl border border-line bg-white p-4">
            <h2 ref={previewHeading} tabIndex={-1} id="books-restore-preview" className="text-lg font-semibold text-ink">Check before replacing your Books</h2>
            <p className="break-words">Backup: {selected.name}. Saved {new Date(selected.preview.exportedAt).toLocaleString("en-GB")}.</p>
            <p>{selected.kind === "encrypted" ? "Password-protected backup unlocked on this device." : "Unencrypted backup."}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Current Books and selected backup</caption>
                <thead><tr><th scope="col" className="py-2">What is included</th><th scope="col" className="px-3">Currently here</th><th scope="col" className="px-3">In the backup</th></tr></thead>
                <tbody>{summaryRows.map(([label, key]) => <tr key={key} className="border-t border-line"><th scope="row" className="py-1 font-normal">{label}</th><td className="px-3">{selected.preview.existing[key]}</td><td className="px-3">{selected.preview.incoming[key]}</td></tr>)}</tbody>
              </table>
            </div>
            <p>Money records and their decisions are kept. Every business needs confirmation again. Account and HMRC links are removed. Provider connections, update runs and saved progress are not carried into these Books; their old details remain in your backup file. Reconnect providers to check their current records. No figures become ready to file just because you restored a backup.</p>
            <h3 className="text-lg font-semibold text-ink">Save the Books currently here before replacing them</h3>
            <p>Choose a password for this safety copy and download it. This password is for the current Books, separate from the backup you are restoring. Check that the file was saved before you confirm below.</p>
            {exportControls}
            <label className="flex items-start gap-3 text-ink">
              <input type="checkbox" checked={confirmed} disabled={!downloaded || !!busy} onChange={event => setConfirmed(event.currentTarget.checked)} className="mt-1 size-5 shrink-0" />
              <span>I have saved the current Books and understand that restoring will replace them with this backup.</span>
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="button" disabled={!downloaded || !confirmed || !!busy} onClick={() => void replace()}>Replace these Books with the backup</Button>
              <Button type="button" variant="outline" disabled={busy === "restoring"} onClick={cancel}>Cancel restore</Button>
            </div>
          </section>
        ) : null}
        </section>
        {error ? <p ref={alert} tabIndex={-1} role="alert" className="rounded-lg border border-line bg-white p-3 text-ink">{error}</p> : null}
        {message ? <p ref={status} tabIndex={-1} role="status" className="rounded-lg border border-line bg-white p-3 text-ink">{message}</p> : null}
      </div>
  );

  return expanded ? (
    <section aria-label="Books backup and restore controls" className="mt-8">{content}</section>
  ) : (
    <details className="mt-8 rounded-2xl border border-line bg-paper p-5">
      <summary className="min-h-11 cursor-pointer font-semibold text-ink">Back up or restore your Books</summary>
      <div className="mt-4">{content}</div>
    </details>
  );
}
