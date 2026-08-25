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
  it("offers six people-power doors plus the account utility", () => {
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Check" })).toHaveAttribute("href", "/checkup");
    expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute("href", "/plan");
    expect(screen.getByRole("link", { name: "Books" })).toHaveAttribute("href", "/books");
    expect(screen.getByRole("link", { name: "File" })).toHaveAttribute("href", "/file");
    expect(screen.getByRole("link", { name: "Put it right" })).toHaveAttribute("href", "/put-it-right");
    expect(screen.getByRole("link", { name: "Understand" })).toHaveAttribute("href", "/learn");
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
    // The MTD entry check belongs to Check even though most ITSA pages live under File.
    navigation.pathname = "/itsa/am-i-in/";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Check" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: "File" })).not.toHaveAttribute("aria-current");
  });

  it("marks the Books door across its front door and local workspace", () => {
    navigation.pathname = "/books/workspace/";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Books" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: "File" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps the accounting bridge inside Books", () => {
    navigation.pathname = "/books/connect/";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Books" })).toHaveAttribute("aria-current", "true");
  });

  it("keeps the Tax Position Passport inside Check", () => {
    navigation.pathname = "/passport/";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Check" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it.each([
    ["/uk/tax-expert/", "Check", "Understand"],
    ["/uk/personal-tax/", "Plan", "Understand"],
    ["/tools/mileage/", "Plan", "File"],
    ["/itsa/quarter/", "File", "Check"],
    ["/uk/politics/decisions/", "Understand", "Plan"],
  ])("gives %s to one door only", (path, active, inactive) => {
    navigation.pathname = path;
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: active })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: inactive })).not.toHaveAttribute("aria-current");
  });

  it("distinguishes standing on a hub from standing inside its section", () => {
    navigation.pathname = "/learn/"; // trailing slash: trailingSlash is on
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Understand" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("never lights a door from a lookalike prefix", () => {
    navigation.pathname = "/uk-not-really/";
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Understand" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the cross-job legacy tools hub neutral", () => {
    navigation.pathname = "/tools/";
    render(<SiteNav />);

    for (const name of ["Check", "Plan", "Books", "File", "Put it right", "Understand"]) {
      expect(screen.getByRole("link", { name })).not.toHaveAttribute("aria-current");
    }
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
    expect(screen.getByRole("link", { name: "Check" })).toHaveAttribute(
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
    const plan = screen.getByRole("link", { name: "Plan" });
    expect(plan).toHaveAccessibleDescription("Compare lawful choices without being steered.");
    expect(screen.getByRole("link", { name: "Put it right" })).toHaveAccessibleDescription(
      "Correct errors, challenge decisions or get payment help.",
    );
    expect(screen.getByRole("link", { name: "Understand" })).toHaveAccessibleDescription(
      "Learn the rules, sources, public money and power.",
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
    const checkupLink = screen.getByRole("link", { name: "Check" });
    checkupLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(checkupLink);

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
