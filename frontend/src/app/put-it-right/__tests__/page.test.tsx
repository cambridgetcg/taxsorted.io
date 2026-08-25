// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PutItRightPage from "../page";

afterEach(() => vi.useRealTimers());

describe("Put it right page", () => {
  it("keeps correction, appeal, complaint and payment help as distinct routes", () => {
    render(<PutItRightPage />);
    for (const route of [
      /my records or calculation are wrong/i,
      /amend a filed return/i,
      /disagree with an HMRC decision/i,
      /cannot pay on time/i,
      /HMRC’s service was the problem/i,
      /need extra support/i,
      /not declared some income/i,
    ]) {
      expect(screen.getByRole("heading", { name: route })).toBeInTheDocument();
    }
  });

  it("links to the official amendment, appeal, complaint and payment routes", () => {
    render(<PutItRightPage />);
    expect(screen.getByRole("link", { name: /change a self assessment return/i })).toHaveAttribute("href", "https://www.gov.uk/self-assessment-tax-returns/corrections");
    expect(screen.getByRole("link", { name: /correct errors in a VAT return/i })).toHaveAttribute("href", "https://www.gov.uk/submit-vat-return/correct-errors-in-your-vat-return");
    expect(screen.getByRole("link", { name: /disagree with a decision/i })).toHaveAttribute("href", "https://www.gov.uk/tax-appeals/decision");
    expect(screen.getByRole("link", { name: /payment plans and time to pay/i })).toHaveAttribute("href", "https://www.gov.uk/difficulties-paying-hmrc/pay-in-instalments");
    expect(screen.getByRole("link", { name: /make a complaint/i })).toHaveAttribute("href", "https://www.gov.uk/complain-about-hmrc");
    expect(screen.getByRole("link", { name: /tell HMRC about undeclared income/i })).toHaveAttribute("href", "https://www.gov.uk/undeclared-income");
  });

  it("does not invite confidential case intake or claim representation", () => {
    render(<PutItRightPage />);
    expect(screen.getByText(/does not assess the merits of a real dispute/i)).toBeInTheDocument();
    expect(screen.getByText(/does not.*accept confidential case files/i)).toBeInTheDocument();
    expect(screen.getByText(/does not.*act for you before HMRC or a tribunal/i)).toBeInTheDocument();
  });

  it("warns and falls back to current official instructions after source review is due", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-26T12:00:00Z"));
    render(<PutItRightPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(/source review overdue/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/current GOV\.UK instructions/i);
  });
});
