// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SiteNav } from "../site-nav";

// SiteNav reads i18n through useI18n, which has a safe English fallback when
// rendered outside the provider — so no wrapper is needed here.
describe("SiteNav", () => {
  it("keeps the open Learn book in the primary navigation", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Learn" })).toHaveAttribute("href", "/learn");
  });

  it("offers an Account link", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: /^account$/i })).toHaveAttribute("href", "/account");
  });

  it("offers the evidence-backed UK tax expert", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Tax expert" })).toHaveAttribute(
      "href",
      "/uk/tax-expert",
    );
  });

  it("offers the public industry map", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Industry" })).toHaveAttribute(
      "href",
      "/uk/tax-industry",
    );
  });

  it("offers the public charities map", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Charities" })).toHaveAttribute(
      "href",
      "/uk/charities",
    );
  });

  it("offers the public money map", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Public money" })).toHaveAttribute(
      "href",
      "/uk/public-funding",
    );
  });

  it("offers the observer-accountability map", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Accountability" })).toHaveAttribute(
      "href",
      "/uk/accountability",
    );
  });

  it("exposes an accessible mobile disclosure without dropping links or language", () => {
    render(<SiteNav />);

    const menuButton = screen.getByRole("button", { name: "Open menu" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveAttribute("aria-controls", "primary-navigation-links");

    fireEvent.click(menuButton);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("link", { name: /^income tax \(mtd\)$/i })).toHaveAttribute(
      "href",
      "/itsa",
    );
    expect(screen.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the disclosure button", () => {
    render(<SiteNav />);

    const disclosure = screen.getByRole("button", { name: "Open menu" });
    disclosure.focus();
    fireEvent.click(disclosure);
    fireEvent.keyDown(disclosure, { key: "Escape" });

    const menuButton = screen.getByRole("button", { name: "Open menu" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveFocus();
  });

  it("collapses after a navigation choice", () => {
    render(<SiteNav />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const learnLink = screen.getByRole("link", { name: "Learn" });
    learnLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(learnLink);

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
