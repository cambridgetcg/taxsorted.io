// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PoliticsMethodPage from "../page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/uk/politics/method",
}));

describe("UK politics publishing method", () => {
  it("describes source records without turning them into proved facts", () => {
    render(<PoliticsMethodPage />);

    expect(screen.getByText(/maps source-linked records/i)).toBeInTheDocument();
    expect(screen.getByText(/dataset records carry source identifiers/i)).toBeInTheDocument();
    expect(screen.queryByText(/joins up facts/i)).not.toBeInTheDocument();
  });

  it("does not invite sensitive evidence into the public issue tracker", () => {
    render(<PoliticsMethodPage />);

    expect(screen.getByText(/never post such evidence publicly/i)).toBeInTheDocument();
    expect(screen.getByText(/confidential TaxSorted intake is not live yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /public issue tracker/i })).toHaveAttribute(
      "href",
      "https://github.com/cambridgetcg/taxsorted.io/issues"
    );
  });
});
