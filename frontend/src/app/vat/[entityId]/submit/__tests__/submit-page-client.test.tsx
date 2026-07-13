// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VATSubmitPageClient from "../submit-page-client";

const { navigation } = vi.hoisted(() => ({
  navigation: { searchParams: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.searchParams,
}));

describe("fictional VAT draft calculator", () => {
  beforeEach(() => {
    navigation.searchParams = new URLSearchParams();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("states the browser-only boundary and exposes no old submission state", () => {
    render(<VATSubmitPageClient entityId="ent_001" />);

    expect(
      screen.getByRole("complementary", { name: "Fictional browser-only calculator" }),
    ).toHaveTextContent(/does not connect.*save a draft.*file a return/i);
    expect(screen.queryByText(/submission failed|vat return prepared|saved and sent/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /^file/i })).toBeNull();
    expect(screen.getByRole("tab", { name: "Quick 20% estimate" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("supports arrow, Home and End tab keys while preserving entered state", () => {
    render(<VATSubmitPageClient entityId="ent_001" />);

    fireEvent.click(
      screen.getByRole("checkbox", { name: /every sale in these totals is standard-rated/i }),
    );
    const sales = screen.getByLabelText("Standard-rated sales, before VAT");
    fireEvent.change(sales, { target: { value: "123.45" } });

    const guidedTab = screen.getByRole("tab", { name: "Quick 20% estimate" });
    fireEvent.keyDown(guidedTab, { key: "End" });
    const detailedTab = screen.getByRole("tab", { name: "Detailed boxes" });
    expect(detailedTab).toHaveAttribute("aria-selected", "true");
    expect(detailedTab).toHaveFocus();
    expect(document.getElementById("guided-sales")).toHaveValue("123.45");
    expect(document.getElementById("detailed-vatDueSales")).toBeInTheDocument();

    fireEvent.keyDown(detailedTab, { key: "Home" });
    expect(guidedTab).toHaveAttribute("aria-selected", "true");
    expect(guidedTab).toHaveFocus();
    expect(sales).toHaveValue("123.45");

    fireEvent.keyDown(guidedTab, { key: "ArrowRight" });
    expect(detailedTab).toHaveAttribute("aria-selected", "true");
  });

  it("requires explicit detailed values instead of silently turning blanks into zero", () => {
    render(<VATSubmitPageClient entityId="ent_001" />);

    fireEvent.click(screen.getByRole("tab", { name: "Detailed boxes" }));
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I checked these example figures against my records/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Review completed calculation" }));

    expect(screen.getByText(/VAT due on sales: enter a number/i)).toBeInTheDocument();
    expect(document.getElementById("detailed-vatDueSales")).toHaveFocus();
  });

  it("moves focus into completion, prints, then returns with figures intact", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<VATSubmitPageClient entityId="ent_001" />);

    fireEvent.click(
      screen.getByRole("checkbox", { name: /every sale in these totals is standard-rated/i }),
    );
    const sales = screen.getByLabelText("Standard-rated sales, before VAT");
    const costs = screen.getByLabelText("Eligible standard-rated purchases, before VAT");
    fireEvent.change(sales, { target: { value: "1000" } });
    fireEvent.change(costs, { target: { value: "200" } });
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I checked this example draft/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Review completed calculation" }));

    const completionHeading = screen.getByRole("heading", {
      name: "Review the fictional VAT draft",
    });
    expect(completionHeading).toHaveFocus();
    expect(
      screen.getByText(/nothing was saved, connected to an account, or sent to hmrc/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Print or save as PDF" }));
    expect(print).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Return to the figures" }));
    expect(screen.getByRole("tab", { name: "Quick 20% estimate" })).toHaveFocus();
    expect(sales).toHaveValue("1000");
    expect(costs).toHaveValue("200");
  });
});
