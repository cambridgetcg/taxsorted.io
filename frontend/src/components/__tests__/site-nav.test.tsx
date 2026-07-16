// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SiteNav } from "../site-nav";

// SiteNav reads the current path for its you-are-here marker; the mock lets
// each test stand on a different page. Default: the homepage.
const navigation = vi.hoisted(() => ({ pathname: "/" as string | null }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

afterEach(() => {
  navigation.pathname = "/";
});

// SiteNav has a safe English fallback when rendered outside I18nProvider.
describe("SiteNav", () => {
  it("offers four clear doors plus the account utility", () => {
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Check my tax" })).toHaveAttribute(
      "href",
      "/checkup",
    );
    expect(screen.getByRole("link", { name: "Do my tax" })).toHaveAttribute("href", "/tools");
    expect(screen.getByRole("link", { name: "Learn" })).toHaveAttribute("href", "/learn");
    expect(screen.getByRole("link", { name: "UK system" })).toHaveAttribute("href", "/uk");
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
  });

  it("speaks the reader's language first: the skip link is the first focusable thing", () => {
    render(<SiteNav />);

    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip).toHaveAttribute("href", "#main-content");
    // First link in DOM order — keyboard users reach it on the first Tab.
    expect(screen.getAllByRole("link")[0]).toBe(skip);
  });

  it("marks the door you are inside — across its whole route family", () => {
    // /itsa belongs to the Do my tax door even though the door links /tools.
    navigation.pathname = "/itsa/am-i-in/";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Do my tax" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: "Learn" })).not.toHaveAttribute("aria-current");
  });

  it("distinguishes standing on a hub from standing inside its section", () => {
    navigation.pathname = "/uk/"; // trailing slash: trailingSlash is on
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "UK system" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("never lights a door from a lookalike prefix", () => {
    navigation.pathname = "/uk-not-really/";
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "UK system" })).not.toHaveAttribute("aria-current");
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

  it("gives every door one plain line of scent in the menu — as description, not name noise", () => {
    render(<SiteNav />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    // The names stay clean (exact matches above prove it); the scent lines
    // are wired as accessible descriptions.
    const doTax = screen.getByRole("link", { name: "Do my tax" });
    expect(doTax).toHaveAccessibleDescription("Records, quarter figures, VAT and tools.");
    expect(screen.getByRole("link", { name: "Learn" })).toHaveAccessibleDescription(
      "Plain guides — every figure sourced.",
    );
    // The primary pill gets its scent too — outside the pill, still described.
    expect(screen.getByRole("link", { name: "Check my tax" })).toHaveAccessibleDescription(
      "Find the right check for you.",
    );
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

  it("closes on Escape even when focus sits on the skip link", () => {
    render(<SiteNav />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const skip = screen.getByRole("link", { name: "Skip to main content" });
    skip.focus();
    fireEvent.keyDown(skip, { key: "Escape" });

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
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
