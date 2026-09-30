import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { workspaceTestDb as db } from "./workspace-idb-harness";
import { activateWorkspace, createWorkspaceSession, readWorkspaceSnapshot, replaceWorkspace, WORKSPACE_CHECKLIST_KEY, WORKSPACE_KEYS, WORKSPACE_STORAGE_KEY } from "../workspace-storage";
import { createReturnPreparationStore } from "../return-preparation-store";
import { createPreparationDraft } from "../return-preparation";
import { createPassportStore, createEmptyPassportDraft } from "../passport-store";
import { createChecklistStore } from "../checklist-store";
import { createRecordsStore } from "../records";
import { CHECKLIST_SCHEMA, emptyChecklistProgress } from "@/app/checkup/checklist-state";

vi.mock("idb-keyval", async () => {
  const { workspaceTestDb } = await import("./workspace-idb-harness");
  return { createStore: () => workspaceTestDb.store };
});
const locks: string[] = [];
beforeEach(() => {
  db.reset(); locks.length = 0;
  vi.stubGlobal("BroadcastChannel", undefined);
  vi.stubGlobal("navigator", { locks: { request: async (name: string, run: () => Promise<unknown>) => { locks.push(name); return run(); } } });
});
afterEach(() => vi.unstubAllGlobals());

