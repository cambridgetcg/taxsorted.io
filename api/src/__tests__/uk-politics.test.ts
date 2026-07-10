import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { apiCors } from "../cors.js";
import { createUkPoliticsRoutes, type UkPoliticsOptions } from "../routes/uk-politics.js";

const NOW = new Date("2026-07-10T08:00:00.000Z");

const member = {
  id: 4514,
  nameDisplayAs: "Sir Keir Starmer",
  nameFullTitle: "Rt Hon Sir Keir Starmer MP",
  latestParty: {
    id: 15,
    name: "Labour",
    abbreviation: "Lab",
    backgroundColour: "d50000",
  },
  latestHouseMembership: {
    membershipFrom: "Holborn and St Pancras",
    membershipFromId: 4105,
    house: 1,
    membershipStartDate: "2015-05-07T00:00:00",
    membershipEndDate: null,
    membershipStatus: { statusIsActive: true },
  },
  thumbnailUrl: "https://members-api.parliament.uk/api/Members/4514/Thumbnail",
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fetchMock(
  implementation: (url: URL, init?: RequestInit) => Promise<Response> | Response
) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) =>
    await implementation(new URL(input instanceof Request ? input.url : input.toString()), init)
  );
}

function mount(options: UkPoliticsOptions) {
  const app = new Hono();
  let sessionCalls = 0;
  app.use("*", apiCors);
  app.route(
    "/v1/politics/uk",
    createUkPoliticsRoutes({ publicDataEnabled: true, now: () => NOW, ...options })
  );
  // Mirrors index.ts ordering. If a public route ever falls through to this
  // rail, the test sees both the call and the cookie it plants.
  app.use("/v1/*", async (c, next) => {
    sessionCalls++;
    c.header("Set-Cookie", "ts_session=should-not-exist; HttpOnly");
    await next();
  });
  app.get("/v1/private-probe", (c) => c.json({ ok: true }));
  return { app, sessionCalls: () => sessionCalls };
}

describe("public UK politics people", () => {
  it("searches current members, maps the public shape, and is wildcard-CORS without a session", async () => {
    const fetchImpl = fetchMock((url) => {
      expect(url.pathname).toBe("/api/Members/Search");
      expect(url.searchParams.get("IsCurrentMember")).toBe("true");
      expect(url.searchParams.get("House")).toBe("1");
      expect(url.searchParams.get("Name")).toBe("Starmer");
      expect(url.searchParams.get("skip")).toBe("20");
      expect(url.searchParams.get("take")).toBe("10");
      return json({ items: [{ value: member }], totalResults: 1, skip: 20, take: 10 });
    });
    const { app, sessionCalls } = mount({ fetchImpl });

    const response = await app.request(
      "/v1/politics/uk/people?house=commons&q=Starmer&skip=20&take=10",
      { headers: { Origin: "https://app.example" } }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(sessionCalls()).toBe(0);
    expect(body.people[0]).toEqual({
      id: 4514,
      name: "Sir Keir Starmer",
      fullTitle: "Rt Hon Sir Keir Starmer MP",
      house: "Commons",
      party: { id: 15, name: "Labour", abbreviation: "Lab", colour: "#d50000" },
      seat: { id: 4105, name: "Holborn and St Pancras" },
      membershipStartDate: "2015-05-07T00:00:00",
      profileUrl: "https://members.parliament.uk/member/4514",
    });
    expect(body.source.retrievedAt).toBe(NOW.toISOString());
    expect(body.source.licence.url).toBe(
      "https://www.parliament.uk/site-information/copyright/open-parliament-licence/"
    );
  });

  it("returns a clean timeout instead of hanging or exposing an exception", async () => {
    const fetchImpl = fetchMock(() => new Promise<Response>(() => undefined));
    const { app } = mount({ fetchImpl, timeoutMs: 5 });
    const response = await app.request("/v1/politics/uk/people");
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.error).toBe("upstream_timeout");
    expect(body.source.retrievedAt).toBe(NOW.toISOString());
  });
});

