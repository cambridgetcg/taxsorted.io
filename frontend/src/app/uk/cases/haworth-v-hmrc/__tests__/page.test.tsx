// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HaworthCasePage from "../page";

describe("Haworth v HMRC deep case", () => {
  it("keeps the notice win separate from the later tax loss", () => {
    render(<HaworthCasePage />);

    expect(
      screen.getByRole("heading", {
        name: "HMRC lost the notice case. The taxpayer later lost the tax case.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("£8,786,288.40")).toHaveLength(2);
    expect(screen.getByText(/not an award or final tax saving/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no damages award was identified/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/underlying tax appeal was later dismissed/i)).toBeInTheDocument();
  });

  it("shows the historical exposure as context rather than recovery", () => {
    render(<HaworthCasePage />);

    expect(
      screen.getByRole("table", {
        name: /documented figures, what each meant and what it did not mean/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "What it did not mean" }),
    ).toBeInTheDocument();
    expect(screen.getByText("£878,628.84")).toBeInTheDocument();
    expect(screen.getByText("£4,393,144.20")).toBeInTheDocument();
    expect(screen.getAllByText(/not a penalty imposed/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/net result can be negative/i)).toBeInTheDocument();
    expect(screen.getByText(/no probability score/i)).toBeInTheDocument();
  });

  it("makes the consented professional contact order explicit", () => {
    render(<HaworthCasePage />);

    expect(
      screen.getByRole("heading", {
        name: "The client first. The public body only through the proper route.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Prospective client or authorised representative")).toBeInTheDocument();
    expect(screen.getByText(/there is no live claimant to pick up/i)).toBeInTheDocument();
    expect(screen.getByText(/receives no expression of interest/i)).toBeInTheDocument();
  });

  it("offers source-resolving public data without a private upload", () => {
    render(<HaworthCasePage />);

    expect(
      screen.getByRole("link", { name: /complete case packet json/i }),
    ).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/case-commons/uk/cases/haworth-v-hmrc-2021",
    );
    expect(
      screen.getByText(/response checksum covers the exact delivered bytes/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /full judgment/i })).toHaveAttribute(
      "href",
      "https://supremecourt.uk/uploads/uksc_2019_0124_judgment_90ad362b5f.pdf",
    );
  });
});
