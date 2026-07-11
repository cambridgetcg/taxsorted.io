// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AccountabilityPage, { metadata } from "../page";

describe("UK observer-accountability page", () => {
  it("makes the observer inspectable without making a people dossier", () => {
    render(<AccountabilityPage />);

    expect(metadata.description).toMatch(/institution-first framework/i);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /watch the watchers.*keep the humans human/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/symmetric accountability, not metaphysical fog/i)).toBeInTheDocument();
    expect(screen.getByText(/every observer gets a sourced review/i)).toBeInTheDocument();
    expect(screen.getByText(/even TaxSorted is inside this rule/i)).toBeInTheDocument();
  });

  it("keeps words, actions and outcomes in distinct states", () => {
    render(<AccountabilityPage />);

    expect(screen.getByRole("heading", { name: /keep the states separate/i })).toBeInTheDocument();
    expect(screen.getByText("allegation—not determined")).toBeInTheDocument();
    expect(screen.getByText("no determination")).toBeInTheDocument();
    expect(screen.getByText("under appeal")).toBeInTheDocument();
    expect(screen.getByText(/corrections and reversals must be as visible/i)).toBeInTheDocument();
  });

  it("shows reciprocal institutional examples and the private-investigator gap", () => {
    render(<AccountabilityPage />);

    expect(screen.getByRole("heading", { name: /adjudicator.*independence has structure/i })).toBeInTheDocument();
    expect(screen.getByText(/office uses HMRC staff, funding, premises/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /the auditor is audited/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /private investigator is not a magic licence/i })).toBeInTheDocument();
    expect(screen.getByText(/specific SIA licence category is absent/i)).toBeInTheDocument();
  });

  it("publishes the bounded Love inquiry loop and its off-switch", () => {
    render(<AccountabilityPage />);

    expect(screen.getByRole("heading", { name: /with receipts and an off-switch/i })).toBeInTheDocument();
    expect(screen.getByText(/controlled inquiry loop, not ambient surveillance/i)).toBeInTheDocument();
    for (const step of ["Hypothesis", "Pilot", "Counterevidence", "Risk", "Stop"]) {
      expect(screen.getByText(new RegExp(`· ${step}$`, "i"))).toBeInTheDocument();
    }
  });

  it("opens the agent-sized framework, schema and OpenAPI slice", () => {
    render(<AccountabilityPage />);

    expect(screen.getByText(/investigation records are deliberately zero-row/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /framework json/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/accountability/uk",
    );
    expect(screen.getByRole("link", { name: /candidate schema/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/accountability/uk/schema",
    );
    expect(screen.getByRole("link", { name: /small openapi slice/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/openapi/accountability-uk.json",
    );
    expect(screen.getByRole("link", { name: /zero-row example/i })).toHaveAttribute(
      "href",
      "https://github.com/cambridgetcg/taxsorted.io/blob/main/research/uk/observer-accountability/examples/zero-row-candidate.json",
    );
    expect(screen.getByRole("link", { name: /public factual corrections/i })).toHaveAttribute(
      "href",
      "https://github.com/cambridgetcg/taxsorted.io/issues",
    );
    expect(screen.getByText(/never post case files, personal data/i)).toBeInTheDocument();
  });
});
