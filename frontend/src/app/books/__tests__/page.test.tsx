// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BooksPage from "../page";

describe("Books front door", () => {
  it("positions accounting plainly and labels the live boundary", () => {
    render(<BooksPage />);

    expect(
      screen.getByRole("heading", { name: /know where every number came from/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/without an in-house accounting team/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /open starter books|start my books|open my local books/i })[0])
      .toHaveAttribute("href", "/books/workspace");
    expect(screen.getByRole("link", { name: /open property books/i })).toHaveAttribute(
      "href",
      "/books/workspace?activity=uk-property",
    );
    expect(screen.getByRole("link", { name: /bring existing records/i })).toHaveAttribute(
      "href",
      "/books/connect",
    );
    expect(screen.getByText(/does not yet prepare statutory accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/not yet a complete general ledger/i)).toBeInTheDocument();
  });

  it("takes a made-up sale from gross amount to bank payout", () => {
    render(<BooksPage />);

    expect(screen.getByText("£180.00", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("£18.00", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("£162.00", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(/bank statement alone does not prove/i)).toBeInTheDocument();
    expect(screen.getByText(/debits equal credits/i)).toBeInTheDocument();
    expect(screen.getByText(/teaching-example-not-saved-not-filed/i)).toBeInTheDocument();
  });

  it("recalculates without floating-point money and stops an impossible fee", () => {
    render(<BooksPage />);

    fireEvent.change(screen.getByRole("textbox", { name: /buyer paid/i }), {
      target: { value: "200.10" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /marketplace kept as its fee/i }), {
      target: { value: "25.05" },
    });
    expect(screen.getByText("£175.05", { selector: "p" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: /marketplace kept as its fee/i }), {
      target: { value: "300" },
    });
    const error = screen.getByRole("alert");
    const fee = screen.getByRole("textbox", { name: /marketplace kept as its fee/i });
    expect(error).toHaveTextContent(/fee from £0 up to the sale amount/i);
    expect(fee).toHaveAttribute("aria-describedby", error.id);
    expect(screen.queryByText("£175.05", { selector: "p" })).not.toBeInTheDocument();
  });

  it("makes the walkthrough fragment a keyboard focus destination", () => {
    render(<BooksPage />);

    expect(document.querySelector("#example")).toHaveAttribute("tabindex", "-1");
  });

  it("links tax claims to current official UK starting points", () => {
    render(<BooksPage />);

    expect(screen.getByRole("link", { name: /cash basis for sole traders/i })).toHaveAttribute(
      "href",
      "https://www.gov.uk/simpler-income-tax-cash-basis",
    );
    expect(screen.getByRole("link", { name: /company and accounting records/i })).toHaveAttribute(
      "href",
      "https://www.gov.uk/running-a-limited-company/company-and-accounting-records",
    );
  });
});
