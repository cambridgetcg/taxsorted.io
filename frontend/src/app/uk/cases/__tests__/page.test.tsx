// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TAX_DISPUTE_FRAMEWORK } from "@taxsorted/engine/uk/disputes";
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

  it("shows the shared twelve-dimension interpretation framework", () => {
    render(<UkCaseCommonsPage />);

    expect(
      screen.getByRole("heading", {
        name: "Twelve dimensions. Missing material stays visible.",
      }),
    ).toBeInTheDocument();
    const framework = document.getElementById("interpretation-framework");
    expect(framework).not.toBeNull();
    expect(within(framework!).getAllByRole("listitem")).toHaveLength(12);
    for (const dimension of TAX_DISPUTE_FRAMEWORK.dimensions) {
      expect(
        within(framework!).getByRole("heading", { name: dimension.title }),
      ).toBeInTheDocument();
    }
    expect(within(framework!).getByText(/gap is not filled from intuition/i))
      .toBeInTheDocument();
    expect(within(framework!).getByText(/not hidden model reasoning/i))
      .toBeInTheDocument();
    expect(
      within(framework!).getByRole("heading", {
        name: "Decisive means outcome-determinative",
      }),
    ).toBeInTheDocument();
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

  it("opens bounded agent and public training doors", () => {
    render(<UkCaseCommonsPage />);

    expect(
      screen.getByRole("heading", {
        name: "Framework open. Derived release under review.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open agent guide json/i }),
    ).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/case-commons/uk/agent",
    );
    expect(
      screen.getByRole("link", { name: /open framework json/i }),
    ).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/case-commons/uk/interpretation",
    );
    expect(screen.getByText("Awaiting exact-release approval"))
      .toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /download public examples/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/not a sufficient or representative training corpus/i))
      .toBeInTheDocument();
    expect(screen.getByText(/user data are outside this export/i))
      .toBeInTheDocument();
  });
});
