// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CheckupPage from "../page";

describe("Tax Checkup front door", () => {
  it("asks for a situation without asking for identifying tax data", () => {
    render(<CheckupPage />);

    const heading = screen.getByRole("heading", { name: /find where you stand/i });
    expect(heading).toBeInTheDocument();
    expect(heading.closest("div[lang='en']")).toHaveAttribute("dir", "ltr");
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(screen.getByText(/asks for no name, address, National Insurance number or tax reference/i))
      .toBeInTheDocument();
    expect(screen.getByText(/no tax figures or quarterly updates are sent to HMRC/i))
      .toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("orders the MTD quick check, deeper expert and preparation journey", () => {
    render(<CheckupPage />);

    fireEvent.click(screen.getByRole("radio", { name: /work for myself or rent out property/i }));

    expect(screen.getByRole("heading", { name: "Start with your MTD position" }))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Run the 60-second MTD check" }))
      .toHaveAttribute("href", "/itsa/am-i-in");
    expect(screen.getByRole("link", { name: "Use the deeper MTD expert" }))
      .toHaveAttribute("href", "/uk/tax-expert#first-deep-path");
    expect(screen.getByRole("link", { name: "See the full MTD journey" }))
      .toHaveAttribute("href", "/itsa");
    expect(screen.getByText(/keeps unknown facts visible/i)).toBeInTheDocument();
  });

  it("routes record preparation without claiming it is filing", () => {
    render(<CheckupPage />);

    fireEvent.click(screen.getByRole("radio", { name: /organise records or a quarter/i }));

    expect(screen.getByRole("link", { name: "Add or import income and expenses" }))
      .toHaveAttribute("href", "/itsa/records");
    expect(screen.getByRole("link", { name: "Calculate a mileage deduction" }))
      .toHaveAttribute("href", "/tools/mileage");
    expect(screen.getByText(/keep the trip evidence separately/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the ITSA cockpit" }))
      .toHaveAttribute("href", "/dashboard");
    expect(screen.getByText(/Prepared does not mean filed/i)).toBeInTheDocument();
  });

  it("opens a portable Passport without claiming identity or professional review", () => {
    render(<CheckupPage />);

    fireEvent.click(
      screen.getByRole("radio", {
        name: /one tax picture I can keep or hand over/i,
      }),
    );

    expect(
      screen.getByRole("link", { name: /start or resume my passport/i }),
    ).toHaveAttribute("href", "/passport");
    expect(
      screen.getByText(/evidence is named by you, not inspected/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/PAYE and full liability calculations remain outside/i),
    ).toBeInTheDocument();
  });

  it("keeps thresholds, VAT and plain-language learning behind the same door", () => {
    render(<CheckupPage />);

    fireEvent.click(screen.getByRole("radio", { name: /near £60,000 or £100,000/i }));
    expect(screen.getByRole("link", { name: /check my £60k and £100k lines/i }))
      .toHaveAttribute("href", "/uk/personal-tax#threshold-check");

    fireEvent.click(screen.getByRole("radio", { name: /VAT-registered business/i }));
    expect(screen.getByRole("link", { name: "Open the VAT workbench" }))
      .toHaveAttribute("href", "/vat");
    expect(screen.getByText(/not yet recognised for production filing/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /want to understand first/i }));
    expect(screen.getByRole("link", { name: "Learn tax in plain words" }))
      .toHaveAttribute("href", "/learn");
    expect(screen.getByRole("link", { name: "Follow the wider UK tax system" }))
      .toHaveAttribute("href", "/uk");
  });
});
