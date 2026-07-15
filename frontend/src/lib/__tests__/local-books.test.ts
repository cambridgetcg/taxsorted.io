import { describe, expect, it } from "vitest";
import {
  emptyLocalBooks,
  eventFromRecord,
  projectReadyRecords,
  type LocalLedger,
} from "../local-books";

const NOW = "2026-07-15T12:00:00.000Z";

function ledger(id: string, name: string): LocalLedger {
  return {
    id,
    name,
    activity: "self-employment",
    scopeState: "confirmed",
    scopeConfirmedAt: NOW,
  };
}

describe("local books projection", () => {
  it("projects one chosen ledger without mixing another trade of the same type", () => {
    const state = emptyLocalBooks();
    state.ledgers = [ledger("shop-a", "Shop A"), ledger("shop-b", "Shop B")];
    state.events = [
      eventFromRecord(
        { date: "2026-05-01", amount: 10000, kind: "income", category: "turnover", source: "self-employment" },
        { id: "a", ledgerId: "shop-a", now: NOW, reviewState: "ready", origin: { kind: "manual" }, contentDigest: "a" }
      ),
      eventFromRecord(
        { date: "2026-05-02", amount: 90000, kind: "income", category: "turnover", source: "self-employment" },
        { id: "b", ledgerId: "shop-b", now: NOW, reviewState: "ready", origin: { kind: "manual" }, contentDigest: "b" }
      ),
    ];

    expect(projectReadyRecords(state, "shop-a")).toEqual([
      expect.objectContaining({ id: "a", amount: 10000 }),
    ]);
  });

  it("never projects pending or excluded events", () => {
    const state = emptyLocalBooks();
    state.ledgers = [ledger("shop", "Shop")];
    state.events = (["needs-review", "excluded"] as const).map((reviewState, index) =>
      eventFromRecord(
        { date: `2026-05-0${index + 1}`, amount: 10000, kind: "income", category: "turnover", source: "self-employment" },
        { id: String(index), ledgerId: "shop", now: NOW, reviewState, origin: { kind: "bank-csv" }, contentDigest: String(index) }
      )
    );

    expect(projectReadyRecords(state)).toEqual([]);
  });

  it("keeps ready records out of figures until the ledger scope is confirmed", () => {
    const state = emptyLocalBooks();
    const unconfirmed = ledger("shop", "Shop");
    unconfirmed.scopeState = "needs-confirmation";
    delete unconfirmed.scopeConfirmedAt;
    state.ledgers = [unconfirmed];
    state.events = [
      eventFromRecord(
        { date: "2026-05-01", amount: 10000, kind: "income", category: "turnover", source: "self-employment" },
        { id: "ready", ledgerId: "shop", now: NOW, reviewState: "ready", origin: { kind: "manual" }, contentDigest: "ready" }
      ),
    ];

    expect(projectReadyRecords(state)).toEqual([]);
    expect(projectReadyRecords(state, undefined, { includeUnconfirmed: true })).toHaveLength(1);
  });

  it("supports several tax postings behind one cash event", () => {
    const state = emptyLocalBooks();
    state.ledgers = [ledger("shop", "Shop")];
    const event = eventFromRecord(
      { date: "2026-05-01", amount: 16200, kind: "income", category: "turnover", source: "self-employment" },
      { id: "payout", ledgerId: "shop", now: NOW, reviewState: "ready", origin: { kind: "cambridge-tcg" }, contentDigest: "payout" }
    );
    event.postings = [
      { kind: "income", category: "turnover", amount: 18000, effect: "increase" },
      { kind: "expense", category: "financeCharges", amount: 1800, effect: "increase" },
    ];
    state.events = [event];

    expect(projectReadyRecords(state)).toEqual([
      expect.objectContaining({ id: "payout:posting-1", amount: 18000, category: "turnover" }),
      expect.objectContaining({ id: "payout:posting-2", amount: 1800, category: "financeCharges" }),
    ]);
  });

  it("keeps cash direction separate from the tax effect for a refund", () => {
    const state = emptyLocalBooks();
    state.ledgers = [ledger("shop", "Shop")];
    const refund = eventFromRecord(
      {
        date: "2026-05-03",
        amount: 1800,
        kind: "expense",
        category: "financeCharges",
        source: "self-employment",
        effect: "decrease",
      },
      { id: "refund", ledgerId: "shop", now: NOW, reviewState: "ready", origin: { kind: "manual" }, contentDigest: "refund" }
    );
    state.events = [refund];

    expect(refund.cash.direction).toBe("in");
    expect(projectReadyRecords(state)[0]).toMatchObject({
      kind: "expense",
      effect: "decrease",
      amount: 1800,
    });
  });
});
