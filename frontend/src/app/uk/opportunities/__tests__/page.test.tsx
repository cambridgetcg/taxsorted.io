// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/uk-professional-opportunities", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/uk-professional-opportunities")
    >();
  const { default: corpus } = await import(
    "../../../../../../research/uk/professional-opportunities/data/uk-professional-opportunities.json"
  );
  return {
    ...actual,
    ukProfessionalOpportunityCorpus: corpus,
    professionalOpportunitySources: (sourceIds: readonly string[]) => {
      const wanted = new Set(sourceIds);
      return corpus.sources.filter((source) => wanted.has(source.id));
    },
  };
});

import UkProfessionalOpportunitiesPage from "../page";
import { ukProfessionalOpportunityCorpus } from "@/lib/uk-professional-opportunities";

describe("UK professional opportunities page", () => {
  if (!ukProfessionalOpportunityCorpus) {
    throw new Error("professional-opportunity corpus is unavailable");
  }
  const corpus = ukProfessionalOpportunityCorpus;

  it("defines opportunity as work to review rather than a lead or payout", () => {
    render(<UkProfessionalOpportunitiesPage />);

    expect(
      screen.getByRole("heading", {
        name: "Specialist work, mapped without the sales pitch.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "A class of work worth checking—not a claimant, lead or likely payout.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/no win score/i).length).toBeGreaterThan(0);
  });

  it("publishes every bounded opportunity and the local-only assessment door", () => {
    render(<UkProfessionalOpportunitiesPage />);

    for (const opportunity of corpus.opportunities) {
      expect(
        screen.getByRole("heading", { name: opportunity.title }),
      ).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole("link", {
        name: /open the evidence and workflow/i,
      }),
    ).toHaveLength(corpus.opportunities.length);
    for (const opportunity of corpus.opportunities) {
      const sourceId =
        opportunity.lawfulValueMechanisms[0]?.sourceIds[0];
      const source = corpus.sources.find((candidate) => candidate.id === sourceId);
      if (!source) throw new Error(`Missing source ${sourceId}`);
      expect(
        screen.getByRole("link", { name: source.title }),
      ).toHaveAttribute("href", source.url);
    }
    expect(
      screen.getByRole("link", { name: /blank local assessment json/i }),
    ).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/professional-opportunities/uk/assessment-template",
    );
    expect(screen.getByText(/no assessment upload endpoint/i)).toBeInTheDocument();
  });

  it("keeps professional gate kinds distinct", () => {
    render(<UkProfessionalOpportunitiesPage />);

    expect(screen.getByText("Legal requirement")).toBeInTheDocument();
    expect(
      screen.getByText("Regulator or platform condition"),
    ).toBeInTheDocument();
    expect(screen.getByText("Professional-body rule")).toBeInTheDocument();
    expect(screen.getByText("Prudent specialism")).toBeInTheDocument();
  });

  it("supports paid professional judgment without selling the relationship", () => {
    render(<UkProfessionalOpportunitiesPage />);

    expect(
      screen.getByRole("heading", {
        name: "Keep the map open. Charge honestly for the work.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/takes no referral cut/i)).toBeInTheDocument();
    expect(screen.getByText(/client chooses whom to instruct/i)).toBeInTheDocument();
  });
});
