// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import BooksConnectPage from "../page";
import { ACCOUNTING_SOURCES, OFFICIAL_FILING_HELP } from "@/lib/accounting-integrations";

afterEach(() => {
  window.history.replaceState({}, "", "/");
  vi.unstubAllGlobals();
});

describe("Bring in records", () => {
  it("opens working CSV and manual starts without a provider request", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<BooksConnectPage />);
    expect(screen.getByRole("heading", { name: "Bring in your records." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /import a bank csv/i })).toHaveAttribute("href", "/books/workspace/money?start=csv");
    expect(screen.getByRole("link", { name: /add a money item/i })).toHaveAttribute("href", "/books/workspace/money?start=manual");
    expect(screen.getByText(/signing in does not back them up/i)).toBeVisible();
    expect(screen.getAllByText("Connector not live")).toHaveLength(4);
    expect(screen.getByText(/cannot ask them for access or import their records/i)).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("carries recognised landlord context into import, manual entry and review only", () => {
    window.history.replaceState({}, "", "/books/connect?activity=uk-property&token=not-forwarded");
    render(<BooksConnectPage />);
    expect(screen.getByRole("link", { name: /import a bank csv/i })).toHaveAttribute("href", "/books/workspace/money?start=csv&activity=uk-property");
    expect(screen.getByRole("link", { name: /add a money item/i })).toHaveAttribute("href", "/books/workspace/money?start=manual&activity=uk-property");
    expect(screen.getByRole("link", { name: /check my business/i })).toHaveAttribute("href", "/books/workspace/business?activity=uk-property");
    expect(screen.getByRole("link", { name: /^review my records/i })).toHaveAttribute("href", "/books/workspace/money?activity=uk-property");
    expect(screen.getByRole("link", { name: /see my quarterly totals/i })).toHaveAttribute("href", "/books/workspace/tax?activity=uk-property");
    expect(screen.getByRole("link", { name: /all services/i })).toHaveAttribute("href", "/services");
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toContain("not-forwarded");
    }
  });

  it("ignores unsupported activity values", () => {
    window.history.replaceState({}, "", "/books/connect?activity=limited-company");
    render(<BooksConnectPage />);
    expect(screen.getByRole("link", { name: /import a bank csv/i })).toHaveAttribute("href", "/books/workspace/money?start=csv");
  });

  it("keeps provider limits and official links available without fake connect actions", () => {
    render(<BooksConnectPage />);
    for (const provider of ACCOUNTING_SOURCES.filter((source) => source.id !== "csv")) {
      const summary = screen.getByText(`Plans, limits and official links for ${provider.name}`);
      expect(summary.closest("details")).not.toHaveAttribute("open");
      fireEvent.click(summary);
      expect(screen.getByRole("link", { name: new RegExp(provider.needSoftware!.label, "i") })).toHaveAttribute("href", provider.needSoftware!.href);
      expect(screen.queryByRole("button", { name: new RegExp(`connect.*${provider.name}`, "i") })).not.toBeInTheDocument();
    }
    expect(screen.getByText(/private Xero authorisation pilot exists, with public access closed/i)).toBeVisible();
    expect(screen.getByText(/has no financial reader/i)).toBeVisible();
    expect(screen.getByText(/does not expose unreconciled statement lines/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /xero — bank-statement access limit/i })).toHaveAttribute("href", "https://developer.xero.com/documentation/api/accounting/bankstatements");
  });

  it("keeps live preparation separate from HMRC test submissions", () => {
    render(<BooksConnectPage />);
    expect(screen.getByText(/quarterly totals are prepared figures, not tax due or a filed return/i)).toBeVisible();
    expect(screen.getByText(/a test submission does not file your tax/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /open VAT test journey/i })).toHaveAttribute("href", "/vat");
    expect(screen.getByRole("link", { name: /open income tax test connection/i })).toHaveAttribute("href", "/dashboard");
    expect(within(screen.getByRole("region", { name: "HMRC test connections" })).getByRole("link", { name: /review a quarterly update/i })).toHaveAttribute("href", "/itsa/quarter");
    fireEvent.click(screen.getByText("What connects today and what comes next"));
    expect(screen.getByText(/signing in to a source never earns a reconciled badge/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /fictional connector test/i })).toHaveAttribute("href", "/books/connect/demo");
  });

  it("retains the dated source ledger inside a disclosure", () => {
    render(<BooksConnectPage />);
    fireEvent.click(screen.getByText("Official guidance and integration sources"));
    for (const source of OFFICIAL_FILING_HELP) {
      expect(screen.getByRole("link", { name: new RegExp(source.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })).toHaveAttribute("href", source.href);
    }
    expect(screen.getAllByText(/GOV.UK · checked 2026-08-01/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /official VAT guidance/i })).toHaveAttribute("href", "https://www.gov.uk/government/collections/making-tax-digital-for-vat");
    expect(screen.getByRole("link", { name: /official MTD Income Tax guidance/i })).toHaveAttribute("href", "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax");
  });
});
