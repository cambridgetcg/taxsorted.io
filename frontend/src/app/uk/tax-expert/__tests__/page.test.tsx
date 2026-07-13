// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UkTaxExpertPage from "../page";

describe("UK tax expert page shell", () => {
  it("leaves the single main landmark to the shared site layout", () => {
    const { container } = render(<UkTaxExpertPage />);

    expect(container.querySelector("main")).toBeNull();
  });

  it("opens with one plain sentence saying what the page does for the reader", () => {
    render(<UkTaxExpertPage />);

    expect(
      screen.getByText(/Answer a few questions about your income\. See exactly which tax rules apply to you — and why\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /check which tax rules apply to you/i })).toBeInTheDocument();
  });

  it("spells out MTD, HMRC, ITSA and ANI on first use", () => {
    const { container } = render(<UkTaxExpertPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("Making Tax Digital (MTD)");
    expect(text).toContain("HMRC — the UK tax office");
    expect(text).toContain("Income Tax Self Assessment (ITSA)");
    expect(text).toContain("ANI — your income after certain deductions");
  });

  it("collapses the capability matrix, the philosophy and the developer links into closed details", () => {
    const { container } = render(<UkTaxExpertPage />);

    for (const summaryText of [
      /what this site can and cannot do/i,
      /how this checker thinks/i,
      /for developers and software agents/i,
    ]) {
      const summary = screen.getByText(summaryText);
      const details = summary.closest("details");
      expect(details).not.toBeNull();
      expect(details).not.toHaveAttribute("open");
    }
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("leads back to its hub with a breadcrumb trail, not straight to the homepage", () => {
    render(<UkTaxExpertPage />);

    const trail = screen.getByRole("navigation", { name: /you are here/i });
    expect(trail).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Do my tax" })).toHaveAttribute("href", "/tools");
  });
});
