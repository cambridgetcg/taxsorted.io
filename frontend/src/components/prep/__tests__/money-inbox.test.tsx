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
  it("shows the money movement, bounded tax effect and source without claiming profit", () => {
    render(<MoneyInbox events={[event]} ledgers={[ledger]} onReview={vi.fn()} />);

    expect(screen.getByText("Money movement")).toBeInTheDocument();
    expect(screen.getByText("Income Tax totals")).toBeInTheDocument();
    expect(screen.getByText("Income Tax category")).toBeInTheDocument();
    expect(screen.getByText("Where this came from")).toBeInTheDocument();
    expect(screen.queryByText("Profit")).not.toBeInTheDocument();
    expect(screen.getByText(/not tax due/i)).toBeInTheDocument();
    expect(screen.getByText(/bank line only/i)).toBeInTheDocument();
    expect(screen.getByText(/do not choose Yes for transfers, loans, owner money/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Was this an ordinary running cost?" }))
      .toBeInTheDocument();
  });

  it("requires a Yes answer and an explicit check before marking a row ready", async () => {
    const onReview = vi.fn().mockResolvedValue({ ...event, reviewState: "ready", revision: 2 });
    render(<MoneyInbox events={[event]} ledgers={[ledger]} onReview={onReview} />);

    expect(onReview).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /mark as checked/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "Yes, all of it" }));
    expect(screen.getByRole("button", { name: /mark as checked/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I checked the date/i }));
    fireEvent.click(screen.getByRole("button", { name: /mark as checked/i }));

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
    fireEvent.click(screen.getByRole("radio", { name: "A property I let" }));
    fireEvent.click(screen.getByRole("radio", { name: "Yes, all of it" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /I checked the date/i }));
    fireEvent.click(screen.getByRole("button", { name: /mark as checked/i }));

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
    expect(screen.getByRole("button", { name: /keep out of Income Tax totals/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "No" }));
    fireEvent.click(screen.getByRole("button", { name: /keep out of Income Tax totals/i }));
    await waitFor(() =>
      expect(onReview).toHaveBeenCalledWith("event-1", {
        expectedRevision: 1,
        reviewState: "excluded",
      })
    );
  });

  it("keeps partly-business and unsure rows waiting", () => {
    render(<MoneyInbox events={[event]} ledgers={[ledger]} onReview={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: "Only part" }));
    expect(screen.getByText(/cannot split one payment into business and personal parts/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark as checked/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /keep out of Income Tax totals/i })).toBeDisabled();
  });

  it("requires a fresh answer and check after a material fact changes", () => {
    render(<MoneyInbox events={[event]} ledgers={[ledger]} onReview={vi.fn()} />);

    const submit = screen.getByRole("button", { name: /mark as checked/i });
    fireEvent.click(screen.getByRole("radio", { name: "Yes, all of it" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /I checked the date/i }));
    expect(submit).toBeEnabled();

    fireEvent.change(screen.getByLabelText(/Amount in pounds/i), {
      target: { value: "12.34" },
    });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: /I checked the date/i }));
    expect(submit).toBeEnabled();
    fireEvent.click(screen.getByRole("radio", { name: "Money in" }));

    expect(screen.getByRole("group", { name: "Was this ordinary business income?" }))
      .toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Yes, all of it" })).not.toBeChecked();
    expect(submit).toBeDisabled();
  });

  it("explains a failed check plainly and keeps technical detail optional", async () => {
    const onReview = vi.fn().mockRejectedValue(new Error("record revision conflict"));
    render(<MoneyInbox events={[event]} ledgers={[ledger]} onReview={onReview} />);

    fireEvent.click(screen.getByRole("radio", { name: "Yes, all of it" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /I checked the date/i }));
    fireEvent.click(screen.getByRole("button", { name: /mark as checked/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "We couldn’t save this check. Nothing was changed. Try again.",
    );
    const details = screen.getByText("Technical detail").closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Technical detail"));
    expect(screen.getByText("record revision conflict")).toBeVisible();
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
