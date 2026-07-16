// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ToolsPage from "../tools/page";
import AboutPage from "../about/page";

// The nav is 4 doors. These tests prove no old destination was lost:
// every tool that left the nav is one click away behind /tools (the civic
// pages live behind main's /uk hub, tested in uk/__tests__), and the
// licence text that left the footer lives at /about#licences.

describe("Do my tax hub (/tools)", () => {
  it("links every tool the old nav and orphaned routes offered", () => {
    render(<ToolsPage />);
    expect(screen.getByRole("link", { name: /income tax/i })).toHaveAttribute("href", "/itsa");
    expect(screen.getByRole("link", { name: /^vat/i })).toHaveAttribute("href", "/vat");
    expect(screen.getByRole("link", { name: /mileage log/i })).toHaveAttribute(
      "href",
      "/tools/mileage",
    );
    expect(screen.getByRole("link", { name: /check my tax position/i })).toHaveAttribute(
      "href",
      "/uk/tax-expert",
    );
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});

describe("About page (/about)", () => {
  it("says what TaxSorted is and keeps the browser-only records promise", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: /what taxsorted is/i })).toBeInTheDocument();
    expect(screen.getByText(/your records stay in\s+your browser/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /one human and one ai/i })).toHaveAttribute(
      "href",
      "/from-the-builders",
    );
    expect(screen.getByRole("link", { name: /what you ask for/i })).toHaveAttribute(
      "href",
      "/feedback",
    );
  });

  it("carries the full licence text that left the footer, once, at #licences", () => {
    render(<AboutPage />);
    const licences = screen.getByRole("heading", { name: /licences/i });
    expect(licences).toHaveAttribute("id", "licences");
    // Each licence said once: AGPL (the code), OGL (government material),
    // OPL (Parliamentary material) — plus the non-association note.
    expect(screen.getByRole("link", { name: /gnu agpl licence/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open government licence v3\.0/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open parliament licence v3\.0/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/not connected to\s+taxsorted\.co\.uk/i)).toBeInTheDocument();
  });
});
