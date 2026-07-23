// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRecordsStore } from "@/lib/records";
import {
  LOCAL_BOOKS_SCHEMA,
  eventFromRecord,
  type LocalBooksState,
  type LocalLedger,
} from "@/lib/local-books";
import DashboardClient from "../dashboard-client";

// The dashboard now embeds the HMRC connect panel (Task 3), which calls the
// api client on mount. No real network in this suite — a rejected call is
// the honest "api unreachable" case, exercised on its own in
// hmrc-panel.test.tsx; this file only needs the dashboard shell to render.
vi.mock("@/lib/api", () => ({
  api: {
    listEntities: vi.fn().mockRejectedValue(new Error("no network in tests")),
    // HmrcPanel's account-truth note (Task 14) makes its own getAccount call —
    // reject it the same honest way; the panel treats this signal as
    // secondary and non-blocking (silent catch), so this suite still only
    // needs the dashboard shell to render.
    getAccount: vi.fn().mockRejectedValue(new Error("no network in tests")),
  },
  ApiError: class ApiError extends Error {},
}));

describe("dashboard client", () => {
  it("shows the honest outside-periods copy, never a stuck loading state, when today is past the tax year", async () => {
    // 2027-06-01 is after 2026-27's last quarterly period (ended 5 Apr 2027):
    // quarterForDate returns null FOREVER from here on — that must read as
    // "outside the quarterly periods", not as "Loading…" for eternity.
    render(<DashboardClient today="2027-06-01" store={createRecordsStore(new Map())} />);
    expect(
      await screen.findByText(/falls outside the 2026-27 quarterly periods/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/loading your quarter/i)).toBeNull();
  });

  it("pauses totals and estimates rather than combining two separate trades", async () => {
    const confirmed = (id: string, name: string): LocalLedger => ({
      id,
      name,
      activity: "self-employment",
      scopeState: "confirmed",
      scopeConfirmedAt: "2026-07-01T00:00:00.000Z",
    });
    const ledgers = [confirmed("shop-a", "Shop A"), confirmed("shop-b", "Shop B")];
    const now = "2026-07-01T00:00:00.000Z";
    const state: LocalBooksState = {
      schema: LOCAL_BOOKS_SCHEMA,
      storeRevision: 1,
      ledgers,
      events: ledgers.map((ledger, index) =>
        eventFromRecord(
          {
            date: "2026-05-01",
            amount: (index + 1) * 10000,
            kind: "income",
            category: "turnover",
            source: "self-employment",
          },
          {
            id: `sale-${index}`,
            ledgerId: ledger.id,
            now,
            reviewState: "ready",
            origin: { kind: "manual", externalId: `sale-${index}` },
            contentDigest: `sale-${index}`,
          }
        )
      ),
      history: [],
      imports: [],
    };
    const backend = new Map<string, unknown>([["taxsorted-local-books-v2", state]]);

    render(<DashboardClient today="2026-06-01" store={createRecordsStore(backend)} />);

    expect(
      await screen.findByText(/totals are paused because separate businesses must not be combined/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/estimate is paused because separate businesses must not be combined/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("£300.00")).not.toBeInTheDocument();
  });
});
