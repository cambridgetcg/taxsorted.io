import { describe, expect, it } from "vitest";
import { createRecordsStore } from "../records";
import type { ImportCandidate } from "../local-books";

const INCOME = {
  date: "2026-05-01",
  amount: 12345,
  kind: "income" as const,
  category: "turnover",
  source: "self-employment" as const,
};

function candidate(overrides: Partial<ImportCandidate> = {}): ImportCandidate {
  return {
    record: { ...INCOME, description: "CLIENT PAYMENT" },
    origin: {
      kind: "bank-csv",
      accountScope: "self-employment",
      externalId: "file-a:row-2",
      label: "bank.csv",
      row: 2,
    },
    contentDigest: "digest-a",
    ...overrides,
  };
}

describe("local books store", () => {
  it("adds a manual event but projects it only after the ledger scope is confirmed", async () => {
    const store = createRecordsStore(new Map());
    const event = await store.add(INCOME);

    expect(event.reviewState).toBe("ready");
    expect(event.origin.kind).toBe("manual");
    expect(event.ledgerId).toBe("ledger:self-employment:primary");
    expect(await store.list()).toEqual([]);
    expect((await store.state()).ledgers[0].scopeState).toBe("needs-confirmation");

    await store.confirmLedger(event.ledgerId);
    expect(await store.list()).toEqual([
      expect.objectContaining({ id: event.id, amount: 12345, category: "turnover" }),
    ]);
  });

  it("invalidates a confirmed ledger when another event is added", async () => {
    const store = createRecordsStore(new Map());
    const first = await store.add(INCOME);
    await store.confirmLedger(first.ledgerId);
    expect(await store.list()).toHaveLength(1);

    await store.add({ ...INCOME, date: "2026-05-02" });
    const state = await store.state();
    expect(state.ledgers[0]).toMatchObject({ scopeState: "needs-confirmation" });
    expect(state.ledgers[0].scopeConfirmedAt).toBeUndefined();
    expect(await store.list()).toHaveLength(0);
  });

  it("rejects unknown categories and kind mismatches", async () => {
    const store = createRecordsStore(new Map());
    await expect(
      store.add({ ...INCOME, kind: "expense", category: "lambos" })
    ).rejects.toThrow(/unknown category/i);
    await expect(
      store.add({ ...INCOME, kind: "expense", category: "turnover" })
    ).rejects.toThrow(/kind mismatch/i);
    expect(await store.list()).toHaveLength(0);
  });

  it("validates a whole manual batch before persisting any member", async () => {
    const store = createRecordsStore(new Map());
    await expect(
      store.addMany([
        INCOME,
        { ...INCOME, amount: 0 },
      ])
    ).rejects.toThrow(/cash amount/i);
    expect(await store.listEvents()).toHaveLength(0);
  });

  it("stages an import, skips the exact same source event, then requires review", async () => {
    const store = createRecordsStore(new Map());
    const first = await store.importMany([candidate()]);
    const second = await store.importMany([candidate()]);

    expect(first.added).toHaveLength(1);
    expect(second).toMatchObject({ duplicateCount: 1, conflicts: [] });
    expect(await store.list()).toHaveLength(0);

    const pending = first.added[0];
    await store.review(pending.id, {
      expectedRevision: pending.revision,
      reviewState: "ready",
    });
    await store.confirmLedger(pending.ledgerId);
    expect(await store.list()).toHaveLength(1);
    expect((await store.state()).history).toHaveLength(1);
  });

  it("does not revoke scope for an exact repeat or held conflict, but does for a new import", async () => {
    const store = createRecordsStore(new Map());
    const [event] = (await store.importMany([candidate()])).added;
    await store.confirmLedger(event.ledgerId);

    await store.importMany([candidate()]);
    expect((await store.state()).ledgers[0].scopeState).toBe("confirmed");

    await store.importMany([candidate({ contentDigest: "changed" })]);
    expect((await store.state()).ledgers[0].scopeState).toBe("confirmed");

    await store.importMany([
      candidate({
        origin: { ...candidate().origin, externalId: "file-b:row-2" },
        contentDigest: "new-source-event",
      }),
    ]);
    expect((await store.state()).ledgers[0].scopeState).toBe("needs-confirmation");
  });

  it("holds changed content that reuses one exact source identity", async () => {
    const store = createRecordsStore(new Map());
    const first = await store.importMany([candidate()]);
    const changed = await store.importMany([candidate({ contentDigest: "digest-b" })]);

    expect(changed.added).toHaveLength(0);
    expect(changed.conflicts).toEqual([
      expect.objectContaining({
        externalId: "file-a:row-2",
        existingEventId: first.added[0].id,
        candidate: expect.objectContaining({ contentDigest: "digest-b" }),
      }),
    ]);
  });

  it("keeps source identity stable when a corrected import changes activity", async () => {
    const store = createRecordsStore(new Map());
    const first = await store.importMany([candidate()]);
    const corrected = await store.importMany([
      candidate({
        record: {
          date: "2026-05-01",
          amount: 12345,
          kind: "income",
          category: "periodAmount",
          source: "uk-property",
          description: "CLIENT PAYMENT",
        },
        contentDigest: "digest-property-correction",
      }),
    ]);

    expect(first.added).toHaveLength(1);
    expect(corrected.added).toHaveLength(0);
    expect(corrected.conflicts).toEqual([
      expect.objectContaining({ existingEventId: first.added[0].id }),
    ]);
    expect(await store.listEvents()).toHaveLength(1);
    expect((await store.state()).ledgers).toHaveLength(1);
    expect((await store.state()).ledgers[0].activity).toBe("self-employment");
  });

  it("warns about a possible duplicate but keeps both legitimate candidates", async () => {
    const store = createRecordsStore(new Map());
    await store.importMany([candidate()]);
    const overlap = await store.importMany([
      candidate({
        origin: {
          kind: "bank-csv",
          accountScope: "self-employment",
          externalId: "file-b:row-9",
          label: "overlap.csv",
          row: 9,
        },
        contentDigest: "digest-overlap",
      }),
    ]);

    expect(overlap.added).toHaveLength(1);
    expect(overlap.added[0].possibleDuplicateOf).toHaveLength(1);
    expect(overlap.added[0].reviewNote).toMatch(/possible match/i);
  });

  it("rejects a stale review instead of overwriting a newer decision", async () => {
    const store = createRecordsStore(new Map());
    const [event] = (await store.importMany([candidate()])).added;
    await store.review(event.id, { expectedRevision: 1, reviewState: "ready" });
    await expect(
      store.review(event.id, { expectedRevision: 1, reviewState: "excluded" })
    ).rejects.toThrow(/changed in another view/i);
  });

  it("edits one-posting review fields, moves activity, and invalidates both ledger scopes", async () => {
    const store = createRecordsStore(new Map());
    const event = await store.add(INCOME);
    await store.confirmLedger(event.ledgerId);

    const moved = await store.review(event.id, {
      expectedRevision: event.revision,
      reviewState: "ready",
      occurredOn: "2026-05-09",
      amount: 4567,
      cashDirection: "in",
      activity: "uk-property",
      category: "periodAmount",
      description: "Tenant payment",
    });
    expect(moved).toMatchObject({
      ledgerId: "ledger:uk-property:primary",
      occurredOn: "2026-05-09",
      cash: { amount: 4567, direction: "in" },
      description: "Tenant payment",
      postings: [{ amount: 4567, kind: "income", effect: "increase", category: "periodAmount" }],
    });
    const state = await store.state();
    expect(state.ledgers.map((ledger) => ledger.scopeState)).toEqual([
      "needs-confirmation",
      "needs-confirmation",
    ]);
    expect(state.history[0].before).toMatchObject({
      ledgerId: "ledger:self-employment:primary",
      occurredOn: "2026-05-01",
    });
    expect(moved.possibleDuplicateKey).toContain("ledger:uk-property:primary");

    await store.confirmLedger(moved.ledgerId);
    expect(await store.list()).toEqual([
      expect.objectContaining({
        id: event.id,
        date: "2026-05-09",
        amount: 4567,
        source: "uk-property",
        category: "periodAmount",
      }),
    ]);
  });

  it("can reopen a confirmed ledger and persist only explicit entity and HMRC business links", async () => {
    const store = createRecordsStore(new Map());
    const event = await store.add(INCOME);
    await store.confirmLedger(event.ledgerId);
    await store.reopenLedger(event.ledgerId);
    expect((await store.state()).ledgers[0]).toMatchObject({ scopeState: "needs-confirmation" });

    await store.confirmLedger(event.ledgerId);
    const linked = await store.linkLedgerToEntity(event.ledgerId, {
      entityId: "entity-1",
      entityName: "Yu",
      hmrcBusinessId: "business-1",
    });
    expect(linked).toMatchObject({
      ownerEntityId: "entity-1",
      ownerEntityName: "Yu",
      hmrcBusinessId: "business-1",
      scopeState: "needs-confirmation",
    });
    expect(linked.entityLinkedAt).toBeTruthy();

    const changedEntity = await store.linkLedgerToEntity(event.ledgerId, {
      entityId: "entity-2",
      entityName: "Yu's company",
    });
    expect(changedEntity.ownerEntityId).toBe("entity-2");
    expect(changedEntity.hmrcBusinessId).toBeUndefined();

    const unlinked = await store.linkLedgerToEntity(event.ledgerId, null);
    expect(unlinked.ownerEntityId).toBeUndefined();
    expect(unlinked.hmrcBusinessId).toBeUndefined();
    expect(unlinked.scopeState).toBe("needs-confirmation");
  });

  it("excludes without deletion and returns it to review with reconstructable history", async () => {
    const store = createRecordsStore(new Map());
    const event = await store.add(INCOME);
    await store.confirmLedger(event.ledgerId);
    const excluded = await store.review(event.id, {
      expectedRevision: 1,
      reviewState: "excluded",
    });
    expect(await store.list()).toHaveLength(0);
    expect(await store.listEvents()).toHaveLength(1);

    await store.review(event.id, {
      expectedRevision: excluded.revision,
      reviewState: "needs-review",
    });
    const state = await store.state();
    expect(state.history).toHaveLength(2);
    expect(state.history[0].before).toMatchObject({ id: event.id, reviewState: "ready" });
    expect(state.events[0].reviewState).toBe("needs-review");
    expect(await store.list()).toHaveLength(0);
  });

  it("migrates v1 records while leaving the old key as a migration baseline", async () => {
    const backend = new Map<string, unknown>();
    const legacy = [{ id: "old-1", ...INCOME }];
    backend.set("taxsorted-records-v1", legacy);
    const store = createRecordsStore(backend);

    const state = await store.state();
    expect(state.schema).toBe("taxsorted.local-books/2");
    expect(state.events[0]).toMatchObject({ id: "old-1", reviewState: "ready" });
    expect(state.ledgers[0].scopeState).toBe("needs-confirmation");
    expect(await store.list()).toEqual([]);
    await store.confirmLedger(state.ledgers[0].id);
    expect(await store.list()).toEqual([expect.objectContaining({ id: "old-1", amount: 12345 })]);
    expect(backend.get("taxsorted-records-v1")).toEqual(legacy);
  });

  it("merges unseen IDs appended by an old v1 tab without treating removals as deletion", async () => {
    const backend = new Map<string, unknown>();
    backend.set("taxsorted-records-v1", [{ id: "old-1", ...INCOME }]);
    const store = createRecordsStore(backend);
    const first = await store.state();
    await store.confirmLedger(first.ledgers[0].id);

    backend.set("taxsorted-records-v1", [
      { id: "old-1", ...INCOME },
      { id: "old-2", ...INCOME, date: "2026-05-02" },
    ]);
    const merged = await store.state();
    expect(merged.events.map((event) => event.id)).toEqual(["old-1", "old-2"]);
    expect(merged.ledgers[0].scopeState).toBe("needs-confirmation");
    expect(await store.list()).toEqual([]);

    backend.set("taxsorted-records-v1", [{ id: "old-2", ...INCOME, date: "2026-05-02" }]);
    expect((await store.state()).events.map((event) => event.id)).toEqual(["old-1", "old-2"]);
  });

  it("validates a first migration before writing v2", async () => {
    const backend = new Map<string, unknown>();
    backend.set("taxsorted-records-v1", [{ id: "bad", ...INCOME, amount: 0 }]);
    const store = createRecordsStore(backend);

    await expect(store.state()).rejects.toThrow(/cash amount/i);
    expect(backend.has("taxsorted-local-books-v2")).toBe(false);
  });

  it("serializes mutations across two store instances sharing one backend", async () => {
    const stored = new Map<string, unknown>();
    const wait = () => new Promise((resolve) => setTimeout(resolve, 5));
    const backend = {
      get: async (key: string) => {
        await wait();
        return stored.has(key) ? structuredClone(stored.get(key)) : undefined;
      },
      set: async (key: string, value: unknown) => {
        await wait();
        stored.set(key, structuredClone(value));
      },
      delete: (key: string) => stored.delete(key),
    };
    const first = createRecordsStore(backend);
    const second = createRecordsStore(backend);

    await Promise.all([
      first.add(INCOME),
      second.add({ ...INCOME, date: "2026-05-02", amount: 200 }),
    ]);
    const events = await first.listEvents();
    expect(events).toHaveLength(2);
    await first.confirmLedger(events[0].ledgerId);
    expect(await first.list()).toHaveLength(2);
  });

  it("exports ready postings as versioned CSV and all events as history JSON", async () => {
    const store = createRecordsStore(new Map());
    const manual = await store.add({ ...INCOME, description: "=SUM(A1)" });
    expect((await store.exportCsv()).split("\n")).toHaveLength(1);
    await store.importMany([candidate()]);
    await store.confirmLedger(manual.ledgerId);

    const csv = await store.exportCsv();
    expect(csv.split("\n")[0]).toContain("schema_version,event_id,event_revision,ledger_id");
    expect(csv.split("\n")[0]).toContain("cash_amount,cash_direction");
    expect(csv.split("\n")[0]).toContain("ledger_name,owner_entity_id,owner_entity_name,hmrc_business_id");
    expect(csv.split("\n")[0]).toContain("account_scope");
    expect(csv.split("\n")[0]).toContain("reversal_event_id,reversal_event_revision");
    expect(csv).toContain("taxsorted.books.csv/1");
    expect(csv).toContain("'=SUM(A1)");
    expect(csv.split("\n")).toHaveLength(2);
    const [header, row] = csv.split("\n").map((line) => line.split(","));
    const fields = Object.fromEntries(header.map((name, index) => [name, row[index]]));
    expect(fields).toMatchObject({
      cash_amount: "123.45",
      cash_direction: "in",
      amount: "123.45",
      account_scope: "",
      reversal_event_id: "",
      reversal_event_revision: "",
    });

    const json = JSON.parse(await store.exportJson());
    expect(json.schema).toBe("taxsorted.local-books/2");
    expect(json.events).toHaveLength(2);
  });
});
