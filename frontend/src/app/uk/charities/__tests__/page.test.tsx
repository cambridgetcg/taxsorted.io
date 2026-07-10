// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CharitiesPage from "../page";

describe("UK charities page", () => {
  it("leads with the organisation-first publication boundary", () => {
    render(<CharitiesPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /see the public bargain.*keep people out of the bulk graph/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no local charity mirror.*no bulk people export/i)).toBeInTheDocument();
    expect(screen.getByText(/no person-to-religion graph/i)).toBeInTheDocument();
  });

  it("opens each territorial official register rather than a TaxSorted mirror", () => {
    render(<CharitiesPage />);

    const cards = screen.getAllByTestId("register-card");
    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByRole("link")).toHaveAttribute(
      "href",
      "https://www.gov.uk/find-charity-information",
    );
    expect(within(cards[1]).getByRole("link")).toHaveAttribute(
      "href",
      "https://www.oscr.org.uk/about-charities/search-the-register/",
    );
    expect(within(cards[2]).getByRole("link")).toHaveAttribute(
      "href",
      "https://www.charitycommissionni.org.uk/start-up-a-charity/register-of-charities/",
    );
  });

  it("states the conditional tax truth and the control model", () => {
    render(<CharitiesPage />);

    expect(
      screen.getByRole("heading", { name: /charities pay no tax.*wrong map/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/non-qualifying income or non-charitable spending can be taxed/i)).toBeInTheDocument();
    expect(screen.getByText(/trustees direct and steward a charity/i)).toBeInTheDocument();
    expect(screen.getByText(/calling all of that.*ownership.*hides/i)).toBeInTheDocument();
  });

  it("keeps finance measures visibly distinct", () => {
    render(<CharitiesPage />);

    expect(screen.getAllByTestId("finance-card")).toHaveLength(6);
    expect(
      screen.getByRole("heading", { name: /income.*spending.*assets.*impact/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/staff cost and published bands must not become/i)).toBeInTheDocument();
    expect(screen.getByText(/award, payment, donation and delivered result are different/i)).toBeInTheDocument();
  });

  it("gives a minimum-information route to ask for help", () => {
    render(<CharitiesPage />);

    expect(screen.getByRole("heading", { name: /calm way to ask/i })).toBeInTheDocument();
    expect(screen.getByText(/understand the privacy route before sending a case file/i)).toBeInTheDocument();
    expect(screen.getByText(/safest way to share the minimum information/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /complaint and concern routes/i })).toHaveAttribute(
      "href",
      "https://www.gov.uk/complain-about-charity",
    );
  });

  it("links the bounded API and machine contract", () => {
    render(<CharitiesPage />);

    expect(screen.getAllByRole("link", { name: /v1\/charities\/uk/i }).at(-1)).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/charities/uk",
    );
    expect(screen.getByRole("link", { name: /read openapi/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/openapi.json",
    );
    expect(screen.getByRole("link", { name: /bulk exports/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/charities/uk/exports",
    );
    expect(screen.getByRole("link", { name: /data dictionary/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/charities/uk/dictionary",
    );
    expect(screen.getByRole("link", { name: /register doors/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/charities/uk/registers",
    );
  });
});
