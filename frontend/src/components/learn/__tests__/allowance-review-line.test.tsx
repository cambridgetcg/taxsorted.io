// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { AllowanceReviewLine } from "../allowance-review-line";

function choose(name: string) {
  fireEvent.click(screen.getByRole("radio", { name }));
  fireEvent.click(screen.getByRole("button", { name: "Open the reasoning receipt" }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Allowance Review Line", () => {
  it("starts with one explicit unknown and keeps the source available before prediction", () => {
    render(<AllowanceReviewLine />);

    expect(screen.getByRole("heading", {
      name: "The arithmetic was easy. Were you allowed to run it?",
    })).toBeInTheDocument();
    expect(screen.getByText(/payer records have not been checked/i)).toBeInTheDocument();
    expect(screen.getByText(/no other trading or miscellaneous income/i))
      .toBeInTheDocument();
    expect(screen.getByText(/no capital allowances/i)).toBeInTheDocument();
    const incomeSourceGroup = screen.getByRole("group", {
      name: "Change one fact: who paid the income",
    });
    expect(within(incomeSourceGroup).getAllByRole("radio")).toHaveLength(3);
    expect(within(incomeSourceGroup).getByRole("radio", {
      name: /Payer records not checked/i,
    })).toBeChecked();
    const completePayerCheck = within(incomeSourceGroup).getByText(/Complete relevant-income payer check/i);
    expect(completePayerCheck).toHaveTextContent(/spouse or civil partner is employed by the payer/i);
    expect(completePayerCheck).toHaveTextContent(/participator or an associate of a participator/i);
    expect(completePayerCheck).toHaveTextContent(/partner or connected with a partner/i);
    expect(screen.getByRole("link", {
      name: /GOV.UK — trading and property income allowances.*opens in a new tab/i,
    })).toHaveAttribute(
      "href",
      "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    );
    expect(screen.getByRole("link", {
      name: /HMRC BIM86015 — relevant income and partial relief.*opens in a new tab/i,
    })).toHaveAttribute(
      "href",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86015",
    );
    expect(screen.getByRole("link", {
      name: /HMRC BIM86050 — capital allowances.*opens in a new tab/i,
    })).toHaveAttribute(
      "href",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86050",
    );
    expect(screen.queryByText("A clean stop")).not.toBeInTheDocument();
  });

  it("rewards unresolved payer evidence as a valid, non-money stop", () => {
    render(<AllowanceReviewLine />);
    choose("Stop — one material fact is still missing");

    expect(screen.getByText(/Good stop/i)).toBeInTheDocument();
    expect(screen.getByText("A clean stop")).toBeInTheDocument();
    expect(screen.getByText("Needs review · valid boundary")).toBeInTheDocument();
    expect(screen.getByText("No profit route or tax figure emitted.")).toBeInTheDocument();
    expect(screen.getByText("Material unknown kept visible")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\byou saved\b|\bpoints\b|\bXP\b|\bstreak\b/i);
    expect(screen.queryByText(/£4,000\.00 trading profit/i)).not.toBeInTheDocument();
  });

  it("calculates both routes only after checked payer records establish the source", () => {
    render(<AllowanceReviewLine />);
    fireEvent.click(screen.getByRole("radio", { name: /Unconnected customers only/i }));
    choose("Compare — the trading allowance route leaves lower profit");

    expect(screen.getByText("A bounded projected calculation")).toBeInTheDocument();
    expect(screen.getByText(/£1,000\.00 deduction \(up to the £1,000\.00 limit\) → £4,000\.00 projected trading profit/))
      .toBeInTheDocument();
    expect(screen.getByText(/£600\.00 total deductions → £4,400\.00 projected trading profit/))
      .toBeInTheDocument();
    expect(screen.getByText("Scenario route availability derived from payer facts"))
      .toBeInTheDocument();
    expect(screen.getByText(/does not establish completed facts, final tax/i)).toBeInTheDocument();
  });

  it("removes the allowance route when an exclusion is known", () => {
    render(<AllowanceReviewLine />);
    fireEvent.click(screen.getByRole("radio", { name: /^Mina’s employer at payment time\b/i }));
    choose("Use the ordinary method — it is the available or lower-profit route");

    expect(screen.getByText(/Unavailable because the scenario payer employed Mina when it paid the income/i))
      .toBeInTheDocument();
    expect(screen.getByText("Unavailable route removed before calculation"))
      .toBeInTheDocument();
    expect(screen.getByText(/Review line: Ordinary-method route/i)).toBeInTheDocument();
  });

  it("makes a useful miss inspectable without awarding the reasoning value", () => {
    render(<AllowanceReviewLine />);
    choose("Compare — the trading allowance route leaves lower profit");

    expect(screen.getByText(/Useful miss/i)).toBeInTheDocument();
    expect(screen.getByText("A clean stop")).toBeInTheDocument();
    expect(screen.queryByText("Material unknown kept visible")).not.toBeInTheDocument();
  });

  it("clears the prior prediction and receipt whenever the material fact changes", () => {
    render(<AllowanceReviewLine />);
    choose("Stop — one material fact is still missing");
    expect(screen.getByText("A clean stop")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Unconnected customers only/i }));

    expect(screen.queryByText("A clean stop")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", {
      name: "Stop — one material fact is still missing",
    })).not.toBeChecked();
    expect(screen.getByText(/Unconnected customers only: Complete relevant-income payer check/i))
      .toBeInTheDocument();
  });

  it("asks for a position without inventing a default answer", () => {
    render(<AllowanceReviewLine />);
    fireEvent.click(screen.getByRole("button", { name: "Open the reasoning receipt" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/choose where the review line belongs/i);
    expect(screen.queryByText("A clean stop")).not.toBeInTheDocument();
  });

  it("changes the lesson to a source stop after the review deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-26T12:00:00Z"));
    render(<AllowanceReviewLine />);

    expect(screen.getByText(/Source stop: this ruleset is not valid for today/i))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Unconnected customers only/i }));
    choose("Stop — one material fact is still missing");

    expect(screen.getByText(/source review is not valid for today/i)).toBeInTheDocument();
    expect(screen.getByText("Stale rules stopped before arithmetic")).toBeInTheDocument();
    expect(screen.queryByText(/£4,000\.00 trading profit/i)).not.toBeInTheDocument();
  });
});
