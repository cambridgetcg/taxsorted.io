// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShortVersion } from "../short-version";

describe("ShortVersion", () => {
  it("renders a region labelled 'The short version' with an h2", () => {
    render(
      <ShortVersion>
        <li>You may need to send updates every 3 months.</li>
        <li>It starts in April 2026 for some people.</li>
      </ShortVersion>
    );
    expect(
      screen.getByRole("region", { name: "The short version" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "The short version" })
    ).toBeInTheDocument();
  });

  it("renders the bullets as a real list", () => {
    render(
      <ShortVersion>
        <li>Keep records as you go.</li>
      </ShortVersion>
    );
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(
      screen.getByRole("listitem")
    ).toHaveTextContent("Keep records as you go.");
  });
});
