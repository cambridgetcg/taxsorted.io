// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PoliticsIntegrityPage from "../page";
import {
  enforcementPowerCards,
  financeDatasets,
  integrityApiDoors,
  integrityDistributionDoors,
} from "../integrity-data";

vi.mock("next/navigation", () => ({
  usePathname: () => "/uk/politics/integrity",
}));

describe("UK politics public-integrity page", () => {
  it("makes evidence-not-inference the main rule", () => {
    render(<PoliticsIntegrityPage />);
    expect(screen.getByRole("heading", { level: 1, name: /follow the record/i })).toBeInTheDocument();
    expect(screen.getByText(/donation \+ meeting \+ contract does not equal/i)).toBeInTheDocument();
  });

  it("shows every finance dataset and its honest publication state", () => {
    render(<PoliticsIntegrityPage />);
    for (const dataset of financeDatasets) {
      expect(screen.getByRole("heading", { name: dataset.title })).toBeInTheDocument();
    }
    expect(screen.getAllByText("Live")).toHaveLength(1);
    expect(screen.getAllByText("Review gate")).toHaveLength(1);
    expect(screen.getAllByText("Licence gate")).toHaveLength(2);
  });

  it("shows all seven dimensions on every formal office card", () => {
    render(<PoliticsIntegrityPage />);
    expect(screen.getAllByRole("meter")).toHaveLength(enforcementPowerCards.length * 7);
    expect(screen.getByText(/never a leaderboard/i)).toBeInTheDocument();
    for (const card of enforcementPowerCards) {
      const article = screen
        .getByRole("heading", { level: 3, name: card.office })
        .closest("article");
      expect(article).not.toBeNull();
      expect(article).toHaveTextContent(card.methodVersion);
      for (const sourceId of card.sourceIds) expect(article).toHaveTextContent(sourceId);
      for (const constraint of card.constraints) expect(article).toHaveTextContent(constraint);
    }
  });

  it("links every public-integrity API door", () => {
    render(<PoliticsIntegrityPage />);
    for (const door of integrityApiDoors) {
      const matchingLinks = screen.getAllByRole("link", { name: new RegExp(door.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
      expect(matchingLinks.some((link) => link.getAttribute("href") === `https://api.taxsorted.io/v1/politics/uk${door.path}`)).toBe(true);
    }
  });

  it("distinguishes available metadata from post-approval record bodies", () => {
    render(<PoliticsIntegrityPage />);
    expect(screen.getByRole("heading", { name: "Developer handoff" })).toBeInTheDocument();
    for (const door of integrityDistributionDoors) {
      const matchingLinks = screen.getAllByRole("link", {
        name: new RegExp(door.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      });
      expect(
        matchingLinks.some(
          (link) => link.getAttribute("href") === `https://api.taxsorted.io/v1/politics/uk${door.path}`
        )
      ).toBe(true);
    }
    expect(
      screen.getByRole("link", { name: /check release state and learn how to mirror with etags/i })
    ).toHaveAttribute("href", "/uk/politics/api");
    expect(screen.getAllByText(/after human release approval/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/after api deployment.*pending human decision/i).length).toBeGreaterThan(0);
  });

  it("states that operational and personal dossiers stay out", () => {
    render(<PoliticsIntegrityPage />);
    expect(screen.getByText(/rank-and-file rosters/i)).toBeInTheDocument();
    expect(screen.getByText(/no sentiment, honesty, aggression/i)).toBeInTheDocument();
    expect(screen.getByText(/not a universal people search/i)).toBeInTheDocument();
  });

  it("shows current sourced police base-pay ranges separately from benefits", () => {
    render(<PoliticsIntegrityPage />);
    expect(screen.getByRole("heading", { name: "Police pay by rank" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Constable £31,164 £50,256/ })).toBeInTheDocument();
    expect(screen.getByText(/35.3% employer contribution/i)).toBeInTheDocument();
  });
});
