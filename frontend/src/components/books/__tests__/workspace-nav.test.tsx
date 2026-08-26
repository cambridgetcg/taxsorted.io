// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BooksWorkspaceNav,
  type BooksWorkspaceNavView,
} from "../workspace-nav";

const VIEWS: readonly {
  view: BooksWorkspaceNavView;
  label: string;
  href: string;
}[] = [
  { view: "today", label: "Today", href: "/books/workspace" },
  { view: "money", label: "Money", href: "/books/workspace/money" },
  { view: "business", label: "Business", href: "/books/workspace/business" },
  { view: "tax", label: "Tax", href: "/books/workspace/tax" },
];

describe("Books workspace navigation", () => {
  it("uses four static links with plain visible names", () => {
    render(<BooksWorkspaceNav view="today" />);

    expect(screen.getByRole("navigation", { name: "Books sections" })).toBeInTheDocument();
    for (const item of VIEWS) {
      expect(screen.getByRole("link", { name: item.label })).toHaveAttribute(
        "href",
        item.href,
      );
    }
  });

  it.each(VIEWS)("marks only $label as the current page", ({ view, label }) => {
    render(<BooksWorkspaceNav view={view} />);

    expect(screen.getByRole("link", { name: label })).toHaveAttribute(
      "aria-current",
      "page",
    );
    for (const other of VIEWS.filter((item) => item.view !== view)) {
      expect(screen.getByRole("link", { name: other.label })).not.toHaveAttribute(
        "aria-current",
      );
    }
  });
});
