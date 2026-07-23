// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PublicDecisionsPage from "../page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/uk/politics/decisions",
}));

describe("public decision pathways", () => {
  it("starts with the decision and preserves the neutral no-profile boundary", () => {
    render(<PublicDecisionsPage />);

    expect(
      screen.getByRole("heading", { name: /find where the decision lives/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not saved, sent, analysed or used to infer a political belief/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Change a decision" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const selectedIntent = screen.getByRole("button", {
      name: /change a central tax rule through primary legislation/i,
    });
    expect(selectedIntent).toHaveAttribute("aria-pressed", "true");
    expect(within(selectedIntent).getByText("Deep map")).toHaveClass(
      "text-white/90",
    );
    expect(
      within(selectedIntent).getByText(/identified a finance bill.*primary legislation/i),
    ).toHaveClass("text-white/90");
    expect(
      screen.getByRole("heading", { name: /four truths before choosing a door/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Government proposes")).toBeInTheDocument();
    expect(screen.getByText("Commons authorises")).toBeInTheDocument();
    expect(screen.getByText("HMRC administers")).toBeInTheDocument();
  });

  it("shows the dated draft-legislation window without overstating its scope", () => {
    render(<PublicDecisionsPage />);

    expect(
      screen.getByRole("heading", {
        name: /finance bill 2026-27 draft-legislation technical consultation/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/official closing date 2026-09-07/i)).toBeInTheDocument();
    expect(screen.getByText(/scope: partly fixed/i)).toBeInTheDocument();
    expect(screen.getByText(/what can still change:/i).parentElement).toHaveTextContent(
      /technical drafting.*final inclusion/i,
    );
    expect(
      screen.getByRole("link", { name: /verify the live official window/i }),
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/government/collections/finance-bill-2026-27-draft-legislation-and-technical-tax-documents",
    );
  });

  it("states formal effects instead of ranking a best political tactic", () => {
    render(<PublicDecisionsPage />);

    expect(
      screen.getByRole("heading", { name: /no “best” route.*read the formal effect/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/threshold creates a response or debate consideration/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/no promise:/i).length).toBeGreaterThan(3);
    expect(screen.getByText(/influence is not formal power/i)).toBeInTheDocument();
    expect(screen.getAllByText(/taxsorted inference/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/creator's name is published while it is open/i),
    ).toBeInTheDocument();
  });

  it("leaves policy advocacy when the user selects a personal tax decision", () => {
    render(<PublicDecisionsPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /challenge a decision about me/i }),
    );

    expect(
      screen.getByRole("heading", { name: /challenge an HMRC tax decision/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/leave the public-policy path here/i)).toBeInTheDocument();
    expect(screen.getByText(/many appeals are normally required within 30 days/i)).toBeInTheDocument();
    expect(screen.getByText(/normally completed within 45 days/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /judicial review is a parallel exceptional route/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/territory: england and wales court procedure only/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/promptly.*three months/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Scotland and Northern Ireland use different court procedures/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /ten stages/i }),
    ).not.toBeInTheDocument();
  });

  it("separates service complaints and devolved or local tax powers", () => {
    render(<PublicDecisionsPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /complain about HMRC service/i }),
    );
    expect(
      screen.getByRole("heading", { name: /complain about HMRC service/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/not a substitute for an appeal/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /change a devolved or local tax/i }),
    );
    expect(
      screen.getByText(/do not reuse the Westminster route/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /devolved and local tax powers/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /change a delegated tax rule.*identify the legal instrument/i,
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: /secondary tax legislation and delegated powers/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/read the parent power/i)).toBeInTheDocument();
  });

  it("opens the stable machine contracts", () => {
    render(<PublicDecisionsPage />);

    expect(screen.getByRole("link", { name: /read the json/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/politics/uk/public-decision-pathways",
    );
    expect(screen.getByRole("link", { name: /read the schema/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/politics/uk/public-decision-pathways/schema",
    );
    expect(screen.getByRole("link", { name: /read reuse rights/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/politics/uk/public-decision-pathways/rights",
    );
    expect(
      screen.getByRole("link", { name: /read the openapi description/i }),
    ).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/openapi/politics-uk.json",
    );
  });
});
