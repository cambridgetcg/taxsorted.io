// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrepareClient } from "../prepare-client";
import PreparePage from "../page";
import {
  createEmploymentSource,
  createPreparationDraft,
  type PreparationDraft,
  type PreparationYear,
} from "@/lib/return-preparation";
import { preparationStorageKey } from "@/lib/return-preparation-store";

const io = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  get: vi.fn(),
  update: vi.fn(),
  generation: 0,
  search: "",
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(io.search),
}));
vi.mock("@/lib/workspace-storage", () => ({
  createWorkspaceSession: () => {
    let generation: number | undefined;
    return {
      async read(key: string) { generation ??= io.generation; return io.get(key); },
      async update(key: string, updater: (value: unknown) => unknown) {
        if (generation !== undefined && generation !== io.generation) throw new Error("This workspace changed after you opened it. Reload before saving.");
        generation ??= io.generation;
        return io.update(key, updater);
      },
    };
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function savedDraft(year: PreparationYear = "2025-26"): PreparationDraft {
  return { ...createPreparationDraft(year, "prepare-return"), revision: 1 };
}
async function start() {
  fireEvent.click(screen.getByRole("button", { name: "Start preparation" }));
  await screen.findByRole("heading", { name: "1. Circumstances" });
}
function answer(
  label: string,
  answer: "Yes" | "No" | "Not sure" | "Unanswered",
) {
  fireEvent.click(
    within(screen.getByRole("group", { name: label })).getByRole("radio", {
      name: answer,
    }),
  );
}
async function addEmployment() {
  answer("Employment", "Yes");
  fireEvent.click(screen.getByRole("button", { name: "Continue to evidence" }));
  fireEvent.click(screen.getByRole("button", { name: "Add an employment" }));
}
function fillEmployment(
  index = 1,
  overrides: { year?: PreparationYear; pay?: string; tax?: string } = {},
) {
  const card = within(
    screen.getByRole("region", { name: `Employment ${index}` }),
  );
  fireEvent.change(card.getByLabelText("Employer or job label"), {
    target: { value: `Job ${index}` },
  });
  fireEvent.change(card.getByLabelText("Tax year shown on the document"), {
    target: { value: overrides.year ?? "2025-26" },
  });
  fireEvent.change(card.getByLabelText("Document label or where you keep it"), {
    target: { value: `Job ${index} P60 in folder` },
  });
  fireEvent.change(card.getByLabelText("Pay in this employment (£)"), {
    target: { value: overrides.pay ?? "12345.67" },
  });
  fireEvent.change(card.getByLabelText("Tax deducted in this employment (£)"), {
    target: { value: overrides.tax ?? "1234.56" },
  });
  return card;
}
function markReviewed(index = 1) {
  const card = within(
    screen.getByRole("region", { name: `Employment ${index}` }),
  );
  fireEvent.click(card.getByRole("checkbox", { name: /I checked this job/ }));
  fireEvent.click(
    card.getByRole("button", { name: `Mark employment ${index} reviewed` }),
  );
  return card;
}
async function save() {
  fireEvent.click(
    screen.getByRole("button", { name: "Save preparation on this device" }),
  );
  await screen.findByText(
    "Preparation saved on this device. No information was uploaded.",
  );
}

beforeEach(() => {
  io.search = "";
  io.values.clear();
  io.generation = 0;
  io.get.mockReset();
  io.update.mockReset();
  io.get.mockImplementation(async (key: string) =>
    structuredClone(io.values.get(key)),
  );
  io.update.mockImplementation(
    async (key: string, updater: (value: unknown) => unknown) => {
      io.values.set(key, structuredClone(updater(io.values.get(key))));
    },
  );
  vi.spyOn(Date.prototype, "toISOString").mockReturnValue(
    "2026-09-30T12:00:00.000Z",
  );
  vi.spyOn(window, "confirm").mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  // Explicitly discard the same-tab recovery offered by unmounting dirty work.
  render(<PrepareClient />);
  const discard = screen.queryByRole("button", {
    name: "Discard unsaved work in this tab",
  });
  if (discard) fireEvent.click(discard);
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("guided return preparation", () => {
  it.each(["2025-26", "2026-27"] as const)("opens %s tasks only after an explicit saved-draft resume", async (year) => {
    io.search = `year=${year}&view=tasks`;
    io.values.set(preparationStorageKey(year), savedDraft(year));
    render(<PreparePage />);
    expect(io.get).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Your tasks and questions" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume saved preparation" }));
    await screen.findByRole("heading", { name: "3. Review" });
    expect(screen.getByRole("region", { name: "Your tasks and questions" })).toHaveTextContent(year.replace("-", "–"));
    expect(io.get).toHaveBeenCalledExactlyOnceWith(preparationStorageKey(year));
    expect(io.update).not.toHaveBeenCalled();
  });

  it("starts an empty preparation with circumstances even through a tasks link", async () => {
    io.search = "year=2026-27&view=tasks";
    render(<PreparePage />);
    await start();
    expect(screen.queryByRole("region", { name: "Your tasks and questions" })).not.toBeInTheDocument();
    expect(io.update).not.toHaveBeenCalled();
  });

  it.each(["view=other", "view=tasks&view=tasks", "view=tasks&view=other"])("ignores unsupported or ambiguous task views: %s", async (query) => {
    io.search = query;
    io.values.set(preparationStorageKey("2025-26"), savedDraft());
    render(<PreparePage />);
    expect(io.get).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Resume saved preparation" }));
    await screen.findByRole("heading", { name: "1. Circumstances" });
    expect(screen.queryByRole("region", { name: "Your tasks and questions" })).not.toBeInTheDocument();
  });

  it("fences a pending resume when the requested view changes", async () => {
    const pending = deferred<PreparationDraft>();
    io.get.mockReturnValueOnce(pending.promise);
    io.values.set(preparationStorageKey("2025-26"), savedDraft());
    const view = render(<PreparePage />);
    fireEvent.click(screen.getByRole("button", { name: "Resume saved preparation" }));
    io.search = "view=tasks";
    view.rerender(<PreparePage />);
    await act(async () => { pending.resolve(savedDraft()); });
    expect(screen.queryByRole("heading", { name: "1. Circumstances" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume saved preparation" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Resume saved preparation" }));
    await screen.findByRole("heading", { name: "3. Review" });
    expect(io.update).not.toHaveBeenCalled();
  });

  it("takes an unanswered task to its selected radio without changing or saving the answer", async () => {
    render(<PrepareClient />);
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Step 3 Review" }));
    const task = screen.getByRole("heading", { name: "Answer: Employment" }).closest("li")!;
    fireEvent.click(within(task).getByRole("button", { name: "Review this answer" }));
    const unchanged = within(screen.getByRole("group", { name: "Employment" })).getByRole("radio", { name: "Unanswered" });
    await waitFor(() => expect(unchanged).toHaveFocus());
    expect(unchanged).toBeChecked();
    expect(io.update).not.toHaveBeenCalled();
  });

  it("takes an evidence task to the exact field and updates the live plan without an implicit save", async () => {
    render(<PrepareClient />);
    await start();
    answer("Property income", "Yes");
    fireEvent.click(screen.getByRole("button", { name: "Step 3 Review" }));
    const task = screen.getByRole("heading", { name: "Gather records: Property income" }).closest("li")!;
    fireEvent.click(within(task).getByRole("button", { name: "Open this evidence" }));
    const select = within(screen.getByRole("region", { name: "Property income" })).getByRole("combobox", { name: "Evidence status" });
    await waitFor(() => expect(select).toHaveFocus());
    expect(select).toHaveValue("missing");
    fireEvent.change(select, { target: { value: "reviewed" } });
    fireEvent.click(screen.getByRole("button", { name: "Step 3 Review" }));
    expect(screen.queryByRole("heading", { name: "Gather records: Property income" })).not.toBeInTheDocument();
    expect(io.update).not.toHaveBeenCalled();
  });

  it("keeps uncertainty open despite reviewed evidence and includes questions in the deliberate summary", async () => {
    const draft = savedDraft();
    draft.circumstances.property = "unknown";
    draft.evidence.property = "reviewed";
    draft.circumstances.employment = "yes";
    draft.employmentSources = [{ ...createEmploymentSource(), employerName: "Private employer", sourceLabel: "Private folder", documentType: "P45", pay: "12345.67", notes: "Private note" }];
    io.values.set(preparationStorageKey("2025-26"), draft);
    io.search = "view=tasks";
    render(<PreparePage />);
    fireEvent.click(screen.getByRole("button", { name: "Resume saved preparation" }));
    await screen.findByRole("heading", { name: "3. Review" });
    const region = screen.getByRole("region", { name: "Your tasks and questions" });
    expect(region).not.toHaveTextContent("Private employer");
    expect(region).not.toHaveTextContent("Private folder");
    const task = screen.getByRole("heading", { name: "Clarify: Property income" }).closest("li")!;
    fireEvent.click(within(task).getByRole("button", { name: "Review this answer" }));
    const unsure = within(screen.getByRole("group", { name: "Property income" })).getByRole("radio", { name: "Not sure" });
    await waitFor(() => expect(unsure).toHaveFocus());
    expect(unsure).toBeChecked();
    answer("Property income", "No");
    fireEvent.click(screen.getByRole("button", { name: "Step 3 Review" }));
    expect(screen.queryByRole("heading", { name: "Clarify: Property income" })).not.toBeInTheDocument();
    const employmentTask = screen.getByRole("heading", { name: "Follow up P45 or other employment documents" }).closest("li")!;
    fireEvent.click(within(employmentTask).getByRole("button", { name: "Open this evidence" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Your employment documents" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Step 3 Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview summary" }));
    const preview = screen.getByLabelText("Preparation summary preview");
    expect(preview).toHaveTextContent("Preparation actions and questions");
    expect(preview).toHaveTextContent("Question for HMRC or an adviser");
    expect(preview).not.toHaveTextContent("12345.67");
    expect(preview).not.toHaveTextContent("Private note");
    expect(io.update).not.toHaveBeenCalled();
    expect(io.values.get(preparationStorageKey("2025-26"))).toEqual(draft);
  });

  it.each(["2025-26", "2026-27"] as const)("preselects the linked %s year without reading until Resume", async (year) => {
    io.search = `year=${year}`;
    io.values.set(preparationStorageKey(year), savedDraft(year));
    render(<PreparePage />);
    expect(screen.getByLabelText("Tax year")).toHaveValue(year);
    expect(io.get).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Resume saved preparation" }));
    await screen.findByRole("heading", { name: "1. Circumstances" });
    expect(io.get).toHaveBeenCalledExactlyOnceWith(preparationStorageKey(year));
    expect(io.update).not.toHaveBeenCalled();
  });

  it.each(["year=2027-28", "year=", "year=2026-27&year=2025-26", "year=2026-27&year=2026-27"])("defaults safely for an invalid or ambiguous year link: %s", (query) => {
    io.search = query;
    render(<PreparePage />);
    expect(screen.getByLabelText("Tax year")).toHaveValue("2025-26");
    expect(io.get).not.toHaveBeenCalled();
    expect(io.update).not.toHaveBeenCalled();
  });

  it("ignores a pending resume when the link changes years and requires a fresh explicit read", async () => {
    const pending = deferred<PreparationDraft>();
    io.get.mockReturnValueOnce(pending.promise);
    const view = render(<PreparePage />);
    fireEvent.click(screen.getByRole("button", { name: "Resume saved preparation" }));
    io.search = "year=2026-27";
    view.rerender(<PreparePage />);
    expect(screen.getByLabelText("Tax year")).toHaveValue("2026-27");
    expect(screen.getByRole("button", { name: "Resume saved preparation" })).toBeEnabled();
    await act(async () => { pending.resolve(savedDraft()); });
    expect(screen.queryByRole("heading", { name: "1. Circumstances" })).not.toBeInTheDocument();
    expect(io.get).toHaveBeenCalledTimes(1);
    io.values.set(preparationStorageKey("2026-27"), savedDraft("2026-27"));
    fireEvent.click(screen.getByRole("button", { name: "Resume saved preparation" }));
    await screen.findByRole("heading", { name: "1. Circumstances" });
    expect(io.get).toHaveBeenLastCalledWith(preparationStorageKey("2026-27"));
    expect(io.update).not.toHaveBeenCalled();
  });

  it("keeps an open draft when the linked year changes, including its explicit save destination", async () => {
    const view = render(<PreparePage />);
    await start();
    answer("Employment", "Yes");
    io.search = "year=2026-27";
    view.rerender(<PreparePage />);
    expect(screen.getByText(/Your 2025–26 preparation is still open/)).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Employment" })).getByRole("radio", { name: "Yes", checked: true })).toBeInTheDocument();
    expect(io.get).toHaveBeenCalledTimes(1);
    await save();
    expect(io.update).toHaveBeenCalledExactlyOnceWith(preparationStorageKey("2025-26"), expect.any(Function));
    expect(io.values.has(preparationStorageKey("2026-27"))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Choose another tax year" }));
    expect(screen.getByLabelText("Tax year")).toHaveValue("2026-27");
  });

  it("offers unsaved tab work before following a different year link", async () => {
    const view = render(<PreparePage />);
    await start();
    answer("Employment", "Yes");
    view.unmount();
    io.search = "year=2026-27";
    render(<PreparePage />);
    expect(screen.getByLabelText("Tax year")).toHaveValue("2026-27");
    expect(screen.getByRole("button", { name: "Start preparation" })).toBeDisabled();
    expect(io.get).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Resume unsaved work in this tab" }));
    await screen.findByRole("heading", { name: "1. Circumstances" });
    expect(screen.getByText(/Your 2025–26 preparation is still open/)).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Employment" })).getByRole("radio", { name: "Yes", checked: true })).toBeInTheDocument();
    await save();
    expect(io.update).toHaveBeenCalledExactlyOnceWith(preparationStorageKey("2025-26"), expect.any(Function));
    fireEvent.click(screen.getByRole("button", { name: "Choose another tax year" }));
    expect(screen.getByLabelText("Tax year")).toHaveValue("2026-27");
  });

  it("allows a requested save to finish for its original draft during a year-link change", async () => {
    const pending = deferred<void>();
    io.update.mockImplementation(async (key: string, updater: (value: unknown) => unknown) => {
      await pending.promise;
      io.values.set(key, structuredClone(updater(io.values.get(key))));
    });
    const view = render(<PreparePage />);
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Save preparation on this device" }));
    io.search = "year=2026-27";
    view.rerender(<PreparePage />);
    await act(async () => { pending.resolve(); });
    await screen.findByText("Preparation saved on this device. No information was uploaded.");
    expect(io.update).toHaveBeenCalledExactlyOnceWith(preparationStorageKey("2025-26"), expect.any(Function));
    expect(io.values.has(preparationStorageKey("2026-27"))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Choose another tax year" }));
    expect(screen.getByLabelText("Tax year")).toHaveValue("2026-27");
    expect(screen.getByRole("button", { name: "Resume saved preparation" })).toBeEnabled();
  });

  it("opens the route without reading or saving tax facts and defaults to the ended return year", async () => {
    render(<PreparePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Prepare my tax return" }),
    ).toBeInTheDocument();
    expect(io.get).not.toHaveBeenCalled();
    expect(io.update).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Tax year")).toHaveValue("2025-26");
    expect(
      screen.getByRole("link", { name: /Check whether I need a return/ }),
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/check-if-you-need-tax-return",
    );
    expect(
      screen.getByText(/Saved drafts are local and unencrypted/),
    ).toHaveTextContent("Books backups do not include preparation drafts");
    await start();
    expect(io.get).toHaveBeenCalledExactlyOnceWith(
      preparationStorageKey("2025-26"),
    );
    expect(io.update).not.toHaveBeenCalled();
    expect(
      screen.getAllByRole("radio", { name: "Unanswered", checked: true }),
    ).toHaveLength(8);
    expect(
      screen.getByRole("group", { name: "Employment" }),
    ).toHaveAccessibleDescription(
      "Did you work for an employer during this tax year?",
    );
    // The heading can be found after commit but before its passive focus effect
    // runs, especially on Windows. Wait for the required observable behaviour.
    await waitFor(() => expect(
      screen.getByRole("heading", { name: "1. Circumstances" }),
    ).toHaveFocus());
  });

  it("never overlays an existing draft with a new one, and resumes the saved purpose", async () => {
    const draft = savedDraft();
    draft.purpose = "organise-records";
    draft.circumstances.employment = "yes";
    io.values.set(preparationStorageKey(draft.year), draft);
    render(<PrepareClient />);
    fireEvent.click(screen.getByRole("button", { name: "Start preparation" }));
    await screen.findByText(/There is already a saved preparation/);
    expect(
      screen.queryByRole("heading", { name: "1. Circumstances" }),
    ).not.toBeInTheDocument();
    expect(io.update).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Resume saved preparation" }),
    );
    await screen.findByRole("heading", { name: "1. Circumstances" });
    expect(screen.getByLabelText("Preparation purpose")).toHaveValue(
      "organise-records",
    );
    expect(
      within(screen.getByRole("group", { name: "Employment" })).getByRole(
        "radio",
        { name: "Yes" },
      ),
    ).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Save preparation on this device" }),
    ).toBeDisabled();
  });

  it("distinguishes no saved draft from unreadable storage and offers a temporary path without overwriting", async () => {
    render(<PrepareClient />);
    fireEvent.click(
      screen.getByRole("button", { name: "Resume saved preparation" }),
    );
    await screen.findByText(/No saved preparation was found/);
    io.get.mockRejectedValueOnce(new Error("private diagnostics"));
    fireEvent.click(screen.getByRole("button", { name: "Start preparation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Existing saved data has been left untouched",
    );
    expect(screen.queryByText(/private diagnostics/)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Use a temporary preparation" }),
    );
    answer("Employment", "Yes");
    expect(
      screen.getByRole("button", { name: "Save preparation on this device" }),
    ).toBeDisabled();
    expect(io.update).not.toHaveBeenCalled();
  });

  it("saves only explicitly, restores exact employment strings and keeps another year blank", async () => {
    const view = render(<PrepareClient />);
    await start();
    await addEmployment();
    fillEmployment(1, { tax: "-15.30" });
    markReviewed();
    expect(io.update).not.toHaveBeenCalled();
    await save();
    const stored = io.values.get(
      preparationStorageKey("2025-26"),
    ) as PreparationDraft;
    expect(stored.employmentSources[0]).toMatchObject({
      pay: "12345.67",
      tax: "-15.30",
      reviewed: true,
    });
    view.unmount();
    render(<PrepareClient />);
    fireEvent.click(
      screen.getByRole("button", { name: "Resume saved preparation" }),
    );
    await screen.findByRole("heading", { name: "1. Circumstances" });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to evidence" }),
    );
    expect(
      screen.getByLabelText("Tax deducted in this employment (£)"),
    ).toHaveValue("-15.30");
    fireEvent.click(
      screen.getByRole("button", { name: "Choose another tax year" }),
    );
    fireEvent.change(screen.getByLabelText("Tax year"), {
      target: { value: "2026-27" },
    });
    await start();
    expect(
      screen.getAllByRole("radio", { name: "Unanswered", checked: true }),
    ).toHaveLength(8);
    expect(io.values.has(preparationStorageKey("2026-27"))).toBe(false);
    expect(io.values.get(preparationStorageKey("2025-26"))).toEqual(stored);
  });

  it("protects dirty year changes and internal navigation, while keeping step headings focused", async () => {
    render(<PrepareClient />);
    await start();
    answer("Employment", "Yes");
    fireEvent.click(
      screen.getByRole("button", { name: "Choose another tax year" }),
    );
    expect(
      screen.getByRole("group", { name: "Unsaved preparation changes" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    const anchor = document.createElement("a");
    anchor.href = "/services";
    anchor.textContent = "Navigate away";
    document.body.appendChild(anchor);
    expect(fireEvent.click(anchor)).toBe(false);
    expect(window.confirm).toHaveBeenCalledOnce();
    anchor.remove();
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to evidence" }),
    );
    expect(screen.getByRole("heading", { name: "2. Evidence" })).toHaveFocus();
    fireEvent.click(
      screen.getByRole("button", { name: "Back to circumstances" }),
    );
    expect(
      screen.getByRole("heading", { name: "1. Circumstances" }),
    ).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Preparation purpose"), {
      target: { value: "organise-records" },
    });
    await save();
    expect(
      (io.values.get(preparationStorageKey("2025-26")) as PreparationDraft)
        .purpose,
    ).toBe("organise-records");
  });

  it("retains the originating store generation when resuming unsaved work after a workspace restore", async () => {
    const view = render(<PrepareClient />);
    await start();
    answer("Employment", "Yes");
    view.unmount();
    io.generation += 1;
    render(<PrepareClient />);
    fireEvent.click(screen.getByRole("button", { name: "Resume unsaved work in this tab" }));
    await screen.findByRole("heading", { name: "1. Circumstances" });
    fireEvent.click(screen.getByRole("button", { name: "Save preparation on this device" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your changes could not be saved. They are still here.");
    expect(io.update).not.toHaveBeenCalled();
    expect(within(screen.getByRole("group", { name: "Employment" })).getByRole("radio", { name: "Yes" })).toBeChecked();
  });

  it("offers explicit recovery after client navigation without reading or writing persistent storage", async () => {
    const view = render(<PrepareClient />);
    await start();
    await addEmployment();
    fillEmployment();
    view.unmount();
    io.get.mockClear();
    render(<PrepareClient />);
    expect(io.get).not.toHaveBeenCalled();
    expect(io.update).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue("12345.67")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start preparation" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Resume unsaved work in this tab" }),
    );
    expect(screen.getByLabelText("Pay in this employment (£)")).toHaveValue(
      "12345.67",
    );
    expect(io.get).not.toHaveBeenCalled();
    expect(io.update).not.toHaveBeenCalled();
    await save();
    cleanup();
    render(<PrepareClient />);
    expect(
      screen.queryByRole("button", { name: "Resume unsaved work in this tab" }),
    ).not.toBeInTheDocument();
  });

  it("discards only in-memory changes when explicitly choosing another year", async () => {
    render(<PrepareClient />);
    await start();
    answer("Employment", "Yes");
    await save();
    answer("Employment", "No");
    fireEvent.click(
      screen.getByRole("button", { name: "Choose another tax year" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Discard unsaved changes" }),
    );
    expect(
      (io.values.get(preparationStorageKey("2025-26")) as PreparationDraft)
        .circumstances.employment,
    ).toBe("yes");
    cleanup();
    render(<PrepareClient />);
    expect(
      screen.queryByRole("button", { name: "Resume unsaved work in this tab" }),
    ).not.toBeInTheDocument();
  });

  it.each(["before", "after"] as const)(
    "recovers the committed revision when returning %s a pending save completes",
    async (timing) => {
      const view = render(<PrepareClient />);
      await start();
      answer("Employment", "Yes");
      const pause = deferred<void>();
      io.update.mockImplementationOnce(
        async (key: string, update: (v: unknown) => unknown) => {
          await pause.promise;
          io.values.set(key, update(io.values.get(key)));
        },
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Save preparation on this device" }),
      );
      expect(screen.getByRole("button", { name: "Step 2 Evidence" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Continue to evidence" })).toBeDisabled();
      view.unmount();
      if (timing === "after")
        await act(async () => {
          pause.resolve();
          await pause.promise;
        });
      render(<PrepareClient />);
      fireEvent.click(
        screen.getByRole("button", { name: "Resume unsaved work in this tab" }),
      );
      if (timing === "before") {
        expect(
          screen.queryByRole("heading", { name: "1. Circumstances" }),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("button", {
            name: "Resume unsaved work in this tab",
          }),
        ).toBeDisabled();
        await act(async () => {
          pause.resolve();
          await pause.promise;
        });
      }
      await screen.findByRole("heading", { name: "1. Circumstances" });
      expect(
        screen.getByRole("button", { name: "Save preparation on this device" }),
      ).toBeDisabled();
      answer("Employment", "No");
      await save();
      expect(
        (io.values.get(preparationStorageKey("2025-26")) as PreparationDraft)
          .revision,
      ).toBe(2);
    },
  );

  it("recovers unsaved entries if a save fails after navigating away", async () => {
    const view = render(<PrepareClient />);
    await start();
    answer("Employment", "Yes");
    const pause = deferred<void>();
    io.update.mockImplementationOnce(async () => {
      await pause.promise;
      throw new Error("Unavailable");
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save preparation on this device" }),
    );
    view.unmount();
    render(<PrepareClient />);
    fireEvent.click(
      screen.getByRole("button", { name: "Resume unsaved work in this tab" }),
    );
    await act(async () => {
      pause.resolve();
      await pause.promise;
    });
    await screen.findByRole("heading", { name: "1. Circumstances" });
    expect(
      within(screen.getByRole("group", { name: "Employment" })).getByRole(
        "radio",
        { name: "Yes" },
      ),
    ).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Save preparation on this device" }),
    ).toBeEnabled();
    await save();
    expect(
      (io.values.get(preparationStorageKey("2025-26")) as PreparationDraft)
        .revision,
    ).toBe(1);
  });

  it("preserves all entries after save failure and disables editing during a pending save", async () => {
    render(<PrepareClient />);
    await start();
    await addEmployment();
    fillEmployment();
    io.update.mockRejectedValueOnce(new Error("private failure"));
    fireEvent.click(
      screen.getByRole("button", { name: "Save preparation on this device" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your changes could not be saved",
    );
    expect(screen.getByLabelText("Pay in this employment (£)")).toHaveValue(
      "12345.67",
    );
    expect(screen.getByLabelText("Pay in this employment (£)")).toBeEnabled();
    const pause = deferred<void>();
    io.update.mockImplementationOnce(
      async (key: string, update: (v: unknown) => unknown) => {
        await pause.promise;
        io.values.set(key, update(io.values.get(key)));
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Save preparation on this device" }),
    );
    expect(screen.getByLabelText("Pay in this employment (£)")).toBeDisabled();
    await act(async () => {
      pause.resolve();
      await pause.promise;
    });
    await screen.findByText(
      "Preparation saved on this device. No information was uploaded.",
    );
    expect(screen.getByLabelText("Pay in this employment (£)")).toBeEnabled();
  });

  it.each(["cancel", "unmount"] as const)(
    "ignores a late saved-draft read after %s",
    async (mode) => {
      const pause = deferred<PreparationDraft>();
      io.get.mockReturnValueOnce(pause.promise);
      const view = render(<PrepareClient />);
      fireEvent.click(
        screen.getByRole("button", { name: "Resume saved preparation" }),
      );
      if (mode === "cancel")
        fireEvent.click(screen.getByRole("button", { name: "Cancel loading" }));
      else view.unmount();
      await act(async () => {
        pause.resolve(savedDraft());
        await pause.promise;
      });
      expect(
        screen.queryByRole("heading", { name: "1. Circumstances" }),
      ).not.toBeInTheDocument();
      expect(io.update).not.toHaveBeenCalled();
    },
  );

  it("requires real matching P60 figures and explicit confirmation, and material edits remove review", async () => {
    render(<PrepareClient />);
    await start();
    await addEmployment();
    expect(screen.getByLabelText("Pay in this employment (£)")).toHaveValue("");
    fireEvent.click(
      screen.getByRole("button", { name: "Mark employment 1 reviewed" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "blank remains unknown",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Confirm that you checked",
    );
    fillEmployment(1, { year: "2026-27" });
    markReviewed();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "document year matches",
    );
    fillEmployment();
    markReviewed();
    expect(
      screen.getByText("Reviewed against your document"),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByLabelText("Tax deducted in this employment (£)"),
      { target: { value: "0" } },
    );
    expect(
      screen.queryByText("Reviewed against your document"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /I checked this job/ }),
    ).not.toBeChecked();
    markReviewed();
    expect(
      screen.getByText("Reviewed against your document"),
    ).toBeInTheDocument();
  });

  it("supports multiple jobs while P45/other sources stay unresolved and preserve hidden figures", async () => {
    render(<PrepareClient />);
    await start();
    await addEmployment();
    fillEmployment();
    markReviewed();
    fireEvent.click(screen.getByRole("button", { name: "Add an employment" }));
    const second = fillEmployment(2, { pay: "50.00", tax: "0" });
    fireEvent.change(second.getByLabelText("Document type"), {
      target: { value: "P45" },
    });
    expect(
      second.queryByRole("button", { name: "Mark employment 2 reviewed" }),
    ).not.toBeInTheDocument();
    expect(
      second.getByText("Keep this as an unresolved follow-up"),
    ).toBeInTheDocument();
    fireEvent.change(second.getByLabelText("Document type"), {
      target: { value: "P60" },
    });
    expect(second.getByLabelText("Pay in this employment (£)")).toHaveValue(
      "50.00",
    );
    fireEvent.change(second.getByLabelText("Document type"), {
      target: { value: "other" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    expect(
      screen.getByText(/Employment entries: 1 reviewed; 1 unresolved/),
    ).toBeInTheDocument();
  });

  it("does not display a stored future-year review flag as a reviewed P60", async () => {
    const draft = savedDraft("2026-27");
    draft.circumstances.employment = "yes";
    draft.employmentSources = [
      {
        ...createEmploymentSource(),
        employerName: "Job A",
        sourceLabel: "P60",
        documentYear: "2026-27",
        pay: "100",
        tax: "0",
        reviewed: true,
      },
    ];
    io.values.set(preparationStorageKey(draft.year), draft);
    render(<PrepareClient />);
    fireEvent.change(screen.getByLabelText("Tax year"), {
      target: { value: draft.year },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Resume saved preparation" }),
    );
    await screen.findByRole("heading", { name: "1. Circumstances" });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to evidence" }),
    );
    expect(
      screen.queryByText("Reviewed against your document"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mark employment 1 reviewed" }),
    ).toBeInTheDocument();
  });

  it("stops at the supported employment limit rather than creating an unsaveable extra entry", async () => {
    const draft = savedDraft();
    draft.circumstances.employment = "yes";
    draft.employmentSources = Array.from({ length: 50 }, () =>
      createEmploymentSource(),
    );
    io.values.set(preparationStorageKey(draft.year), draft);
    render(<PrepareClient />);
    fireEvent.click(
      screen.getByRole("button", { name: "Resume saved preparation" }),
    );
    await screen.findByRole("heading", { name: "1. Circumstances" });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to evidence" }),
    );
    expect(
      screen.getByText("Add an employment", { selector: "button" }),
    ).toBeDisabled();
    expect(
      screen.getByText(/supports up to 50 employment entries/),
    ).toBeInTheDocument();
  });

  it("asks before removing a nonempty employment", async () => {
    render(<PrepareClient />);
    await start();
    await addEmployment();
    fillEmployment();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove employment 1" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Keep employment 1" }));
    expect(screen.getByLabelText("Pay in this employment (£)")).toHaveValue(
      "12345.67",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Remove employment 1" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm removal of employment 1" }),
    );
    expect(
      screen.queryByRole("region", { name: "Employment 1" }),
    ).not.toBeInTheDocument();
  });

  it("shows conditional evidence and keeps uncertainty separate from reviewed document labels", async () => {
    render(<PrepareClient />);
    await start();
    answer("Property income", "Not sure");
    answer("Trading or freelance work", "Yes");
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to evidence" }),
    );
    const property = within(
      screen.getByRole("region", { name: "Property income" }),
    );
    expect(property.getByText(/Where to look:/)).toBeInTheDocument();
    fireEvent.change(property.getByLabelText("Evidence status"), {
      target: { value: "reviewed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    expect(
      screen.getByText(/6 unanswered circumstances · 1 marked “Not sure”/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Other income remains a follow-up/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not confirm that a return is complete/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /submit|file return/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps ongoing-year P60s unresolved and updates year labels when the year has ended", async () => {
    render(<PrepareClient />);
    fireEvent.change(screen.getByLabelText("Tax year"), {
      target: { value: "2026-27" },
    });
    await start();
    await addEmployment();
    fillEmployment(1, { year: "2026-27" });
    markReviewed();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This tax year has not ended",
    );
    expect(
      screen.getByText(/Its P60 cannot be marked reviewed yet/),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Choose another tax year" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Discard unsaved changes" }),
    );
    vi.mocked(Date.prototype.toISOString).mockReturnValue(
      "2027-04-06T12:00:00.000Z",
    );
    fireEvent.change(screen.getByLabelText("Tax year"), {
      target: { value: "2025-26" },
    });
    expect(
      screen.getByRole("option", { name: "2026–27 · ended" }),
    ).toBeInTheDocument();
  });

  it("previews a deliberate unencrypted summary with figures and notes omitted by default", async () => {
    const makeUrl = vi.fn(() => "blob:summary");
    const revokeUrl = vi.fn();
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = makeUrl;
        static revokeObjectURL = revokeUrl;
      },
    );
    const clicked = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(<PrepareClient />);
    await start();
    await addEmployment();
    fillEmployment();
    fireEvent.change(screen.getByLabelText("Notes or questions (optional)"), {
      target: { value: "Ask about a work benefit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview summary" }));
    const preview = screen.getByLabelText("Preparation summary preview");
    expect(preview).not.toHaveTextContent("12345.67");
    expect(preview).not.toHaveTextContent("Ask about a work benefit");
    expect(preview).toHaveTextContent("Job 1");
    expect(
      screen.getByRole("button", { name: "Download plain-text summary" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Include employment figures" }),
    );
    expect(
      screen.queryByLabelText("Preparation summary preview"),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Include my employment notes" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Preview summary" }));
    expect(
      screen.getByLabelText("Preparation summary preview"),
    ).toHaveTextContent("12345.67");
    expect(
      screen.getByLabelText("Preparation summary preview"),
    ).toHaveTextContent("Ask about a work benefit");
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I understand this summary is unencrypted/,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Download plain-text summary" }),
    );
    expect(clicked).toHaveBeenCalledOnce();
    expect(makeUrl).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledWith("blob:summary");
    expect(io.update).not.toHaveBeenCalled();
  });

  it("catches an invalid amount during summary preview and lets the person repair it", async () => {
    render(<PrepareClient />);
    await start();
    await addEmployment();
    fillEmployment(1, { pay: "1,000" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview summary" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "without commas or currency symbols",
    );
    expect(
      screen.queryByLabelText("Preparation summary preview"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit evidence" }));
    expect(screen.getByLabelText("Pay in this employment (£)")).toHaveValue(
      "1,000",
    );
    fireEvent.change(screen.getByLabelText("Pay in this employment (£)"), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview summary" }));
    expect(
      screen.getByLabelText("Preparation summary preview"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the visible preview when the browser cannot create the download", async () => {
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL(): string {
          throw new Error("private diagnostic");
        }
      },
    );
    render(<PrepareClient />);
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Step 3 Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview summary" }));
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I understand this summary is unencrypted/,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Download plain-text summary" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The summary could not be downloaded",
    );
    expect(
      screen.getByLabelText("Preparation summary preview"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/private diagnostic/)).not.toBeInTheDocument();
    expect(io.update).not.toHaveBeenCalled();
  });
});
