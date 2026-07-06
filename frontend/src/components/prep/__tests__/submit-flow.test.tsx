// @vitest-environment jsdom

// The moment of truth: this is the first UI where a user's own figures leave
// the device for HMRC. The api client is mocked wholesale — no real network.
// Every mock here is what the real api would actually send back for that
// scenario (shapes pinned to itsa-submit.ts / itsa.ts's real responses).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { LedgerRecord } from "@taxsorted/engine/uk/itsa";
import { SubmitFlow } from "../submit-flow";

const { mockApi, MockApiError } = vi.hoisted(() => {
  class MockApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
      public detail?: unknown
    ) {
      super(message);
    }
  }
  return {
    MockApiError,
    mockApi: {
      businesses: vi.fn(),
      submitQuarterlyUpdate: vi.fn(),
      receipts: vi.fn(),
      triggerCalc: vi.fn(),
      getCalc: vi.fn(),
    },
  };
});

vi.mock("@/lib/api", () => ({
  api: mockApi,
  ApiError: MockApiError,
}));

// All dates fall inside Q1 2026-27 standard (2026-04-06 .. 2026-07-05) — same
// window quarter-card.test.tsx's fixture uses, so the totals below are
// byte-identical to what QuarterCard would render for the same records.
const RECORDS: LedgerRecord[] = [
  { id: "1", date: "2026-05-01", amount: 750000, kind: "income", category: "turnover", source: "self-employment" },
  { id: "2", date: "2026-06-01", amount: 40000, kind: "expense", category: "carVanTravelExpenses", source: "self-employment" },
];

const BASE_PROPS = {
  entityId: "e1",
  connectedItsa: true,
  records: RECORDS,
  source: "self-employment" as const,
  taxYear: "2026-27" as const,
  quarterIndex: 1 as const,
  election: "standard" as const,
  // Fast, deterministic backoff for the poll-cap test — production callers
  // omit this and get the real 1.5s/3s/5s/8s/12s plan.
  pollBackoffMs: [5, 5, 5, 5, 5],
};

const ONE_BUSINESS = { businessId: "XAIS12345678910", typeOfBusiness: "self-employment" as const, tradingName: "Acme Ltd" };

function receipt(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "receipt-1",
    taxYear: "2026-27",
    quarterIndex: 1,
    periodEnd: "2026-07-05",
    businessId: "XAIS12345678910",
    typeOfBusiness: "self-employment",
    submittedAt: "2026-07-06T14:03:00.000Z",
    supersededCount: 0,
    hmrcCorrelationId: "corr-abc-123",
    ...overrides,
  };
}

