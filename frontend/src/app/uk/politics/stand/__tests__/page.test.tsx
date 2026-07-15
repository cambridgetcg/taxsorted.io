// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StandForOfficePage from "../page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/uk/politics/stand",
}));

describe("public-office pathfinder", () => {
  it("starts with work and preserves the neutral, no-profile boundary", () => {
    render(<StandForOfficePage />);

    expect(
      screen.getByRole("heading", { name: /start with the work, not the title/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/not sent, saved or used to infer a political belief/i)).toBeInTheDocument();
    expect(screen.getAllByText(/not legal advice|not an eligibility certificate/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Stand for office" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: /member of.*parliament/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/appointment deadline:/i).parentElement).toHaveTextContent(
      /nineteenth working day/i,
    );
    expect(screen.getByText(/consent timing:/i).parentElement).toHaveTextContent(
      /one month/i,
    );
    expect(screen.getByText(/£100 for each day they sit or vote/i)).toBeInTheDocument();
  });

  it("keeps party selection and the independent route visible as different branches", () => {
    render(<StandForOfficePage />);

    expect(screen.getByText("Party route")).toBeInTheDocument();
    expect(screen.getByText("Independent route")).toBeInTheDocument();
    expect(screen.getAllByText(/party.*selection|selection.*party/i).length).toBeGreaterThan(0);
  });

  it("switches office rules locally without pretending the figures are interchangeable", () => {
    render(<StandForOfficePage />);

    expect(screen.getByText(/deposit:/i).parentElement).toHaveTextContent("£500");
    fireEvent.click(screen.getByRole("button", { name: /principal.*councillor/i }));

    expect(screen.getByText(/deposit:/i).parentElement).toHaveTextContent("not applicable");
    expect(screen.getByText(/subscribers:/i).parentElement).toHaveTextContent("exactly 2");
    expect(screen.getByText(/no national salary or single UK amount/i)).toBeInTheDocument();
    expect(screen.getByText(/£50 for each day they sit or vote/i)).toBeInTheDocument();
  });

  it("labels proposed law, coverage gaps and the open machine doors", () => {
    render(<StandForOfficePage />);

    expect(screen.getByText(/law watch · not current law/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /these offices are not.*basically the same/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /read the json/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/politics/uk/public-office-pathways",
    );
    expect(screen.getByRole("link", { name: /read the schema/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/politics/uk/public-office-pathways/schema",
    );
    expect(screen.getByRole("link", { name: /read reuse rights/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/politics/uk/public-office-pathways/rights",
    );
  });
});
