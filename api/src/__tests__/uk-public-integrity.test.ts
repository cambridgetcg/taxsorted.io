import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import {
  createUkPublicIntegrityRoutes,
  type UkPublicIntegrityOptions,
} from "../routes/uk-public-integrity.js";

const NOW = new Date("2026-07-10T08:00:00.000Z");

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function csv(value: string) {
  return new Response(value, {
    status: 200,
    headers: { "Content-Type": "text/csv" },
  });
}

function fetchMock(
  implementation: (url: URL, init?: RequestInit) => Promise<Response> | Response
) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) =>
    await implementation(new URL(input instanceof Request ? input.url : input.toString()), init)
  );
}

function mount(options: UkPublicIntegrityOptions = {}) {
  const app = new Hono();
  app.route(
    "/v1/politics/uk",
    createUkPublicIntegrityRoutes({ now: () => NOW, ...options })
  );
  return app;
}

describe("public contract awards", () => {
  it("returns a strict organisation-only view and removes registry contact and address fields", async () => {
    const fetchImpl = fetchMock((url) => {
      expect(url.origin).toBe("https://www.contractsfinder.service.gov.uk");
      expect(url.pathname).toBe("/Published/Notices/OCDS/Search");
      expect(url.searchParams.get("publishedFrom")).toBe("2026-06-01T00:00:00Z");
      expect(url.searchParams.get("publishedTo")).toBe("2026-06-30T23:59:59Z");
      expect(url.searchParams.get("stages")).toBe("award");
      expect(url.searchParams.get("limit")).toBe("7");

      return json({
        releases: [
          {
            ocid: "ocds-b5fd17-example",
            id: "release-1",
            date: "2026-06-20T09:30:00Z",
            buyer: {
              id: "GB-GOR-HO",
              name: "Example Public Buyer",
              address: { streetAddress: "BUYER PRIVATE ADDRESS" },
              contactPoint: {
                name: "BUYER CONTACT PERSON",
                email: "buyer.private@example.test",
                telephone: "020 7000 0000",
              },
            },
            tender: {
              title: "Secure document services",
              procurementMethodDetails: "Open procedure",
              classification: {
                scheme: "CPV",
                id: "72512000",
                description: "Document management services",
              },
              value: { amount: 1_200_000, currency: "GBP" },
              contactPoint: { email: "tender.private@example.test" },
            },
            parties: [
              {
                id: "supplier-company",
                name: "Verified Supplier Ltd",
                identifier: { scheme: "GB-COH", id: "01234567" },
                address: { streetAddress: "SUPPLIER PRIVATE ADDRESS" },
                contactPoint: {
                  name: "SUPPLIER CONTACT PERSON",
                  email: "supplier.private@example.test",
                },
              },
              {
                id: "supplier-without-public-id",
                name: "UNVERIFIED SUPPLIER NAME",
                address: { streetAddress: "SOLE TRADER HOME ADDRESS" },
              },
            ],
            awards: [
              {
                id: "award-1",
                status: "active",
                date: "2026-06-18T00:00:00Z",
                datePublished: "2026-06-20T09:30:00Z",
                value: { amount: 1_100_000, currency: "GBP" },
                suppliers: [
                  { id: "supplier-company", name: "Untrusted fallback name" },
                  { id: "supplier-without-public-id", name: "UNVERIFIED SUPPLIER NAME" },
                ],
                documents: [
                  {
                    documentType: "awardNotice",
                    url: "https://www.contractsfinder.service.gov.uk/Notice/example",
                    title: "ATTACHMENT SECRET TITLE",
                    description: "ATTACHMENT SECRET CONTENT",
                  },
                ],
                contactPoint: { email: "award.private@example.test" },
              },
            ],
          },
        ],
        links: {
          next: "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?cursor=NEXT_2%3D",
        },
      });
    });
    const app = mount({ fetchImpl });

    const response = await app.request(
      "/v1/politics/uk/relationships/contracts?from=2026-06-01&to=2026-06-30&take=7"
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("public, max-age=900");
    expect(body.schema).toBe("taxsorted.uk.public-contract-awards/1");
    expect(body.datasetId).toBe("public-contract-awards-query");
    expect(body.nextCursor).toBe("NEXT_2=");
    expect(body.deals).toHaveLength(1);
    expect(body.records).toEqual(body.deals);
    expect(body.page).toEqual({ limit: 7, returned: 1, nextCursor: "NEXT_2=" });
    expect(body.links.next).toContain("cursor=NEXT_2%3D");
    expect(body.links.catalogue).toBe("/v1/politics/uk/datasets");
    expect(body.records[0]).toMatchObject({
      id: "contracts-finder:ocds-b5fd17-example:release-1",
      sourceRecordId: "release-1",
      causalInference: "none",
      sourceIds: ["contracts-finder-api"],
    });
    expect(body.records[0].doesNotProve).toContain("Wrongdoing or corruption");
    expect(body.deals[0].buyer).toEqual({ id: "GB-GOR-HO", name: "Example Public Buyer" });
    expect(body.deals[0].tenderValue).toEqual({
      amountMinor: 120_000_000,
      currency: "GBP",
      basis: "source_reported_exact",
    });
    expect(body.deals[0].awards[0].value).toEqual({
      amountMinor: 110_000_000,
      currency: "GBP",
      basis: "source_reported_exact",
    });
    expect(body.deals[0].awards[0].suppliers).toEqual([
      {
        name: "Verified Supplier Ltd",
        identifier: { scheme: "GB-COH", id: "01234567" },
        privacy: "official_organisation_identifier",
      },
      {
        name: null,
        identifier: null,
        privacy: "name_withheld_without_verified_organisation_identifier",
      },
    ]);
    expect(body.deals[0].awards[0].officialNoticeUrl).toBe(
      "https://www.contractsfinder.service.gov.uk/Notice/example"
    );
    expect(Object.keys(body.deals[0].buyer)).toEqual(["id", "name"]);
    expect(Object.keys(body.deals[0].awards[0])).toEqual([
      "id",
      "status",
      "awardedAt",
      "publishedAt",
      "value",
      "suppliers",
      "officialNoticeUrl",
    ]);
    expect(body.deals[0].inference).toContain("does not prove political involvement");

    const serialized = JSON.stringify(body);
    for (const privateValue of [
      "BUYER PRIVATE ADDRESS",
      "BUYER CONTACT PERSON",
      "buyer.private@example.test",
      "tender.private@example.test",
      "SUPPLIER PRIVATE ADDRESS",
      "SUPPLIER CONTACT PERSON",
      "supplier.private@example.test",
      "UNVERIFIED SUPPLIER NAME",
      "SOLE TRADER HOME ADDRESS",
      "ATTACHMENT SECRET TITLE",
      "ATTACHMENT SECRET CONTENT",
      "award.private@example.test",
    ]) {
      expect(serialized).not.toContain(privateValue);
    }
  });

  it("rejects missing, excessive, malformed and out-of-range query values without fetching", async () => {
    const fetchImpl = fetchMock(() => {
      throw new Error("An invalid request must not reach Contracts Finder.");
    });
    const app = mount({ fetchImpl });
    const paths = [
      "/v1/politics/uk/relationships/contracts",
      "/v1/politics/uk/relationships/contracts?from=2026-06-01&to=2026-07-02",
      "/v1/politics/uk/relationships/contracts?from=2026-06-01&to=2026-07-03",
      "/v1/politics/uk/relationships/contracts?from=2026-07-01&to=2026-06-01",
      "/v1/politics/uk/relationships/contracts?from=2026-06-01&to=2026-06-30&take=21",
      "/v1/politics/uk/relationships/contracts?from=2026-06-01&to=2026-06-30&cursor=%24bad",
    ];

    for (const path of paths) {
      const response = await app.request(path);
      expect(response.status).toBe(422);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      expect(await response.json()).toMatchObject({
        type: "https://api.taxsorted.io/problems/invalid_query",
        title: "Invalid query",
        status: 422,
        instance: "/v1/politics/uk/relationships/contracts",
        error: "invalid_query",
        nextActions: [{ href: "/v1/politics/uk/integrity" }],
      });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("ministerial gifts and hospitality", () => {
  it("keeps normalized named records closed by default and does not fetch", async () => {
    const fetchImpl = fetchMock(() => {
      throw new Error("The disabled route must not fetch personal-data records.");
    });
    const app = mount({ fetchImpl });

    const response = await app.request(
      "/v1/politics/uk/relationships/ministerial-benefits?month=2026-05&department=Home%20Office"
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(body).toMatchObject({
      title: "Publication review pending",
      status: 503,
      instance: "/v1/politics/uk/relationships/ministerial-benefits",
      error: "publication_review_needed",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps only reviewed CSV fields when explicitly enabled, including nil returns", async () => {
    const fetchImpl = fetchMock((url) => {
      if (url.hostname === "www.gov.uk") {
        expect(url.pathname).toBe(
          "/api/content/government/publications/register-of-ministers-gifts-and-hospitality-may-2026"
        );
        return json({
          title: "Register of Ministers' Gifts and Hospitality, May 2026",
          details: {
            attachments: [
              {
                title: "Home Office - Ministers' Gifts - May 2026",
                url: "https://assets.publishing.service.gov.uk/media/home-office-gifts.csv",
                content_type: "text/csv",
              },
              {
                title: "Home Office - Ministers' Hospitality - May 2026",
                url: "https://assets.publishing.service.gov.uk/media/home-office-hospitality.csv",
                content_type: "text/csv",
              },
              {
                title: "Another Department - Ministers' Gifts - May 2026",
                url: "https://assets.publishing.service.gov.uk/media/another-department.csv",
                content_type: "text/csv",
              },
              {
                title: "Home Office supporting document",
                url: "https://assets.publishing.service.gov.uk/media/home-office.pdf",
                content_type: "application/pdf",
              },
            ],
          },
        });
      }
      if (url.pathname.endsWith("/home-office-gifts.csv")) {
        return csv(
          [
            "Minister,Date,Gift,Given or Received,Who gift was given to or received from,Value (£),Outcome (Received gifts only),Private email",
            'Minister One,12/05/2026,"A framed, ""signed"" print",Received,Example Person,£150.50,Transferred to department,gift.private@example.test',
            "Minister Two,Nil Return,,,,,,nil.private@example.test",
          ].join("\n")
        );
      }
      if (url.pathname.endsWith("/home-office-hospitality.csv")) {
        return csv(
          [
            "Minister,Date,Individual or Organisation that offered hospitality,Type of Hospitality Received,Accompanied by Guest,Estimated value of Hospitality (£),Home address",
            "Minister One,15/05/2026,Example Organisation,Dinner,Yes,250,HOSPITALITY PRIVATE ADDRESS",
          ].join("\n")
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const app = mount({ fetchImpl, ministerialBenefitsEnabled: true });

    const response = await app.request(
      "/v1/politics/uk/relationships/ministerial-benefits?month=2026-05&department=Home%20Office&type=all"
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(body.schema).toBe("taxsorted.uk.ministerial-benefits/1");
    expect(body.month).toBe("2026-05");
    expect(body.department).toBe("Home Office");
    expect(body.records).toHaveLength(3);
    expect(body.records[0]).toMatchObject({
      recordType: "gift",
      status: "reported",
      minister: "Minister One",
      department: "Home Office",
      date: "2026-05-12",
      benefit: 'A framed, "signed" print',
      direction: "Received",
      counterpartyAsPublished: "Example Person",
      counterpartyType: "publisher_did_not_classify",
      amountPence: 15_050,
      amountAsPublished: "£150.50",
      outcome: "Transferred to department",
    });
    expect(body.records[1]).toMatchObject({
      recordType: "gift",
      status: "nil_return",
      minister: "Minister Two",
      department: "Home Office",
      date: null,
      benefit: null,
      counterpartyAsPublished: null,
      amountPence: null,
    });
    expect(body.records[2]).toMatchObject({
      recordType: "hospitality",
      status: "reported",
      minister: "Minister One",
      department: "Home Office",
      date: "2026-05-15",
      benefit: "Dinner",
      direction: null,
      counterpartyAsPublished: "Example Organisation",
      amountPence: 25_000,
      accompaniedByGuest: "Yes",
    });
    expect(body.joiningRule).toContain("never matched");

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("gift.private@example.test");
    expect(serialized).not.toContain("nil.private@example.test");
    expect(serialized).not.toContain("HOSPITALITY PRIVATE ADDRESS");
  });
});

describe("police institution and senior-office records", () => {
  it("whitelists force-list and force-detail fields while removing addresses and direct contacts", async () => {
    const fetchImpl = fetchMock((url) => {
      if (url.pathname === "/api/forces") {
        return json([
          {
            id: "metropolitan",
            name: "Metropolitan Police Service",
            address: "FORCE LIST PRIVATE ADDRESS",
            email: "force-list-private@example.test",
          },
          { id: "INVALID_ID", name: "Invalid Force" },
          { id: "missing-name" },
        ]);
      }
      if (url.pathname === "/api/forces/metropolitan") {
        return json({
          id: "metropolitan",
          name: "Metropolitan Police Service",
          description:
            "<p>Serving London &amp; its communities.</p><script>DESCRIPTION SCRIPT SECRET</script>",
          url: "https://www.met.police.uk/",
          telephone: "101",
          address: "FORCE DETAIL PRIVATE ADDRESS",
          contact_details: { email: "force-detail-private@example.test" },
          engagement_methods: [
            {
              type: "facebook",
              title: "Official Facebook",
              url: "https://www.facebook.com/metpoliceuk/",
              description: "ENGAGEMENT SECRET FIELD",
            },
            {
              type: "unsafe",
              title: "Unsafe link",
              url: "http://example.test/not-https",
            },
          ],
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const app = mount({ fetchImpl });

    const listResponse = await app.request("/v1/politics/uk/enforcement/forces");
    const list = await listResponse.json();
    const detailResponse = await app.request(
      "/v1/politics/uk/enforcement/forces/metropolitan"
    );
    const detail = await detailResponse.json();

    expect(listResponse.status).toBe(200);
    expect(list.datasetId).toBe("police-force-directory-query");
    expect(list.forces).toEqual([{ id: "metropolitan", name: "Metropolitan Police Service" }]);
    expect(list.records).toEqual(list.forces);
    expect(list.page).toEqual({ returned: 1, total: 1, nextCursor: null });
    expect(detailResponse.status).toBe(200);
    expect(detail.force).toEqual({
      id: "metropolitan",
      name: "Metropolitan Police Service",
      publicDescription: "Serving London & its communities.",
      website: "https://www.met.police.uk/",
      publicSwitchboard: "101",
      engagement: [
        {
          type: "facebook",
          title: "Official Facebook",
          url: "https://www.facebook.com/metpoliceuk/",
        },
      ],
    });
    expect(detail.record).toEqual(detail.force);
    expect(detail.links.catalogue).toBe("/v1/politics/uk/datasets");
    expect(detail.safety).toContain("no station addresses");

    const serialized = JSON.stringify({ list, detail });
    for (const privateValue of [
      "FORCE LIST PRIVATE ADDRESS",
      "force-list-private@example.test",
      "FORCE DETAIL PRIVATE ADDRESS",
      "force-detail-private@example.test",
      "DESCRIPTION SCRIPT SECRET",
      "ENGAGEMENT SECRET FIELD",
    ]) {
      expect(serialized).not.toContain(privateValue);
    }
  });

  it("keeps named senior officers closed by default and does not fetch", async () => {
    const fetchImpl = fetchMock(() => {
      throw new Error("The disabled senior-office route must not fetch.");
    });
    const app = mount({ fetchImpl });

    const response = await app.request(
      "/v1/politics/uk/enforcement/forces/metropolitan/leaders"
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.error).toBe("publication_review_needed");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns only the official senior-officer name and rank when explicitly enabled", async () => {
    const fetchImpl = fetchMock((url) => {
      expect(url.pathname).toBe("/api/forces/metropolitan/people");
      return json([
        {
          name: "Chief Constable Ada Example",
          rank: "Chief Constable",
          bio: "LEADER PRIVATE FAMILY AND HOME DETAILS",
          contact_details: {
            email: "leader.private@example.test",
            telephone: "07000 000000",
            address: "LEADER PRIVATE ADDRESS",
          },
          contact_methods: [
            { type: "twitter", url: "https://social.example.test/private-profile" },
          ],
          family: ["PRIVATE FAMILY MEMBER"],
        },
        { name: "Missing Rank", bio: "FILTERED PERSON SECRET" },
      ]);
    });
    const app = mount({ fetchImpl, enforcementLeadersEnabled: true });

    const response = await app.request(
      "/v1/politics/uk/enforcement/forces/metropolitan/leaders"
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.leaders).toEqual([
      {
        name: "Chief Constable Ada Example",
        rank: "Chief Constable",
        scope: "senior_officer_published_by_force",
        omitted: [
          "biography",
          "address",
          "email",
          "telephone",
          "mobile",
          "personal social profiles",
        ],
      },
    ]);
    expect(body.rule).toContain("No lower-rank roster or direct contact data");

    const serialized = JSON.stringify(body);
    for (const privateValue of [
      "LEADER PRIVATE FAMILY AND HOME DETAILS",
      "leader.private@example.test",
      "07000 000000",
      "LEADER PRIVATE ADDRESS",
      "private-profile",
      "PRIVATE FAMILY MEMBER",
      "Missing Rank",
      "FILTERED PERSON SECRET",
    ]) {
      expect(serialized).not.toContain(privateValue);
    }
  });
});
