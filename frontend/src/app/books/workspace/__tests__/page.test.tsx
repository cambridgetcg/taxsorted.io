// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BooksWorkspacePage from "../page";

const store = vi.hoisted(() => ({
  state: vi.fn(),
  subscribe: vi.fn(() => () => undefined),
  add: vi.fn(),
  importMany: vi.fn(),
  review: vi.fn(),
  confirmLedger: vi.fn(),
  reopenLedger: vi.fn(),
  exportJson: vi.fn(),
  exportCsv: vi.fn(),
}));

vi.mock("@/lib/records", () => ({
  createRecordsStore: () => store,
}));

function emptyBooks() {
  return {
    schema: "taxsorted.local-books/2",
    storeRevision: 0,
    ledgers: [],
    events: [],
    history: [],
    imports: [],
  };
}

function readyBooks() {
  return {
    schema: "taxsorted.local-books/2",
    storeRevision: 3,
    ledgers: [
      {
        id: "ledger:self-employment:primary",
        name: "My first business",
        activity: "self-employment",
        scopeState: "confirmed",
        scopeConfirmedAt: "2026-07-31T12:05:00.000Z",
      },
    ],
    events: [
      {
        id: "event-ready",
        ledgerId: "ledger:self-employment:primary",
        revision: 1,
        reviewState: "ready",
        occurredOn: "2026-07-31",
        cash: { amount: 1250, currency: "GBP", direction: "in" },
        postings: [
          { kind: "income", category: "turnover", amount: 1250, effect: "increase" },
        ],
        origin: { kind: "manual" },
        contentDigest: "digest-ready",
        createdAt: "2026-07-31T12:00:00.000Z",
        updatedAt: "2026-07-31T12:00:00.000Z",
      },
    ],
    history: [],
    imports: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  store.state.mockResolvedValue(emptyBooks());
  store.add.mockResolvedValue({});
  store.importMany.mockResolvedValue({ added: [], duplicateCount: 0, conflicts: [] });
  window.history.replaceState({}, "", "/books/workspace");
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("Books workspace entry", () => {
  it("reuses Starter Books but gives a novice two explicit first actions", async () => {
    render(<BooksWorkspacePage />);

    expect(await screen.findByRole("heading", { name: "Your books" })).toBeInTheDocument();
    expect(screen.getByText(/one UK sole trade or one UK property business/i)).toBeInTheDocument();
    expect(screen.getByText(/does not encrypt, sync or back up/i)).toBeInTheDocument();

    const manual = screen.getByRole("button", { name: "Add one transaction" });
    const csv = screen.getByRole("button", { name: "Import a CSV" });
    expect(manual).toHaveAttribute("aria-expanded", "false");
    expect(manual).toHaveAttribute("aria-controls", "manual-start-panel");
    expect(csv).toHaveAttribute("aria-expanded", "false");
    expect(csv).toHaveAttribute("aria-controls", "csv-start-panel");

    fireEvent.click(manual);
    const manualHeading = await screen.findByRole("heading", {
      name: "Add your first transaction",
    });
    expect(manualHeading).toHaveFocus();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();

    fireEvent.click(csv);
    const csvHeading = await screen.findByRole("heading", { name: "Import bank movements" });
    expect(csvHeading).toHaveFocus();
    expect(screen.getByLabelText("CSV file")).toBeVisible();
    await waitFor(() => expect(manual).toHaveAttribute("aria-expanded", "false"));
    expect(csv).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps an unfinished draft when switching first actions", async () => {
    render(<BooksWorkspacePage />);
    await screen.findByRole("heading", { name: "Your books" });

    fireEvent.click(screen.getByRole("button", { name: "Add one transaction" }));
    const amount = screen.getByLabelText("Amount (£)");
    fireEvent.change(amount, { target: { value: "12.34" } });

    fireEvent.click(screen.getByRole("button", { name: "Import a CSV" }));
    expect(screen.getByLabelText("CSV file")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Add one transaction" }));

    expect(screen.getByLabelText("Amount (£)")).toHaveValue("12.34");
  });

  it("preserves the UK property choice from the front door", async () => {
    window.history.replaceState({}, "", "/books/workspace?activity=uk-property");
    render(<BooksWorkspacePage />);
    await screen.findByRole("heading", { name: "Your books" });

    fireEvent.click(screen.getByRole("button", { name: "Add one transaction" }));

    expect(screen.getByRole("radio", { name: /UK property/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Self-employment/i })).not.toBeChecked();
  });

  it("opens the requested real start from the connection guide", async () => {
    window.history.replaceState({}, "", "/books/workspace?start=csv");
    render(<BooksWorkspacePage />);

    const csvHeading = await screen.findByRole("heading", { name: "Import bank movements" });
    await waitFor(() => expect(csvHeading).toHaveFocus());
    expect(screen.getByRole("button", { name: "Import a CSV" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByLabelText("CSV file")).toBeVisible();
  });

  it("hands reviewed and scope-confirmed books to the quarter and full filing path", async () => {
    store.state.mockResolvedValue(readyBooks());
    render(<BooksWorkspacePage />);

    expect(await screen.findByRole("link", { name: /review this Income Tax quarter/i }))
      .toHaveAttribute("href", "/itsa/quarter");
    expect(screen.getByRole("link", { name: /full records-to-receipt path/i }))
      .toHaveAttribute("href", "/books/connect");
  });

  it("keeps focus and a visible success message after the first record is added", async () => {
    const populated = {
      schema: "taxsorted.local-books/2",
      storeRevision: 1,
      ledgers: [
        {
          id: "ledger:self-employment:primary",
          name: "My first business",
          activity: "self-employment",
          scopeState: "needs-confirmation",
        },
      ],
      events: [
        {
          id: "event-1",
          ledgerId: "ledger:self-employment:primary",
          revision: 1,
          reviewState: "needs-review",
          occurredOn: "2026-07-31",
          cash: { amount: 1250, currency: "GBP", direction: "in" },
          postings: [
            { kind: "income", category: "turnover", amount: 1250, effect: "increase" },
          ],
          origin: { kind: "manual" },
          contentDigest: "digest-1",
          createdAt: "2026-07-31T12:00:00.000Z",
          updatedAt: "2026-07-31T12:00:00.000Z",
        },
      ],
      history: [],
      imports: [],
    };
    store.add.mockImplementation(async () => {
      store.state.mockResolvedValue(populated);
      return populated.events[0];
    });

    render(<BooksWorkspacePage />);
    await screen.findByRole("heading", { name: "Your books" });
    fireEvent.click(screen.getByRole("button", { name: "Add one transaction" }));
    fireEvent.change(screen.getByLabelText("Amount (£)"), { target: { value: "12.50" } });
    const submit = screen.getByRole("button", { name: "Add record" });
    submit.focus();
    fireEvent.click(submit);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Record added to your Money Inbox.",
    );
    expect(submit).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Money Inbox" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done with this first step" }))
      .toBeInTheDocument();
  });
});