describe("SubmitFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.businesses.mockResolvedValue({ businesses: [ONE_BUSINESS] });
    // The default world for most tests: no earlier submissions on the server.
    mockApi.receipts.mockResolvedValue({ receipts: [] });
  });

  it("locked: not connected to HMRC — honest copy pointing to the dashboard, no network calls", () => {
    render(<SubmitFlow {...BASE_PROPS} connectedItsa={false} />);

    expect(
      screen.getByText(/connect to hmrc \(sandbox\) on your dashboard to practice a real submission/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/dashboard");
    expect(mockApi.businesses).not.toHaveBeenCalled();
    expect(mockApi.receipts).not.toHaveBeenCalled();
  });

  it("locked: connected but no records for this source+quarter — never claims a connection problem", () => {
    render(<SubmitFlow {...BASE_PROPS} records={[]} />);

    expect(screen.getByText(/no self-employment records yet for q1 2026-27/i)).toBeInTheDocument();
    expect(mockApi.businesses).not.toHaveBeenCalled();
    expect(mockApi.receipts).not.toHaveBeenCalled();
  });

  it("review (no earlier receipt on the server): shows the privacy line and the exact category totals QuarterCard shows", async () => {
    render(<SubmitFlow {...BASE_PROPS} />);

    expect(
      await screen.findByText(/hmrc receives these totals.{0,3}never your individual records/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Turnover")).toBeInTheDocument();
    expect(screen.getByText("£7,500.00")).toBeInTheDocument();
    expect(screen.getByText(/Car, van and travel/)).toBeInTheDocument();
    expect(screen.getByText("£400.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send to hmrc \(sandbox demo\)/i })).toBeInTheDocument();
    // No earlier submission and the receipts check succeeded — no restored
    // receipt card and no couldn't-check notice.
    expect(screen.queryByRole("button", { name: /resubmit with updated figures/i })).toBeNull();
    expect(screen.queryByText(/couldn't check for earlier submissions/i)).toBeNull();
  });

  it("reload with an existing receipt: opens at the receipt card (submittedAt in UTC, resend count), resubmit returns to review", async () => {
    // What a reload looks like: the server remembers a submission this
    // session never made — the flow must surface it, not offer a bare
    // submit button that reads as "never sent".
    mockApi.receipts.mockResolvedValue({ receipts: [receipt({ supersededCount: 3 })] });

    render(<SubmitFlow {...BASE_PROPS} />);

    expect(await screen.findByText(/this quarter was already sent/i)).toBeInTheDocument();
    // formatUkDateTime pins: date table + raw UTC time, explicitly labelled
    // (no unlabelled wall-clock that would read an hour off during BST).
    expect(screen.getByText(/6 July 2026, 14:03 UTC/)).toBeInTheDocument();
    expect(screen.getByText(/resent ×3/i)).toBeInTheDocument();
    expect(screen.getByText(/corr-abc-123/)).toBeInTheDocument();
    // The submit button is NOT the first thing shown for an already-sent quarter…
    expect(screen.queryByRole("button", { name: /send to hmrc \(sandbox demo\)/i })).toBeNull();

    // …but resubmission stays one honest click away (cumulative correction model).
    fireEvent.click(screen.getByRole("button", { name: /resubmit with updated figures/i }));
    expect(await screen.findByRole("button", { name: /send to hmrc \(sandbox demo\)/i })).toBeInTheDocument();
    expect(
      screen.getByText(/hmrc receives these totals.{0,3}never your individual records/i)
    ).toBeInTheDocument();
  });

  it("receipts check fails: non-blocking — review renders with a quiet couldn't-check notice, never an error state", async () => {
    mockApi.receipts.mockRejectedValue(new MockApiError(500, "db", "receipts store unavailable"));

    render(<SubmitFlow {...BASE_PROPS} />);

    expect(
      await screen.findByRole("button", { name: /send to hmrc \(sandbox demo\)/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/couldn't check for earlier submissions/i)).toBeInTheDocument();
    // Quiet one-liner, not an alert — the flow itself still works.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("submit success: sends exactly the displayed totals and renders a receipt with the sandbox badge, correlation id and resend count", async () => {
    mockApi.submitQuarterlyUpdate.mockResolvedValue({ receipt: receipt({ supersededCount: 2 }) });

    render(<SubmitFlow {...BASE_PROPS} />);
    fireEvent.click(await screen.findByRole("button", { name: /send to hmrc \(sandbox demo\)/i }));

    expect(await screen.findByText(/receipt/i)).toBeInTheDocument();
    expect(mockApi.submitQuarterlyUpdate).toHaveBeenCalledWith("e1", {
      taxYear: "2026-27",
      businessId: "XAIS12345678910",
      typeOfBusiness: "self-employment",
      quarterIndex: 1,
      election: "standard",
      totals: { turnover: 750000, carVanTravelExpenses: 40000 },
    });
    expect(screen.getAllByText(/sandbox/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/corr-abc-123/)).toBeInTheDocument();
    expect(screen.getByText(/resent ×2/i)).toBeInTheDocument();
  });

  it("receipt_write_failed: shows the exact verbatim message and never renders a receipt card", async () => {
    const message =
      "HMRC accepted the submission but we could not record the receipt — do not resubmit blindly; refresh to check.";
    mockApi.submitQuarterlyUpdate.mockRejectedValue(
      new MockApiError(500, "receipt_write_failed", message, { hmrcCorrelationId: "corr-xyz" })
    );

    render(<SubmitFlow {...BASE_PROPS} />);
    fireEvent.click(await screen.findByRole("button", { name: /send to hmrc \(sandbox demo\)/i }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText(/^receipt$/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /get hmrc's calculation/i })).toBeNull();
  });

  it("calc complete: HMRC's pounds figure and our pence estimate render side by side, with no pence/pounds confusion", async () => {
    mockApi.submitQuarterlyUpdate.mockResolvedValue({ receipt: receipt() });
    mockApi.triggerCalc.mockResolvedValue({ calculationId: "12345678" });
    mockApi.getCalc.mockResolvedValue({
      status: "complete",
      incomeTaxAndNicsDuePounds: 1234.56,
      taxableIncomePounds: 5000,
      source: "hmrc-sandbox",
    });

    render(<SubmitFlow {...BASE_PROPS} />);
    fireEvent.click(await screen.findByRole("button", { name: /send to hmrc \(sandbox demo\)/i }));
    fireEvent.click(await screen.findByRole("button", { name: /get hmrc's calculation \(sandbox\)/i }));

    expect(await screen.findByText("£1,234.56")).toBeInTheDocument();
    // The pence-confusion regression: dividing 1234.56 by 100 a second time
    // would render £12.35 — that string must never appear anywhere.
    expect(screen.queryByText("£12.35")).toBeNull();
    expect(screen.getByText(/hmrc's calculation \(sandbox\)/i)).toBeInTheDocument();
    expect(screen.getByText(/taxsorted estimate/i)).toBeInTheDocument();
    expect(mockApi.getCalc).toHaveBeenCalledWith("e1", "12345678", "2026-27");
  });

  it("poll cap reached: honest 'still computing' copy, never rendered as an error", async () => {
    mockApi.submitQuarterlyUpdate.mockResolvedValue({ receipt: receipt() });
    mockApi.triggerCalc.mockResolvedValue({ calculationId: "12345678" });
    mockApi.getCalc.mockResolvedValue({ status: "computing", source: "hmrc-sandbox" });

    render(<SubmitFlow {...BASE_PROPS} />);
    fireEvent.click(await screen.findByRole("button", { name: /send to hmrc \(sandbox demo\)/i }));
    fireEvent.click(await screen.findByRole("button", { name: /get hmrc's calculation \(sandbox\)/i }));

    expect(await screen.findByText(/still computing/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/check back/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mockApi.getCalc).toHaveBeenCalledTimes(5);
  });

  it("more than one matching business: offers a picker instead of guessing", async () => {
    mockApi.businesses.mockResolvedValue({
      businesses: [
        { businessId: "biz-1", typeOfBusiness: "self-employment", tradingName: "Shop A" },
        { businessId: "biz-2", typeOfBusiness: "self-employment", tradingName: "Shop B" },
      ],
    });

    render(<SubmitFlow {...BASE_PROPS} />);

    expect(await screen.findByRole("radio", { name: "Shop A" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Shop B" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send to hmrc/i })).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Shop B" }));
    expect(await screen.findByRole("button", { name: /send to hmrc \(sandbox demo\)/i })).toBeInTheDocument();
  });

  it("resubmission: after a receipt, the reader can return to review and send again (the cumulative correction model)", async () => {
    mockApi.submitQuarterlyUpdate.mockResolvedValue({ receipt: receipt() });

    render(<SubmitFlow {...BASE_PROPS} />);
    fireEvent.click(await screen.findByRole("button", { name: /send to hmrc \(sandbox demo\)/i }));
    expect(await screen.findByText(/receipt/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /review and resubmit/i }));
    expect(await screen.findByRole("button", { name: /send to hmrc \(sandbox demo\)/i })).toBeInTheDocument();

    mockApi.submitQuarterlyUpdate.mockResolvedValue({ receipt: receipt({ supersededCount: 1 }) });
    fireEvent.click(screen.getByRole("button", { name: /send to hmrc \(sandbox demo\)/i }));
    expect(await screen.findByText(/resent ×1/i)).toBeInTheDocument();
    expect(mockApi.submitQuarterlyUpdate).toHaveBeenCalledTimes(2);
  });
});
