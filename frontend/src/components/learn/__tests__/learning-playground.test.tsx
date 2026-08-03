// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LearningPlayground } from "../learning-playground";
import {
  LEARNING_PROGRESS_KEY,
  LEARNING_PROGRESS_SCHEMA,
  serializeLearningProgress,
} from "@/lib/learning-progress";

describe("learning playground", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts as an open, named radio game with no fake earnings total", () => {
    render(<LearningPlayground />);

    expect(screen.getByRole("progressbar", { name: "Learning rounds completed" }))
      .toHaveAttribute("value", "0");
    expect(screen.getByText("0 of 3 rounds completed")).not.toHaveAttribute("aria-live");
    expect(screen.getByRole("group", {
      name: "What should Mina keep visible in her books?",
    })).toBeInTheDocument();
    expect(screen.getByText(/different meanings.*never added/i)).toBeInTheDocument();
    expect(screen.queryByText(/you (saved|earned) £/i)).not.toBeInTheDocument();
  });

  it("explains a wrong move without taking a life or awarding progress", () => {
    render(<LearningPlayground />);

    fireEvent.click(screen.getByRole("radio", {
      name: "£162.00 sale and no separate fee",
    }));
    fireEvent.click(screen.getByRole("button", { name: "Check my move" }));

    expect(screen.getByRole("status")).toHaveTextContent("Useful miss");
    expect(screen.getByRole("status")).toHaveTextContent(/hides part of the sale/i);
    expect(screen.getByText("0 of 3 rounds completed")).toBeInTheDocument();
  });

  it("writes one honest ledger line and persists only the completed ID", async () => {
    render(<LearningPlayground />);

    fireEvent.click(screen.getByRole("radio", {
      name: "£180.00 sale, £18.00 fee and £162.00 payout",
    }));
    fireEvent.click(screen.getByRole("button", { name: "Check my move" }));

    expect(screen.getByRole("status")).toHaveTextContent("Correct move");
    expect(screen.getByText("1 of 3 rounds completed")).toBeInTheDocument();
    expect(screen.getAllByText("£18.00 of business cost kept in view").length)
      .toBeGreaterThan(0);
    expect(screen.getByText(/not £18 of accounting income or guaranteed tax saved/i))
      .toBeInTheDocument();

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(LEARNING_PROGRESS_KEY) ?? "{}")).toEqual({
        schema: LEARNING_PROGRESS_SCHEMA,
        completedIds: ["payout-puzzle"],
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Check my move" }));
    expect(JSON.parse(window.localStorage.getItem(LEARNING_PROGRESS_KEY) ?? "{}").completedIds)
      .toEqual(["payout-puzzle"]);
  });

  it("continues explicitly and moves focus to the next round heading", async () => {
    render(<LearningPlayground />);
    fireEvent.click(screen.getByRole("radio", {
      name: "£180.00 sale, £18.00 fee and £162.00 payout",
    }));
    fireEvent.click(screen.getByRole("button", { name: "Check my move" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to next round" }));

    const nextHeading = await screen.findByRole("heading", { name: "The £1,000 choice" });
    await waitFor(() => expect(nextHeading).toHaveFocus());
    expect(screen.getByRole("group", {
      name: /which route leaves the smaller trading profit/i,
    })).toBeInTheDocument();
    expect(screen.getByText(/Case scope: no other trading, miscellaneous or property income/i))
      .toBeVisible();
    expect(screen.getByText(/Complete ordinary-method deductions: £600\.00.*capital allowances are £0/i))
      .toBeVisible();
    expect(screen.getByRole("radio", {
      name: "Ordinary method → £4,400.00 trading profit",
    })).toBeInTheDocument();
  });

  it("keeps the source available before an answer and names the new tab", () => {
    render(<LearningPlayground />);

    expect(screen.getByRole("link", {
      name: /GOV.UK — cash-basis income and expenses.*opens in a new tab/i,
    })).toHaveAttribute(
      "href",
      "https://www.gov.uk/simpler-income-tax-cash-basis/income-and-expenses-under-cash-basis",
    );
  });

  it("shows estimated cash kept only with the worked-example boundary", () => {
    render(<LearningPlayground />);
    fireEvent.click(screen.getByRole("button", {
      name: /Round 2[\s\S]*Allowance choice/,
    }));
    fireEvent.click(screen.getByRole("radio", {
      name: "Trading allowance → £4,000.00 trading profit",
    }));
    fireEvent.click(screen.getByRole("button", { name: "Check my move" }));

    const continueButton = screen.getByRole("button", { name: "Continue to next round" });
    const depthTurn = screen.getByText("Optional depth turn · Open The Review Line");
    expect(continueButton.compareDocumentPosition(depthTurn) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    expect(screen.queryByRole("heading", {
      name: "The arithmetic was easy. Were you allowed to run it?",
    })).not.toBeVisible();
    fireEvent.click(depthTurn);

    expect(screen.getAllByText("£80.00 estimated tax kept").length).toBeGreaterThan(0);
    expect(screen.getByText(/£400 deduction difference.*£80 estimate.*not income/i))
      .toBeInTheDocument();
    const allowanceSourceLinks = screen.getAllByRole("link", {
      name: /GOV.UK — trading and property income allowances/i,
    });
    expect(allowanceSourceLinks).toHaveLength(2);
    for (const link of allowanceSourceLinks) {
      expect(link).toHaveAttribute(
        "href",
        "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
      );
    }
    expect(screen.getByRole("heading", {
      name: "The arithmetic was easy. Were you allowed to run it?",
    })).toBeInTheDocument();
  });

  it("keeps the optional Review Line available when the stable round ID was already completed", async () => {
    window.localStorage.setItem(
      LEARNING_PROGRESS_KEY,
      serializeLearningProgress(["allowance-choice"]),
    );
    render(<LearningPlayground />);

    fireEvent.click(screen.getByRole("button", {
      name: /Round 2[\s\S]*Allowance choice/,
    }));
    fireEvent.click(screen.getByText("Optional depth turn · Open The Review Line"));

    expect(await screen.findByRole("heading", {
      name: "The arithmetic was easy. Were you allowed to run it?",
    })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(LEARNING_PROGRESS_KEY) ?? "{}")).toEqual({
      schema: LEARNING_PROGRESS_SCHEMA,
      completedIds: ["allowance-choice"],
    });
  });

  it("restores valid progress and resets only its own storage key", async () => {
    window.localStorage.setItem(
      LEARNING_PROGRESS_KEY,
      serializeLearningProgress(["allowance-choice"]),
    );
    window.localStorage.setItem("keep-me", "still-here");
    render(<LearningPlayground />);

    expect(await screen.findByText("1 of 3 rounds completed")).toBeInTheDocument();
    expect(screen.getByText("£80.00 estimated tax kept")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset my practice" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, reset these rounds" }));

    expect(screen.getByText("0 of 3 rounds completed")).toBeInTheDocument();
    expect(window.localStorage.getItem(LEARNING_PROGRESS_KEY)).toBeNull();
    expect(window.localStorage.getItem("keep-me")).toBe("still-here");
  });

  it("moves reset focus into confirmation and safely back after either choice", async () => {
    render(<LearningPlayground />);

    fireEvent.click(screen.getByRole("button", { name: "Reset my practice" }));
    const firstConfirmation = screen.getByRole("button", { name: "Yes, reset these rounds" });
    await waitFor(() => expect(firstConfirmation).toHaveFocus());

    fireEvent.click(screen.getByRole("button", { name: "Keep my progress" }));
    const resetAfterCancel = screen.getByRole("button", { name: "Reset my practice" });
    await waitFor(() => expect(resetAfterCancel).toHaveFocus());

    fireEvent.click(resetAfterCancel);
    const secondConfirmation = screen.getByRole("button", { name: "Yes, reset these rounds" });
    await waitFor(() => expect(secondConfirmation).toHaveFocus());
    fireEvent.click(secondConfirmation);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reset my practice" })).toHaveFocus();
    });
  });

  it("keeps playing in memory when browser storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    render(<LearningPlayground />);
    fireEvent.click(screen.getByRole("radio", {
      name: "£180.00 sale, £18.00 fee and £162.00 payout",
    }));
    fireEvent.click(screen.getByRole("button", { name: "Check my move" }));

    expect(screen.getByText("1 of 3 rounds completed")).toBeInTheDocument();
    expect(screen.getByText("This browser isn’t saving progress; play still works."))
      .toBeInTheDocument();
    expect(screen.getAllByRole("status").some((status) => (
      status.textContent?.includes("Correct move")
    ))).toBe(true);
  });

  it("does not pretend saved progress was removed when browser storage refuses", async () => {
    window.localStorage.setItem(
      LEARNING_PROGRESS_KEY,
      serializeLearningProgress(["allowance-choice"]),
    );
    render(<LearningPlayground />);
    expect(await screen.findByText("1 of 3 rounds completed")).toBeInTheDocument();

    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset my practice" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, reset these rounds" }));

    expect(screen.getByText(/saved progress could not be removed/i)).toBeInTheDocument();
    expect(screen.getByText("1 of 3 rounds completed")).toBeInTheDocument();
    expect(window.localStorage.getItem(LEARNING_PROGRESS_KEY)).not.toBeNull();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reset my practice" })).toHaveFocus();
    });
  });
});
