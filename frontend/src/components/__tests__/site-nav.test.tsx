// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteNav } from "../site-nav";

// SiteNav reads i18n through useI18n, which has a safe English fallback when
// rendered outside the provider — so no wrapper is needed here.
describe("SiteNav", () => {
  it("offers an Account link", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: /account/i })).toHaveAttribute("href", "/account");
  });

  it("offers the public industry map", () => {
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Industry" })).toHaveAttribute(
      "href",
      "/uk/tax-industry",
    );
  });
});
