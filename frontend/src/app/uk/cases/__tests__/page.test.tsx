// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UkCaseCommonsPage from "../page";
import { ukCaseStaticPublication } from "@/lib/uk-case-publication";

describe("UK case commons page", () => {
  it("opens with the public-interest method and hard marketplace boundary", () => {
    render(<UkCaseCommonsPage />);

    expect(
      screen.getByRole("heading", {
        name: "Public power, checked in daylight.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Research commons, not a lawsuit marketplace.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/does not take a case, predict a win/i)).toBeInTheDocument();
    expect(screen.getByText(/£0 and a negative net scenario/i)).toBeInTheDocument();
  });

  it("links the admitted deep case and local professional packet", () => {
    render(<UkCaseCommonsPage />);

    expect(
      screen.getByRole("link", { name: /open the evidence file/i }),
    ).toHaveAttribute("href", "/uk/cases/haworth-v-hmrc");
    expect(
      screen.getByRole("link", { name: /blank local assessment json/i }),
    ).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/case-commons/uk/assessment-template",
    );
    expect(screen.getByText(/no submission endpoint/i)).toBeInTheDocument();
    expect(ukCaseStaticPublication).toMatchObject({
      status: "approved-for-publication",
      exactCorpusApproved: true,
      emergencyStop: false,
      caseIds: ["haworth-v-hmrc-2021"],
    });
  });
});
