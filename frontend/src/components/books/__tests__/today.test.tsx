// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BooksSummary } from "@/lib/books-summary";
import { BooksToday } from "../today";

function summary(overrides: Partial<BooksSummary> = {}): BooksSummary {
  return {
    eventCount: 0,
    needsReviewCount: 0,
    excludedCount: 0,
    readyWaitingForScopeCount: 0,
    readyConfirmedCount: 0,
    ledgers: [],
    ...overrides,
  };
}

function actionLinks() {
  const actions = screen.getByRole("region", { name: "Choose one small next action" });
  return within(actions).getAllByRole("link");
}

describe("Books Today", () => {
  it("puts waiting items first and shows no more than three action cards", () => {
    render(
      <BooksToday
        summary={summary({
          eventCount: 6,
          needsReviewCount: 2,
          excludedCount: 2,
          readyWaitingForScopeCount: 1,
          readyConfirmedCount: 1,
        })}
      />,
    );

    expect(screen.getByRole("heading", { name: "2 items need your check" })).toBeInTheDocument();
    const links = actionLinks();
    expect(links).toHaveLength(3);
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining("Check 2 waiting items"),
      expect.stringContaining("Confirm each group covers one business"),
      expect.stringContaining("See what the records show"),
    ]);
    expect(links[0]).toHaveAttribute("href", "/books/workspace/money");
    expect(links[0]).toHaveAccessibleDescription(
      "They do not change a total until you say what happened.",
    );
    expect(screen.queryByRole("link", { name: "See the Income Tax view" })).not.toBeInTheDocument();
    expect(screen.queryByText(/step 1/i)).not.toBeInTheDocument();
  });

  it("puts the business answer first when nothing needs transaction review", () => {
    render(
      <BooksToday
        summary={summary({
          eventCount: 3,
          readyWaitingForScopeCount: 2,
          readyConfirmedCount: 1,
        })}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "2 checked items cannot count yet" }),
    ).toBeInTheDocument();
    const [first] = actionLinks();
    expect(first).toHaveTextContent("Confirm each group covers one business");
    expect(first).toHaveAttribute("href", "/books/workspace/business");
    expect(first).toHaveAccessibleDescription(
      "Checked items stay out of totals until you confirm each group contains records for one separate business.",
    );
  });

  it("offers both bounded business and Income Tax views for confirmed records", () => {
    render(
      <BooksToday
        summary={summary({
          eventCount: 1,
          readyConfirmedCount: 1,
        })}
      />,
    );

    const business = screen.getByRole("link", { name: "See what the records show" });
    expect(business).toHaveAttribute("href", "/books/workspace/business");
    expect(business).toHaveAccessibleDescription(
      "View each confirmed business separately, with the dates and limits beside it.",
    );

    const tax = screen.getByRole("link", { name: "See the Income Tax view" });
    expect(tax).toHaveAttribute("href", "/books/workspace/tax");
    expect(tax).toHaveAccessibleDescription(
      "Inspect cumulative category totals. Nothing has been sent.",
    );
  });

  it("describes an excluded-only book as not waiting, not complete", () => {
    render(
      <BooksToday
        summary={summary({
          eventCount: 2,
          excludedCount: 2,
        })}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Nothing is waiting for your check" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Not counted").parentElement).toHaveTextContent(/Not counted\s*2/);
    expect(screen.getByText(/does not prove every movement is present/i)).toBeInTheDocument();
    expect(actionLinks()).toHaveLength(2);
    expect(screen.getByRole("link", { name: "See 2 items not counted" }))
      .toHaveAccessibleDescription(
        "They stay in history and out of totals unless you send one back to To check.",
      );
    expect(screen.getByRole("link", { name: "Add more records" })).toHaveAttribute(
      "href",
      "/books/workspace/money",
    );
    expect(screen.queryByText(/your books are complete/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/everything is included/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/you(?:'|’)re up to date/i)).not.toBeInTheDocument();
  });
});