describe("person privacy and public record", () => {
  it("keeps professional contacts while removing residential and interest address/donor lines", async () => {
    const fetchImpl = fetchMock((url) => {
      const suffix = url.pathname.replace("/api/Members/4514", "");
      if (!suffix) return json({ value: member });
      if (suffix === "/Contact") {
        return json({
          value: [
            {
              type: "Parliamentary office",
              notes: "Please include your full name and constituency address.",
              line1: "House of Commons",
              line2: "London",
              postcode: "SW1A 0AA",
              email: "keir.starmer.mp@parliament.uk",
            },
            {
              type: "Home",
              line1: "10 Private Lane",
              postcode: "AB1 2CD",
              phone: "01000 000000",
            },
            {
              type: "Government office",
              notes: "Contact for work with the Home Office",
              line1: "2 Marsham Street",
              postcode: "SW1P 4DF",
              phone: "020 7000 0000",
            },
            {
              type: "X (formerly Twitter)",
              isWebAddress: true,
              line1: "https://x.com/keir_starmer",
            },
          ],
        });
      }
      if (suffix === "/Biography") {
        return json({
          value: {
            representations: [
              {
                id: 4105,
                name: "Holborn and St Pancras",
                house: 1,
                startDate: "2015-05-07T00:00:00",
              },
            ],
            governmentPosts: [
              {
                id: 1267,
                name: "Prime Minister",
                house: 1,
                startDate: "2024-07-05T00:00:00",
              },
            ],
            oppositionPosts: [],
            otherPosts: [],
            committeeMemberships: [],
            houseMemberships: [],
            electionsContested: [],
            partyAffiliations: [],
          },
        });
      }
      if (suffix === "/RegisteredInterests") {
        return json({
          value: [
            {
              id: 4,
              name: "Gifts, benefits and hospitality",
              interests: [
                {
                  id: 99,
                  interest:
                    "Name of donor: Example Person\r\nAddress of donor: 1 Private Road, London SW1A 1AA\r\nDestination: Paris\r\nFamily member: Example Relative\r\nName: Hidden Guest\r\nRelationship to member: Spouse\r\nAmount: £500\r\nDate accepted: 1 July 2026",
                  createdWhen: "2026-07-02T00:00:00",
                  childInterests: [
                    {
                      id: 100,
                      interest:
                        "Payer: Example Ltd, 2 Market Street, York YO1 1AA\r\nRole, work or services: Speech",
                      childInterests: [],
                    },
                  ],
                },
              ],
            },
            {
              id: 10,
              name: "Family members engaged in lobbying the public sector",
              interests: [
                {
                  id: 101,
                  interest:
                    "Role: Senior adviser\r\nEmployer: Identifying Family Employer Ltd\r\nClient: Identifying Client",
                  childInterests: [],
                },
              ],
            },
          ],
        });
      }
      if (suffix === "/Staff") {
        return json({ value: [{ title: "Ms", forename: "A", surname: "Staffer", details: "Researcher" }] });
      }
      if (suffix === "/ContributionSummary") {
        return json({
          items: [
            {
              value: {
                debateTitle: "Engagements",
                sittingDate: "2026-07-01T00:00:00",
                house: "Commons",
                section: "Commons Chamber",
                totalContributions: 2,
                answerCount: 2,
              },
              links: [
                {
                  href: "https://hansard-api.parliament.uk/Debates/Debate/example.json",
                },
              ],
            },
          ],
        });
      }
      if (suffix === "/LatestElectionResult") {
        return json({
          value: {
            result: "Lab Hold",
            electionTitle: "2024 General Election",
            electionDate: "2024-07-04T00:00:00",
            constituencyName: "Holborn and St Pancras",
            electorate: 71300,
            turnout: 38602,
            majority: 11572,
            isGeneralElection: true,
            candidates: [
              {
                name: "Sir Keir Starmer",
                party: member.latestParty,
                votes: 18884,
                voteShare: 0.489,
                rankOrder: 1,
              },
            ],
          },
        });
      }
      throw new Error(`unexpected URL ${url}`);
    });
    const { app } = mount({ fetchImpl });

    const response = await app.request("/v1/politics/uk/people/4514");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contacts.map((contact: { type: string }) => contact.type)).toEqual([
      "Parliamentary office",
      "Government office",
      "X (formerly Twitter)",
    ]);
    expect(JSON.stringify(body.contacts)).not.toContain("Private Lane");
    expect(body.contacts[0].address).toEqual(["House of Commons", "London", "SW1A 0AA"]);
    expect(body.contacts[0].notes).toBe(
      "Please include your full name and constituency address."
    );
    expect(body.contacts[1].notes).toBe("Contact for work with the Home Office");
    expect(body.roles.government[0].name).toBe("Prime Minister");
    expect(body.formalPower).toEqual({
      basis: "office-not-person",
      methodPath: "/v1/politics/uk/power/method",
      assessmentIds: ["uk:office:member-of-parliament", "uk:office:prime-minister"],
      unassessedCurrentRoles: [],
      combinationRule:
        "A person may hold several offices. Their assessments are listed separately and never added together.",
      gap: null,
    });
    expect(body.staff[0]).toEqual({ name: "Ms A Staffer", title: "Ms", details: "Researcher" });
    expect(body.activity[0].answerCount).toBe(2);
    expect(body.election.title).toBe("2024 General Election");
    expect(body.interests).toHaveLength(2);
    const interestText = body.interests.map((interest: { text: string }) => interest.text).join("\n");
    expect(interestText).toContain("Amount: £500");
    expect(interestText).toContain("Role, work or services: Speech");
    expect(interestText).not.toMatch(
      /Example Person|Address of donor|Payer:|SW1A 1AA|YO1 1AA|Paris|Example Relative|Hidden Guest|Spouse/
    );
    expect(interestText).not.toMatch(/Identifying Family Employer|Identifying Client|Senior adviser/);
    expect(body.interests[1].parentId).toBe(99);
    expect(body.privacy.residentialContactsExcluded).toBe(true);
    expect(body.privacy.interestFamilyCategoriesExcluded).toBe(true);
  });

  it("does not fetch or publish staff or interests when their separate gates are closed", async () => {
    const fetchImpl = fetchMock((url) => {
      const suffix = url.pathname.replace("/api/Members/4514", "");
      if (!suffix) return json({ value: member });
      if (suffix === "/Staff") throw new Error("The closed staff gate must prevent the upstream fetch.");
      if (suffix === "/RegisteredInterests") {
        throw new Error("The closed interests gate must prevent the upstream fetch.");
      }
      if (["/Contact", "/Biography", "/ContributionSummary", "/LatestElectionResult"].includes(suffix)) {
        return json({});
      }
      throw new Error(`Unexpected Parliament path: ${url.pathname}`);
    });
    const { app } = mount({
      fetchImpl,
      parliamentaryStaffEnabled: false,
      parliamentaryInterestsEnabled: false,
    });

    const response = await app.request("/v1/politics/uk/people/4514");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.staff).toEqual([]);
    expect(body.interests).toEqual([]);
    expect(body.privacy.parliamentaryStaffPublication).toBe(
      "blocked_pending_separate_review"
    );
    expect(
      fetchImpl.mock.calls.some(([input]) =>
        /\/(?:Staff|RegisteredInterests)$/.test(
          new URL(input instanceof Request ? input.url : input.toString()).pathname
        )
      )
    ).toBe(false);
    expect(body.privacy.parliamentaryInterestsPublication).toBe(
      "blocked_pending_separate_review"
    );
  });

  it("rejects a historical member before fetching contacts, interests, or staff", async () => {
    const fetchImpl = fetchMock((url) => {
      expect(url.pathname).toBe("/api/Members/99");
      return json({
        value: {
          ...member,
          id: 99,
          nameDisplayAs: "Former Member",
          latestHouseMembership: {
            ...member.latestHouseMembership,
            membershipEndDate: "2024-05-30T00:00:00",
            membershipStatus: { statusIsActive: false },
          },
        },
      });
    });
    const { app } = mount({ fetchImpl });

    const response = await app.request("/v1/politics/uk/people/99");
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.error).toBe("person_not_current");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("parties and roles", () => {
  it("merges active parties across both Houses", async () => {
    const fetchImpl = fetchMock((url) => {
      const house = url.pathname.endsWith("/1") ? 1 : 2;
      return json({
        items: [
          {
            value: {
              id: 15,
              name: "Labour",
              abbreviation: "Lab",
              backgroundColour: "d50000",
              foregroundColour: "ffffff",
              governmentType: 0,
              isIndependentParty: false,
            },
          },
          ...(house === 2
            ? [
                {
                  value: {
                    id: 8,
                    name: "Crossbench",
                    abbreviation: "CB",
                    backgroundColour: null,
                    isIndependentParty: true,
                  },
                },
              ]
            : []),
        ],
      });
    });
    const { app } = mount({ fetchImpl });
    const response = await app.request("/v1/politics/uk/parties?house=all");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(body.parties.find((party: { id: number }) => party.id === 15).houses).toEqual([
      "Commons",
      "Lords",
    ]);
  });

  it("returns only current holders for the requested role kind", async () => {
    const fetchImpl = fetchMock((url) => {
      expect(url.pathname).toBe("/api/Posts/GovernmentPosts");
      return json([
        {
          value: {
            id: 1267,
            name: "Prime Minister",
            hansardName: "The Prime Minister",
            postHolders: [
              { member: { value: member }, startDate: "2024-07-05T00:00:00", isPaid: true },
              {
                member: { value: { ...member, id: 1 } },
                startDate: "2020-01-01T00:00:00",
                endDate: "2024-07-05T00:00:00",
              },
            ],
            governmentDepartments: [
              { id: 87, name: "Prime Minister's Office", url: "https://www.gov.uk/number10" },
            ],
          },
        },
      ]);
    });
    const { app } = mount({ fetchImpl });
    const response = await app.request("/v1/politics/uk/roles?kind=government");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.kind).toBe("government");
    expect(body.roles[0].holders).toHaveLength(1);
    expect(body.roles[0].holders[0].person.id).toBe(4514);
  });
});

