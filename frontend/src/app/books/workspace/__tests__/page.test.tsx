// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BooksWorkspacePage from "../page";
import BooksBusinessPage from "../business/page";
import BooksMoneyPage from "../money/page";
import BooksTaxPage from "../tax/page";
import {
  emptyLocalBooks,
  eventFromRecord,
  type LocalBooksState,
} from "@/lib/local-books";

const NOW = "2026-08-20T12:00:00.000Z";

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

function emptyBooks(): LocalBooksState {
  return emptyLocalBooks({
    replicaId: "workspace-test-replica",
    createdAt: NOW,
  });
}

function readyBooks(): LocalBooksState {
  const state = emptyBooks();
  state.storeRevision = 3;
  state.ledgers = [
      {
        id: "ledger:self-employment:primary",
        name: "My first business",
        activity: "self-employment",
        scopeState: "confirmed",
        scopeConfirmedAt: "2026-07-31T12:05:00.000Z",
      },
    ];
  state.events = [
      eventFromRecord(
        {
          date: "2026-07-31",
          amount: 1250,
          kind: "income",
          category: "turnover",
          source: "self-employment",
        },
        {
          id: "event-ready",
          ledgerId: "ledger:self-employment:primary",
          now: NOW,
          reviewState: "ready",
          origin: { kind: "manual" },
          contentDigest: "digest-ready",
        },
      ),
    ];
  return state;
}

