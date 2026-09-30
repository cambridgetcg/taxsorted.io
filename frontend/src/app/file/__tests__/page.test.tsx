// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FilePage from "../page";
import { OFFICIAL_RETURN_ROUTES } from "@/lib/accounting-integrations";

describe("File and pay page", () => {
  it("offers relevant next actions for individuals, sole traders and landlords", () => {
    render(<FilePage />);
    expect(screen.getByRole("heading", { name: "File and pay." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /my personal tax/i })).toHaveAttribute("href", "/prepare");
    expect(screen.getByRole("link", { name: /my sole-trader tax/i })).toHaveAttribute("href", "/books/workspace?activity=self-employment");
    expect(screen.getByRole("link", { name: /my landlord tax/i })).toHaveAttribute("href", "/books/workspace?activity=uk-property");
    expect(screen.getByRole("link", { name: /review my records/i })).toHaveAttribute("href", "/books/workspace/money");
    expect(screen.getByRole("link", { name: /see my quarterly totals/i })).toHaveAttribute("href", "/books/workspace/tax");
    expect(screen.getByRole("link", { name: /build my handover/i })).toHaveAttribute("href", "/passport");
    expect(screen.getByRole("link", { name: /all services/i })).toHaveAttribute("href", "/services");
  });

  it("makes the live filing boundary visible and keeps test routes explicit", () => {
    render(<FilePage />);
    const boundary = screen.getByRole("complementary", { name: "Filing availability" });
    expect(within(boundary).getByText(/live filing with HMRC is not available/i)).toBeVisible();
    expect(within(boundary).getByText(/a complete year-end return is not available/i)).toBeVisible();
    expect(within(boundary).getByRole("link", { name: /official filing route/i })).toHaveAttribute("href", "#official-filing");
    expect(screen.getByText(/practice submissions do not satisfy a filing obligation/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /explore income tax preparation and tests/i })).toHaveAttribute("href", "/itsa");
    expect(screen.getByRole("link", { name: /explore the VAT test journey/i })).toHaveAttribute("href", "/vat");
    expect(screen.getByText(/Starter Books does not yet derive a VAT return/i)).toBeVisible();
  });

  it("links to the checked official destinations without sending records", () => {
    render(<FilePage />);
    for (const route of OFFICIAL_RETURN_ROUTES) {
      const link = screen.getByRole("link", { name: new RegExp(route.label, "i") });
      expect(link).toHaveAttribute("href", route.href);
      expect(link).toHaveAttribute("rel", "noreferrer noopener");
      expect(new URL(route.href).hostname).toBe("www.gov.uk");
    }
    expect(screen.getByText(/TaxSorted does not send your records with them/i)).toBeVisible();
  });

  it("keeps exact filing states available in a closed disclosure", () => {
    render(<FilePage />);
    const disclosure = screen.getByText("What prepared, submitted and accepted mean").closest("details");
    expect(disclosure).not.toHaveAttribute("open");
    expect(screen.getByText("Prepared", { selector: "dt" })).not.toBeVisible();
    fireEvent.click(screen.getByText("What prepared, submitted and accepted mean"));
    for (const state of ["Prepared", "Approved", "Submitted", "Delivery unknown", "Received", "Accepted", "Rejected", "Settled", "Corrected"]) {
      expect(screen.getByText(state, { selector: "dt" })).toBeVisible();
    }
    expect(screen.getByText(/A click or pre-send failure is not submitted/i)).toBeVisible();
    expect(screen.getByText(/Merely knowing the amount is not settlement/i)).toBeVisible();
  });
});
