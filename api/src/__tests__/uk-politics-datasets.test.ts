import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { apiCors } from "../cors.js";
import { canonicalJson, representationEtag } from "../open-data.js";
import { createUkPoliticsRoutes } from "../routes/uk-politics.js";
import { parsePublicCsv } from "../routes/uk-public-integrity.js";
import { enforcementInstitutions } from "../uk-integrity-system.js";
import {
  politicsDatasetFieldAllowlist,
  politicsDatasetAdmissionDigest,
  politicsDatasetAdmissions,
  politicsDatasetNestedFieldAllowlist,
  politicsOpenDatasets,
  isPoliticsBulkPublicationApproval,
} from "../uk-politics-datasets.js";

const approvedBulkRelease = {
  approver: "Yu",
  approvedOn: "2026-07-10",
  admissionDigest: politicsDatasetAdmissionDigest,
  confidentialIntakeUrl: "https://intake.taxsorted.io/politics",
} as const;

function mountClosed() {
  const fetchImpl = vi.fn(async () => {
    throw new Error("Static public-safe datasets must never fetch an upstream source.");
  });
  const app = new Hono();
  let sessionCalls = 0;
  app.use("*", apiCors);
  app.route(
    "/v1/politics/uk",
    createUkPoliticsRoutes({
      publicDataEnabled: false,
      electoralCommissionReuseConfirmed: false,
      electoralFinanceReviewApproved: false,
      ministerialBenefitsEnabled: false,
      enforcementLeadersEnabled: false,
      parliamentaryStaffEnabled: false,
      parliamentaryInterestsEnabled: false,
      fetchImpl,
    })
  );
  app.use("/v1/*", async (c, next) => {
    sessionCalls += 1;
    c.header("Set-Cookie", "ts_session=must-not-exist; HttpOnly");
    await next();
  });
  return { app, fetchImpl, sessionCalls: () => sessionCalls };
}

