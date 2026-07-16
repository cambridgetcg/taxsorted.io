// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PoliticsApiPage from "../page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/uk/politics/api",
}));

const base = "https://api.taxsorted.io/v1/politics/uk";

describe("UK politics API guide", () => {
  it("leads with the no-key public access contract", () => {
    render(<PoliticsApiPage />);

    expect(screen.getByText(/no key · no account · no charge/i)).toBeInTheDocument();
    expect(screen.getByText(/there is no token or request header to add/i)).toBeInTheDocument();
    expect(screen.getByText(/datasets marked open can be read/i)).toBeInTheDocument();
    expect(screen.getByText(/most record downloads are switched off/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === "P" &&
          element.textContent?.includes("Only open is an approved hosted release") === true
      )
    ).toBeInTheDocument();
  });

  it("provides post-deployment release-state examples without assuming body approval", () => {
    render(<PoliticsApiPage />);

    const curl = screen.getByLabelText("30-second curl example");
    expect(curl).toHaveTextContent("curl -fsS");
    expect(curl).toHaveTextContent("/datasets");
    expect(curl).toHaveTextContent("taxsorted-politics-catalogue.json");

    const javascript = screen.getByLabelText("JavaScript fetch example");
    expect(javascript).toHaveTextContent("await fetch");
    expect(javascript).toHaveTextContent("/datasets");
    expect(javascript).toHaveTextContent("publication.status");
    expect(javascript).toHaveTextContent("availability");
    expect(screen.getByText(/fetch a record body only/i)).toHaveTextContent(
      "availability: open"
    );
  });

  it("links the catalogue and all three example distributions", () => {
    render(<PoliticsApiPage />);

    expect(screen.getByRole("link", { name: /browse the dataset catalogue/i })).toHaveAttribute(
      "href",
      `${base}/datasets`
    );
    expect(screen.getByRole("link", { name: /after release: example json download/i })).toHaveAttribute(
      "href",
      `${base}/datasets/enforcement-governance/download?format=json`
    );
    expect(screen.getByRole("link", { name: /after release: example csv download/i })).toHaveAttribute(
      "href",
      `${base}/datasets/enforcement-governance/download?format=csv`
    );
    expect(screen.getByRole("link", { name: /after release: example ndjson download/i })).toHaveAttribute(
      "href",
      `${base}/datasets/enforcement-governance/download?format=ndjson`
    );
  });

  it("explains conditional mirroring, stable IDs and source licences", () => {
    render(<PoliticsApiPage />);

    expect(screen.getByText(/send it back as/i)).toHaveTextContent("If-None-Match");
    expect(screen.getByLabelText("ETag mirror example")).toHaveTextContent("--etag-compare");
    expect(screen.getByText(/dataset and record ids are permanent identifiers/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === "LI" &&
          element.textContent?.includes("keep sourceIds where present") === true
      )
    ).toHaveTextContent("official URL");
    expect(screen.getByRole("link", { name: /source and reuse ledger/i })).toHaveAttribute(
      "href",
      `${base}/datasets/official-sources`
    );
    expect(screen.getByRole("link", { name: /mixed-rights statement/i })).toHaveAttribute(
      "href",
      `${base}/datasets/rights`
    );
    expect(screen.getByRole("link", { name: /after deployment: read the admission ledger/i })).toHaveAttribute(
      "href",
      `${base}/datasets/admissions`
    );
    expect(screen.getByText(/no human has approved a release yet/i)).toBeInTheDocument();
    expect(screen.getAllByText(/after api deployment/i).length).toBeGreaterThan(0);
  });

  it("retains the query and method endpoint reference", () => {
    render(<PoliticsApiPage />);

    expect(screen.getByRole("link", { name: "/system" })).toHaveAttribute("href", `${base}/system`);
    expect(screen.getByRole("link", { name: "/public-office-pathways" })).toHaveAttribute(
      "href",
      `${base}/public-office-pathways`,
    );
    expect(screen.getByRole("link", { name: /explore standing for office/i })).toHaveAttribute(
      "href",
      "/uk/politics/stand",
    );
    expect(screen.getByRole("link", { name: "/enforcement/institutions" })).toHaveAttribute(
      "href",
      `${base}/enforcement/institutions`
    );
    expect(screen.getByRole("link", { name: "/people/5131" })).toHaveAttribute(
      "href",
      `${base}/people/5131`
    );
  });
});