describe("workspace generation boundary", () => {
  it("reads legacy slots without writes or normalising malformed values", async () => {
    db.values.set(WORKSPACE_KEYS[0], { malformed: true });
    db.values.set(WORKSPACE_KEYS[4], null);
    const before = structuredClone(db.values);
    const snapshot = await readWorkspaceSnapshot();
    expect(snapshot.generation).toBeNull();
    expect(snapshot.values[WORKSPACE_KEYS[0]]).toEqual({ malformed: true });
    expect(snapshot.values[WORKSPACE_KEYS[4]]).toBeNull();
    expect(snapshot.values[WORKSPACE_KEYS[5]]).toBeUndefined();
    expect(db.values).toEqual(before);
    expect(db.modes).toEqual(["readonly"]);
  });
  it("keeps ordinary writes in legacy keys before activation", async () => {
    const session = createWorkspaceSession();
    await session.read(WORKSPACE_KEYS[4]);
    await session.update(WORKSPACE_KEYS[4], () => "saved");
    expect(db.values.get(WORKSPACE_KEYS[4])).toBe("saved");
    expect(db.values.has(WORKSPACE_STORAGE_KEY)).toBe(false);
  });
  it("preserves malformed null Books instead of manufacturing empty records", async () => {
    db.values.set(WORKSPACE_KEYS[0], null);
    const before = structuredClone(db.values);
    await expect(createRecordsStore().state()).rejects.toThrow(/could not be read/);
    expect(db.values).toEqual(before);
    expect(db.modes).toEqual(["readonly"]);
  });
  it("blocks a Books store from mutating the workspace after replacement", async () => {
    const store = createRecordsStore();
    const record = { date: "2026-05-01", amount: 100, kind: "income" as const, category: "turnover", source: "self-employment" as const };
    await store.add(record);
    const snapshot = await activateWorkspace();
    await replaceWorkspace(snapshot, snapshot.values);
    const before = await readWorkspaceSnapshot();
    await expect(store.add(record)).rejects.toThrow(/workspace changed/);
    expect(await readWorkspaceSnapshot()).toEqual(before);
  });
  it("compares Passport saves atomically without relying on Web Locks", async () => {
    vi.stubGlobal("navigator", {});
    const first = createPassportStore();
    await first.save(createEmptyPassportDraft());
    const second = createPassportStore();
    const a = (await first.load())!, b = (await second.load())!;
    a.incomeSources.employment = "yes"; b.incomeSources.employment = "no";
    const results = await Promise.allSettled([first.save(a), second.save(b)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    expect((await createPassportStore().load())?.incomeSources.employment).toBe("yes");
  });
  it("activates all slots under old writer locks and ignores subsequent old-key writes", async () => {
    db.values.set(WORKSPACE_KEYS[3], { original: true });
    const before = await readWorkspaceSnapshot();
    const activated = await activateWorkspace(before);
    expect(locks).toEqual([WORKSPACE_KEYS[0], WORKSPACE_KEYS[3]]);
    expect(activated.generation).toBeNull();
    expect(Object.keys(activated.values)).toEqual([...WORKSPACE_KEYS]);
    db.values.set(WORKSPACE_KEYS[3], { oldTab: true });
    expect((await readWorkspaceSnapshot()).values[WORKSPACE_KEYS[3]]).toEqual({ original: true });
  });
  it("rejects a changed activation snapshot before writing tombstones", async () => {
    const before = await readWorkspaceSnapshot();
    db.values.set(WORKSPACE_KEYS[4], null);
    await expect(activateWorkspace(before)).rejects.toThrow(/workspace changed/);
    expect(db.values.has(WORKSPACE_STORAGE_KEY)).toBe(false);
    expect(db.values.has(WORKSPACE_KEYS[0])).toBe(false);
  });
  it("rolls back activation and replacement together on commit failure", async () => {
    const before = structuredClone(db.values);
    db.failCommit = true;
    await expect(activateWorkspace()).rejects.toThrow();
    expect(db.values).toEqual(before);
    db.failCommit = false;
    const snapshot = await activateWorkspace();
    const activated = structuredClone(db.values);
    db.failCommit = true;
    await expect(replaceWorkspace(snapshot, { ...snapshot.values, [WORKSPACE_KEYS[3]]: null })).rejects.toThrow();
    expect(db.values).toEqual(activated);
  });
  it("rejects stale source writes and stale complete replacement previews", async () => {
    const a = createWorkspaceSession(), b = createWorkspaceSession();
    await a.read(WORKSPACE_KEYS[4]); await b.read(WORKSPACE_KEYS[4]);
    await a.update(WORKSPACE_KEYS[4], () => "newer");
    await expect(b.update(WORKSPACE_KEYS[4], () => "older")).rejects.toThrow(/workspace changed/);
    const snapshot = await activateWorkspace();
    await createWorkspaceSession().update(WORKSPACE_KEYS[5], () => "newer year");
    await expect(replaceWorkspace(snapshot, snapshot.values)).rejects.toThrow(/workspace changed/);
  });
  it("pins generation even for previously absent Passport and preparation drafts", async () => {
    const preparation = createReturnPreparationStore("2025-26");
    const passport = createPassportStore();
    expect(await preparation.load()).toBeNull(); expect(await passport.load()).toBeNull();
    const snapshot = await activateWorkspace();
    await replaceWorkspace(snapshot, snapshot.values);
    await expect(preparation.save(createPreparationDraft("2025-26", "prepare-return"))).rejects.toThrow(/workspace changed/);
    await expect(passport.save(createEmptyPassportDraft())).rejects.toThrow(/workspace changed/);
  });
  it("keeps an open editor usable after activation alone and writes only the canonical slot", async () => {
    const preparation = createReturnPreparationStore("2025-26");
    await preparation.load();
    await activateWorkspace();
    const legacy = structuredClone(db.values.get(WORKSPACE_KEYS[4]));
    const saved = await preparation.save(createPreparationDraft("2025-26", "prepare-return"));
    expect((await readWorkspaceSnapshot()).values[WORKSPACE_KEYS[4]]).toEqual(saved);
    expect(db.values.get(WORKSPACE_KEYS[4])).toEqual(legacy);
  });
  it("saves and clears checklist in IDB and never reimports an old localStorage copy", async () => {
    const raw = JSON.stringify({ schema: CHECKLIST_SCHEMA, audience: "individuals", checked: emptyChecklistProgress() });
    const getItem = vi.fn(() => raw), setItem = vi.fn();
    vi.stubGlobal("window", { localStorage: { getItem, setItem } });
    const store = createChecklistStore();
    expect(await store.load()).toBe(raw);
    await store.clear();
    expect(await createChecklistStore().load()).toBeNull();
    expect(db.values.get(WORKSPACE_CHECKLIST_KEY)).toBeNull();
    expect(setItem).not.toHaveBeenCalled();
    const snapshot = await activateWorkspace();
    await replaceWorkspace(snapshot, snapshot.values);
    await expect(store.save(raw, null)).rejects.toThrow(/workspace changed/);
  });
  it("fails closed for malformed canonical envelopes and missing coordination", async () => {
    db.values.set(WORKSPACE_STORAGE_KEY, { invalid: true });
    await expect(readWorkspaceSnapshot()).rejects.toThrow(/left untouched/);
    db.values.clear(); vi.stubGlobal("navigator", {});
    await expect(activateWorkspace()).rejects.toThrow(/Web Locks/);
    expect(db.values.size).toBe(0);
  });
});
