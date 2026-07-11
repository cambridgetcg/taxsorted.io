// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MtdExpertCheck } from "../MtdExpertCheck";

function choose(label: RegExp, option: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: option } });
}

function fillMaterialFacts(amount = "50000.01") {
  choose(/return duty and filing position/i, "required-and-submitted");
  choose(/activity shown on that return continue immediately/i, "yes");
  choose(/national insurance number/i, "yes");
  choose(/residence in 2024\/25/i, "uk-resident");
  choose(/was the 2024\/25 return amended/i, "no");
  choose(/annualisation or another special income rule/i, "no");
  choose(/activity that continued at entry still continue/i, "continuing");
  choose(/relevant item shown on the 2024\/25 return/i, "none-listed");
  choose(/HMRC digital-exclusion position/i, "not-approved-or-pending");
  choose(/other HMRC exemption application covering 2026\/27/i, "none");
  choose(/quarterly update periods/i, "standard");
  fireEvent.change(screen.getByLabelText(/gross self-employment income in the UK return/i), { target: { value: amount } });
  fireEvent.change(screen.getByLabelText(/^gross UK property income$/i), { target: { value: "0" } });
  fireEvent.change(screen.getByLabelText(/^gross foreign property income$/i), { target: { value: "0" } });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-11T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("MTD expert browser check", () => {
  it("classifies one penny over £50,000 and keeps the figures in the browser", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<MtdExpertCheck />);
    fillMaterialFacts();
    fireEvent.click(screen.getByRole("button", { name: /understand my position/i }));

    expect(screen.getByRole("heading", { name: /MTD Income Tax applies from 6 April 2026/i })).toBeInTheDocument();
    expect(screen.getAllByText("£50,000.01").length).toBeGreaterThan(0);
    expect(screen.getAllByText("7 August 2026").length).toBeGreaterThan(0);
    expect(screen.getByText(/no penalties for missing a 2026-27 quarterly-update deadline/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps the exact £50,000 boundary out of the first phase", () => {
    render(<MtdExpertCheck />);
    fillMaterialFacts("50000");
    fireEvent.click(screen.getByRole("button", { name: /understand my position/i }));
    expect(screen.getByRole("heading", { name: /not over £50,000/i })).toBeInTheDocument();
    expect(screen.queryByText("7 August 2026")).toBeNull();
  });

  it("shows blank income as an unknown fact instead of zero", () => {
    render(<MtdExpertCheck />);
    fillMaterialFacts();
    fireEvent.change(screen.getByLabelText(/gross self-employment income in the UK return/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /understand my position/i }));
    expect(screen.getByRole("heading", { name: /use the required 2024\/25 return figures/i })).toBeInTheDocument();
    expect(screen.getByText(/smallest facts needed next/i)).toBeInTheDocument();
    expect(screen.getByText((_, element) =>
      element?.tagName === "LI" &&
      element.textContent?.includes("2024-25 gross UK-return self-employment income") === true,
    )).toBeInTheDocument();
  });

  it("blocks malformed money before the engine runs", () => {
    render(<MtdExpertCheck />);
    fillMaterialFacts("not money");
    fireEvent.click(screen.getByRole("button", { name: /understand my position/i }));
    const field = screen.getByLabelText(/gross self-employment income in the UK return/i);
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/enter a number, like 40000/i)).toBeInTheDocument();
    expect(screen.queryByText(/confidence:/i)).toBeNull();
  });

  it("clears a result as soon as a material answer changes", () => {
    render(<MtdExpertCheck />);
    fillMaterialFacts();
    fireEvent.click(screen.getByRole("button", { name: /understand my position/i }));
    expect(screen.getByRole("heading", { name: /MTD Income Tax applies/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/gross self-employment income in the UK return/i), { target: { value: "10000" } });
    expect(screen.queryByRole("heading", { name: /MTD Income Tax applies/i })).toBeNull();
  });

  it("includes UK-resident foreign property and shows the later-phase forecast", () => {
    render(<MtdExpertCheck />);
    fillMaterialFacts("35000");
    fireEvent.change(screen.getByLabelText(/^gross foreign property income$/i), { target: { value: "16000.01" } });
    fireEvent.change(screen.getByLabelText(/expected residence in 2025\/26/i), { target: { value: "uk-resident" } });
    fireEvent.change(screen.getAllByLabelText(/gross UK-return self-employment/i)[0], { target: { value: "30000.01" } });
    fireEvent.change(screen.getAllByLabelText(/gross UK property/i)[1], { target: { value: "0" } });
    fireEvent.change(screen.getAllByLabelText(/gross foreign property/i)[1], { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /understand my position/i }));

    expect(screen.getAllByText("£51,000.01").length).toBeGreaterThan(0);
    expect(screen.getByText("Forecast over threshold")).toBeInTheDocument();
  });

  it("rejects amounts above the service boundary with a focused error summary", () => {
    render(<MtdExpertCheck />);
    fillMaterialFacts("10000000000.01");
    fireEvent.click(screen.getByRole("button", { name: /understand my position/i }));
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(screen.getByText(/service limit is £10 billion/i)).toBeInTheDocument();
  });

  it("does not steal focus back to the summary while a person corrects errors", () => {
    render(<MtdExpertCheck />);
    fillMaterialFacts("not money");
    fireEvent.change(screen.getByLabelText(/^gross UK property income$/i), { target: { value: "also bad" } });
    fireEvent.click(screen.getByRole("button", { name: /understand my position/i }));
    expect(screen.getByRole("alert")).toHaveFocus();

    const first = screen.getByLabelText(/gross self-employment income in the UK return/i);
    first.focus();
    fireEvent.change(first, { target: { value: "50000.01" } });
    expect(first).toHaveFocus();
  });
});
