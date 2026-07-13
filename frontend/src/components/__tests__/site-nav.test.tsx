// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SiteNav } from "../site-nav";

// SiteNav reads i18n through useI18n, which has a safe English fallback when
// rendered outside the provider — so no wrapper is needed here.
//
// The nav is four doors + Account + language. Every destination that left the
// old flat nav is one click away behind its door's hub page (see the hub-pages
// test), so these assertions pin the doors, not the deep links.
describe("SiteNav", () => {
  it("keeps the open Learn book in the primary navigation", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Learn" })).toHaveAttribute("href", "/learn");
  });

  it("offers the Do my tax door to the tools hub", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Do my tax" })).toHaveAttribute("href", "/tools");
  });

  it("offers the Follow the money door to the civic hub", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Follow the money" })).toHaveAttribute(
      "href",
      "/uk/money",
    );
  });

  it("offers the About door", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
  });

  it("offers an Account link", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: /^account$/i })).toHaveAttribute("href", "/account");
  });

  it("shows exactly the four doors plus Account — no flat link pile", () => {
    render(<SiteNav />);
    // Logo link + 4 doors + Account = 6 links total.
    expect(screen.getAllByRole("link")).toHaveLength(6);
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
    expect(screen.getByRole("link", { name: "Do my tax" })).toHaveAttribute("href", "/tools");
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
