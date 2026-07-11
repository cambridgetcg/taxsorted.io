// One honest release ledger for TaxSorted's public datasets. The first four
// entries establish current public baselines; they are not reconstructed
// record-change events. Future releases append to release-checkpoints.json.

import { Hono, type Context } from "hono";
import {
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
} from "../open-data.js";
import { ukCharities } from "../uk-charities.js";
import { ukPublicFunding } from "../uk-public-funding.js";
import { ukTaxIndustry } from "../uk-tax-industry.js";
import { ukTaxSystem } from "../uk-tax-system.js";
import {
  buildOpenDataCatalog,
  type OpenDataRouteOptions,
} from "./open-data.js";
import { problemDetails } from "../problem-details.js";
import {
  releaseAtomFeedPath,
  releaseCheckpointLedgerSchema,
  releaseJsonFeedPath,
  releaseLedgerPath,
} from "../release-discovery-contract.js";
import checkpointData from "../release-checkpoints.json" with { type: "json" };

export {
  releaseAtomFeedPath,
  releaseJsonFeedPath,
  releaseLedgerPath,
} from "../release-discovery-contract.js";

const apiOrigin = "https://api.taxsorted.io";
const humanOrigin = "https://taxsorted.io";
const rightsPath = "/v1/open-data/rights";
const checkpointDigestScope =
  "SHA-256 of the exact UTF-8 TaxSorted deterministic JSON returned by the dataset graph route.";

// This JSON file is the deployment-checked append-only source of truth.
const releaseCheckpointDeclarations = Object.freeze(
  releaseCheckpointLedgerSchema.parse(checkpointData).map((checkpoint) =>
    Object.freeze({
      ...checkpoint,
      links: Object.freeze({ ...checkpoint.links }),
    }),
  ),
);

const currentGraphSources: Record<string, unknown> = {
  "uk-tax-system": ukTaxSystem,
  "uk-tax-industry": ukTaxIndustry,
  "uk-charities-sector": ukCharities,
  "uk-public-funding": ukPublicFunding,
};

function sha256Digest(value: unknown) {
  const etag = representationEtag(canonicalJson(value));
  const match = /^"sha256-([a-f0-9]{64})"$/.exec(etag);
  if (!match) {
    throw new TypeError(
      "TaxSorted representation ETag is not a SHA-256 validator",
    );
  }
  return `sha256:${match[1]}`;
}

function latestCheckpoint(datasetId: string) {
  for (
    let index = releaseCheckpointDeclarations.length - 1;
    index >= 0;
    index--
  ) {
    const checkpoint = releaseCheckpointDeclarations[index];
    if (checkpoint.datasetId === datasetId) return checkpoint;
  }
  return undefined;
}

function assertCheckpointDeclarations() {
  const ids = new Set<string>();
  const versions = new Set<string>();
  const seenDatasets = new Set<string>();
  let previousObservation = "0000-00-00";

  for (const checkpoint of releaseCheckpointDeclarations) {
    if (checkpoint.evidenceReviewedOn > checkpoint.observedPublicOn) {
      throw new TypeError(
        `Release checkpoint ${checkpoint.id} was observed before its evidence review`,
      );
    }
    const expectedKind = seenDatasets.has(checkpoint.datasetId)
      ? "release-checkpoint"
      : "baseline-checkpoint";
    if (checkpoint.kind !== expectedKind) {
      throw new TypeError(
        `Release checkpoint ${checkpoint.id} must be a ${expectedKind}`,
      );
    }
    seenDatasets.add(checkpoint.datasetId);
    if (ids.has(checkpoint.id)) {
      throw new TypeError(`Duplicate release checkpoint ID: ${checkpoint.id}`);
    }
    ids.add(checkpoint.id);

    const versionKey = `${checkpoint.datasetId}\u0000${checkpoint.version}`;
    if (versions.has(versionKey)) {
      throw new TypeError(
        `Duplicate release checkpoint version: ${checkpoint.datasetId} ${checkpoint.version}`,
      );
    }
    versions.add(versionKey);

    if (checkpoint.observedPublicOn < previousObservation) {
      throw new TypeError("Release checkpoints must be ordered by observation day");
    }
    previousObservation = checkpoint.observedPublicOn;
  }
}