const donationHeaders = [
  "ECRef",
  "RegulatedEntityName",
  "RegulatedEntityType",
  "Value",
  "AcceptedDate",
  "AccountingUnitName",
  "DonorName",
  "AccountingUnitsAsCentralParty",
  "IsSponsorship",
  "DonorStatus",
  "RegulatedDoneeType",
  "CompanyRegistrationNumber",
  "Postcode",
  "DonationType",
  "NatureOfDonation",
  "PurposeOfVisit",
  "DonationAction",
  "ReceivedDate",
  "ReportedDate",
  "IsReportedPrePoll",
  "ReportingPeriodName",
  "IsBequest",
  "IsAggregation",
  "RegulatedEntityId",
  "AccountingUnitId",
  "DonorId",
  "CampaigningName",
  "RegisterName",
  "IsIrishSource",
];

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function donationCsv(rows: Array<Record<string, string>>) {
  return [
    donationHeaders.join(","),
    ...rows.map((row) => donationHeaders.map((header) => csvCell(row[header] ?? "")).join(",")),
  ].join("\r\n");
}

describe("Electoral Commission reuse boundary", () => {
  it("ships closed by default and points people to the official source", async () => {
    const fetchImpl = fetchMock(() => {
      throw new Error("must not fetch while reuse is unconfirmed");
    });
    const { app } = mount({ fetchImpl, electoralCommissionReuseConfirmed: false });
    const response = await app.request(
      "/v1/politics/uk/funding/donations?from=2026-01-01&to=2026-03-31"
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.error).toBe("source_terms_confirmation_needed");
    expect(body.source.url).toBe(
      "https://search.electoralcommission.org.uk/Search/Donations"
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("normalises and paginates the official CSV only after explicit confirmation", async () => {
    const csv = donationCsv([
      {
        ECRef: "C100",
        RegulatedEntityName: "Example Party",
        RegulatedEntityType: "Political Party",
        Value: "£1,234.56",
        AcceptedDate: "01/02/2026",
        AccountingUnitName: "Central Party",
        DonorName: "Example Donor",
        DonorStatus: "Individual",
        CompanyRegistrationNumber: "01234567",
        Postcode: "AB1 2CD",
        DonationType: "Cash",
        NatureOfDonation: "Money, unrestricted",
        ReceivedDate: "31/01/2026",
        ReportedDate: "10/02/2026",
        ReportingPeriodName: "Q1 2026",
        RegulatedEntityId: "99",
        DonorId: "secret-source-id",
        RegisterName: "Great Britain",
      },
      {
        ECRef: "C101",
        RegulatedEntityName: "Example Party",
        RegulatedEntityType: "Political Party",
        Value: "£10.00",
        AcceptedDate: "02/02/2026",
        DonorName: "Second Donor",
        DonorStatus: "Company",
        CompanyRegistrationNumber: "SC123456",
        Postcode: "ZZ1 1ZZ",
        DonationType: "Non Cash",
        RegisterName: "Great Britain",
      },
    ]);
    const fetchImpl = fetchMock((url, init) => {
      expect(url.pathname).toBe("/api/csv/Donations");
      expect(url.searchParams.get("et")).toBe("pp");
      expect(url.searchParams.has("start")).toBe(false);
      expect(url.searchParams.has("rows")).toBe(false);
      expect(url.searchParams.getAll("register")).toEqual(["gb", "ni"]);
      expect(new Headers(init?.headers).get("accept")).toBe("text/csv");
      return new Response(csv, { headers: { "Content-Type": "text/csv" } });
    });
    const { app } = mount({ fetchImpl, electoralCommissionReuseConfirmed: true });
    const response = await app.request(
      "/v1/politics/uk/funding/donations?from=2026-01-01&to=2026-03-31&skip=0&take=1"
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.skip).toBe(0);
    expect(body.take).toBe(1);
    expect(body.donations[0]).toMatchObject({
      reference: "C101",
      recipient: "Example Party",
      amountPence: 1000,
      acceptedDate: "2026-02-02",
      donorName: "Second Donor",
      donorType: "Company",
      companyNumber: "SC123456",
    });
    const serialized = JSON.stringify(body.donations);
    expect(serialized).not.toMatch(/postcode|address|CompanyRegistrationNumber|DonorId|secret-source-id|ZZ1 1ZZ/i);
    expect(serialized).not.toContain("Example Donor");
    expect(body.coverage).toContain("Verified company donors");
  });

  it("does not fetch the mixed political-finance CSV while its privacy review is closed", async () => {
    const fetchImpl = fetchMock(() => {
      throw new Error("The privacy gate must prevent the upstream bulk fetch.");
    });
    const { app } = mount({
      fetchImpl,
      electoralCommissionReuseConfirmed: true,
      electoralFinanceReviewApproved: false,
    });

    const response = await app.request(
      "/v1/politics/uk/funding/donations?from=2026-01-01&to=2026-03-31"
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).error).toBe("source_privacy_review_needed");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects unbounded date ranges before fetching a CSV", async () => {
    const fetchImpl = fetchMock(() => json({}));
    const { app } = mount({ fetchImpl, electoralCommissionReuseConfirmed: true });
    const response = await app.request(
      "/v1/politics/uk/funding/donations?from=2026-01-01&to=2026-06-01"
    );

    expect(response.status).toBe(422);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("publication gate and source manifest", () => {
  it("blocks all data in a closed production-style mount but leaves the manifest open", async () => {
    const fetchImpl = fetchMock(() => {
      throw new Error("must not fetch while publication is closed");
    });
    const app = new Hono();
    app.route(
      "/v1/politics/uk",
      createUkPoliticsRoutes({
        fetchImpl,
        now: () => NOW,
        publicDataEnabled: false,
        electoralCommissionReuseConfirmed: true,
      })
    );

    const closed = await app.request("/v1/politics/uk/people");
    const closedBody = await closed.json();
    expect(closed.status).toBe(503);
    expect(closed.headers.get("cache-control")).toBe("no-store");
    expect(closedBody.error).toBe("publication_review_needed");
    expect(closedBody.methodUrl).toBe("https://taxsorted.io/uk/politics/method/");
    expect(closedBody.privacyNotice).toBe("pending_publication_review");
    expect(fetchImpl).not.toHaveBeenCalled();

    const manifest = await app.request("/v1/politics/uk/sources");
    const manifestBody = await manifest.json();
    expect(manifest.status).toBe(200);
    expect(manifestBody.publication.status).toBe("blocked_pending_review");
    const endpointStatus = new Map(
      manifestBody.endpoints.map((endpoint: { path: string; status: string }) => [
        endpoint.path,
        endpoint.status,
      ])
    );
    expect(endpointStatus.get("/people")).toBe("blocked_pending_review");
    expect(endpointStatus.get("/people/:id")).toBe("blocked_pending_review");
    expect(endpointStatus.get("/people/:id staff field")).toBe(
      "blocked_pending_people_review"
    );
    expect(endpointStatus.get("/people/:id interests field")).toBe(
      "blocked_pending_people_review"
    );
    expect(endpointStatus.get("/parties")).toBe("blocked_pending_review");
    expect(endpointStatus.get("/roles")).toBe("blocked_pending_review");
    expect(endpointStatus.get("/funding/donations")).toBe("blocked_pending_review");
    expect(manifestBody.sources[0].licence.url).toBe(
      "https://www.parliament.uk/site-information/copyright/open-parliament-licence/"
    );
    expect(manifestBody.sources[1].status).toBe("blocked_pending_people_review");
    expect(manifestBody.source.url).toBe(
      "https://api.taxsorted.io/v1/politics/uk/sources"
    );
  });
});
