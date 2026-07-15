// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import UkSystemPage from "../page";

describe("UK system hub", () => {
  it("keeps every deep public-system page one click away", () => {
    render(<UkSystemPage />);

    const heading = screen.getByRole("heading", { name: /follow the rules/i });
    expect(heading.closest("div[lang='en']")).toHaveAttribute("dir", "ltr");

    for (const [name, href] of [
      [/public money/i, "/uk/public-funding"],
      [/politics and power/i, "/uk/politics"],
      [/accountability/i, "/uk/accountability"],
      [/the tax industry/i, "/uk/tax-industry"],
      [/charities/i, "/uk/charities"],
    ] as const) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("organises the human checks and bounded API doors together", () => {
    render(<UkSystemPage />);

    expect(screen.getByRole("link", { name: /UK tax expert/i })).toHaveAttribute(
      "href",
      "/uk/tax-expert",
    );
    expect(screen.getByRole("link", { name: /politics API guide/i })).toHaveAttribute(
      "href",
      "/uk/politics/api",
    );
    expect(screen.getByRole("link", { name: /Tax expert capabilities/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/uk/tax-expert",
    );
    expect(screen.getByText(/does not mean every candidate record has passed/i))
      .toBeInTheDocument();
  });
});
