// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BooksBackup } from "../books-backup";
import { createRecordsStore } from "@/lib/records";
import { BOOKS_BACKUP_MAX_BYTES, parseBooksBackup } from "@/lib/books-backup";

const INCOME = { date: "2026-05-01", amount: 12345, kind: "income" as const, category: "turnover", source: "self-employment" as const };
const downloads: Blob[] = [];

beforeEach(() => {
  downloads.length = 0;
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL(blob: Blob) { downloads.push(blob); return "blob:books-backup-test"; }
    static revokeObjectURL = vi.fn();
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function file(json: string, name = "books-backup.json") {
  const selected = new File([json], name, { type: "application/json" });
  Object.defineProperty(selected, "text", { value: async () => json });
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

async function setup() {
  const backend = new Map();
  const store = createRecordsStore(backend);
  const current = await store.add(INCOME);
  const source = createRecordsStore(new Map());
  const incoming = await source.add({ ...INCOME, amount: 9900 });
  await source.review(incoming.id, { expectedRevision: 1, reviewState: "ready" });
  await source.confirmLedger(incoming.ledgerId);
  const json = await source.exportBackup();
  const refreshed = vi.fn(async () => undefined);
  render(<BooksBackup store={store} onRestored={refreshed} />);
  fireEvent.click(screen.getByText("Back up or restore your Books"));
  return { backend, store, current, incoming, json, refreshed };
}

async function saveAndConfirm() {
  fireEvent.click(screen.getByRole("button", { name: "Download the Books currently here" }));
  await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("Books backup and restore controls", () => {
  it("downloads a versioned backup without signing in or choosing a restore file", async () => {
    const { current } = await setup();
    fireEvent.click(screen.getByRole("button", { name: "Download a Books backup" }));
    await screen.findByText(/Backup download started/);
    expect((await parseBooksBackup(await blobText(downloads[0]))).books.events[0].id).toBe(current.id);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("previews, downloads the existing records and requires deliberate confirmation before replacement", async () => {
    const { store, current, incoming, json, refreshed } = await setup();
    choose(file(json));
    await screen.findByRole("heading", { name: "Check before replacing your Books" });
    expect(screen.getByRole("table", { name: "Current Books and selected backup" })).toHaveTextContent("Earlier record versions");
    expect(screen.getByText(/Every business needs confirmation again/)).toBeInTheDocument();
    const replace = screen.getByRole("button", { name: "Replace these Books with the backup" });
    expect(replace).toBeDisabled();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect((await store.state()).events[0].id).toBe(current.id);
    await saveAndConfirm();
    expect((await parseBooksBackup(await blobText(downloads[0]))).books.events[0].id).toBe(current.id);
    fireEvent.click(replace);
    await screen.findByText(/Your Books were replaced/);
    expect((await store.state()).events[0]).toMatchObject({ id: incoming.id, cash: { amount: 9900 }, reviewState: "ready" });
    expect(await store.list()).toEqual([]);
    expect(refreshed).toHaveBeenCalledOnce();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("does not replace records changed after the safety copy and requires a new preview", async () => {
    const { store, json } = await setup();
    choose(file(json));
    await screen.findByRole("checkbox");
    await saveAndConfirm();
    const newer = await store.add({ ...INCOME, amount: 700 });
    fireEvent.click(screen.getByRole("button", { name: "Replace these Books with the backup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("changed after the preview");
    expect((await store.state()).events.some(event => event.id === newer.id)).toBe(true);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("rejects malformed files and checks file size before reading any contents", async () => {
    const { backend } = await setup();
    const before = structuredClone([...backend]);
    choose(file("not json"));
    expect(await screen.findByRole("alert")).toHaveTextContent("not valid JSON");
    const huge = file("unused");
    Object.defineProperty(huge, "size", { value: BOOKS_BACKUP_MAX_BYTES + 1 });
    choose(huge);
    expect(await screen.findByRole("alert")).toHaveTextContent("no larger than 10 MB");
    expect([...backend]).toEqual(before);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("keeps confirmation disabled when the current-backup download fails", async () => {
    const { json, backend } = await setup();
    const before = structuredClone([...backend]);
    choose(file(json));
    await screen.findByRole("checkbox");
    vi.mocked(HTMLAnchorElement.prototype.click).mockImplementation(() => { throw new Error("Download blocked"); });
    fireEvent.click(screen.getByRole("button", { name: "Download the Books currently here" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Download blocked");
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect([...backend]).toEqual(before);
  });

  it("clears confirmation when another file is selected or restore is cancelled", async () => {
    const { json, backend } = await setup();
    const before = structuredClone([...backend]);
    choose(file(json));
    await screen.findByRole("checkbox");
    await saveAndConfirm();
    choose(file(json, "another-file.json"));
    await screen.findByRole("checkbox");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel restore" }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect([...backend]).toEqual(before);
  });

  it("distinguishes a completed restore from a failed view refresh", async () => {
    const { store, incoming, json, refreshed } = await setup();
    refreshed.mockRejectedValueOnce(new Error("View failed"));
    choose(file(json));
    await screen.findByRole("checkbox");
    await saveAndConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Replace these Books with the backup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("backup was restored");
    expect((await store.state()).events[0].id).toBe(incoming.id);
  });
});