function currentPublicationRows(
  catalog: ReturnType<typeof buildOpenDataCatalog>,
) {
  return catalog.datasets
    .map((dataset) => {
      const checkpoint = latestCheckpoint(dataset.id);
      return {
        datasetId: dataset.id,
        title: dataset.title,
        currentVersion: dataset.version,
        publicationStatus: dataset.publication.status,
        fullDatasetAvailable: dataset.publication.fullDatasetAvailable,
        latestDeclaredCheckpointId:
          checkpoint?.version === dataset.version ? checkpoint.id : null,
      };
    })
    .sort((left, right) =>
      left.datasetId < right.datasetId
        ? -1
        : left.datasetId > right.datasetId
          ? 1
          : 0,
    );
}

function assertEveryOpenDatasetHasCurrentCheckpoint(
  catalog: ReturnType<typeof buildOpenDataCatalog>,
) {
  for (const dataset of catalog.datasets) {
    if (dataset.publication.status !== "open") continue;

    const checkpoint = latestCheckpoint(dataset.id);
    if (!checkpoint || checkpoint.version !== dataset.version) {
      throw new TypeError(
        `Open dataset ${dataset.id} ${dataset.version} has no declared current release checkpoint`,
      );
    }
    if (
      checkpoint.title !== dataset.title ||
      checkpoint.evidenceReviewedOn !== dataset.reviewedOn ||
      checkpoint.links.manifest !== dataset.resources.manifest ||
      checkpoint.links.currentGraph !== dataset.resources.fullGraph ||
      checkpoint.links.schema !== dataset.resources.schema ||
      checkpoint.links.exports !== dataset.resources.exports
    ) {
      throw new TypeError(
        `Open dataset ${dataset.id} metadata does not match its declared checkpoint`,
      );
    }

    const graph = currentGraphSources[dataset.id];
    if (graph === undefined) {
      throw new TypeError(
        `Open dataset ${dataset.id} has no exact graph source for checkpoint verification`,
      );
    }
    const digest = sha256Digest(graph);
    if (digest !== checkpoint.digest) {
      throw new TypeError(
        `Open dataset ${dataset.id} ${dataset.version} no longer matches its declared checkpoint digest`,
      );
    }
  }
}

export function buildReleaseLedger(options: OpenDataRouteOptions = {}) {
  assertCheckpointDeclarations();
  const catalog = buildOpenDataCatalog(options);
  assertEveryOpenDatasetHasCurrentCheckpoint(catalog);

  return {
    schema: "taxsorted.open-data-release-ledger/1",
    title: "TaxSorted public dataset release checkpoints",
    semantics: {
      mode: "baseline-and-forward-checkpoints",
      firstEntries:
        "The first entry for each dataset establishes the public snapshot observed on that day. It is not a claim that every record was added or changed then.",
      futureRule:
        "A future public dataset version must append a checkpoint with its real version and exact graph digest. Existing checkpoints are not rewritten.",
      recordHistory:
        "This ledger contains dataset-release checkpoints only. It contains no retrospective record-created, record-updated or record-deleted events.",
      timePrecision:
        "Observation and evidence-review values have day precision. Atom requires a date-time, so its updated values use 00:00:00Z on the stated day; that is not an exact publication time.",
      openCoverage:
        "Every dataset whose central catalogue status is exactly open must have a current declared checkpoint or this route refuses to start.",
      archiveAvailability:
        "No immutable snapshot archive exists yet. links.currentGraph is mutable; accept its bytes for a checkpoint only when their digest matches. links.immutableSnapshot stays null until a real immutable representation is published.",
      digestScope: checkpointDigestScope,
    },
    currentPublication: currentPublicationRows(catalog),
    checkpoints: releaseCheckpointDeclarations,
    representations: {
      canonicalLedger: releaseLedgerPath,
      jsonFeed: releaseJsonFeedPath,
      atom: releaseAtomFeedPath,
    },
  } as const;
}

