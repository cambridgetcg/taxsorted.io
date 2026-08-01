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
  it("offers six clear doors plus the account utility", () => {
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Books" })).toHaveAttribute("href", "/books");
    expect(screen.getByRole("link", { name: "Connect records" })).toHaveAttribute(
      "href",
      "/books/connect",
    );
    expect(screen.getByRole("link", { name: "Tax check" })).toHaveAttribute(
      "href",
      "/checkup",
    );
    expect(screen.getByRole("link", { name: "Tax tools" })).toHaveAttribute("href", "/tools");
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
    // /itsa belongs to Tax tools even though the door links /tools.
    navigation.pathname = "/itsa/am-i-in/";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Tax tools" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: "Learn" })).not.toHaveAttribute("aria-current");
  });

  it("marks the Books door across its front door and local workspace", () => {
    navigation.pathname = "/books/workspace/";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Books" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: "Tax tools" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("gives the accounting bridge its own current state without lighting Books", () => {
    navigation.pathname = "/books/connect/";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Connect records" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Books" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the Tax Position Passport inside the Tax tools door", () => {
    navigation.pathname = "/passport/";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Tax tools" })).toHaveAttribute(
      "aria-current",
      "true",
    );
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
    expect(screen.getByRole("link", { name: "Tax check" })).toHaveAttribute(
      "href",
      "/checkup",
    );
    expect(screen.getByRole("link", { name: "Books" })).toHaveAttribute("href", "/books");
    expect(screen.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
  });

  it("gives every door one plain line of scent in the menu — as description, not name noise", () => {
    render(<SiteNav />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    // The names stay clean (exact matches above prove it); the scent lines
    // are wired as accessible descriptions.
    const taxTools = screen.getByRole("link", { name: "Tax tools" });
    expect(taxTools).toHaveAccessibleDescription("Prepare figures and practise filing.");
    expect(screen.getByRole("link", { name: "Connect records" })).toHaveAccessibleDescription(
      "Bring records from elsewhere into one review path.",
    );
    expect(screen.getByRole("link", { name: "Learn" })).toHaveAccessibleDescription(
      "Understand money decisions with cited sources.",
    );
    // The primary pill gets its scent too — outside the pill, still described.
    expect(screen.getByRole("link", { name: "Books" })).toHaveAccessibleDescription(
      "Keep and review money records you can explain.",
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
    const checkupLink = screen.getByRole("link", { name: "Tax check" });
    checkupLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(checkupLink);

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
