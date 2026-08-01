// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BooksConnectPage from "../page";

describe("Books connection path", () => {
  it("opens the two real local starts and labels provider connections as not live", () => {
    render(<BooksConnectPage />);

    expect(
      screen.getByRole("heading", { name: /connect records\. keep each boundary clear/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /import a bank csv/i })[0]).toHaveAttribute(
      "href",
      "/books/workspace?start=csv",
    );
    expect(screen.getByRole("link", { name: /add one transaction/i })).toHaveAttribute(
      "href",
      "/books/workspace?start=manual",
    );
    expect(screen.getAllByText("Connector not live")).toHaveLength(4);
    expect(screen.getByText(/cannot ask them for access or collect provider data/i))
      .toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /try the made-up connector proof/i })
    ).toHaveAttribute("href", "/books/connect/demo");
  });

  it("separates existing users from neutral official software links", () => {
    render(<BooksConnectPage />);

    expect(screen.getAllByText("Already use it")).toHaveLength(4);
    expect(screen.getAllByText("Need accounting software")).toHaveLength(4);
    expect(screen.getByRole("link", { name: /view official xero plans/i })).toHaveAttribute(
      "href",
      "https://www.xero.com/uk/pricing-plans/"
    );
    expect(screen.getByRole("link", { name: /view official sage plans/i })).toHaveAttribute(
      "href",
      "https://www.sage.com/en-gb/accounting-software/"
    );
    expect(screen.getAllByText(/no referral or suitability claim/i)).toHaveLength(4);
  });

  it("shows reconciliation as a missing gate rather than a connection result", () => {
    render(<BooksConnectPage />);

    expect(screen.getByRole("heading", { name: "Check completeness" })).toBeInTheDocument();
    expect(screen.getByText(/signing in to a source never earns a reconciled badge/i))
      .toBeInTheDocument();
    expect(screen.getByText(/does not expose unreconciled statement lines/i))
      .toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /xero — bank-statement access limit/i }),
    ).toHaveAttribute(
      "href",
      "https://developer.xero.com/documentation/api/accounting/bankstatements",
    );
    expect(screen.getByText(/product commitments, not claims about today's build/i))
      .toBeInTheDocument();
    expect(screen.getByText(/attachments are also outside TaxSorted's first pilot/i))
      .toBeInTheDocument();
  });

  it("keeps VAT and Income Tax separate and names exactly what is not live", () => {
    render(<BooksConnectPage />);

    expect(screen.getByRole("heading", { name: "VAT" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Income Tax" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open VAT practice/i })).toHaveAttribute(
      "href",
      "/vat",
    );
    expect(
      screen.getByRole("link", { name: /connect Income Tax practice/i }),
    ).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText(/year-end adjustments, other income, final declaration/i))
      .toBeInTheDocument();
    expect(screen.getAllByText(/no production-filing claim|not yet recognised/i).length)
      .toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /official VAT guidance/i })).toHaveAttribute(
      "href",
      "https://www.gov.uk/government/collections/making-tax-digital-for-vat",
    );
    expect(
      screen.getByRole("link", { name: /official MTD Income Tax guidance/i }),
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax",
    );
  });

  it("puts current official filing guidance in the order a person needs it", () => {
    render(<BooksConnectPage />);

    expect(
      screen.getByRole("link", { name: /check if and when you must use MTD Income Tax/i }),
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/guidance/find-out-if-and-when-you-need-to-use-making-tax-digital-for-income-tax",
    );
    expect(
      screen.getByRole("link", { name: /send cumulative quarterly updates/i }),
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates",
    );
    expect(screen.getByRole("link", { name: /complete and submit the tax return/i }))
      .toHaveAttribute(
        "href",
        "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/submit-your-tax-return",
      );
    expect(screen.getByRole("link", { name: /pay a Self Assessment tax bill/i })).toHaveAttribute(
      "href",
      "https://www.gov.uk/pay-self-assessment-tax-bill",
    );
    expect(
      screen.getByRole("link", { name: /correct a Self Assessment tax return/i }),
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/self-assessment-tax-returns/corrections",
    );
    expect(screen.getAllByText(/checked 2026-08-01/i).length).toBeGreaterThanOrEqual(10);
    expect(
      screen.getByRole("link", { name: /gov\.uk's mtd income tax guidance/i })
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax"
    );
  });
});
