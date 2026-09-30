// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPreparationDraft } from "@/lib/return-preparation";
import type { PreparationAction } from "@/lib/preparation-action-plan";
import { PreparationActionPlan } from "../preparation-action-plan";

const derive = vi.hoisted(() => vi.fn());
vi.mock("@/lib/preparation-action-plan", () => ({ derivePreparationActionPlan: derive }));

const actions: PreparationAction[] = [
  {
    id: "employment-answer", kind: "answer", title: "Check whether you had employment income",
    why: "An unanswered question leaves the evidence you need uncertain.",
    where: "Check your employment records for this tax year.", next: "Answer the employment question, or keep it as Not sure.",
    target: { step: "circumstances", circumstance: "employment" },
  },
  {
    id: "property-gather", kind: "gather", title: "Find your property records",
    why: "Your property evidence is marked missing.", where: "Look in your rent statements and receipts.",
    next: "Gather the relevant records before changing the evidence label.",
    target: { step: "evidence", circumstance: "property" },
  },
  {
    id: "pension-review", kind: "review", title: "Review your pension evidence",
    why: "The evidence is collected but has not been reviewed.", where: "Use your pension statements for this year.",
    next: "Check the statements and keep uncertain items unresolved.",
    target: { step: "evidence", circumstance: "pension" },
  },
  {
    id: "employment-question", kind: "question", title: "Ask about P45 and other employment documents",
    why: "The current employment step only reviews P60 figures.", where: "Ask your employer or a tax adviser with your original documents available.",
    next: "Keep these employment records unresolved while you check the next step.",
    question: "Which figures should I use from my P45 and other documents without counting the same pay twice?",
    target: { step: "evidence", circumstance: "employment" },
  },
  {
    id: "other-income-question", kind: "question", title: "Clarify your other income",
    why: "Other income is marked Not sure.", where: "Check the source records or ask an adviser.",
    next: "Review the answer once you know what the records represent.",
    question: "Does this income belong in my preparation for this tax year?",
    target: { step: "circumstances", circumstance: "other-income" },
  },
];

function draft(year: "2025-26" | "2026-27" = "2025-26") {
  return createPreparationDraft(year, "prepare-return", "2026-09-30T10:00:00.000Z");
}

