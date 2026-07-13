import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { apiCors } from "../cors.js";
import { politicsDatasetAdmissionDigest } from "../uk-politics-datasets.js";
import {
  buildReleaseLedger,
  createReleaseDiscoveryRoutes,
} from "../routes/release-discovery.js";
import { createOpenDataRoutes } from "../routes/open-data.js";
import { releaseCheckpointSchema } from "../release-discovery-contract.js";

const openOptions = {
  taxSystemPublic: true,
  taxIndustryPublic: true,
  charitiesPublic: true,
  publicFundingPublic: true,
  politicsBulkDataAvailable: false,
};

function mount() {
  const app = new Hono();
  app.use("*", apiCors);
  app.route(
    "/v1/open-data/releases",
    createReleaseDiscoveryRoutes(openOptions),
  );
  return app;
}

describe("uniform public release discovery", () => {
  it("rejects fields and identifiers that would permanently poison the prefix", () => {
    const checkpoint = buildReleaseLedger(openOptions).checkpoints[0];
    for (const candidate of [
      { ...checkpoint, publishedAt: "2026-07-11T12:34:56Z" },
      { ...checkpoint, id: "" },
      { ...checkpoint, id: `${checkpoint.id}-other` },
      {
        ...checkpoint,
        title: `${checkpoint.title}\u0001`,
      },
      {
        ...checkpoint,
        links: { ...checkpoint.links, currentGraph: "/v1/wrong/graph" },
      },
      {
        ...checkpoint,
        links: {
          ...checkpoint.links,
          immutableSnapshot: "/v1/invented/archive.json",
        },
      },
      {
        ...checkpoint,
        links: { ...checkpoint.links, inventedArchive: "/not-real" },
      },
    ]) {
      expect(releaseCheckpointSchema.safeParse(candidate).success).toBe(false);
    }
  });

  it("publishes exact current checkpoints without claiming record history", async () => {
    const response = await mount().request("/v1/open-data/releases", {
      headers: { Origin: "https://builder.example" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("etag")).toMatch(/^"sha256-[a-f0-9]{64}"$/);
    expect(response.headers.get("link")).toContain(
      '</v1/open-data/releases/feed.json>; rel="alternate"; type="application/feed+json"',
    );
    expect(body.schema).toBe("taxsorted.open-data-release-ledger/1");
    expect(body.semantics.mode).toBe("baseline-and-forward-checkpoints");
    expect(body.semantics.recordHistory).toContain("no retrospective");
    expect(body.semantics.archiveAvailability).toContain(
      "No immutable snapshot archive exists",
    );
    expect(body.checkpoints).toHaveLength(6);
    expect(
      body.checkpoints.every(
        (checkpoint: { links: { immutableSnapshot: unknown } }) =>
          checkpoint.links.immutableSnapshot === null,
      ),
    ).toBe(true);

    expect(
      Object.fromEntries(
        body.checkpoints.map((checkpoint: Record<string, unknown>) => [
          checkpoint.datasetId,
          checkpoint,
        ]),
      ),
    ).toMatchObject({
      "uk-tax-system": {
        kind: "baseline-checkpoint",
        version: "2026-07-10.2",
        observedPublicOn: "2026-07-11",
        recordChangeClaims: "none",
        digest:
          "sha256:400bbe40cad2cfad3a755cb248263822e53d633c22ceb42f2f7d4b84ecd0cb99",
      },
      "uk-tax-industry": {
        version: "2026-07-10.2",
        digest:
          "sha256:df9dd5d816db517b240e19f5040fe9392f18b972979d4fda9a07f5e53fabc959",
      },
      "uk-charities-sector": {
        version: "2026-07-13.1",
        digest:
          "sha256:427485ac6a67214c125a0ad4348dc543e566a4a2b669330fc13ba0900fb447ac",
      },
      "uk-public-funding": {
        version: "2026-07-10.1",
        digest:
          "sha256:8100d03e8d1d095ea2d3eea1cd237424d3b0bf11e13901018fdd52f55ec0d801",
      },
    });

    expect(JSON.stringify(body)).not.toMatch(
      /recordCreated|recordUpdated|recordDeleted|publishedAt/,
    );
    expect(
      body.currentPublication
        .filter((dataset: { publicationStatus: string }) =>
          dataset.publicationStatus === "open",
        )
        .map((dataset: { datasetId: string }) => dataset.datasetId)
        .sort(),
    ).toEqual([
      "uk-charities-sector",
      "uk-public-funding",
      "uk-tax-industry",
      "uk-tax-system",
    ]);
  });

  it("generates JSON Feed and Atom from those same checkpoints", async () => {
    const app = mount();
    const ledger = await (await app.request("/v1/open-data/releases")).json();
    const jsonResponse = await app.request(
      "/v1/open-data/releases/feed.json",
    );
    const jsonFeed = await jsonResponse.json();
    const atomResponse = await app.request(
      "/v1/open-data/releases/feed.atom",
    );
    const atom = await atomResponse.text();

    expect(jsonResponse.headers.get("content-type")).toBe(
      "application/feed+json; charset=utf-8",
    );
    expect(jsonFeed.version).toBe("https://jsonfeed.org/version/1.1");
    expect(jsonFeed.items.map((item: { id: string }) => item.id).sort()).toEqual(
      ledger.checkpoints.map((checkpoint: { id: string }) => checkpoint.id).sort(),
    );
    for (const item of jsonFeed.items) {
      expect(item).not.toHaveProperty("date_published");
      expect(item).not.toHaveProperty("date_modified");
      expect(item._taxsorted.recordChangeClaims).toBe("none");
      expect(item.content_text).toContain("no record-level creation");
      expect(item.attachments[0].title).toContain("Mutable current graph route");
      expect(item.attachments[0]._taxsorted_expected_digest).toBe(
        item._taxsorted.digest,
      );
    }

    expect(atomResponse.headers.get("content-type")).toBe(
      "application/atom+xml; charset=utf-8",
    );
    expect(atom.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(
      true,
    );
    expect(atom.match(/<entry>/g)).toHaveLength(ledger.checkpoints.length);
    expect(atom).toContain("day-normalised to 00:00:00Z");
    expect(atom).toContain("not exact publication times");
    expect(atom).toContain("No retrospective record events are asserted");
    for (const checkpoint of ledger.checkpoints) {
      expect(atom).toContain(`<id>${checkpoint.id}</id>`);
      expect(atom).toContain(checkpoint.digest);
    }
  });

  it("uses representation-specific validators for GET and HEAD", async () => {
    const app = mount();
    const paths = [
      "/v1/open-data/releases",
      "/v1/open-data/releases/feed.json",
      "/v1/open-data/releases/feed.atom",
    ];
    const etags = new Set<string>();

    for (const path of paths) {
      const first = await app.request(path);
      const etag = first.headers.get("etag")!;
      etags.add(etag);

      const head = await app.request(path, { method: "HEAD" });
      expect(head.status, path).toBe(200);
      expect(await head.text(), path).toBe("");
      expect(head.headers.get("etag"), path).toBe(etag);

      const unchanged = await app.request(path, {
        headers: { "If-None-Match": `W/${etag}` },
      });
      expect(unchanged.status, path).toBe(304);
      expect(await unchanged.text(), path).toBe("");
      expect(unchanged.headers.get("etag"), path).toBe(etag);
    }

    expect(etags.size).toBe(paths.length);
  });

  it("mounts before the central catalogue's deliberate catch-all", async () => {
    const app = new Hono();
    app.route(
      "/v1/open-data/releases",
      createReleaseDiscoveryRoutes(openOptions),
    );
    app.route("/v1/open-data", createOpenDataRoutes(openOptions));

    expect((await app.request("/v1/open-data/releases")).status).toBe(200);
    expect((await app.request("/v1/open-data")).status).toBe(200);
  });

  it("rejects query invention and non-read methods", async () => {
    const app = mount();
    const query = await app.request(
      "/v1/open-data/releases/feed.json?after=invented",
    );
    expect(query.status).toBe(400);
    expect(query.headers.get("cache-control")).toBe("no-store");
    expect(query.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(await query.json()).toMatchObject({
      type: "https://api.taxsorted.io/problems/unknown_query_parameter",
      status: 400,
      instance: "/v1/open-data/releases/feed.json",
      error: "unknown_query_parameter",
      parameters: ["after"],
    });

    const write = await app.request("/v1/open-data/releases", {
      method: "POST",
    });
    expect(write.status).toBe(405);
    expect(write.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
    expect(write.headers.get("cache-control")).toBe("no-store");
  });

  it("retains declared baselines while showing a current emergency stop", () => {
    const ledger = buildReleaseLedger({
      ...openOptions,
      charitiesEmergencyStop: true,
    });
    expect(ledger.checkpoints).toHaveLength(6);
    expect(
      ledger.currentPublication.find(
        (dataset) => dataset.datasetId === "uk-charities-sector",
      ),
    ).toMatchObject({
      publicationStatus: "emergency-stopped",
      fullDatasetAvailable: false,
      latestDeclaredCheckpointId:
        "urn:taxsorted:release-checkpoint:uk-charities-sector:2026-07-13.1",
    });
  });

  it("refuses to omit a newly open family without an exact checkpoint", () => {
    expect(() =>
      buildReleaseLedger({
        ...openOptions,
        politicsBulkDataAvailable: true,
        politicsBulkDataApproval: {
          approver: "Release test reviewer",
          approvedOn: "2026-07-10",
          admissionDigest: politicsDatasetAdmissionDigest,
          confidentialIntakeUrl: "https://confidential.example/report",
        },
      }),
    ).toThrow(
      /Open dataset uk-politics-public-integrity 1\.0\.0 has no declared current release checkpoint/,
    );
  });
});
