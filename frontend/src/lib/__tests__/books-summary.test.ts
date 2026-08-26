import { describe, expect, it } from "vitest";
import {
  emptyLocalBooks,
  eventFromRecord,
  type AccountingEvent,
  type LocalBooksState,
  type LocalLedger,
} from "../local-books";
import { summariseBooks } from "../books-summary";

const NOW = "2026-08-26T12:00:00.000Z";

function books(): LocalBooksState {
  return emptyLocalBooks({ replicaId: "replica-for-summary-tests", createdAt: NOW });
}

function ledger(
  id: string,
  name: string,
  scopeState: LocalLedger["scopeState"] = "confirmed",
): LocalLedger {
  return {
    id,
    name,
    activity: "self-employment",
    scopeState,
    ...(scopeState === "confirmed" ? { scopeConfirmedAt: NOW } : {}),
  };
}

function event(
  input: {
    id: string;
    ledgerId: string;
    amount: number;
    kind?: "income" | "expense";
    effect?: "increase" | "decrease";
    reviewState?: AccountingEvent["reviewState"];
    date?: string;
  },
): AccountingEvent {
  const kind = input.kind ?? "income";
  return eventFromRecord(
    {
      date: input.date ?? "2026-08-20",
      amount: input.amount,
      kind,
      category: kind === "income" ? "turnover" : "adminCosts",
      source: "self-employment",
      ...(input.effect ? { effect: input.effect } : {}),
    },
    {
      id: input.id,
      ledgerId: input.ledgerId,
      now: NOW,
      reviewState: input.reviewState ?? "ready",
      origin: { kind: "manual" },
      contentDigest: `digest:${input.id}`,
    },
  );
}

describe("plain Books summary", () => {
  it("keeps pending, excluded and unconfirmed events out of figures", () => {
    const state = books();
    state.ledgers = [
      ledger("confirmed", "Confirmed shop"),
      ledger("unconfirmed", "Unconfirmed shop", "needs-confirmation"),
    ];
    state.events = [
      event({ id: "ready", ledgerId: "confirmed", amount: 10_000 }),
      event({
        id: "pending",
        ledgerId: "confirmed",
        amount: 20_000,
        reviewState: "needs-review",
      }),
      event({
        id: "excluded",
        ledgerId: "confirmed",
        amount: 30_000,
        reviewState: "excluded",
      }),
      event({ id: "unconfirmed", ledgerId: "unconfirmed", amount: 40_000 }),
    ];

    const summary = summariseBooks(state);

    expect(summary).toMatchObject({
      eventCount: 4,
      needsReviewCount: 1,
      excludedCount: 1,
      readyWaitingForScopeCount: 1,
      readyConfirmedCount: 1,
    });
    expect(summary.ledgers).toEqual([
      expect.objectContaining({
        ledgerId: "confirmed",
        confirmedEventCount: 1,
        income: 10_000,
        expenses: 0,
        moneyIn: 10_000,
      }),
      expect.objectContaining({
        ledgerId: "unconfirmed",
        confirmedEventCount: 0,
        income: 0,
        expenses: 0,
        incomeLessCosts: 0,
        moneyIn: 0,
        moneyOut: 0,
        firstRecordOn: null,
        latestRecordOn: null,
      }),
    ]);
  });

  it("keeps separate ledgers separate and dates only their confirmed records", () => {
    const state = books();
    state.ledgers = [ledger("cards", "Card shop"), ledger("prints", "Print shop")];
    state.events = [
      event({ id: "cards-sale", ledgerId: "cards", amount: 50_000, date: "2026-06-01" }),
      event({
        id: "cards-cost",
        ledgerId: "cards",
        amount: 12_000,
        kind: "expense",
        date: "2026-06-30",
      }),
      event({ id: "prints-sale", ledgerId: "prints", amount: 90_000, date: "2026-07-15" }),
    ];

    const summary = summariseBooks(state);

    expect(summary.ledgers).toEqual([
      expect.objectContaining({
        ledgerId: "cards",
        confirmedEventCount: 2,
        income: 50_000,
        expenses: 12_000,
        incomeLessCosts: 38_000,
        moneyIn: 50_000,
        moneyOut: 12_000,
        firstRecordOn: "2026-06-01",
        latestRecordOn: "2026-06-30",
      }),
      expect.objectContaining({
        ledgerId: "prints",
        confirmedEventCount: 1,
        income: 90_000,
        expenses: 0,
        incomeLessCosts: 90_000,
        moneyIn: 90_000,
        moneyOut: 0,
        firstRecordOn: "2026-07-15",
        latestRecordOn: "2026-07-15",
      }),
    ]);
  });

  it("applies decrease effects to figures while preserving their cash direction", () => {
    const state = books();
    state.ledgers = [ledger("shop", "Shop")];
    state.events = [
      event({
        id: "sale-refund",
        ledgerId: "shop",
        amount: 2_000,
        kind: "income",
        effect: "decrease",
      }),
      event({
        id: "cost-refund",
        ledgerId: "shop",
        amount: 3_000,
        kind: "expense",
        effect: "decrease",
      }),
    ];

    expect(summariseBooks(state).ledgers[0]).toMatchObject({
      income: -2_000,
      expenses: -3_000,
      incomeLessCosts: 1_000,
      moneyIn: 3_000,
      moneyOut: 2_000,
    });
  });

  it("keeps a gross sale and fee distinct from the net cash movement", () => {
    const state = books();
    state.ledgers = [ledger("shop", "Card shop")];
    const payout = event({ id: "payout", ledgerId: "shop", amount: 16_200 });
    payout.postings = [
      { kind: "income", category: "turnover", amount: 18_000, effect: "increase" },
      {
        kind: "expense",
        category: "financeCharges",
        amount: 1_800,
        effect: "increase",
      },
    ];
    state.events = [payout];

    expect(summariseBooks(state).ledgers[0]).toMatchObject({
      confirmedEventCount: 1,
      income: 18_000,
      expenses: 1_800,
      incomeLessCosts: 16_200,
      moneyIn: 16_200,
      moneyOut: 0,
    });
  });
});