beforeEach(() => {
  derive.mockReset();
  derive.mockImplementation(value => ({ year: value.year, actions }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("preparation tasks and questions", () => {
  it("starts with three concrete actions and explains their relationship to unsaved entries", () => {
    const value = draft();
    const navigate = vi.fn();
    render(<PreparationActionPlan draft={value} onNavigate={navigate} />);
    const region = screen.getByRole("region", { name: "Your tasks and questions" });
    expect(within(region).getByText("Preparation · 2025–26")).toBeInTheDocument();
    expect(within(region).getByText(/including unsaved changes/)).toBeInTheDocument();
    expect(within(region).getByText(/Use “Save preparation on this device” to keep them/)).toBeInTheDocument();
    expect(within(region).getByText(/Your preparation summary includes these tasks and questions/)).toBeInTheDocument();
    expect(within(region).getAllByRole("listitem")).toHaveLength(3);
    expect(within(region).getByText("Showing 3 of 5 tasks and questions")).toBeInTheDocument();
    for (const action of actions.slice(0, 3)) {
      const item = within(region).getByRole("heading", { name: action.title }).closest("li")!;
      expect(within(item).getByText(action.why)).toBeInTheDocument();
      expect(within(item).getByText(action.where)).toBeInTheDocument();
      expect(within(item).getByText(action.next)).toBeInTheDocument();
    }
    for (const label of ["Answer a question", "Gather evidence", "Review evidence"]) expect(within(region).getByText(label)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    expect(derive).toHaveBeenCalledWith(value);
  });

  it.each([0, 1, 2])("opens action %s's precise circumstance or evidence target without changing its state", index => {
    const value = draft();
    const original = structuredClone(value);
    const navigate = vi.fn();
    render(<PreparationActionPlan draft={value} onNavigate={navigate} />);
    const item = screen.getByRole("heading", { name: actions[index].title }).closest("li")!;
    const button = within(item).getByRole("button");
    expect(button).toHaveAccessibleDescription(actions[index].title);
    fireEvent.click(button);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(actions[index].target);
    expect(value).toEqual(original);
    expect(screen.getByRole("heading", { name: actions[index].title })).toBeInTheDocument();
  });

  it("expands the remaining actions, focuses the first new heading and returns focus when collapsing", async () => {
    render(<PreparationActionPlan draft={draft()} onNavigate={vi.fn()} />);
    const expand = screen.getByRole("button", { name: "Show all 5 tasks and questions" });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(expand.getAttribute("aria-controls")!)?.tagName).toBe("OL");
    expand.focus();
    fireEvent.click(expand);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    await waitFor(() => expect(screen.getByRole("heading", { name: actions[3].title })).toHaveFocus());
    const collapse = screen.getByRole("button", { name: "Show first 3 tasks and questions" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(collapse);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Show all 5 tasks and questions" })).toHaveFocus();
    expect(screen.queryByRole("heading", { name: actions[3].title })).not.toBeInTheDocument();
  });

  it("keeps unsupported employment follow-ups readable as questions instead of offering a completion toggle", () => {
    derive.mockReturnValue({ year: "2025-26", actions: [actions[3]] });
    const navigate = vi.fn();
    render(<PreparationActionPlan draft={draft()} onNavigate={navigate} />);
    expect(screen.getByText("Ask a follow-up question")).toBeInTheDocument();
    expect(screen.getByText("Question to ask")).toBeInTheDocument();
    expect(screen.getByText(actions[3].question!)).toBeInTheDocument();
    expect(screen.getByText(/Keep these employment records unresolved/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /done|complete|mark reviewed/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open this evidence" }));
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ step: "evidence", circumstance: "employment" });
  });

  it("derives a fresh list from changed on-page entries without saving or making network requests", () => {
    const save = vi.spyOn(Storage.prototype, "setItem");
    const request = vi.spyOn(globalThis, "fetch");
    const value = draft();
    const view = render(<PreparationActionPlan draft={value} onNavigate={vi.fn()} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    const changed = { ...value, circumstances: { ...value.circumstances, employment: "no" as const } };
    derive.mockReturnValueOnce({ year: changed.year, actions: [actions[1]] });
    view.rerender(<PreparationActionPlan draft={changed} onNavigate={vi.fn()} />);
    expect(derive).toHaveBeenLastCalledWith(changed);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: actions[0].title })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    expect(value.circumstances.employment).toBeNull();
  });

  it("uses a bounded empty state without inferring filing readiness", () => {
    derive.mockReturnValue({ year: "2025-26", actions: [] });
    render(<PreparationActionPlan draft={draft()} onNavigate={vi.fn()} />);
    expect(screen.getByText(/No tasks are suggested from the answers and review labels in this draft/)).toBeInTheDocument();
    expect(screen.getByText(/does not establish complete records, correct tax treatment or readiness to file/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/all done|all complete|ready to file/i)).not.toBeInTheDocument();
  });

  it("disables navigation while busy and leaves the remaining advice available to read", () => {
    const navigate = vi.fn();
    render(<PreparationActionPlan draft={draft()} onNavigate={navigate} busy />);
    for (const item of screen.getAllByRole("listitem")) {
      const button = within(item).getByRole("button");
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Show all 5 tasks and questions" }));
    expect(screen.getByText(actions[3].question!)).toBeInTheDocument();
    for (const item of screen.getAllByRole("listitem")) expect(within(item).getByRole("button")).toBeDisabled();
  });

  it("starts another year's plan with its own first three actions", () => {
    const navigate = vi.fn();
    const view = render(<PreparationActionPlan draft={draft()} onNavigate={navigate} />);
    fireEvent.click(screen.getByRole("button", { name: "Show all 5 tasks and questions" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    view.rerender(<PreparationActionPlan draft={draft("2026-27")} onNavigate={navigate} />);
    expect(screen.getByText("Preparation · 2026–27")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Show all 5 tasks and questions" })).toHaveAttribute("aria-expanded", "false");
  });
});
