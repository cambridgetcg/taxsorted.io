// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "../breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders a 'You are here' navigation starting at Home", () => {
    render(
      <Breadcrumbs items={[{ href: "/learn", label: "Learn" }]} current="Income Tax" />
    );
    expect(
      screen.getByRole("navigation", { name: "You are here" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Learn" })).toHaveAttribute(
      "href",
      "/learn"
    );
  });

  it("marks the current page with aria-current and does not link it", () => {
    render(
      <Breadcrumbs items={[{ href: "/learn", label: "Learn" }]} current="Income Tax" />
    );
    const current = screen.getByText("Income Tax");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.closest("a")).toBeNull();
  });

  it("works with no middle items: Home then current", () => {
    render(<Breadcrumbs current="About" />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByText("About")).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("hides the decorative arrows from screen readers", () => {
    const { container } = render(<Breadcrumbs current="About" />);
    for (const arrow of Array.from(container.querySelectorAll("span"))) {
      if (arrow.textContent === "→") {
        expect(arrow).toHaveAttribute("aria-hidden", "true");
      }
    }
  });
});