function mixedBooks(): LocalBooksState {
  const state = emptyBooks();
  state.ledgers = [
    {
      id: "trade",
      name: "Card shop",
      activity: "self-employment",
      scopeState: "confirmed",
      scopeConfirmedAt: NOW,
    },
    {
      id: "property",
      name: "Garden flat",
      activity: "uk-property",
      scopeState: "confirmed",
      scopeConfirmedAt: NOW,
    },
    {
      id: "property-to-check",
      name: "Second property group",
      activity: "uk-property",
      scopeState: "needs-confirmation",
    },
  ];
  const makeEvent = ({
    id,
    ledgerId,
    source,
    amount,
    reviewState,
  }: {
    id: string;
    ledgerId: string;
    source: "self-employment" | "uk-property";
    amount: number;
    reviewState: "needs-review" | "ready" | "excluded";
  }) =>
    eventFromRecord(
      {
        date: "2026-07-31",
        amount,
        kind: "income",
        category: source === "self-employment" ? "turnover" : "periodAmount",
        source,
      },
      {
        id,
        ledgerId,
        now: NOW,
        reviewState,
        origin: { kind: "manual" },
        contentDigest: `digest-${id}`,
      },
    );
  state.events = [
    makeEvent({ id: "trade-ready", ledgerId: "trade", source: "self-employment", amount: 1250, reviewState: "ready" }),
    makeEvent({ id: "property-ready", ledgerId: "property", source: "uk-property", amount: 2000, reviewState: "ready" }),
    makeEvent({ id: "waiting", ledgerId: "trade", source: "self-employment", amount: 300, reviewState: "needs-review" }),
    makeEvent({ id: "excluded", ledgerId: "trade", source: "self-employment", amount: 400, reviewState: "excluded" }),
    makeEvent({ id: "scope-waiting", ledgerId: "property-to-check", source: "uk-property", amount: 500, reviewState: "ready" }),
  ];
  return state;
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
  it("gives Today one truthful status and no completeness claim", async () => {
    render(<BooksWorkspacePage />);

    expect(await screen.findByRole("heading", { name: "Your business money" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "No records yet" })).toBeInTheDocument();
    expect(screen.getByText(/up to one UK sole-trader business and one UK property business/i))
      .toBeInTheDocument();
    expect(screen.getByText(/TaxSorted does not encrypt or back them up/i)).toBeInTheDocument();
    expect(screen.getByText(/signing in does not put them on another device/i))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Add money in or out/ }))
      .toHaveAttribute("href", "/books/workspace/money?start=manual");
    expect(screen.queryByText(/up to date/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/books are complete/i)).not.toBeInTheDocument();
  });

  it("gives the Money view two explicit first actions", async () => {
    render(<BooksMoneyPage />);

    expect(await screen.findByRole("heading", { name: "Your business money" })).toBeInTheDocument();

    const manual = await screen.findByRole("button", { name: "Add money in or out" });
    const csv = screen.getByRole("button", { name: "Bring in a CSV file" });
    expect(manual).toHaveAttribute("aria-expanded", "false");
    expect(manual).toHaveAttribute("aria-controls", "manual-start-panel");
    expect(csv).toHaveAttribute("aria-expanded", "false");
    expect(csv).toHaveAttribute("aria-controls", "csv-start-panel");

    fireEvent.click(manual);
    const manualHeading = await screen.findByRole("heading", {
      name: "Add money in or out",
    });
    expect(manualHeading).toHaveFocus();
    expect(screen.getByLabelText("When did the money move?")).toBeInTheDocument();

    fireEvent.click(csv);
    const csvHeading = await screen.findByRole("heading", { name: "Bring in a CSV file" });
    expect(csvHeading).toHaveFocus();
    expect(screen.getByLabelText("Bank or bookkeeping file (.csv)")).toBeVisible();
    await waitFor(() => expect(manual).toHaveAttribute("aria-expanded", "false"));
    expect(csv).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps an unfinished draft when switching first actions", async () => {
    render(<BooksMoneyPage />);
    await screen.findByRole("heading", { name: "Your business money" });

    fireEvent.click(await screen.findByRole("button", { name: "Add money in or out" }));
    const amount = screen.getByLabelText("How much?");
    fireEvent.change(amount, { target: { value: "12.34" } });

    fireEvent.click(screen.getByRole("button", { name: "Bring in a CSV file" }));
    expect(screen.getByLabelText("Bank or bookkeeping file (.csv)")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Add money in or out" }));

    expect(screen.getByLabelText("How much?")).toHaveValue("12.34");
  });

  it("preserves the UK property choice from the front door", async () => {
    window.history.replaceState({}, "", "/books/workspace/money?activity=uk-property");
    render(<BooksMoneyPage />);
    await screen.findByRole("heading", { name: "Your business money" });

    fireEvent.click(await screen.findByRole("button", { name: "Add money in or out" }));

    expect(screen.getByRole("radio", { name: "A property I let" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "My own business" })).not.toBeChecked();
  });

  it("opens the requested real start from the connection guide", async () => {
    window.history.replaceState({}, "", "/books/workspace/money?start=csv");
    render(<BooksMoneyPage />);

    const csvHeading = await screen.findByRole("heading", { name: "Bring in a CSV file" });
    await waitFor(() => expect(csvHeading).toHaveFocus());
    expect(screen.getByRole("button", { name: "Bring in a CSV file" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByLabelText("Bank or bookkeeping file (.csv)")).toBeVisible();
  });

  it("hands reviewed and scope-confirmed books to the quarter and full filing path", async () => {
    store.state.mockResolvedValue(readyBooks());
    render(<BooksTaxPage />);

    expect(await screen.findByRole("link", { name: /check this quarter before sending anything/i }))
      .toHaveAttribute("href", "/itsa/quarter");
    expect(screen.getByRole("link", { name: /see how records could reach HMRC/i }))
      .toHaveAttribute("href", "/books/connect");
    expect(screen.getAllByText(/nothing has been sent/i)).not.toHaveLength(0);
    expect(screen.getByText(/these figures exactly add up the checked records/i))
      .toBeInTheDocument();
    expect(screen.getByText(/they may still be incomplete/i)).toBeInTheDocument();
    expect(screen.queryByText(/every figure here is an estimate/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /tax due/i })).not.toBeInTheDocument();
  });

  it("shows bounded per-business figures without claiming a balance or accounting profit", async () => {
    store.state.mockResolvedValue(readyBooks());
    render(<BooksBusinessPage />);

    expect(await screen.findByRole("heading", { name: "Each business stays separate" }))
      .toBeInTheDocument();
    expect(screen.getByText("Income recorded")).toBeInTheDocument();
    expect(screen.getByText("Costs recorded")).toBeInTheDocument();
    expect(screen.getByText("Income less recorded costs")).toBeInTheDocument();
    expect(screen.getAllByText("£12.50")).toHaveLength(2);
    expect(screen.getByText(/these totals are not bank cash or final profit/i))
      .toBeInTheDocument();
    expect(screen.getByText(/bank checking, invoices and bills, assets and debts/i))
      .toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /bank balance|accounting profit/i }))
      .not.toBeInTheDocument();
  });

  it("keeps two businesses separate and names every kind of omitted Tax record", async () => {
    store.state.mockResolvedValue(mixedBooks());
    const business = render(<BooksBusinessPage />);

    expect(await screen.findByRole("heading", { name: "Card shop" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Garden flat" })).toBeInTheDocument();
    expect(screen.getByText(/across all the dates shown/i)).toBeInTheDocument();
    expect(screen.getAllByText("£12.50")).toHaveLength(2);
    expect(screen.getAllByText("£20")).toHaveLength(2);
    expect(screen.getByText(/2 waiting or left-out items are not included/i))
      .toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Check this again — Card shop" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Card shop business check" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Check this again — Garden flat" }),
    ).toBeInTheDocument();
    business.unmount();

    render(<BooksTaxPage />);
    expect(await screen.findByRole("heading", { name: "Card shop" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Garden flat" })).toBeInTheDocument();
    expect(screen.getByText("£12.50")).toBeInTheDocument();
    expect(screen.getByText("£20")).toBeInTheDocument();
    expect(screen.getByText(/1 waiting item is not included/i)).toBeInTheDocument();
    expect(screen.getByText(/1 checked item is waiting for a business check/i))
      .toBeInTheDocument();
    expect(screen.getByText(/1 saved item is marked not counted/i)).toBeInTheDocument();
    expect(screen.getByText(/standard update periods/i)).toBeInTheDocument();
    expect(screen.getByText(/calendar-quarter periods are not supported yet/i))
      .toBeInTheDocument();
  });

  it("moves focus to a saved message after a business check", async () => {
    store.state.mockResolvedValue(mixedBooks());
    store.confirmLedger.mockResolvedValue({});
    render(<BooksBusinessPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Yes, these all belong to one business — Second property group",
      }),
    );

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Business check saved for Second property group.");
    await waitFor(() => expect(status).toHaveFocus());
  });

  it("keeps a failed business check plain and leaves technical detail optional", async () => {
    store.state.mockResolvedValue(mixedBooks());
    store.confirmLedger.mockRejectedValue(new Error("ledger not found"));
    render(<BooksBusinessPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Yes, these all belong to one business — Second property group",
      }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "We couldn’t save this business check. Nothing was changed. Try again.",
    );
    expect(screen.getByText("Technical detail")).toBeInTheDocument();
    expect(screen.queryByText("ledger not found")).not.toBeVisible();
  });

  it("keeps focus and a visible success message after the first record is added", async () => {
    const populated = emptyBooks();
    populated.storeRevision = 1;
    populated.ledgers = [
      {
        id: "ledger:self-employment:primary",
        name: "My first business",
        activity: "self-employment",
        scopeState: "needs-confirmation",
      },
    ];
    populated.events = [
      eventFromRecord(
        {
          date: "2026-07-31",
          amount: 1250,
          kind: "income",
          category: "turnover",
          source: "self-employment",
        },
        {
          id: "event-1",
          ledgerId: "ledger:self-employment:primary",
          now: NOW,
          reviewState: "needs-review",
          origin: { kind: "manual" },
          contentDigest: "digest-1",
        },
      ),
    ];
    store.add.mockImplementation(async () => {
      store.state.mockResolvedValue(populated);
      return populated.events[0];
    });

    render(<BooksMoneyPage />);
    await screen.findByRole("heading", { name: "Your business money" });
    fireEvent.click(await screen.findByRole("button", { name: "Add money in or out" }));
    fireEvent.change(screen.getByLabelText("How much?"), { target: { value: "12.50" } });
    const submit = screen.getByRole("button", { name: "Add to check" });
    submit.focus();
    fireEvent.click(submit);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Added. Check this item before it changes your totals.",
    );
    expect(submit).toHaveFocus();
    expect(screen.getByRole("heading", { name: "To check" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish adding for now" }))
      .toBeInTheDocument();
  });
});
