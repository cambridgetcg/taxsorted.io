// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MoneyInbox, PracticeShop } from "../money-inbox";
import { eventFromRecord, type LocalLedger } from "@/lib/local-books";

const ledger: LocalLedger = {
  id: "ledger:self-employment:primary",
  name: "My first business",
  activity: "self-employment",
  scopeState: "needs-confirmation",
};

const event = eventFromRecord(
  {
    date: "2026-07-10",
    amount: 420,
    kind: "expense",
    category: "adminCosts",
    source: "self-employment",
    description: "ROYAL MAIL",
  },
  {
    id: "event-1",
    ledgerId: ledger.id,
    now: "2026-07-15T12:00:00.000Z",
    reviewState: "needs-review",
    origin: { kind: "bank-csv", label: "bank.csv", row: 4, externalId: "file:row-4" },
    contentDigest: "digest",
    suggestion: {
      basis: "The description contains Royal Mail.",
      limitation: "A bank line cannot prove business purpose.",
    },
  }
);

describe("Money Inbox", () => {
  it("shows Cash, Profit, Tax and Source trail together with the suggestion limits", () => {
    render(<MoneyInbox events={[event]} ledgers={[ledger]} onReview={vi.fn()} />);

    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("Profit")).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText("Source trail")).toBeInTheDocument();
    expect(screen.getByText(/not tax due/i)).toBeInTheDocument();
    expect(screen.getByText(/bank line only/i)).toBeInTheDocument();
  });

  it("requires a Yes answer and an explicit check before marking a row ready", async () => {
    const onReview = vi.fn().mockResolvedValue({ ...event, reviewState: "ready", revision: 2 });
    render(<MoneyInbox events={[event]} ledgers={[ledger]} onReview={onReview} />);

    expect(onReview).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /confirm transaction/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    expect(screen.getByRole("button", { name: /confirm transaction/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I checked the date/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm transaction/i }));

    await waitFor(() =>
      expect(onReview).toHaveBeenCalledWith("event-1", {
        expectedRevision: 1,
        reviewState: "ready",
        occurredOn: "2026-07-10",
        amount: 420,
        activity: "self-employment",
        category: "adminCosts",
        description: "ROYAL MAIL",
      })
    );
  });

  it("saves corrected cash facts and activity with the review", async () => {
    const onReview = vi.fn().mockResolvedValue({ ...event, reviewState: "ready", revision: 2 });
    render(<MoneyInbox events={[event]} ledgers={[ledger]} onReview={onReview} />);

    fireEvent.change(screen.getByLabelText(/Amount in pounds/i), { target: { value: "12.34" } });
    fireEvent.click(screen.getByRole("radio", { name: "Money in" }));
    fireEvent.click(screen.getByRole("radio", { name: "UK property" }));
    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /I checked the date/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm transaction/i }));

    await waitFor(() =>
      expect(onReview).toHaveBeenCalledWith(
        "event-1",
        expect.objectContaining({
          amount: 1234,
          cashDirection: "in",
          activity: "uk-property",
          category: "periodAmount",
        })
      )
    );
  });

  it("can leave a row out without deleting it", async () => {
    const onReview = vi.fn().mockResolvedValue({ ...event, reviewState: "excluded", revision: 2 });
    render(<MoneyInbox events={[event]} ledgers={[ledger]} onReview={onReview} />);
    expect(screen.getByRole("button", { name: /leave out/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "No" }));
    fireEvent.click(screen.getByRole("button", { name: /leave out/i }));
    await waitFor(() =>
      expect(onReview).toHaveBeenCalledWith("event-1", {
        expectedRevision: 1,
        reviewState: "excluded",
      })
    );
  });

  it("keeps partly-business and unsure rows waiting", () => {
    render(<MoneyInbox events={[event]} ledgers={[ledger]} onReview={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: "Partly" }));
    expect(screen.getByText(/splitting a partly-business payment is not supported/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm transaction/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /leave out/i })).toBeDisabled();
  });
});

describe("practice shop", () => {
  it("is visibly made up and explains gross sale versus net payout", () => {
    render(<PracticeShop />);
    fireEvent.click(screen.getByText(/Mina's first card sale/i));
    expect(screen.getByText(/nothing here is saved/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /£162 payout/i }));
    expect(screen.getByRole("button", { name: /£162 payout/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/£162 is the cash payout/i)).toBeInTheDocument();
  });
});
