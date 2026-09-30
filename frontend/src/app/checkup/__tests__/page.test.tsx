// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CheckupPage from "../page";
import { CHECKLIST_SCHEMA, CHECKLIST_STORAGE_KEY, emptyChecklistProgress } from "../checklist-state";
import { TAX_YEAR_PERIOD } from "@/lib/tax-year-progress";

const navigation = vi.hoisted(() => ({ query: "" }));
const progress = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(navigation.query) }));
vi.mock("@/lib/tax-year-progress", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/tax-year-progress")>(),
  readTaxYearProgress: progress.read,
}));

beforeEach(() => {
  navigation.query = "";
  window.localStorage.clear();
  window.history.replaceState(null, "", "/checkup");
  progress.read.mockReset().mockResolvedValue({
    period: TAX_YEAR_PERIOD,
    readAt: "2026-09-30T10:00:00.000Z",
    books: { status: "missing" },
    passport: { status: "missing" },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function choose(name: string) {
  const select = screen.queryByRole("combobox", { name: "Who are you sorting tax for?" });
  if (select) {
    await waitFor(() => expect(select).toBeEnabled());
    const option = screen.getByRole("option", { name }) as HTMLOptionElement;
    fireEvent.change(select, { target: { value: option.value } });
    return;
  }
  const option = screen.getByRole("radio", { name });
  await waitFor(() => expect(option).toBeEnabled());
  fireEvent.click(option);
}

function savedSoleTrader() {
  return JSON.stringify({
    schema: CHECKLIST_SCHEMA,
    audience: "sole-traders",
    checked: { ...emptyChecklistProgress(), "sole-traders": ["mtd-check"] },
  });
}

describe("My tax year and personal checklist", () => {
  it("starts without a profile or an implicit save", async () => {
    const writes = vi.spyOn(Storage.prototype, "setItem");
    render(<CheckupPage />);
    expect(screen.getByRole("heading", { name: "My tax year" })).toBeInTheDocument();
    expect(screen.getByText(/choose whether to show progress/i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await screen.findByText(/choose who this is for to see/i);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Save checklist" })).not.toBeInTheDocument();

    await choose("Sole traders and freelancers");
    expect(new URLSearchParams(window.location.search).get("for")).toBe("sole-traders");
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText("1 of 6 steps checked by you")).toBeInTheDocument();
    expect(writes).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(CHECKLIST_STORAGE_KEY)).toBeNull();
    expect(progress.read).not.toHaveBeenCalled();
  });

  it("keeps saved-work consent and personal checkmarks separate, including after an audience switch", async () => {
    navigation.query = "for=landlords";
    render(<CheckupPage />);
    await screen.findByRole("heading", { name: "Landlords checklist" });
    const writes = vi.spyOn(Storage.prototype, "setItem");
    expect(progress.read).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Show my saved progress" }));
    await waitFor(() => expect(progress.read).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("button", { name: "Refresh saved progress" })).toBeEnabled();
    expect(screen.getAllByRole("checkbox").every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(true);
    expect(writes).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    await choose("Individuals and families");
    expect(screen.getByRole("button", { name: "Show my saved progress" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hide saved progress" })).not.toBeInTheDocument();
    expect(progress.read).toHaveBeenCalledTimes(1);
    await choose("Landlords");
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    expect(screen.getByText(/not tied to a tax year/i)).toBeInTheDocument();
    expect(writes).not.toHaveBeenCalled();
  });

  it("keeps the adviser and organisation routes as personal checklists without reading personal records", async () => {
    render(<CheckupPage />);
    await choose("Accountants and advisers");
    expect(screen.getByRole("heading", { name: "Advisers checklist" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show my saved progress" })).not.toBeInTheDocument();
    await choose("Companies, charities and other organisations");
    expect(screen.getByRole("heading", { name: "Organisations checklist" })).toBeInTheDocument();
    expect(progress.read).not.toHaveBeenCalled();
  });

  it("opens the landlord path from the URL with the right records and no sole-trade comparison", async () => {
    navigation.query = "for=landlords";
    render(<CheckupPage />);
    await screen.findByRole("heading", { name: "Landlords checklist" });
    expect(screen.getByRole("combobox", { name: "Who are you sorting tax for?" })).toHaveValue("landlords");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open property records" }))
      .toHaveAttribute("href", "/books/workspace/money?activity=uk-property");
    expect(screen.queryByRole("link", { name: "Compare sole-trader choices" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review quarterly figures" })).toHaveAttribute("href", "/itsa/quarter");
    expect(screen.getByText(/checkmarks are your reminders/i)).toBeInTheDocument();
  });

  it("safely ignores an unknown audience parameter", async () => {
    navigation.query = "for=__proto__";
    render(<CheckupPage />);
    await screen.findByText(/choose who this is for to see/i);
    expect(screen.getAllByRole("radio").every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("keeps overlapping tasks separate when a person switches roles", async () => {
    render(<CheckupPage />);
    await choose("Sole traders and freelancers");
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    await choose("Landlords");
    expect(new URLSearchParams(window.location.search).get("for")).toBe("landlords");
    expect(screen.getAllByRole("checkbox")[0]).not.toBeChecked();
    expect(screen.getByText("0 of 6 steps checked by you")).toBeInTheDocument();
    await choose("Sole traders and freelancers");
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
  });

  it("changes query-selected audiences without mixing or discarding unsaved progress", async () => {
    navigation.query = "for=sole-traders";
    const view = render(<CheckupPage />);
    await screen.findByRole("heading", { name: "Sole traders checklist" });
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    navigation.query = "for=landlords";
    view.rerender(<CheckupPage />);
    expect(screen.getByRole("heading", { name: "Landlords checklist" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")[0]).not.toBeChecked();
    navigation.query = "for=sole-traders";
    view.rerender(<CheckupPage />);
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
  });

  it("never marks a step checked just because its service link is opened", async () => {
    navigation.query = "for=landlords";
    render(<CheckupPage />);
    const link = await screen.findByRole("link", { name: "Check MTD requirements" });
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(link);
    expect(screen.getAllByRole("checkbox").every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(true);
    expect(window.localStorage.getItem(CHECKLIST_STORAGE_KEY)).toBeNull();
  });

  it("puts saving and its status ahead of the steps for mobile and keyboard readers", async () => {
    navigation.query = "for=landlords";
    render(<CheckupPage />);
    const save = await screen.findByRole("button", { name: "Save checklist" });
    const firstStep = screen.getByRole("link", { name: "Check MTD requirements" });
    expect(save.compareDocumentPosition(firstStep) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/save before leaving to keep your checkmarks/i)).toBeInTheDocument();
    expect(screen.getAllByText("What this step covers")[0].closest("details")).not.toHaveAttribute("open");
    fireEvent.click(save);
    const status = screen.getByRole("status");
    expect(status.compareDocumentPosition(firstStep) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("saves only on request and restores the versioned checklist on a later visit", async () => {
    const first = render(<CheckupPage />);
    await choose("Sole traders and freelancers");
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save checklist" }));
    const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
    expect(JSON.parse(raw!)).toEqual(JSON.parse(savedSoleTrader()));
    expect(screen.getByText(/^checklist saved on this device/i)).toBeInTheDocument();
    first.unmount();

    const writes = vi.spyOn(Storage.prototype, "setItem");
    render(<CheckupPage />);
    await screen.findByRole("heading", { name: "Sole traders checklist" });
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    expect(screen.getByText("Saved on this device")).toBeInTheDocument();
    expect(writes).not.toHaveBeenCalled();
  });

  it("lets an explicit audience URL take precedence over the saved selection without overwriting it", async () => {
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, savedSoleTrader());
    navigation.query = "for=landlords";
    render(<CheckupPage />);
    await screen.findByRole("heading", { name: "Landlords checklist" });
    expect(screen.getAllByRole("checkbox")[0]).not.toBeChecked();
    expect(window.localStorage.getItem(CHECKLIST_STORAGE_KEY)).toBe(savedSoleTrader());
    await choose("Sole traders and freelancers");
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
  });

  it("leaves malformed saved data untouched until the person clears this checklist", async () => {
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, "{broken");
    navigation.query = "for=landlords";
    render(<CheckupPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("left untouched");
    expect(screen.getByRole("button", { name: "Save checklist" })).toBeDisabled();
    expect(window.localStorage.getItem(CHECKLIST_STORAGE_KEY)).toBe("{broken");
    fireEvent.click(screen.getByRole("button", { name: "Clear saved checklist" }));
    expect(window.localStorage.getItem(CHECKLIST_STORAGE_KEY)).toBeNull();
    expect(screen.getByRole("button", { name: "Save checklist" })).toBeEnabled();
  });

  it("reports a write failure and keeps the visible progress", async () => {
    navigation.query = "for=landlords";
    render(<CheckupPage />);
    await screen.findByRole("heading", { name: "Landlords checklist" });
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    fireEvent.click(screen.getByRole("button", { name: "Save checklist" }));
    expect(screen.getByRole("alert")).toHaveTextContent("could not be saved");
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    expect(screen.getByText("Changes are not saved")).toBeInTheDocument();
  });

  it("keeps a temporary checklist usable when storage cannot be read", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    navigation.query = "for=landlords";
    render(<CheckupPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Checklist storage on this device could not be read");
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    expect(screen.getByRole("button", { name: "Save checklist" })).toBeDisabled();
  });

  it("clears only its own key and does not erase unrelated browser data", async () => {
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, savedSoleTrader());
    window.localStorage.setItem("taxsorted.locale", "en");
    window.localStorage.setItem("unrelated-books-reference", "preserve");
    render(<CheckupPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Clear saved checklist" }));
    expect(window.localStorage.getItem(CHECKLIST_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("taxsorted.locale")).toBe("en");
    expect(window.localStorage.getItem("unrelated-books-reference")).toBe("preserve");
    expect(screen.getAllByRole("checkbox")[0]).not.toBeChecked();
  });

  it("does not overwrite changes made by another tab", async () => {
    navigation.query = "for=landlords";
    render(<CheckupPage />);
    await screen.findByRole("heading", { name: "Landlords checklist" });
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, savedSoleTrader());
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save checklist" }));
    expect(screen.getByRole("alert")).toHaveTextContent("changed in another tab");
    expect(window.localStorage.getItem(CHECKLIST_STORAGE_KEY)).toBe(savedSoleTrader());
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
  });
});
