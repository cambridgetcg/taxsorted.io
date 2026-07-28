// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import taxIdentityJson from "../../../../../../research/uk/tax-identity/data/uk-tax-identity.json";
import TaxIdentityPage, { metadata } from "../page";

describe("UK tax identity page", () => {
  it("leads with a dated-vector model and its safety boundary", () => {
    render(<TaxIdentityPage />);

    expect(metadata.description).toMatch(/^See legal form, tax attribution/);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /one subject can carry several tax identities at once/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /subject × jurisdiction × tax\/regime × activity\/context × rule set × dimension × effective time/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/tax identity is a dated vector/i)).toBeInTheDocument();
    expect(
      screen.getByText(/asks for no facts about a real person or organisation/i),
    ).toBeInTheDocument();
  });

  it("renders every dimension, archetype, overlap, milestone and synthetic profile", () => {
    render(<TaxIdentityPage />);

    expect(screen.getAllByTestId("dimension-card")).toHaveLength(
      taxIdentityJson.dimensions.length,
    );
    expect(screen.getAllByTestId("archetype-card")).toHaveLength(
      taxIdentityJson.archetypes.length,
    );
    expect(screen.getAllByTestId("overlap-card")).toHaveLength(
      taxIdentityJson.overlaps.length,
    );
    expect(screen.getAllByTestId("milestone")).toHaveLength(
      taxIdentityJson.milestones.length,
    );
    expect(screen.getAllByTestId("example-profile")).toHaveLength(
      taxIdentityJson.exampleProfiles.length,
    );
    expect(screen.getAllByTestId("example-subject")).toHaveLength(
      taxIdentityJson.exampleProfiles.reduce(
        (count, example) => count + example.subjects.length,
        0,
      ),
    );
    expect(screen.getAllByTestId("assertion-card")).toHaveLength(
      taxIdentityJson.exampleProfiles.reduce(
        (count, example) => count + example.assertions.length,
        0,
      ),
    );
  });

  it(
    "keeps category origins, evolution, overlap relations and review triggers visible",
    () => {
      render(<TaxIdentityPage />);

      for (const dimension of taxIdentityJson.dimensions) {
        expect(
          screen.getByRole("heading", { name: dimension.label }),
        ).toBeInTheDocument();
        expect(screen.getByText(dimension.origin)).toBeInTheDocument();
      }
      for (const overlap of taxIdentityJson.overlaps) {
        expect(
          screen.getByText(overlap.dangerousShortcut),
        ).toBeInTheDocument();
      }
      expect(screen.getAllByTestId("overlap-relation")).toHaveLength(
        taxIdentityJson.overlaps.reduce(
          (count, overlap) => count + overlap.relations.length,
          0,
        ),
      );
      expect(
        screen.getAllByTestId("overlap-review-trigger"),
      ).toHaveLength(
        taxIdentityJson.overlaps.reduce(
          (count, overlap) => count + overlap.reviewTriggers.length,
          0,
        ),
      );
      expect(
        screen.getByRole("heading", {
          name: /categories arrived at different times for different reasons/i,
        }),
      ).toBeInTheDocument();
    },
    10_000,
  );

  it("names every assertion's subject, full scope, effective-date basis and sources", () => {
    render(<TaxIdentityPage />);

    const firstExample = taxIdentityJson.exampleProfiles[0];
    const firstAssertion = firstExample.assertions[0];
    const firstSubject = firstExample.subjects.find(
      (subject) => subject.id === firstAssertion.scope.subjectRef,
    );
    const firstCard = screen.getAllByTestId("assertion-card")[0];

    expect(firstSubject).toBeDefined();
    expect(
      within(firstCard).getByText(firstSubject?.label ?? ""),
    ).toBeInTheDocument();
    for (const value of [
      firstAssertion.scope.jurisdiction,
      firstAssertion.scope.taxOrRegime,
      firstAssertion.scope.activityOrContext,
      firstAssertion.scope.ruleset,
    ]) {
      expect(within(firstCard).getByText(value, { exact: true })).toBeInTheDocument();
    }
    expect(
      within(firstCard).getByText(/effective-date basis:/i),
    ).toBeInTheDocument();
    for (const sourceId of firstAssertion.sourceIds) {
      const source = taxIdentityJson.sources.find((item) => item.id === sourceId);
      expect(
        within(firstCard).getByRole("link", { name: source?.title }),
      ).toBeInTheDocument();
    }
  });

  it("does not truncate source trails or source supports and limitations", () => {
    render(<TaxIdentityPage />);

    const archetype = taxIdentityJson.archetypes.reduce((longest, candidate) =>
      candidate.sourceIds.length > longest.sourceIds.length ? candidate : longest,
    );
    const archetypeCard = screen
      .getByRole("heading", { name: archetype.label })
      .closest('[data-testid="archetype-card"]');
    expect(archetypeCard).not.toBeNull();
    for (const sourceId of archetype.sourceIds) {
      const source = taxIdentityJson.sources.find((item) => item.id === sourceId);
      expect(
        within(archetypeCard as HTMLElement).getByRole("link", {
          name: source?.title,
        }),
      ).toBeInTheDocument();
    }

    const sourceCards = screen.getAllByTestId("source-card");
    expect(sourceCards).toHaveLength(taxIdentityJson.sources.length);
    taxIdentityJson.sources.forEach((source, index) => {
      expect(within(sourceCards[index]).getAllByTestId("source-support")).toHaveLength(
        source.supports.length,
      );
      expect(
        within(sourceCards[index]).getAllByTestId("source-limitation"),
      ).toHaveLength(source.limitations.length);
    });
  });

  it("shows classification citations and explains the curated-content licence scope", () => {
    render(<TaxIdentityPage />);

    const classifications = taxIdentityJson.dimensions.flatMap(
      (dimension) => dimension.classificationValues,
    );
    const classificationCards = screen.getAllByTestId("classification-value");
    expect(classificationCards).toHaveLength(classifications.length);
    classifications.forEach((classification, index) => {
      for (const sourceId of classification.sourceIds) {
        const source = taxIdentityJson.sources.find((item) => item.id === sourceId);
        expect(
          within(classificationCards[index]).getByRole("link", {
            name: source?.title,
          }),
        ).toBeInTheDocument();
      }
    });

    expect(
      screen.getByText(taxIdentityJson.meta.contentLicence.scope),
    ).toBeInTheDocument();
  });

  it("publishes sessionless framework, graph, example, source, schema and OpenAPI doors", () => {
    render(<TaxIdentityPage />);

    for (const [name, href] of [
      [/framework index/i, "https://api.taxsorted.io/v1/tax-identity/uk"],
      [/full identity graph/i, "https://api.taxsorted.io/v1/tax-identity/uk/graph"],
      [/synthetic examples/i, "https://api.taxsorted.io/v1/tax-identity/uk/examples"],
      [/source register/i, "https://api.taxsorted.io/v1/tax-identity/uk/sources"],
      [/json schema/i, "https://api.taxsorted.io/v1/tax-identity/uk/schema"],
      [/openapi slice/i, "https://api.taxsorted.io/openapi/tax-identity-uk.json"],
    ] as const) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