function absoluteUrl(path: string) {
  return path.startsWith("http://") || path.startsWith("https://")
    ? path
    : `${apiOrigin}${path}`;
}

function checkpointSummary(
  checkpoint: ReturnType<typeof buildReleaseLedger>["checkpoints"][number],
) {
  return `${checkpoint.title}, version ${checkpoint.version}, has a ${checkpoint.kind} observed on ${checkpoint.observedPublicOn}. Its graph digest is ${checkpoint.digest}. This checkpoint asserts no record-level creation, update or deletion history. No immutable snapshot is archived; verify the mutable current graph route against the digest.`;
}

export function buildReleaseJsonFeed(
  ledger: ReturnType<typeof buildReleaseLedger>,
) {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: ledger.title,
    home_page_url: humanOrigin,
    feed_url: absoluteUrl(releaseJsonFeedPath),
    description:
      "Dataset-release baselines and forward checkpoints. No retrospective record events are asserted.",
    items: [...ledger.checkpoints].reverse().map((checkpoint) => ({
      id: checkpoint.id,
      url: absoluteUrl(checkpoint.links.manifest),
      title: `${checkpoint.title} — ${checkpoint.version}`,
      content_text: checkpointSummary(checkpoint),
      attachments: [
        {
          url: absoluteUrl(checkpoint.links.currentGraph),
          mime_type: "application/json",
          title:
            "Mutable current graph route; accept only when its digest matches this checkpoint",
          _taxsorted_expected_digest: checkpoint.digest,
        },
      ],
      _taxsorted: checkpoint,
    })),
    _taxsorted: {
      schema: ledger.schema,
      canonical_ledger_url: absoluteUrl(releaseLedgerPath),
      semantics: ledger.semantics,
    },
  } as const;
}

function xmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function xmlAttribute(value: string) {
  return xmlText(value).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function dayAsAtomDateTime(day: string) {
  return `${day}T00:00:00Z`;
}

export function serializeReleaseAtomFeed(
  ledger: ReturnType<typeof buildReleaseLedger>,
) {
  const updated = dayAsAtomDateTime(
    ledger.checkpoints.reduce(
      (latest, checkpoint) =>
        checkpoint.observedPublicOn > latest
          ? checkpoint.observedPublicOn
          : latest,
      "0000-00-00",
    ),
  );
  const entries = [...ledger.checkpoints]
    .reverse()
    .map(
      (checkpoint) => `  <entry>
    <id>${xmlText(checkpoint.id)}</id>
    <title>${xmlText(`${checkpoint.title} — ${checkpoint.version}`)}</title>
    <updated>${dayAsAtomDateTime(checkpoint.observedPublicOn)}</updated>
    <link rel="alternate" type="application/json" href="${xmlAttribute(absoluteUrl(checkpoint.links.manifest))}" />
    <link rel="related" type="application/json" href="${xmlAttribute(absoluteUrl(checkpoint.links.currentGraph))}" title="Mutable current graph route; verify its digest against this checkpoint" />
    <summary type="text">${xmlText(checkpointSummary(checkpoint))}</summary>
  </entry>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${xmlText(absoluteUrl(releaseAtomFeedPath))}</id>
  <title>${xmlText(ledger.title)}</title>
  <subtitle>Dataset-release baselines and forward checkpoints only. Updated values are day-normalised to 00:00:00Z and are not exact publication times. No retrospective record events are asserted.</subtitle>
  <updated>${updated}</updated>
  <author><name>TaxSorted</name><uri>${humanOrigin}/</uri></author>
  <link rel="self" type="application/atom+xml" href="${absoluteUrl(releaseAtomFeedPath)}" />
  <link rel="alternate" type="application/feed+json" href="${absoluteUrl(releaseJsonFeedPath)}" />
  <link rel="related" type="application/json" href="${absoluteUrl(releaseLedgerPath)}" title="Canonical release ledger" />
${entries}
</feed>
`;
}

type PreparedRepresentation = {
  body: string;
  contentType: string;
  contentLocation: string;
  etag: string;
};

function responseLinks(contentLocation: string) {
  return [
    `<${contentLocation}>; rel="canonical"`,
    `<${releaseLedgerPath}>; rel="related"; type="application/json"; title="Canonical release ledger"`,
    `<${releaseJsonFeedPath}>; rel="alternate"; type="application/feed+json"`,
    `<${releaseAtomFeedPath}>; rel="alternate"; type="application/atom+xml"`,
    `</v1/open-data>; rel="collection"; type="application/json"`,
    `<${rightsPath}>; rel="license"; type="application/json"`,
    `</openapi-public.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
    `</openapi.json>; rel="related"; type="application/vnd.oai.openapi+json;version=3.1"; title="Full API"`,
  ].join(", ");
}

function publicHeaders(c: Context, representation: PreparedRepresentation) {
  c.header("Cache-Control", "public, max-age=300, must-revalidate");
  c.header("Content-Language", "en-GB");
  c.header("Content-Location", representation.contentLocation);
  c.header("Content-Type", representation.contentType);
  c.header("ETag", representation.etag);
  c.header("Link", responseLinks(representation.contentLocation));
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Schema-Version", "taxsorted.open-data-release-ledger/1");
}

function unknownQuery(c: Context) {
  const parameters = [...new Set(new URL(c.req.url).searchParams.keys())].sort();
  if (parameters.length === 0) return null;
  const detail = "Release representations do not use query parameters.";
  return problemDetails(c, 400, {
    error: "unknown_query_parameter",
    detail,
    extensions: { message: detail, parameters },
    nextActions: [
      {
        method: "GET",
        href: c.req.path,
        description: "Retry the same representation without a query string.",
      },
    ],
  });
}

function servePrepared(c: Context, representation: PreparedRepresentation) {
  const queryError = unknownQuery(c);
  if (queryError) return queryError;
  publicHeaders(c, representation);
  if (ifNoneMatchMatches(c.req.header("If-None-Match"), representation.etag)) {
    return c.body(null, 304);
  }
  return c.body(representation.body, 200);
}

export function createReleaseDiscoveryRoutes(
  options: OpenDataRouteOptions = {},
) {
  const app = new Hono();
  const ledger = buildReleaseLedger(options);
  const ledgerBody = canonicalJson(ledger);
  const jsonFeedBody = canonicalJson(buildReleaseJsonFeed(ledger));
  const atomBody = serializeReleaseAtomFeed(ledger);
  const prepared: Record<"ledger" | "jsonFeed" | "atom", PreparedRepresentation> = {
    ledger: {
      body: ledgerBody,
      contentType: "application/json; charset=utf-8",
      contentLocation: releaseLedgerPath,
      etag: representationEtag(ledgerBody),
    },
    jsonFeed: {
      body: jsonFeedBody,
      contentType: "application/feed+json; charset=utf-8",
      contentLocation: releaseJsonFeedPath,
      etag: representationEtag(jsonFeedBody),
    },
    atom: {
      body: atomBody,
      contentType: "application/atom+xml; charset=utf-8",
      contentLocation: releaseAtomFeedPath,
      etag: representationEtag(atomBody),
    },
  };

  app.get("/", (c) => servePrepared(c, prepared.ledger));
  app.get("/feed.json", (c) => servePrepared(c, prepared.jsonFeed));
  app.get("/feed.atom", (c) => servePrepared(c, prepared.atom));

  for (const path of ["/", "/feed.json", "/feed.atom"]) {
    app.all(path, (c) => {
      c.header("Allow", "GET, HEAD, OPTIONS");
      const detail = "The public release ledger is read-only.";
      return problemDetails(c, 405, {
        error: "method_not_allowed",
        detail,
        extensions: {
          message: detail,
          method: c.req.method,
          path: c.req.path,
        },
        nextActions: [
          {
            method: "GET",
            href: c.req.path,
            description: "Read this release representation without writing.",
          },
        ],
      });
    });
  }

  app.all("*", (c) => {
    const detail = "No release-ledger representation matches this path.";
    return problemDetails(c, 404, {
      error: "not_found",
      detail,
      nextActions: [
        {
          method: "GET",
          href: releaseLedgerPath,
          description: "Read the canonical release ledger and its links.",
        },
      ],
    });
  });

  return app;
}
