// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SiteNav } from "../site-nav";
import { I18nProvider } from "@/i18n/I18nProvider";

// SiteNav reads the current path for its you-are-here marker; the mock lets
// each test stand on a different page. Default: the homepage.
const navigation = vi.hoisted(() => ({ pathname: "/" as string | null, local: false }));
vi.mock("@/lib/local-runtime", () => ({ isLocalApp: () => navigation.local }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

afterEach(() => {
  navigation.pathname = "/";
  navigation.local = false;
  window.localStorage.clear();
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

// SiteNav has a safe English fallback when rendered outside I18nProvider.
describe("SiteNav", () => {
  it("offers local app help instead of an account in the offline app", () => {
    navigation.local = true;
    navigation.pathname = "/download/";
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Local app" })).toHaveAttribute("href", "/download");
    expect(screen.getByRole("link", { name: "Local app" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  });

  it("offers five task destinations plus the account utility", () => {
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute("href", "/services");
    expect(screen.getByRole("link", { name: "My checklist" })).toHaveAttribute("href", "/checkup");
    expect(screen.getByRole("link", { name: "Money records" })).toHaveAttribute("href", "/books");
    expect(screen.getByRole("link", { name: "Tax guides" })).toHaveAttribute("href", "/learn");
    expect(screen.getByRole("link", { name: "Help & corrections" })).toHaveAttribute("href", "/put-it-right");
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
    // The MTD entry check belongs to the checklist while other ITSA tools live in Services.
    navigation.pathname = "/itsa/am-i-in/";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "My checklist" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: "Services" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the local workspace inside Money records", () => {
    navigation.pathname = "/books/workspace/";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Money records" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: "Services" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps the accounting bridge inside Money records", () => {
    navigation.pathname = "/books/connect/";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Money records" })).toHaveAttribute("aria-current", "true");
  });

  it("keeps the Tax Position Passport inside Services", () => {
    navigation.pathname = "/passport/";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it.each([
    ["/services/individuals/", "Services"],
    ["/services/sole-traders/", "Services"],
    ["/services/landlords/", "Services"],
    ["/plan/", "Services"],
    ["/file/", "Services"],
    ["/vat/", "Services"],
    ["/dashboard/", "Services"],
    ["/uk/tax-expert/", "My checklist"],
    ["/uk/personal-tax/", "My checklist"],
    ["/tools/mileage/", "Money records"],
    ["/itsa/records/", "Money records"],
    ["/itsa/quarter/", "Services"],
    ["/uk/politics/decisions/", "Tax guides"],
  ])("gives %s to one destination only", (path, active) => {
    navigation.pathname = path;
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: active })).toHaveAttribute("aria-current", "true");
    expect(screen.getAllByRole("link").filter((link) => link.hasAttribute("aria-current"))).toHaveLength(1);
  });

  it("distinguishes standing on a hub from standing inside its section", () => {
    navigation.pathname = "/learn/"; // trailing slash: trailingSlash is on
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Tax guides" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("never lights a door from a lookalike prefix", () => {
    navigation.pathname = "/uk-not-really/";
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Tax guides" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the cross-job legacy tools hub neutral", () => {
    navigation.pathname = "/tools/";
    render(<SiteNav />);

    for (const name of ["Services", "My checklist", "Money records", "Tax guides", "Help & corrections"]) {
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
    expect(screen.getByRole("link", { name: "My checklist" })).toHaveAttribute(
      "href",
      "/checkup",
    );
    expect(screen.getByRole("link", { name: "Money records" })).toHaveAttribute("href", "/books");
    expect(screen.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
  });

  it("gives every door one plain line of scent in the menu — as description, not name noise", () => {
    render(<SiteNav />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    // The names stay clean (exact matches above prove it); the scent lines
    // are wired as accessible descriptions.
    expect(screen.getByRole("link", { name: "Services" })).toHaveAccessibleDescription("Find the tax tools and support for your situation.");
    expect(screen.getByRole("link", { name: "Help & corrections" })).toHaveAccessibleDescription(
      "Correct a mistake, challenge a decision or find payment help.",
    );
    expect(screen.getByRole("link", { name: "Tax guides" })).toHaveAccessibleDescription(
      "Understand the rules with plain explanations and sources.",
    );
    // The primary pill gets its scent too — outside the pill, still described.
    expect(screen.getByRole("link", { name: "Money records" })).toHaveAccessibleDescription(
      "Add, review and export your income and expenses.",
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
    const checkupLink = screen.getByRole("link", { name: "My checklist" });
    checkupLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(checkupLink);

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("collapses when browser history changes the current route", () => {
    const { rerender } = render(<SiteNav />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    navigation.pathname = "/books/workspace/";
    rerender(<SiteNav />);
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Money records" })).toHaveAttribute("aria-current", "true");
  });

  it("translates the new destinations without losing route state or the language control", () => {
    navigation.pathname = "/checkup/";
    render(<I18nProvider><SiteNav /></I18nProvider>);
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: "ur" } });

    expect(screen.getByRole("link", { name: "خدمات" })).toHaveAttribute("href", "/services");
    expect(screen.getByRole("link", { name: "میرے کاموں کی فہرست" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("combobox", { name: "زبان" })).toHaveValue("ur");
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
  });
});