describe("UK politics open dataset catalogue", () => {
  it("is one deterministic, no-key and sessionless distribution door", async () => {
    const { app, fetchImpl, sessionCalls } = mountClosed();
    const response = await app.request("/v1/politics/uk/datasets", {
      headers: { Origin: "https://civic-app.example", Cookie: "existing=1" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-expose-headers")).toContain(
      "Content-Disposition"
    );
    expect(response.headers.get("access-control-expose-headers")).toContain(
      "X-Dataset-Version"
    );
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toContain("public");
    expect(response.headers.get("etag")).toMatch(/^"sha256-[a-f0-9]{64}"$/);
    expect(response.headers.get("last-modified")).toBeTruthy();
    expect(response.headers.get("x-dataset-id")).toBe("uk-politics-catalogue");
    expect(response.headers.get("link")).toContain(
      '</v1/politics/uk/datasets/rights>; rel="license"'
    );
    expect(sessionCalls()).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();

    expect(body.access).toMatchObject({
      authentication: "none",
      price: "free",
      cors: "*",
      formats: ["json", "csv", "ndjson"],
    });
    expect(body.datasets.length).toBeGreaterThan(15);
    const ids = body.datasets.map((dataset: { id: string }) => dataset.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id: string) => /^[a-z0-9-]+$/.test(id))).toBe(true);
    for (const dataset of body.datasets) {
      expect(dataset).toMatchObject({
        availability: "development-preview",
        authentication: "none",
        containsPersonalRecords: false,
        schemaVersion: expect.stringMatching(/^\d+\.\d+\.\d+$/),
        primaryKey: "id",
        snapshotAsOf: "2026-07-10",
        screenedOn: "2026-07-10",
        screeningStatus: "agent-screened-against-draft-checklist",
        humanApprovalStatus: "pending",
        recordCount: expect.any(Number),
        fields: expect.any(Array),
        sourceIds: expect.any(Array),
        distributions: expect.any(Array),
      });
      expect(dataset.fields[0].name).toBe("id");
      expect(dataset.distributions.map((item: { format: string }) => item.format)).toEqual([
        "json",
        "csv",
        "ndjson",
      ]);
      expect(dataset.licence.attribution).toBe("TaxSorted (taxsorted.io)");
    }
  });

  it("serves the root discovery response and a manifest alias", async () => {
    const { app } = mountClosed();
    const root = await app.request("/v1/politics/uk");
    const rootBody = await root.json();
    const catalog = await app.request("/v1/politics/uk/datasets");
    const manifest = await app.request("/v1/politics/uk/manifest");

    expect(root.status).toBe(200);
    expect(rootBody.access.authentication).toBe("none");
    expect(rootBody.start).toBe("/v1/politics/uk/datasets");
    expect(rootBody.links.publicOfficePathways).toBe(
      "/v1/politics/uk/public-office-pathways",
    );
    expect(rootBody.links.publicDecisionPathways).toBe(
      "/v1/politics/uk/public-decision-pathways",
    );
    expect(rootBody.publicOfficePathways).toEqual({
      status: "open",
      normalPublicationGates: "independent",
      emergencyStop: "politics-bulk-data-emergency-stop",
      methods: ["GET", "HEAD"],
      writes: false,
    });
    expect(rootBody.publicDecisionPathways).toEqual({
      status: "open",
      normalPublicationGates: "independent",
      emergencyStop: "politics-bulk-data-emergency-stop",
      methods: ["GET", "HEAD"],
      writes: false,
    });
    expect(root.headers.get("x-dataset-id")).toBeNull();
    expect(root.headers.get("x-record-count")).toBeNull();
    expect(root.headers.get("link")).toContain('</v1/politics/uk>; rel="canonical"');
    expect(manifest.status).toBe(200);
    expect(await manifest.text()).toBe(await catalog.text());
    expect(manifest.headers.get("etag")).toBe(catalog.headers.get("etag"));
  });

  it("makes mixed source rights machine-readable instead of implying one blanket licence", async () => {
    const { app } = mountClosed();
    const response = await app.request("/v1/politics/uk/datasets/rights");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("mixed-rights-read-before-reuse");
    expect(body.automationRule).toMatch(/Do not interpret.*every upstream field/i);
    expect(body.sourceLedger).toBe(
      "/v1/politics/uk/datasets/official-sources"
    );
    expect(response.headers.get("link")).toContain(
      '<https://creativecommons.org/licenses/by-sa/4.0/>; rel="license"'
    );
  });

  it("publishes one candid admission record per dataset before human approval", async () => {
    const { app } = mountClosed();
    const catalogue = await (await app.request("/v1/politics/uk/datasets")).json();
    const response = await app.request("/v1/politics/uk/datasets/admissions");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-dataset-id")).toBe(
      "uk-politics-admission-ledger"
    );
    expect(response.headers.get("x-record-count")).toBe(
      String(catalogue.datasets.length)
    );
    expect(body).toMatchObject({
      status: "agent-screened-human-decision-pending",
      humanOwner: "Yu",
      confidentialIntake: { status: "not-live-production-blocker" },
    });
    expect(body.records).toHaveLength(catalogue.datasets.length);
    expect(body.records).toEqual(politicsDatasetAdmissions);
    expect(body.records.map((record: { datasetId: string }) => record.datasetId).sort()).toEqual(
      catalogue.datasets.map((dataset: { id: string }) => dataset.id).sort()
    );
    for (const record of body.records) {
      expect(record).toMatchObject({
        status: "agent-screened-human-decision-pending",
        humanDecision: { status: "pending", approver: null },
        containsPersonalRecords: false,
        confidentialIntake: "not-live-production-blocker",
      });
      expect(record.publicPurpose).toEqual(expect.any(String));
      expect(record.foreseeableRisks.length).toBeGreaterThan(0);
      expect(record.mitigations.length).toBeGreaterThan(2);
      expect(record.minimisation.topLevelFields[0]).toBe("id");
      expect(record.rightsDecision).toMatch(/Unresolved upstream replication rights/);
    }

    const head = await app.request("/v1/politics/uk/datasets/admissions", {
      method: "HEAD",
    });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toBe(response.headers.get("etag"));
  });

  it("opens coherently only when approval matches this ledger and a confidential intake", async () => {
    const app = new Hono();
    app.route(
      "/v1/politics/uk",
      createUkPoliticsRoutes({
        bulkDataEnabled: true,
        bulkDataApproval: approvedBulkRelease,
        publicDataEnabled: false,
      })
    );

    const catalogue = await (await app.request("/v1/politics/uk/datasets")).json();
    const admissions = await (
      await app.request("/v1/politics/uk/datasets/admissions")
    ).json();
    const detail = await (
      await app.request("/v1/politics/uk/datasets/enforcement-governance")
    ).json();

    expect(catalogue.publication).toMatchObject({
      status: "open",
      humanApproval: {
        status: "approved",
        approver: "Yu",
        approvedOn: "2026-07-10",
        admissionDigest: politicsDatasetAdmissionDigest,
      },
      confidentialIntake: {
        status: "live",
        url: approvedBulkRelease.confidentialIntakeUrl,
      },
    });
    expect(catalogue.admissionDigest).toBe(politicsDatasetAdmissionDigest);
    expect(catalogue.datasets.every(
      (dataset: { availability: string; humanApprovalStatus: string }) =>
        dataset.availability === "open" &&
        dataset.humanApprovalStatus === "approved"
    )).toBe(true);
    expect(admissions).toMatchObject({
      status: "human-approved",
      admissionDigest: politicsDatasetAdmissionDigest,
      confidentialIntake: {
        status: "live",
        url: approvedBulkRelease.confidentialIntakeUrl,
      },
    });
    expect(admissions.records.every(
      (record: { status: string; humanDecision: { status: string } }) =>
        record.status === "human-approved" &&
        record.humanDecision.status === "approved"
    )).toBe(true);
    expect(detail.dataset).toMatchObject({
      availability: "open",
      humanApprovalStatus: "approved",
    });

    const disabledApp = new Hono();
    disabledApp.route(
      "/v1/politics/uk",
      createUkPoliticsRoutes({
        bulkDataEnabled: false,
        bulkDataApproval: approvedBulkRelease,
        publicDataEnabled: false,
      })
    );
    const disabledCatalogue = await (
      await disabledApp.request("/v1/politics/uk/datasets")
    ).json();
    const disabledAdmissions = await (
      await disabledApp.request("/v1/politics/uk/datasets/admissions")
    ).json();
    const disabledDetail = await disabledApp.request(
      "/v1/politics/uk/datasets/enforcement-governance"
    );
    expect(disabledCatalogue.publication.status).toBe("approved-disabled");
    expect(disabledAdmissions.status).toBe("human-approved");
    expect(disabledDetail.status).toBe(503);
    expect((await disabledDetail.json()).error).toBe(
      "bulk_data_publication_disabled"
    );
  });

  it("rejects stale, premature or non-confidential publication approvals", () => {
    expect(isPoliticsBulkPublicationApproval(approvedBulkRelease)).toBe(true);
    expect(
      isPoliticsBulkPublicationApproval({
        ...approvedBulkRelease,
        admissionDigest: "sha256-stale",
      })
    ).toBe(false);
    expect(
      isPoliticsBulkPublicationApproval({
        ...approvedBulkRelease,
        approvedOn: "2026-07-09",
      })
    ).toBe(false);
    expect(
      isPoliticsBulkPublicationApproval({
        ...approvedBulkRelease,
        approvedOn: "9999-12-31",
      })
    ).toBe(false);
    expect(
      isPoliticsBulkPublicationApproval({
        ...approvedBulkRelease,
        approvedOn: "2026-11-31",
      })
    ).toBe(false);
    expect(
      isPoliticsBulkPublicationApproval({
        ...approvedBulkRelease,
        confidentialIntakeUrl: "http://intake.taxsorted.io/politics",
      })
    ).toBe(false);
  });

  it("makes field-shape changes an explicit screened contract change", async () => {
    const { app } = mountClosed();
    const catalogue = await (await app.request("/v1/politics/uk/datasets")).json();
    const contract = catalogue.datasets.map(
      (dataset: { id: string; schemaVersion: string; fields: unknown[] }) => ({
        id: dataset.id,
        schemaVersion: dataset.schemaVersion,
        fields: dataset.fields,
      })
    );

    // If this changes, review optional/required, nullable and type changes for
    // every affected field and bump the relevant schema version before
    // deliberately accepting the new checksum.
    expect(representationEtag(canonicalJson(contract))).toBe(
      '"sha256-76411ec7c00076b8cd53129442bc545f7b7793943fee0e1a0252d44b5a13ff1d"'
    );
  });
});

