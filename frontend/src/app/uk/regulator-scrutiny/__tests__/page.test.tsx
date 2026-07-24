// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import opportunityCorpusJson from "../../../../../../research/uk/professional-opportunities/data/uk-professional-opportunities.json";

vi.mock("@/lib/uk-professional-opportunities", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/uk-professional-opportunities")
    >();
  const { default: corpus } = await import(
    "../../../../../../research/uk/professional-opportunities/data/uk-professional-opportunities.json"
  );
  return { ...actual, ukProfessionalOpportunityCorpus: corpus };
});

import RegulatorScrutinyPage, { dynamic } from "../page";

const corpus = opportunityCorpusJson;
const sourceById = new Map(
  corpus.sources.map((source) => [source.id, source]),
);

describe("UK regulator-scrutiny page", () => {
  it("is static and leads with the institutional evidence boundary", () => {
    render(<RegulatorScrutinyPage />);

    expect(dynamic).toBe("force-static");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Regulators answer to evidence too.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Audit the public act, not the employee.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/no finding is inferred/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: /research commons, not an accusation engine/i,
      }),
    ).toBeInTheDocument();
  });

  it("keeps every evidence state visibly distinct", () => {
    render(<RegulatorScrutinyPage />);

    const legend = screen.getByTestId("evidence-legend");
    const labels = within(legend).getAllByTestId("evidence-state-label");

    expect(
      labels.map((label) => label.getAttribute("data-evidence-state")),
    ).toEqual([
      "court-finding",
      "oversight-finding",
      "official-statistic",
      "stakeholder-assessment",
      "taxsorted-fairness-question",
      "unknown",
    ]);
    expect(new Set(labels.map((label) => label.className)).size).toBe(
      labels.length,
    );
    expect(
      within(legend).getByText(/a defined population was counted/i),
    ).toBeInTheDocument();
    expect(
      within(legend).getByText(/it is not a finding or allegation/i),
    ).toBeInTheDocument();
  });

  it("renders every scrutiny record with its limit, counterweight and route", () => {
    render(<RegulatorScrutinyPage />);

    const cards = screen.getAllByTestId("scrutiny-record");
    expect(cards).toHaveLength(corpus.scrutiny.length);

    for (const [index, record] of corpus.scrutiny.entries()) {
      const card = within(cards[index]);
      expect(
        card.getByRole("heading", { name: record.title }),
      ).toBeInTheDocument();
      expect(card.getByText(record.statement)).toBeInTheDocument();
      expect(card.getByText(record.doesNotProve)).toBeInTheDocument();
      expect(
        card.getByText(record.counterweightOrResponse),
      ).toBeInTheDocument();
      expect(
        card.getByText(record.correctionOrReviewRoute),
      ).toBeInTheDocument();
      expect(cards[index]).toHaveAttribute(
        "data-evidence-state",
        record.evidenceState,
      );
    }
  });

  it("keeps the population rule and counterweight beside quantitative evidence", () => {
    render(<RegulatorScrutinyPage />);

    expect(
      screen.getByText(
        /quantitative statements name the measured population or denominator/i,
      ),
    ).toBeInTheDocument();

    const statisticRecords = corpus.scrutiny.filter(
      (record) => record.evidenceState === "official-statistic",
    );
    expect(statisticRecords.length).toBeGreaterThan(0);

    for (const record of statisticRecords) {
      const card = screen
        .getAllByTestId("scrutiny-record")
        .find((candidate) => candidate.textContent?.includes(record.title));
      expect(card).toBeDefined();
      expect(
        within(card!).getByText(
          /use only the population or denominator stated above/i,
        ),
      ).toBeInTheDocument();
      expect(
        within(card!).getByText(record.counterweightOrResponse),
      ).toBeInTheDocument();
    }
  });

  it("makes the route fork and complaint clock warning unmissable", () => {
    render(<RegulatorScrutinyPage />);

    const routeCards = screen.getAllByTestId("route-guide");
    const routeGuides =
      corpus.sharedWorkflow.challengeSeparation.routes;
    expect(routeCards).toHaveLength(routeGuides.length);

    for (const [index, route] of routeGuides.entries()) {
      const card = within(routeCards[index]);
      expect(
        card.getByRole("heading", { name: route.title }),
      ).toBeInTheDocument();
      expect(card.getByText(route.useWhen)).toBeInTheDocument();
      expect(card.getByText(`Clock: ${route.clock}`)).toBeInTheDocument();
      expect(card.getByText(route.next)).toBeInTheDocument();

      const expectedUrls = route.sourceIds.map((sourceId) => {
        const source = sourceById.get(sourceId);
        expect(source, `missing source ${sourceId}`).toBeDefined();
        return source!.url;
      });
      expect(
        Array.from(
          routeCards[index].querySelectorAll<HTMLAnchorElement>(
            'a[data-source-link="true"]',
          ),
          (link) => link.getAttribute("href"),
        ),
      ).toEqual(expectedUrls);
    }

    expect(
      screen.getByText(
        /a complaint does not by itself pause an appeal, statutory-review, payment or judicial-review clock/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders every cited source and permits HTTPS sources only", () => {
    const { container } = render(<RegulatorScrutinyPage />);
    const cards = screen.getAllByTestId("scrutiny-record");

    for (const source of corpus.sources) {
      expect(source.url).toMatch(/^https:\/\//);
    }

    for (const [index, record] of corpus.scrutiny.entries()) {
      const expectedUrls = record.sourceIds.map((sourceId) => {
        const source = sourceById.get(sourceId);
        expect(source, `missing source ${sourceId}`).toBeDefined();
        return source!.url;
      });
      const renderedUrls = Array.from(
        cards[index].querySelectorAll<HTMLAnchorElement>(
          'a[data-source-link="true"]',
        ),
        (link) => link.getAttribute("href"),
      );
      expect(renderedUrls).toEqual(expectedUrls);
    }

    const sourceLinks = container.querySelectorAll<HTMLAnchorElement>(
      'a[data-source-link="true"]',
    );
    expect(sourceLinks.length).toBeGreaterThan(0);
    for (const link of sourceLinks) {
      expect(link.href).toMatch(/^https:\/\//);
    }
  });
});
