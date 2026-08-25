// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FilePage from "../page";

describe("File and pay page", () => {
  it("keeps preparation, submission, receipt and settlement separate", () => {
    render(<FilePage />);
    expect(screen.getByRole("heading", { name: /nothing moves without your eyes and consent/i })).toBeInTheDocument();
    for (const state of ["Prepared", "Approved", "Submitted", "Delivery unknown", "Received", "Accepted", "Rejected", "Settled", "Corrected"]) {
      expect(screen.getByRole("heading", { name: state })).toBeInTheDocument();
    }
    expect(screen.getByText(/A click or pre-send failure is not submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/Merely knowing the amount is not settlement/i)).toBeInTheDocument();
  });

  it("states the production boundary before linking the live paths", () => {
    render(<FilePage />);
    expect(screen.getAllByText(/sandbox only/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/does not claim that VAT or MTD Income Tax submissions can be filed/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open the income tax path/i })).toHaveAttribute("href", "/itsa");
    expect(screen.getByRole("link", { name: /open the vat path/i })).toHaveAttribute("href", "/vat");
  });
});
