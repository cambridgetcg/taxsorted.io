// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaxYearProgressPanel } from "../tax-year-progress";
import { TAX_YEAR_PERIOD, type TaxYearProgress } from "@/lib/tax-year-progress";

const reader = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tax-year-progress", () => ({
  readTaxYearProgress: reader,
  TAX_YEAR_PERIOD: { id: "2026-27", label: "2026–27", start: "2026-04-06", end: "2027-04-05" },
}));

function snapshot(overrides: Partial<TaxYearProgress> = {}): TaxYearProgress {
  return {
    period: TAX_YEAR_PERIOD,
    readAt: "2026-09-30T10:00:00.000Z",
    books: { status: "saved", activities: {
      "self-employment": { records: 12, checked: 7, needsReview: 3, excluded: 2, businesses: 1, unconfirmedBusinesses: 1 },
      "uk-property": { records: 8, checked: 4, needsReview: 4, excluded: 0, businesses: 1, unconfirmedBusinesses: 0 },
    } },
    passport: { status: "saved", savedAt: "2026-09-29T08:00:00.000Z", sourceQuestions: { total: 5, unanswered: 2, explicitlyUnknown: 1 }, evidence: { held: 2, missing: 1, notChecked: 3, notExpected: 0 }, hasMtdCheck: true },
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function show() {
  fireEvent.click(screen.getByRole("button", { name: "Show my saved progress" }));
  await screen.findByText(/Snapshot read/);
}

function expectCount(region: HTMLElement, label: string, count: number) {
  expect(within(region).getByText(label, { selector: "dt" }).nextElementSibling).toHaveTextContent(String(count));
}

beforeEach(() => { vi.clearAllMocks(); reader.mockReset(); reader.mockResolvedValue(snapshot()); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("My tax year saved progress", () => {
  it("reads nothing before the person explicitly chooses this visit's overview", async () => {
    render(<TaxYearProgressPanel audience="sole-traders" />);
    expect(reader).not.toHaveBeenCalled();
    expect(screen.getByText(/No information is uploaded, copied between tools or saved by this overview/)).toBeInTheDocument();
    expect(screen.getByText(/Your choice lasts for this visit/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your sole-trader records" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await show();
    expect(reader).toHaveBeenCalledExactlyOnceWith();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows only the chosen activity's year counts and separates unanswered facts from explicit uncertainty", async () => {
    render(<TaxYearProgressPanel audience="sole-traders" />);
    await show();
    const books = screen.getByRole("region", { name: "Your sole-trader records" });
    expectCount(books, "Records saved", 12);
    expectCount(books, "Records to check", 3);
    expectCount(books, "Businesses to confirm", 1);
    expect(within(books).getByText(/6 April 2026 to 5 April 2027/)).toBeInTheDocument();
    expect(within(books).getByText(/Money records opens all saved dates and businesses/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Your property records" })).not.toBeInTheDocument();
    const passport = screen.getByRole("region", { name: "Your income sources and evidence notes" });
    expectCount(passport, "Unanswered income-source questions", 2);
    expectCount(passport, "Income sources marked “Not sure”", 1);
    expectCount(passport, "Evidence marked missing", 1);
    expect(within(passport).getByText(/Passport facts are not tied to a tax year/)).toBeInTheDocument();
    expect(within(passport).getByText(/Last saved/).querySelector("time")).toHaveAttribute("datetime", "2026-09-29T08:00:00.000Z");
    expect(within(passport).getByText(/based on your saved income-source answers and evidence labels/)).toBeInTheDocument();
    expect(within(passport).getByText(/Documents have not been uploaded, inspected or verified/)).toBeInTheDocument();
  });

  it("prioritises at most three actions and carries property context to the existing Books destinations", async () => {
    const value = snapshot();
    if (value.books.status === "saved") value.books.activities["uk-property"].unconfirmedBusinesses = 1;
    reader.mockResolvedValue(value);
    render(<TaxYearProgressPanel audience="landlords" />);
    await show();
    const books = screen.getByRole("region", { name: "Your property records" });
    expectCount(books, "Records saved", 8);
    expectCount(books, "Records to check", 4);
    const actions = within(screen.getByRole("region", { name: "Choose a next step" })).getAllByRole("link");
    expect(actions).toHaveLength(3);
    expect(actions[0]).toHaveAccessibleName("Check your money records");
    expect(actions[0]).toHaveAttribute("href", "/books/workspace/money?activity=uk-property#money-inbox-heading");
    expect(actions[1]).toHaveAttribute("href", "/books/workspace/business?activity=uk-property#ledger-scope-heading");
    expect(actions[2]).toHaveAttribute("href", "/passport#passport-income-title");
    expect(screen.queryByRole("link", { name: "Review your evidence notes" })).not.toBeInTheDocument();
  });

  it("keeps an individual's overview on Passport facts instead of implying business records apply", async () => {
    render(<TaxYearProgressPanel audience="individuals" />);
    await show();
    expect(screen.queryByRole("region", { name: "Your sole-trader records" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Your property records" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your income sources and evidence notes" })).toBeInTheDocument();
    expect(screen.getAllByRole("link").every(link => link.getAttribute("href")?.startsWith("/passport"))).toBe(true);
  });

  it.each([
    ["missing", /No saved Books were found/, "Start or restore your Books"],
    ["legacy", /Earlier Books were found/, "Open your existing Books"],
    ["invalid", /saved Books format could not be read/, "Open Money records"],
    ["unavailable", /Books storage is unavailable/, "Open Money records"],
  ] as const)("distinguishes %s Books without hiding readable Passport progress or inventing zero counts", async (status, text, action) => {
    reader.mockResolvedValue(snapshot({ books: { status } }));
    render(<TaxYearProgressPanel audience="sole-traders" />);
    await show();
    const books = screen.getByRole("region", { name: "Your sole-trader records" });
    expect(within(books).getByText(text)).toBeInTheDocument();
    expect(within(books).queryByText("Records saved")).not.toBeInTheDocument();
    expectCount(screen.getByRole("region", { name: "Your income sources and evidence notes" }), "Unanswered income-source questions", 2);
    expect(screen.getByRole("link", { name: action })).toHaveAttribute("href", "/books/workspace?activity=self-employment");
  });

  it.each([
    ["missing", /No saved Tax Passport was found/],
    ["invalid", /saved Passport format could not be read/],
    ["unavailable", /Passport storage is unavailable/],
  ] as const)("keeps Books visible when Passport is %s", async (status, text) => {
    reader.mockResolvedValue(snapshot({ passport: { status } }));
    render(<TaxYearProgressPanel audience="landlords" />);
    await show();
    expectCount(screen.getByRole("region", { name: "Your property records" }), "Records saved", 8);
    const passport = screen.getByRole("region", { name: "Your income sources and evidence notes" });
    expect(within(passport).getByText(text)).toBeInTheDocument();
    expect(within(passport).queryByText("Unanswered income-source questions")).not.toBeInTheDocument();
  });

  it("does not infer readiness or tick a checklist when every displayed waiting count is zero", async () => {
    const value = snapshot();
    if (value.books.status === "saved") Object.assign(value.books.activities["self-employment"], { needsReview: 0, unconfirmedBusinesses: 0 });
    if (value.passport.status === "saved") {
      Object.assign(value.passport.sourceQuestions, { unanswered: 0, explicitlyUnknown: 0 });
      Object.assign(value.passport.evidence, { missing: 0, notChecked: 0 });
    }
    reader.mockResolvedValue(value);
    render(<TaxYearProgressPanel audience="sole-traders" />);
    await show();
    expect(screen.getByText(/do not establish complete records, correct tax treatment or readiness to file/)).toBeInTheDocument();
    expect(screen.getByText(/this overview checks no boxes and sends nothing to HMRC/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/ready to file|all complete|all done/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review your saved records" })).toBeInTheDocument();
  });

  it("refreshes only on request, then hiding clears the snapshot and returns focus to the consent button", async () => {
    render(<TaxYearProgressPanel audience="sole-traders" />);
    await show();
    expect(reader).toHaveBeenCalledTimes(1);
    const changed = snapshot();
    if (changed.books.status === "saved") changed.books.activities["self-employment"].needsReview = 6;
    reader.mockResolvedValueOnce(changed);
    fireEvent.click(screen.getByRole("button", { name: "Refresh saved progress" }));
    await screen.findByText(/Snapshot read/);
    expectCount(screen.getByRole("region", { name: "Your sole-trader records" }), "Records to check", 6);
    expect(reader).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Hide saved progress" }));
    expect(screen.queryByRole("region", { name: "Your sole-trader records" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Choose a next step" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Show my saved progress" })).toHaveFocus());
    expect(reader).toHaveBeenCalledTimes(2);
  });

  it("ignores a late read after hiding and does not let it overwrite a newly requested snapshot", async () => {
    const old = deferred<TaxYearProgress>();
    reader.mockReturnValueOnce(old.promise);
    render(<TaxYearProgressPanel audience="landlords" />);
    fireEvent.click(screen.getByRole("button", { name: "Show my saved progress" }));
    expect(screen.getByRole("status")).toHaveTextContent("Reading saved progress");
    expect(screen.getByRole("button", { name: "Refresh saved progress" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Hide saved progress" }));
    await show();
    await act(async () => { old.resolve(snapshot({ books: { status: "invalid" } })); await old.promise; });
    expectCount(screen.getByRole("region", { name: "Your property records" }), "Records saved", 8);
    expect(screen.queryByText(/saved Books format could not be read/)).not.toBeInTheDocument();
  });

  it("keeps a hidden overview empty when its pending read finishes", async () => {
    const pending = deferred<TaxYearProgress>();
    reader.mockReturnValueOnce(pending.promise);
    render(<TaxYearProgressPanel audience="landlords" />);
    fireEvent.click(screen.getByRole("button", { name: "Show my saved progress" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide saved progress" }));
    await act(async () => { pending.resolve(snapshot()); await pending.promise; });
    expect(screen.getByRole("button", { name: "Show my saved progress" })).toHaveFocus();
    expect(screen.queryByText(/Snapshot read/)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Your property records" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Choose a next step" })).not.toBeInTheDocument();
  });

  it("requires fresh consent after an audience change and ignores the previous audience's pending read", async () => {
    const old = deferred<TaxYearProgress>();
    reader.mockReturnValueOnce(old.promise);
    const view = render(<TaxYearProgressPanel audience="sole-traders" />);
    fireEvent.click(screen.getByRole("button", { name: "Show my saved progress" }));
    view.rerender(<TaxYearProgressPanel audience="landlords" />);
    await act(async () => { old.resolve(snapshot()); await old.promise; });
    expect(screen.getByRole("button", { name: "Show my saved progress" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Your sole-trader records" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Your property records" })).not.toBeInTheDocument();
    expect(reader).toHaveBeenCalledTimes(1);
    await show();
    expect(screen.getByRole("region", { name: "Your property records" })).toBeInTheDocument();
  });

  it("does not repopulate an overview that has unmounted", async () => {
    const pending = deferred<TaxYearProgress>();
    reader.mockReturnValueOnce(pending.promise);
    const view = render(<TaxYearProgressPanel audience="sole-traders" />);
    fireEvent.click(screen.getByRole("button", { name: "Show my saved progress" }));
    view.unmount();
    await act(async () => { pending.resolve(snapshot()); await pending.promise; });
    expect(screen.queryByRole("region", { name: "Your saved progress" })).not.toBeInTheDocument();
  });

  it("keeps unexpected reader failures bounded and lets the person retry", async () => {
    reader.mockRejectedValueOnce(new Error("Private underlying diagnostic"));
    render(<TaxYearProgressPanel audience="sole-traders" />);
    fireEvent.click(screen.getByRole("button", { name: "Show my saved progress" }));
    expect(await screen.findByText(/Saved progress could not be read/)).toHaveAttribute("role", "status");
    expect(screen.queryByText("Private underlying diagnostic")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh saved progress" }));
    await screen.findByText(/Snapshot read/);
    expect(screen.getByRole("region", { name: "Your sole-trader records" })).toBeInTheDocument();
  });

  it.each(["advisers", "organisations"] as const)("does not infer a client or organisation snapshot for %s", audience => {
    render(<TaxYearProgressPanel audience={audience} />);
    expect(reader).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Show my saved progress" })).not.toBeInTheDocument();
  });
});