describe("UK politics dataset representations", () => {
  it("keeps JSON, CSV and NDJSON complete, deterministic and schema-aligned", async () => {
    const { app } = mountClosed();
    const root = "/v1/politics/uk/datasets/enforcement-institutions";
    const detailResponse = await app.request(root);
    const detail = await detailResponse.json();
    const jsonResponse = await app.request(`${root}/download?format=json`);
    const jsonBody = await jsonResponse.json();
    const csvResponse = await app.request(`${root}/download?format=csv`);
    const csvBody = await csvResponse.text();
    const ndjsonResponse = await app.request(`${root}/download?format=ndjson`);
    const ndjsonBody = await ndjsonResponse.text();

    expect(detailResponse.status).toBe(200);
    expect(jsonBody.data).toEqual(detail.data);
    expect(detail.dataset.recordCount).toBe(detail.data.length);
    expect(detail.dataset.fields.map((field: { name: string }) => field.name)).toEqual(
      parsePublicCsv(csvBody)[0]
    );
    expect(parsePublicCsv(csvBody).length - 1).toBe(detail.data.length);
    const ndjsonRecords = ndjsonBody
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(ndjsonRecords).toEqual(detail.data);
    expect(ndjsonBody.endsWith("\n")).toBe(true);

    expect(jsonResponse.headers.get("content-type")).toContain("application/json");
    expect(csvResponse.headers.get("content-type")).toContain("text/csv");
    expect(ndjsonResponse.headers.get("content-type")).toContain(
      "application/x-ndjson"
    );
    expect(csvResponse.headers.get("content-disposition")).toContain(
      'filename="taxsorted-uk-enforcement-institutions-v1.csv"'
    );
    expect(ndjsonResponse.headers.get("x-record-count")).toBe(String(detail.data.length));
    expect(ndjsonResponse.headers.get("x-checksum-sha256")).toMatch(/^[a-f0-9]{64}$/);

    const jsonEtag = jsonResponse.headers.get("etag")!;
    const csvEtag = csvResponse.headers.get("etag")!;
    const ndjsonEtag = ndjsonResponse.headers.get("etag")!;
    expect(new Set([jsonEtag, csvEtag, ndjsonEtag]).size).toBe(3);
    const repeated = await app.request(`${root}/download?format=csv`);
    expect(await repeated.text()).toBe(csvBody);
    expect(repeated.headers.get("etag")).toBe(csvEtag);
  });

  it("supports HEAD and representation-specific conditional requests", async () => {
    const { app } = mountClosed();
    const root = "/v1/politics/uk/datasets/enforcement-governance/download";
    const csv = await app.request(`${root}?format=csv`);
    const csvEtag = csv.headers.get("etag")!;
    const json = await app.request(`${root}?format=json`);
    const jsonEtag = json.headers.get("etag")!;

    const head = await app.request(`${root}?format=csv`, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toBe(csvEtag);
    expect(head.headers.get("content-disposition")).toBe(
      csv.headers.get("content-disposition")
    );

    const notModified = await app.request(`${root}?format=csv`, {
      headers: { "If-None-Match": `"elsewhere", W/${csvEtag}` },
    });
    expect(notModified.status).toBe(304);
    expect(await notModified.text()).toBe("");
    expect(notModified.headers.get("etag")).toBe(csvEtag);

    const wildcard = await app.request(`${root}?format=json`, {
      headers: { "If-None-Match": "*" },
    });
    expect(wildcard.status).toBe(304);

    const wrongRepresentation = await app.request(`${root}?format=json`, {
      headers: { "If-None-Match": csvEtag },
    });
    expect(wrongRepresentation.status).toBe(200);
    expect(wrongRepresentation.headers.get("etag")).toBe(jsonEtag);
  });

  it("publishes resolvable common and dataset-specific JSON Schemas", async () => {
    const { app } = mountClosed();
    const common = await app.request("/v1/politics/uk/datasets/schema");
    const specific = await app.request(
      "/v1/politics/uk/datasets/police-pay-ranges-england-wales/schema"
    );
    const specificBody = await specific.json();

    expect(common.status).toBe(200);
    expect(common.headers.get("content-type")).toContain("application/schema+json");
    expect(common.headers.get("x-dataset-id")).toBeNull();
    expect(common.headers.get("x-record-count")).toBeNull();
    expect(common.headers.get("link")).toContain(
      '</v1/politics/uk/datasets/schema>; rel="canonical"'
    );
    expect(specific.status).toBe(200);
    expect(specificBody.required).toContain("id");
    expect(specificBody.required).toContain("minimumMinor");
    expect(specificBody.properties.minimumMinor.type).toBe("integer");
    expect(specificBody.additionalProperties).toBe(true);
    expect(specific.headers.get("link")).not.toContain(
      `/police-pay-ranges-england-wales/schema>; rel="describedby"`
    );
  });
});

describe("UK politics bulk safety and errors", () => {
  it("rejects invalid formats and unknown IDs before applying validators", async () => {
    const { app } = mountClosed();
    const root = "/v1/politics/uk/datasets/enforcement-institutions/download";
    for (const suffix of [
      "",
      "?format=",
      "?format=xml",
      "?format=CSV",
      "?format=json&format=csv",
      "?format=json&extra=1",
    ]) {
      const response = await app.request(`${root}${suffix}`, {
        headers: { "If-None-Match": "*" },
      });
      expect(response.status, suffix).toBe(400);
      expect(response.headers.get("cache-control"), suffix).toBe("no-store");
      expect(response.headers.get("etag"), suffix).toBeNull();
      expect((await response.json()).error, suffix).toBe("invalid_format");
    }

    for (const path of [
      "/v1/politics/uk/datasets/not-real",
      "/v1/politics/uk/datasets/not-real/download?format=json",
    ]) {
      const response = await app.request(path, { headers: { "If-None-Match": "*" } });
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect((await response.json()).error).toBe("dataset_not_found");
    }
  });

  it("provides no bulk alias for a named or live event dataset", async () => {
    const { app, fetchImpl } = mountClosed();
    for (const id of [
      "people",
      "current-members",
      "political-donations",
      "ministerial-benefits",
      "police-leaders",
      "registered-interests",
      "parliamentary-staff",
      "public-contract-awards",
    ]) {
      const response = await app.request(`/v1/politics/uk/datasets/${id}`);
      expect(response.status, id).toBe(404);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("contains no private, named-person or operational fields", async () => {
    const { app } = mountClosed();
    const catalogue = await (await app.request("/v1/politics/uk/datasets")).json();
    const forbidden = new Set([
      "email",
      "phone",
      "telephone",
      "mobile",
      "address",
      "postcode",
      "birthDate",
      "dateOfBirth",
      "holderName",
      "fullName",
      "officerName",
      "officers",
      "minister",
      "ministerName",
      "memberId",
      "donorName",
      "counterpartyAsPublished",
      "staff",
      "leaders",
      "biography",
      "family",
      "contactEmail",
      "residentialLocation",
      "person",
    ]);
    const walk = (value: unknown): string[] => {
      if (Array.isArray(value)) return value.flatMap(walk);
      if (!value || typeof value !== "object") return [];
      return Object.entries(value).flatMap(([key, nested]) => [
        ...(forbidden.has(key) ? [key] : []),
        ...walk(nested),
      ]);
    };

    for (const dataset of catalogue.datasets) {
      const body = await (
        await app.request(`/v1/politics/uk/datasets/${dataset.id}`)
      ).json();
      expect(walk(body.data), dataset.id).toEqual([]);
      const ids = body.data.map((record: { id: unknown }) => record.id);
      expect(ids.every((id: unknown) => typeof id === "string" && id.length > 0), dataset.id).toBe(true);
      expect(new Set(ids).size, dataset.id).toBe(ids.length);
      const allowed = new Set(politicsDatasetFieldAllowlist[dataset.id]);
      expect(allowed.size, dataset.id).toBe(dataset.fields.length);
      for (const record of body.data) {
        expect(
          Object.keys(record).filter((field) => !allowed.has(field)),
          dataset.id
        ).toEqual([]);
      }

      const nestedPaths = new Set<string>();
      const walkNested = (value: unknown, prefix: string): void => {
        if (Array.isArray(value)) {
          for (const item of value) walkNested(item, prefix);
          return;
        }
        if (!value || typeof value !== "object") return;
        for (const [key, nested] of Object.entries(value)) {
          const path = `${prefix}.${key}`;
          nestedPaths.add(path);
          walkNested(nested, path);
        }
      };
      for (const record of body.data as Array<Record<string, unknown>>) {
        for (const [field, value] of Object.entries(record)) {
          walkNested(value, field);
        }
      }
      expect([...nestedPaths].sort(), dataset.id).toEqual(
        [...politicsDatasetNestedFieldAllowlist[dataset.id]].sort()
      );
    }
    expect(Object.keys(politicsDatasetFieldAllowlist).sort()).toEqual(
      catalogue.datasets.map((dataset: { id: string }) => dataset.id).sort()
    );
    expect(Object.keys(politicsDatasetNestedFieldAllowlist).sort()).toEqual(
      catalogue.datasets.map((dataset: { id: string }) => dataset.id).sort()
    );

    const sourceInstitution = enforcementInstitutions.find(
      (record) => record.id === "ew-territorial-police"
    );
    const exportedInstitution = politicsOpenDatasets
      .find((dataset) => dataset.id === "enforcement-institutions")
      ?.records.find((record) => record.id === "ew-territorial-police");
    expect(exportedInstitution?.officialContact).toEqual(
      sourceInstitution?.officialContact
    );
    expect(exportedInstitution?.officialContact).not.toBe(
      sourceInstitution?.officialContact
    );
  });

  it("uses durable IDs for ordered and source-map records", async () => {
    const { app } = mountClosed();
    const ranks = await (
      await app.request("/v1/politics/uk/datasets/police-ranks")
    ).json();
    const funding = await (
      await app.request("/v1/politics/uk/datasets/enforcement-funding-sources")
    ).json();
    const vacancies = await (
      await app.request("/v1/politics/uk/datasets/enforcement-vacancy-links")
    ).json();

    expect(ranks.data[0].id).not.toMatch(/:\d+:/);
    expect(funding.data.map((record: { id: string }) => record.id)).toContain(
      "police-grants-england-wales-2026-27"
    );
    expect(vacancies.data.map((record: { id: string }) => record.id)).toContain(
      "nca-careers"
    );

    const authoredMethod = await (
      await app.request(
        "/v1/politics/uk/datasets/observable-official-language-method"
      )
    ).json();
    expect(authoredMethod.dataset.schemaVersion).toBe("2.0.0");
    expect(authoredMethod.data[0].authorship).toMatch(/TaxSorted-authored/);
  });

  it("stays open when every named-person route is closed", async () => {
    const { app, fetchImpl } = mountClosed();
    for (const path of [
      "/v1/politics/uk/datasets",
      "/v1/politics/uk/datasets/enforcement-institutions",
      "/v1/politics/uk/datasets/enforcement-institutions/download?format=json",
      "/v1/politics/uk/datasets/enforcement-institutions/download?format=csv",
      "/v1/politics/uk/datasets/enforcement-institutions/download?format=ndjson",
    ]) {
      const response = await app.request(path);
      expect(response.status, path).toBe(200);
    }
    const people = await app.request("/v1/politics/uk/people");
    const benefits = await app.request(
      "/v1/politics/uk/relationships/ministerial-benefits?month=2026-05&department=Home%20Office"
    );
    const leaders = await app.request(
      "/v1/politics/uk/enforcement/forces/metropolitan/leaders"
    );
    expect(people.status).toBe(503);
    expect(benefits.status).toBe(503);
    expect(leaders.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("has an independent emergency stop for a misclassified bulk dataset", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("The bulk emergency stop must not fetch.");
    });
    const app = new Hono();
    app.use("*", apiCors);
    app.route(
      "/v1/politics/uk",
      createUkPoliticsRoutes({
        bulkDataEmergencyStop: true,
        publicDataEnabled: false,
        fetchImpl,
      })
    );

    const catalogue = await app.request("/v1/politics/uk/datasets");
    const catalogueBody = await catalogue.json();
    expect(catalogue.status).toBe(200);
    expect(catalogueBody.access.bulkDownloads).toBe(false);
    expect(catalogueBody.publication.bulkDataAvailable).toBe(false);
    expect(
      catalogueBody.datasets.every(
        (dataset: { availability: string }) =>
          dataset.availability === "emergency-stopped"
      )
    ).toBe(true);

    for (const path of [
      "/v1/politics/uk",
      "/v1/politics/uk/datasets/schema",
      "/v1/politics/uk/datasets/rights",
      "/v1/politics/uk/datasets/admissions",
      "/v1/politics/uk/datasets/enforcement-institutions/schema",
      "/v1/politics/uk/integrity/corrections",
    ]) {
      expect((await app.request(path)).status, path).toBe(200);
    }

    for (const path of [
      "/v1/politics/uk/datasets/enforcement-institutions",
      "/v1/politics/uk/datasets/enforcement-institutions/download?format=json",
      "/v1/politics/uk/system",
      "/v1/politics/uk/enforcement/institutions",
      "/v1/politics/uk/power/offices",
    ]) {
      const response = await app.request(path);
      expect(response.status, path).toBe(503);
      expect(response.headers.get("cache-control"), path).toBe("no-store");
      expect((await response.json()).error, path).toBe(
        "bulk_data_emergency_stop"
      );
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("requires an explicit production-style publication decision", async () => {
    const app = new Hono();
    app.route(
      "/v1/politics/uk",
      createUkPoliticsRoutes({
        bulkDataEnabled: false,
        bulkDataEmergencyStop: false,
        publicDataEnabled: false,
      })
    );

    const catalogue = await app.request("/v1/politics/uk/datasets");
    const body = await catalogue.json();
    expect(catalogue.status).toBe(200);
    expect(body.publication.status).toBe("publication-review");
    expect(body.datasets[0].availability).toBe("publication-review");

    const detail = await app.request(
      "/v1/politics/uk/datasets/enforcement-institutions"
    );
    expect(detail.status).toBe(503);
    expect((await detail.json()).error).toBe(
      "bulk_data_publication_review_needed"
    );
  });
});
