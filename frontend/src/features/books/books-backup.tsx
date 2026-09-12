"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BOOKS_BACKUP_MAX_BYTES, type BooksBackupSummary, type BooksRestorePreflight } from "@/lib/books-backup";
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

export function BooksBackup({ store, onRestored }: { store: RecordsStore; onRestored: () => Promise<void> }) {
  const [selected, setSelected] = useState<{ json: string; name: string; preview: BooksRestorePreflight } | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selection = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  const clearPreview = () => {
    selection.current += 1;
    setSelected(null);
    setDownloaded(false);
    setConfirmed(false);
  };

  async function choose(file?: File) {
    clearPreview();
    setError(null);
    setMessage(null);
    if (!file) return;
    const request = selection.current;
    setBusy(true);
    try {
      if (file.size > BOOKS_BACKUP_MAX_BYTES) throw new Error("Choose a Books backup no larger than 10 MB.");
      const json = await file.text();
      const preview = await store.previewRestore(json);
      if (selection.current === request) setSelected({ json, name: file.name, preview });
    } catch (caught) {
      if (selection.current === request) setError(caught instanceof Error ? caught.message : "This backup could not be read.");
    } finally {
      if (selection.current === request) setBusy(false);
    }
  }

  async function saveCurrent() {
    setBusy(true);
    setError(null);
    try {
      download(selected ? selected.preview.existingBackup : await store.exportBackup(), "taxsorted-books-backup.json");
      if (selected) setDownloaded(true);
      setMessage("Backup download started. Check that the file was saved somewhere you can find again.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The backup could not be downloaded.");
    } finally { setBusy(false); }
  }

  async function replace() {
    if (!selected || !downloaded || !confirmed || busy) return;
    setBusy(true);
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
    } finally { setBusy(false); }
  }

  return (
    <details className="mt-8 rounded-2xl border border-line bg-paper p-5">
      <summary className="min-h-11 cursor-pointer font-semibold text-ink">Back up or restore your Books</summary>
      <div className="mt-4 space-y-4 text-sm leading-6 text-ink-soft">
        <p>Your Books stay in this browser. Download a copy regularly and keep it somewhere safe. The file contains private financial records and is not encrypted. Signing in does not save or move these records.</p>
        <p>This backup includes money records, original source data, record decisions and earlier versions. It does not include receipt attachments, account sign-in details or anything already held by HMRC. Files are checked on this device and are not uploaded.</p>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void saveCurrent()}>
          {selected ? "Download the Books currently here" : "Download a Books backup"}
        </Button>
        <div>
          <label htmlFor="books-backup-file" className="block font-semibold text-ink">Choose a Books backup to restore</label>
          <p id="books-backup-file-help">Choose a TaxSorted Books backup (.json), up to 10 MB. Older complete-history downloads are not restore files. Restoring replaces all Books currently in this browser.</p>
          <input ref={input} id="books-backup-file" type="file" accept=".json,application/json" aria-describedby="books-backup-file-help" disabled={busy} onChange={event => void choose(event.currentTarget.files?.[0])} className="mt-2 block w-full rounded-lg border border-line bg-white p-3 text-ink" />
        </div>
        {busy ? <p role="status">Checking and saving your Books…</p> : null}
        {selected ? (
          <section aria-labelledby="books-restore-preview" className="space-y-4 rounded-xl border border-line bg-white p-4">
            <h2 id="books-restore-preview" className="text-lg font-semibold text-ink">Check before replacing your Books</h2>
            <p className="break-words">Backup: {selected.name}. Saved {new Date(selected.preview.exportedAt).toLocaleString("en-GB")}.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Current Books and selected backup</caption>
                <thead><tr><th scope="col" className="py-2">What is included</th><th scope="col" className="px-3">Currently here</th><th scope="col" className="px-3">In the backup</th></tr></thead>
                <tbody>{summaryRows.map(([label, key]) => <tr key={key} className="border-t border-line"><th scope="row" className="py-1 font-normal">{label}</th><td className="px-3">{selected.preview.existing[key]}</td><td className="px-3">{selected.preview.incoming[key]}</td></tr>)}</tbody>
              </table>
            </div>
            <p>Money records and their decisions are kept. Every business needs confirmation again. Account and HMRC links are removed. Provider connections, update runs and saved progress are not carried into these Books; their old details remain in your backup file. Reconnect providers to check their current records. No figures become ready to file just because you restored a backup.</p>
            <p>First download the Books currently here using the button above. Then confirm that you have saved that copy.</p>
            <label className="flex items-start gap-3 text-ink">
              <input type="checkbox" checked={confirmed} disabled={!downloaded || busy} onChange={event => setConfirmed(event.currentTarget.checked)} className="mt-1 size-5 shrink-0" />
              <span>I have saved the current Books and understand that restoring will replace them with this backup.</span>
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="button" disabled={!downloaded || !confirmed || busy} onClick={() => void replace()}>Replace these Books with the backup</Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => { clearPreview(); if (input.current) input.current.value = ""; setMessage(null); }}>Cancel restore</Button>
            </div>
          </section>
        ) : null}
        {error ? <p role="alert" className="rounded-lg border border-line bg-white p-3 text-ink">{error}</p> : null}
        {message ? <p role="status" className="rounded-lg border border-line bg-white p-3 text-ink">{message}</p> : null}
      </div>
    </details>
  );
}
