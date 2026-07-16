// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SiteNav } from "../site-nav";

// SiteNav has a safe English fallback when rendered outside I18nProvider.
describe("SiteNav", () => {
  it("offers four clear doors plus the account utility", () => {
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Check my tax" })).toHaveAttribute(
      "href",
      "/checkup",
    );
    expect(screen.getByRole("link", { name: "MTD & records" })).toHaveAttribute(
      "href",
      "/itsa",
    );
    expect(screen.getByRole("link", { name: "Learn" })).toHaveAttribute("href", "/learn");
    expect(screen.getByRole("link", { name: "UK system" })).toHaveAttribute("href", "/uk");
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
  });

  it("exposes an accessible mobile disclosure without dropping doors or language", () => {
    render(<SiteNav />);

    const menuButton = screen.getByRole("button", { name: "Open menu" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveAttribute("aria-controls", "primary-navigation-links");

    fireEvent.click(menuButton);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("link", { name: "Check my tax" })).toHaveAttribute(
      "href",
      "/checkup",
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
    const checkupLink = screen.getByRole("link", { name: "Check my tax" });
    checkupLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(checkupLink);

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
