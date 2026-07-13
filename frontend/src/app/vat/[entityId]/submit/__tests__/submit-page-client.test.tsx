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
      screen.getByRole("complementary", { name: "A worked example" }),
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
      screen.getByRole("checkbox", { name: /yes — both are true/i }),
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

  it("normalises a pasted pound sign and grouping after guided input blur", () => {
    render(<VATSubmitPageClient entityId="ent_001" />);

    fireEvent.click(
      screen.getByRole("checkbox", { name: /yes — both are true/i }),
    );
    const sales = screen.getByLabelText("Standard-rated sales, before VAT");
    fireEvent.change(sales, { target: { value: "£ 1,000.00" } });
    expect(sales).toHaveValue("1,000.00");
    fireEvent.blur(sales);
    expect(sales).toHaveValue("1000");

    fireEvent.change(sales, { target: { value: "£500,000,000,000.00" } });
    expect(sales).toHaveValue("500,000,000,000.00");
    expect(screen.getByText(/above this example's limit/i)).toBeVisible();
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

  it("reveals a required goods box before reporting and focusing its error", () => {
    render(<VATSubmitPageClient entityId="ent_001" />);

    fireEvent.click(screen.getByRole("tab", { name: "Detailed boxes" }));
    for (const [id, value] of [
      ["detailed-vatDueSales", "20"],
      ["detailed-vatDueAcquisitions", "0"],
      ["detailed-vatReclaimedCurrPeriod", "4"],
      ["detailed-totalValueSalesExVAT", "100"],
      ["detailed-totalValuePurchasesExVAT", "20"],
    ]) {
      fireEvent.change(document.getElementById(id)!, { target: { value } });
    }

    const goodsBoxes = screen
      .getByText("Northern Ireland and EU goods boxes")
      .closest("details");
    expect(goodsBoxes).not.toHaveAttribute("open");

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I checked these example figures against my records/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Review completed calculation" }));

    expect(goodsBoxes).toHaveAttribute("open");
    expect(screen.getByText(/Goods supplied.*enter a number/i)).toBeVisible();
    expect(document.getElementById("detailed-totalValueGoodsSuppliedExVAT")).toHaveFocus();
  });

  it("keeps pasted grouping visible and normalises it on blur", () => {
    render(<VATSubmitPageClient entityId="ent_001" />);

    fireEvent.click(screen.getByRole("tab", { name: "Detailed boxes" }));
    const salesVat = document.getElementById("detailed-vatDueSales")!;
    fireEvent.change(salesVat, { target: { value: "1,000.25" } });
    expect(salesVat).toHaveValue("1,000.25");
    fireEvent.blur(salesVat);
    expect(salesVat).toHaveValue("1000.25");

    fireEvent.change(salesVat, { target: { value: "10,00" } });
    fireEvent.blur(salesVat);
    expect(salesVat).toHaveValue("10,00");
    expect(screen.getByText(/commas only between groups of three digits/i)).toBeVisible();

    fireEvent.change(salesVat, { target: { value: "£10000000000000" } });
    expect(salesVat).toHaveValue("10000000000000");
    fireEvent.blur(salesVat);
    expect(screen.getByText(/this example supports up to/i)).toBeVisible();
  });

  it("keeps calculated boxes at canonical two-decimal precision", () => {
    render(<VATSubmitPageClient entityId="ent_001" />);

    fireEvent.click(screen.getByRole("tab", { name: "Detailed boxes" }));
    fireEvent.change(document.getElementById("detailed-vatDueSales")!, {
      target: { value: "0.10" },
    });
    fireEvent.change(document.getElementById("detailed-vatDueAcquisitions")!, {
      target: { value: "0.20" },
    });
    fireEvent.change(document.getElementById("detailed-vatReclaimedCurrPeriod")!, {
      target: { value: "0" },
    });

    expect(document.getElementById("detailed-totalVatDue")).toHaveValue("0.3");
    expect(document.getElementById("detailed-netVatDue")).toHaveValue("0.3");
  });

  it("blocks an out-of-contract calculated box and focuses its read-only result", () => {
    render(<VATSubmitPageClient entityId="ent_001" />);

    fireEvent.click(screen.getByRole("tab", { name: "Detailed boxes" }));
    for (const [id, value] of [
      ["detailed-vatDueSales", "9999999999999.99"],
      ["detailed-vatDueAcquisitions", "1"],
      ["detailed-vatReclaimedCurrPeriod", "9999999999999.99"],
      ["detailed-totalValueSalesExVAT", "0"],
      ["detailed-totalValuePurchasesExVAT", "0"],
      ["detailed-totalValueGoodsSuppliedExVAT", "0"],
      ["detailed-totalAcquisitionsExVAT", "0"],
    ]) {
      fireEvent.change(document.getElementById(id)!, { target: { value } });
    }

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I checked these example figures against my records/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Review completed calculation" }));

    expect(screen.getByText(/Box 3 is above/i)).toBeVisible();
    expect(document.getElementById("detailed-totalVatDue")).toHaveFocus();
    expect(document.getElementById("completion-heading")).not.toBeInTheDocument();

    fireEvent.change(document.getElementById("detailed-vatDueAcquisitions")!, {
      target: { value: "0" },
    });
    expect(screen.queryByText(/Box 3 is above/i)).toBeNull();
  });

  it("moves focus into completion, prints, then returns with figures intact", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<VATSubmitPageClient entityId="ent_001" />);

    fireEvent.click(
      screen.getByRole("checkbox", { name: /yes — both are true/i }),
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
      name: "Review the example VAT draft",
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
