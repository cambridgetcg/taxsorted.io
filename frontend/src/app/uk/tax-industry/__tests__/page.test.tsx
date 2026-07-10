// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import taxIndustryJson from "../../../../../../research/uk/tax-industry/data/uk-tax-industry.json";
import TaxIndustryPage from "../page";

const industry = taxIndustryJson;

describe("UK tax-industry page", () => {
  it("leads with the open-entry truth and the corpus review state", () => {
    render(<TaxIndustryPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /see the gate before you pay/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /ordinary tax advice is generally not a reserved profession/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`corpus version ${industry.meta.version}`))).toBeInTheDocument();
  });

  it("separates state authority, professional-body rules and employer convention", () => {
    render(<TaxIndustryPage />);

    const ruleCards = screen.getAllByTestId("rule-card");
    expect(ruleCards).toHaveLength(3);
    expect(within(ruleCards[0]).getByText("Law or state authorisation")).toBeInTheDocument();
    expect(within(ruleCards[1]).getByText("Professional-body rule")).toBeInTheDocument();
    expect(within(ruleCards[2]).getByText("Employer convention")).toBeInTheDocument();
    expect(within(ruleCards[1]).getByText(/not a universal licence/i)).toBeInTheDocument();
  });

  it("renders every reviewed role and qualification from the corpus", () => {
    render(<TaxIndustryPage />);

    const roleCards = screen.getAllByTestId("role-card");
    const qualificationCards = screen.getAllByTestId("qualification-card");
    expect(roleCards).toHaveLength(industry.roles.length);
    expect(qualificationCards).toHaveLength(industry.qualifications.length);

    for (const [index, role] of industry.roles.entries()) {
      expect(within(roleCards[index]).getByRole("heading", { name: role.name })).toBeInTheDocument();
    }
    for (const [index, qualification] of industry.qualifications.entries()) {
      expect(within(qualificationCards[index]).getByText(qualification.name)).toBeInTheDocument();
    }
  });

  it("publishes every walk-through, gate and named barrier", () => {
    render(<TaxIndustryPage />);

    expect(screen.getAllByTestId("pathway-card")).toHaveLength(industry.pathways.length);
    expect(screen.getAllByTestId("gate-card")).toHaveLength(industry.gates.length);
    expect(screen.getAllByTestId("barrier-card")).toHaveLength(industry.barriers.length);
    expect(screen.getByText(/means the simplest lawful route for the actual work/i)).toBeInTheDocument();
  });

  it("keeps employment pay, firm revenue and owner profit visibly distinct", () => {
    render(<TaxIndustryPage />);

    expect(screen.getAllByTestId("compensation-card")).toHaveLength(industry.compensation.length);
    expect(screen.getAllByText("Employment pay").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Firm service-line revenue").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Owner profit allocation").length).toBeGreaterThan(0);
    expect(screen.getByText(/salary ≠ revenue ≠ owner profit/i)).toBeInTheDocument();
  });

  it("shows the origin and legal form of every mapped institution", () => {
    render(<TaxIndustryPage />);

    const cards = screen.getAllByTestId("institution-card");
    expect(cards).toHaveLength(industry.institutions.length);
    for (const [index, institution] of industry.institutions.entries()) {
      expect(within(cards[index]).getByRole("heading", { name: institution.name })).toBeInTheDocument();
      expect(within(cards[index]).getByText(institution.legalForm)).toBeInTheDocument();
    }
  });

  it("gives readers a direct path to take and understand the data", () => {
    render(<TaxIndustryPage />);

    expect(screen.getByRole("link", { name: /download complete datasets/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/tax-industry/uk/exports",
    );
    expect(screen.getByRole("link", { name: /read the data dictionary/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/tax-industry/uk/dictionary",
    );
  });
});
