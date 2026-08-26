// @vitest-environment jsdom

import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Ledger } from "../ledger";
import {
  eventFromRecord,
  type AccountingEvent,
  type LocalLedger,
} from "@/lib/local-books";
import type { ReviewEventInput } from "@/lib/records";

const ledger: LocalLedger = {
  id: "ledger:self-employment:primary",
  name: "Mina's card shop",
  activity: "self-employment",
  scopeState: "confirmed",
};

function makeEvent(reviewState: AccountingEvent["reviewState"]): AccountingEvent {
  return eventFromRecord(
    {
      date: "2026-07-10",
      amount: 420,
      kind: "expense",
      category: "adminCosts",
      source: "self-employment",
      description: "Royal Mail postage",
    },
    {
      id: "event-1",
      ledgerId: ledger.id,
      now: "2026-07-15T12:00:00.000Z",
      reviewState,
      origin: { kind: "bank-csv", label: "bank.csv", row: 4 },
      contentDigest: "digest",
    }
  );
}

function StatefulLedger({
  initialEvent,
  onReview,
}: {
  initialEvent: AccountingEvent;
  onReview: (id: string, input: ReviewEventInput) => Promise<unknown>;
}) {
  const [events, setEvents] = useState([initialEvent]);

  const review = async (id: string, input: ReviewEventInput) => {
    await onReview(id, input);
    setEvents((current) =>
      current.map((event) =>
        event.id === id
          ? { ...event, reviewState: input.reviewState, revision: event.revision + 1 }
          : event
      )
    );
  };

  return (
    <Ledger
      events={events}
      ledgers={[ledger]}
      onReview={review}
      onExportJson={vi.fn().mockResolvedValue("{}")}
      onExportCsv={vi.fn().mockResolvedValue("")}
    />
  );
}

describe("Ledger", () => {
  it("shows a readable date and source while keeping the saved version optional", () => {
    const event = makeEvent("ready");
    const providerEvent: AccountingEvent = {
      ...event,
      id: "event-2",
      description: "Design sale",
      origin: {
        kind: "accounting-provider",
        provider: {
          provider: "xero",
          environment: "production",
          organisationId: "organisation-1",
          objectType: "bank-transaction",
        },
      },
    };

    render(
      <Ledger
        events={[event, providerEvent]}
        ledgers={[ledger]}
        onReview={vi.fn()}
        onExportJson={vi.fn()}
        onExportCsv={vi.fn()}
      />
    );

    expect(screen.getAllByText("10 July 2026")).toHaveLength(2);
    expect(screen.getByText("Imported from bank.csv, row 4")).toBeInTheDocument();
    expect(screen.getByText("Imported from Xero")).toBeInTheDocument();
    expect(screen.queryByText(/bank-csv|accounting-provider|revision 1/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Record details")).toHaveLength(2);
    expect(screen.getAllByText("Saved version 1.")).toHaveLength(2);
  });

  it("focuses a stable success message after a record stops counting", async () => {
    const onReview = vi.fn().mockResolvedValue(undefined);
    render(<StatefulLedger initialEvent={makeEvent("ready")} onReview={onReview} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Stop counting Royal Mail postage from 10 July 2026; keep it in history",
      })
    );

    await waitFor(() =>
      expect(onReview).toHaveBeenCalledWith("event-1", {
        expectedRevision: 1,
        reviewState: "excluded",
      })
    );
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(
      "Stopped counting Royal Mail postage from 10 July 2026. It is still kept in your complete history."
    );
    await waitFor(() => expect(status).toHaveFocus());
    expect(screen.queryByRole("button", { name: /Stop counting/ })).not.toBeInTheDocument();
  });

  it("focuses a stable success message after a record returns to To check", async () => {
    const onReview = vi.fn().mockResolvedValue(undefined);
    render(<StatefulLedger initialEvent={makeEvent("excluded")} onReview={onReview} />);

    fireEvent.click(screen.getByText("Not counted, kept in history (1)"));
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));

    await waitFor(() =>
      expect(onReview).toHaveBeenCalledWith("event-1", {
        expectedRevision: 1,
        reviewState: "needs-review",
      })
    );
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(
      "Moved Royal Mail postage from 10 July 2026 back to To check."
    );
    await waitFor(() => expect(status).toHaveFocus());
    expect(screen.queryByRole("button", { name: "Check again" })).not.toBeInTheDocument();
  });

  it("explains a failed record change plainly and keeps technical detail optional", async () => {
    const onReview = vi.fn().mockRejectedValue(new Error("record no longer current"));
    render(<StatefulLedger initialEvent={makeEvent("ready")} onReview={onReview} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Stop counting Royal Mail postage from 10 July 2026; keep it in history",
      })
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "We couldn’t change this record. Nothing was changed. Try again.",
    );
    const details = screen.getByText("Technical detail").closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Technical detail"));
    expect(screen.getByText("record no longer current")).toBeVisible();
  });
});
