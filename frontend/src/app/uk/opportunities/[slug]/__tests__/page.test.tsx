// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/uk-professional-opportunities", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/uk-professional-opportunities")
    >();
  const { default: corpus } = await import(
    "../../../../../../../research/uk/professional-opportunities/data/uk-professional-opportunities.json"
  );
  return {
    ...actual,
    ukProfessionalOpportunityCorpus: corpus,
    professionalOpportunitySources: (sourceIds: readonly string[]) => {
      const wanted = new Set(sourceIds);
      return corpus.sources.filter((source) => wanted.has(source.id));
    },
    regulatorScrutinyByIds: (scrutinyIds: readonly string[]) => {
      const wanted = new Set(scrutinyIds);
      return corpus.scrutiny.filter((record) => wanted.has(record.id));
    },
  };
});

import {
  ProfessionalOpportunityDetail,
  generateStaticParams,
} from "../page";
import { ukProfessionalOpportunityCorpus } from "@/lib/uk-professional-opportunities";

describe("professional opportunity detail", () => {
  if (!ukProfessionalOpportunityCorpus) {
    throw new Error("professional-opportunity corpus is unavailable");
  }
  const corpus = ukProfessionalOpportunityCorpus;
  const opportunity = corpus.opportunities[0]!;

  it("turns one opportunity into evidence, workflow and route checks", () => {
    render(<ProfessionalOpportunityDetail opportunity={opportunity} />);

    expect(
      screen.getByRole("heading", { name: opportunity.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "A complaint does not preserve an appeal.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Inputs become bounded outputs, one stage at a time.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/zero|negative/i).length).toBeGreaterThan(0);
    for (const state of corpus.sharedWorkflow.moneyStateOrder) {
      expect(
        screen.getByText(
          opportunity.moneyModel[
            state as keyof typeof opportunity.moneyModel
          ],
        ),
      ).toBeInTheDocument();
    }
    expect(
      screen.getAllByText(/^Sources:/).length,
    ).toBeGreaterThan(opportunity.deadlineWarnings.length);
  });

  it("exports one static path for every admitted opportunity", () => {
    expect(generateStaticParams()).toEqual(
      corpus.opportunities.map((record) => ({
        slug: record.slug,
      })),
    );
  });

  it("offers a public packet but no completed-assessment upload", () => {
    render(<ProfessionalOpportunityDetail opportunity={opportunity} />);

    expect(
      screen.getByRole("link", { name: /complete public packet json/i }),
    ).toHaveAttribute(
      "href",
      `https://api.taxsorted.io/v1/professional-opportunities/uk/opportunities/${opportunity.id}`,
    );
    expect(screen.getByText(/accepts no completed file/i)).toBeInTheDocument();
    expect(screen.getByText(/TaxSorted verifies no professional/i)).toBeInTheDocument();
  });
});
