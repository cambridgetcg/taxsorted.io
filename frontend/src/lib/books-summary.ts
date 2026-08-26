// Pure, bounded summaries for the plain Books workspace.
//
// These figures describe only reviewed events in a confirmed local book. They
// do not claim that a bank balance, period or set of books is complete.

import type { Pence, SourceType } from "@taxsorted/engine/uk/itsa";
import {
  projectReadyRecords,
  type AccountingEvent,
  type LocalBooksState,
  type LocalLedger,
} from "@/lib/local-books";

export interface BooksLedgerSummary {
  ledgerId: string;
  ledgerName: string;
  activity: SourceType;
  confirmedEventCount: number;
  income: Pence;
  expenses: Pence;
  incomeLessCosts: Pence;
  moneyIn: Pence;
  moneyOut: Pence;
  firstRecordOn: string | null;
  latestRecordOn: string | null;
}

export interface BooksSummary {
  eventCount: number;
  needsReviewCount: number;
  excludedCount: number;
  readyWaitingForScopeCount: number;
  readyConfirmedCount: number;
  ledgers: BooksLedgerSummary[];
}

function confirmedEventsFor(
  state: LocalBooksState,
  ledger: LocalLedger,
): AccountingEvent[] {
  if (ledger.scopeState !== "confirmed") return [];
  return state.events.filter(
    (event) => event.ledgerId === ledger.id && event.reviewState === "ready",
  );
}

function summariseLedger(
  state: LocalBooksState,
  ledger: LocalLedger,
): BooksLedgerSummary {
  const events = confirmedEventsFor(state, ledger);
  const records = projectReadyRecords(state, ledger.id);

  let income = 0;
  let expenses = 0;
  for (const record of records) {
    const signedAmount = record.effect === "decrease" ? -record.amount : record.amount;
    if (record.kind === "income") income += signedAmount;
    else expenses += signedAmount;
  }

  let moneyIn = 0;
  let moneyOut = 0;
  for (const event of events) {
    if (event.cash.direction === "in") moneyIn += event.cash.amount;
    else moneyOut += event.cash.amount;
  }

  const dates = events.map((event) => event.occurredOn).sort();

  return {
    ledgerId: ledger.id,
    ledgerName: ledger.name,
    activity: ledger.activity,
    confirmedEventCount: events.length,
    income,
    expenses,
    incomeLessCosts: income - expenses,
    moneyIn,
    moneyOut,
    firstRecordOn: dates[0] ?? null,
    latestRecordOn: dates.at(-1) ?? null,
  };
}

/**
 * Summarise the facts already held in local books without inferring
 * reconciliation, completeness, a bank balance or tax due.
 */
export function summariseBooks(state: LocalBooksState): BooksSummary {
  const ledgerById = new Map(state.ledgers.map((ledger) => [ledger.id, ledger]));
  let needsReviewCount = 0;
  let excludedCount = 0;
  let readyWaitingForScopeCount = 0;
  let readyConfirmedCount = 0;

  for (const event of state.events) {
    if (event.reviewState === "needs-review") {
      needsReviewCount += 1;
      continue;
    }
    if (event.reviewState === "excluded") {
      excludedCount += 1;
      continue;
    }

    if (ledgerById.get(event.ledgerId)?.scopeState === "confirmed") {
      readyConfirmedCount += 1;
    } else {
      // A missing ledger is also kept out of figures rather than treated as
      // confirmed. Valid stored books should not contain this state.
      readyWaitingForScopeCount += 1;
    }
  }

  return {
    eventCount: state.events.length,
    needsReviewCount,
    excludedCount,
    readyWaitingForScopeCount,
    readyConfirmedCount,
    ledgers: state.ledgers.map((ledger) => summariseLedger(state, ledger)),
  };
}
