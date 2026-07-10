// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import publicFundingJson from "../../../../../../research/uk/public-funding/data/uk-public-funding.json";
import UkPublicFundingPage from "../page";

type Corpus = {
  meta: { version: string };
  sources: Array<{ id: string }>;
  institutions: Array<{ id: string }>;
  governanceUnits: Array<{ id: string }>;
  offices: Array<{ id: string }>;
  programmes: Array<{ beneficiaryTags: string[] }>;
  allocations: Array<{
    id: string;
    name: string;
    amountMinor: number;
    financialYear: string;
    status: string;
    budgetBoundary: string;
  }>;
  contacts: Array<{ id: string }>;
  transparencyGaps: Array<{ id: string }>;
};

const corpus = publicFundingJson as unknown as Corpus;
const apiBase = "https://api.taxsorted.io/v1/public-funding/uk";
const snapshotAllocationIds = [
  "allocation-nhs-england-directed-resource",
  "allocation-public-health-grant",
  "allocation-core-schools-plan",
  "allocation-scotland-education-total",
  "allocation-wales-health-resource",
  "allocation-ni-education-rdel-plan",
];

describe("UK public-funding page", () => {
  it("leads with the pooled-tax truth and traceability boundary", () => {
    render(<UkPublicFundingPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /follow the authority, not an imaginary labelled pound/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/most tax joins a pool before a service gets a budget/i)).toBeInTheDocument();
    expect(screen.getByText(/no invented journey for an individual tax payment/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /national insurance has a narrow statutory nhs allocation/i }),
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/government/publications/national-insurance-fund-accounts/great-britain-national-insurance-fund-account-for-the-year-ended-31-march-2024",
    );
  });

  it("keeps the six money states and seven pipeline gates visible", () => {
    render(<UkPublicFundingPage />);

    const facts = screen.getAllByTestId("money-fact");
    const stages = screen.getAllByTestId("fiscal-stage");

    expect(facts).toHaveLength(6);
    expect(stages).toHaveLength(7);
    expect(within(facts[0]).getByRole("heading", { name: "Budget" })).toBeInTheDocument();
    expect(within(facts[5]).getByRole("heading", { name: "Outturn" })).toBeInTheDocument();
    expect(screen.getByText(/fy 2026-27 runs from april to march/i)).toBeInTheDocument();
    expect(screen.getByText(/ay 2026\/27 follows a teaching cycle/i)).toBeInTheDocument();
  });

  it("shows representative money records without making a total or ranking", () => {
    render(<UkPublicFundingPage />);

    const expected = snapshotAllocationIds.map((id) =>
      corpus.allocations.find((allocation) => allocation.id === id),
    );
    const cards = screen.getAllByTestId("money-snapshot");
    const pounds = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    });

    expect(expected.every(Boolean)).toBe(true);
    expect(cards).toHaveLength(6);
    for (const [index, allocation] of expected.entries()) {
      expect(allocation).toBeDefined();
      expect(within(cards[index]).getByRole("heading", { name: allocation!.name })).toBeInTheDocument();
      expect(within(cards[index]).getByText(pounds.format(allocation!.amountMinor / 100))).toBeInTheDocument();
      expect(within(cards[index]).getByText(`FY ${allocation!.financialYear}`)).toBeInTheDocument();
      expect(within(cards[index]).getByText(allocation!.status)).toBeInTheDocument();
      expect(within(cards[index]).getByText(allocation!.budgetBoundary)).toBeInTheDocument();
      expect(within(cards[index]).getByRole("link", { name: /open amount and evidence/i })).toHaveAttribute(
        "href",
        `${apiBase}/allocations/${allocation!.id}`,
      );
    }
    expect(screen.getByRole("heading", { name: /six boundaries. no grand total/i })).toBeInTheDocument();
    expect(screen.getByText(/they are not a league table, are not like-for-like/i)).toBeInTheDocument();
    expect(screen.getByText(/nation, service scope, status and accounting basis differ/i)).toBeInTheDocument();
  });

  it("shows both service lanes and all four national systems", () => {
    render(<UkPublicFundingPage />);

    expect(screen.getByRole("heading", { name: /budget, commission, provide/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /formula, grant, loan, research/i })).toBeInTheDocument();
    expect(screen.getAllByTestId("nation-card")).toHaveLength(4);
    for (const nation of ["England", "Scotland", "Wales", "Northern Ireland"]) {
      expect(screen.getByRole("heading", { name: nation })).toBeInTheDocument();
    }
  });

  it("turns every reviewed beneficiary tag into a query without pretending tags add up", () => {
    render(<UkPublicFundingPage />);

    const tags = Array.from(
      new Set(corpus.programmes.flatMap((programme) => programme.beneficiaryTags)),
    ).sort((left, right) => left.localeCompare(right));
    const links = screen.queryAllByTestId("beneficiary-tag");

    expect(tags.length).toBeGreaterThan(0);
    expect(links).toHaveLength(tags.length);
    for (const [index, tag] of tags.entries()) {
      expect(links[index]).toHaveAttribute(
        "href",
        `${apiBase}/programmes?beneficiaryTag=${encodeURIComponent(tag)}`,
      );
    }
    expect(screen.getByText(/does not add tagged amounts into a made-up/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("programme-card")).toHaveLength(
      Math.min(6, corpus.programmes.length),
    );
  });

  it("shows formal governance without publishing a bulk people directory", () => {
    render(<UkPublicFundingPage />);

    const officeCard = screen.getByRole("heading", { name: "Formal offices" }).closest("article");
    const governanceCard = screen
      .getByRole("heading", { name: "Boards, panels and committees" })
      .closest("article");
    const contactCard = screen
      .getByRole("heading", { name: "Functional public contacts" })
      .closest("article");

    expect(officeCard).not.toBeNull();
    expect(governanceCard).not.toBeNull();
    expect(contactCard).not.toBeNull();
    expect(within(officeCard!).getByText(String(corpus.offices.length))).toBeInTheDocument();
    expect(within(governanceCard!).getByText(String(corpus.governanceUnits.length))).toBeInTheDocument();
    expect(within(contactCard!).getByText(String(corpus.contacts.length))).toBeInTheDocument();
    expect(screen.getByText(/names are not copied into the bulk graph/i)).toBeInTheDocument();
    expect(screen.getByText(/no inferred emails, personal mobiles, home addresses/i)).toBeInTheDocument();
    expect(screen.getByText(/formal power is scored for offices, not people/i)).toBeInTheDocument();
    expect(screen.getByText(/does not create a person leaderboard/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /formal office-power method/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/politics/uk/power/method",
    );
  });

  it("publishes source, gap and usable API doors with an honest release state", () => {
    render(<UkPublicFundingPage />);

    expect(screen.getByRole("link", { name: /read the complete source ledger/i })).toHaveAttribute(
      "href",
      `${apiBase}/sources`,
    );
    expect(screen.getByRole("link", { name: /read every open gap/i })).toHaveAttribute(
      "href",
      `${apiBase}/gaps`,
    );
    expect(screen.getByRole("link", { name: /manifest/i })).toHaveAttribute(
      "href",
      `${apiBase}/manifest`,
    );
    expect(screen.getByRole("link", { name: /json schema/i })).toHaveAttribute(
      "href",
      `${apiBase}/schema`,
    );
    expect(screen.getByRole("link", { name: /openapi 3.1/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/openapi.json",
    );
    expect(screen.getByRole("link", { name: /agent wake/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/wake",
    );
    expect(screen.getByRole("link", { name: /release changes/i })).toHaveAttribute(
      "href",
      `${apiBase}/changes`,
    );
    expect(screen.getByRole("link", { name: /resolve a stable id/i })).toHaveAttribute(
      "href",
      `${apiBase}/records/${corpus.institutions[0].id}`,
    );
    expect(screen.getByLabelText("Public-funding API curl example")).toHaveTextContent(
      "manifest.publicationStatus",
    );
    expect(screen.getByText(/while protected bodies are paused they return/i)).toHaveTextContent("503");
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === "P" &&
          element.textContent?.includes(`Corpus version ${corpus.meta.version}`) === true,
      ),
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId("gap-card")).toHaveLength(
      Math.min(6, corpus.transparencyGaps.length),
    );
    expect(screen.getByText(/statement, vote, decision, allocation and outturn are different records/i)).toBeInTheDocument();
    expect(screen.getByText(/not copy speeches, infer missing votes, score rhetoric/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /official-events method/i })).toHaveAttribute(
      "href",
      "https://github.com/cambridgetcg/taxsorted.io/blob/main/research/uk/politics/official-events-method.md",
    );
  });
});
