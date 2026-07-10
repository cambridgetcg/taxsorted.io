// One public front door for datasets that people may read, copy and mirror.
// This route is deliberately separate from workspace keys and taxpayer sessions.

import { Hono, type Context } from "hono";
import {
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
} from "../open-data.js";
import { ukTaxIndustry } from "../uk-tax-industry.js";
import { ukTaxSystem } from "../uk-tax-system.js";
import { ukCharities } from "../uk-charities.js";
import { ukPublicFunding } from "../uk-public-funding.js";
import {
  isPoliticsBulkPublicationApproval,
  politicsDatasetAdmissionDigest,
  politicsDatasetAdmissionDigestScope,
  politicsDatasetRelease,
  politicsOpenDatasets,
  type PoliticsBulkPublicationApproval,
} from "../uk-politics-datasets.js";

const catalogPath = "/v1/open-data";
const rightsPath = `${catalogPath}/rights`;
const contentLicence = ukTaxSystem.meta.contentLicence;
const correctionsUrl = "https://github.com/cambridgetcg/taxsorted.io/issues";

export type OpenDataRouteOptions = {
  taxSystemPublic?: boolean;
  taxIndustryPublic?: boolean;
  charitiesPublic?: boolean;
  charitiesEmergencyStop?: boolean;
  publicFundingPublic?: boolean;
  publicFundingEmergencyStop?: boolean;
  politicsBulkDataAvailable?: boolean;
  politicsBulkDataEmergencyStop?: boolean;
  politicsBulkDataApproval?: PoliticsBulkPublicationApproval | null;
};

function catalogHeaders(
  c: Context,
  etag: string,
  contentLocation = catalogPath,
  licenseLocation = rightsPath
) {
  c.header("Cache-Control", "public, max-age=300, must-revalidate");
  c.header("Content-Language", "en-GB");
  c.header("Content-Location", contentLocation);
  c.header("ETag", etag);
  c.header(
    "Link",
    [
      `<${contentLocation}>; rel="canonical"`,
      `<${licenseLocation}>; rel="license"`,
      `<${correctionsUrl}>; rel="help"`,
      `</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
    ].join(", ")
  );
  c.header("X-Content-Type-Options", "nosniff");
}

function dataset(
  id:
    | "uk-tax-system"
    | "uk-tax-industry"
    | "uk-charities-sector"
    | "uk-public-funding",
  root: string,
  corpus:
    | typeof ukTaxSystem
    | typeof ukTaxIndustry
    | typeof ukCharities
    | typeof ukPublicFunding,
  published: boolean,
  humanGuide: string | null,
  options: {
    emergencyStopped?: boolean;
    reviewBoundary?: string;
    scopeBoundary?: string;
  } = {}
) {
  return {
    id,
    title: corpus.meta.title,
    jurisdiction: corpus.meta.jurisdiction,
    schema: corpus.schema,
    version: corpus.meta.version,
    reviewedOn: corpus.meta.reviewedOn,
    updatePolicy: {
      cadence:
        "Irregular and evidence-driven: publish a new reviewed version when sources materially change, a correction is accepted, or maintainers complete a new evidence pass.",
      nextReleaseDate: null,
    },
    correctionChannel: {
      publicUrl: correctionsUrl,
      accountRequired: true,
      privateOrSensitiveIntakeAvailable: false,
      warning:
        "Do not put private, personal or safety-sensitive information in a public GitHub issue.",
    },
    publication: {
      fullDatasetAvailable: published,
      status: options.emergencyStopped
        ? "emergency-stopped"
        : published
          ? "open"
          : "publication-review",
      reviewBoundary:
        options.reviewBoundary ??
        "The source ledger, known gaps, manifest, schema, dictionary and export index remain readable while full-data publication is closed.",
      ...(options.scopeBoundary
        ? { scopeBoundary: options.scopeBoundary }
        : {}),
      notConfidentiality:
        "This hosted-service switch is not confidentiality or revocation. Unapproved or sensitive material must never enter the public repository or static corpus.",
    },
    licence: corpus.meta.contentLicence,
    attribution: `TaxSorted (taxsorted.io), “${corpus.meta.title}”, version ${corpus.meta.version}, https://api.taxsorted.io${root}/graph, ${corpus.meta.contentLicence.name} (${corpus.meta.contentLicence.url}).`,
    resources: {
      overview: root,
      manifest: `${root}/manifest`,
      fullGraph: `${root}/graph`,
      schema: `${root}/schema`,
      dictionary: `${root}/dictionary`,
      exports: `${root}/exports`,
      sources: `${root}/sources`,
      ...(id === "uk-charities-sector"
        ? { registers: `${root}/registers` }
        : {}),
      gaps: `${root}/gaps`,
      humanGuide,
      corrections: correctionsUrl,
    },
  };
}

export function buildOpenDataCatalog(options: OpenDataRouteOptions = {}) {
  const taxSystemPublic = options.taxSystemPublic ?? false;
  const taxIndustryPublic = options.taxIndustryPublic ?? false;
  const charitiesEmergencyStop = options.charitiesEmergencyStop ?? false;
  const charitiesPublic =
    (options.charitiesPublic ?? false) && !charitiesEmergencyStop;
  const publicFundingEmergencyStop =
    options.publicFundingEmergencyStop ?? false;
  const publicFundingPublic =
    (options.publicFundingPublic ?? false) && !publicFundingEmergencyStop;
  const politicsBulkDataAvailable = options.politicsBulkDataAvailable ?? true;
  const politicsBulkDataEmergencyStop =
    options.politicsBulkDataEmergencyStop ?? false;
  const politicsBulkDataApproval = isPoliticsBulkPublicationApproval(
    options.politicsBulkDataApproval
  )
    ? options.politicsBulkDataApproval
    : null;
  return {
    schema: "taxsorted.open-data-catalog/1",
    title: "TaxSorted open data",
    purpose:
      "Public knowledge should be findable, understandable, downloadable and reusable without an account.",
    access: {
      authentication: "none",
      price: "free",
      methods: ["GET", "HEAD", "OPTIONS"],
      cors: "*",
      formats: ["json", "ndjson", "csv"],
      openApi: "/openapi.json",
      rateLimits:
        "No application-level rate limit is currently applied to these static public routes. Hosting and network abuse protections may still act. Prefer one bulk export over many item requests.",
      availability:
        "Best effort; no uptime service level is promised. The data, schemas and code can be mirrored or self-hosted.",
    },
    reuse: {
      taxSortedCurationLicence: contentLicence,
      rights: rightsPath,
      sourceRights:
        "The curation licence covers TaxSorted's normalised corpus and written summaries. Linked source material keeps its own licence and reuse terms; source ledgers record the information TaxSorted has confirmed and leave uncertainty explicit.",
      noKeyRequired: true,
      mirroring:
        "Use each resource ETag with If-None-Match. A 304 response means that exact representation is unchanged.",
      corrections: correctionsUrl,
    },
    datasets: [
      dataset(
        "uk-tax-system",
        "/v1/tax-system/uk",
        ukTaxSystem,
        taxSystemPublic,
        null
      ),
      dataset(
        "uk-tax-industry",
        "/v1/tax-industry/uk",
        ukTaxIndustry,
        taxIndustryPublic,
        "https://taxsorted.io/uk/tax-industry"
      ),
      dataset(
        "uk-charities-sector",
        "/v1/charities/uk",
        ukCharities,
        charitiesPublic,
        "https://taxsorted.io/uk/charities",
        {
          emergencyStopped: charitiesEmergencyStop,
          reviewBoundary:
            "The source ledger, official register doors, known gaps, manifest, schema, dictionary and export index remain readable while the full sector map is closed.",
          scopeBoundary:
            "This release explains the UK charity sector. It contains no mirrored charity-by-charity records, named people, personal contacts, donor or beneficiary data, or inferred religious beliefs.",
        }
      ),
      dataset(
        "uk-public-funding",
        "/v1/public-funding/uk",
        ukPublicFunding,
        publicFundingPublic,
        "https://taxsorted.io/uk/public-funding",
        {
          emergencyStopped: publicFundingEmergencyStop,
          reviewBoundary:
            "The source ledger, known gaps, manifest, schema, dictionary and export index remain readable while the full public-funding graph is closed.",
          scopeBoundary:
            "This release maps institutions, formal offices, aggregate allocations, governance and functional contacts. It contains no copied holder names, personal contacts, inferred ties or individual spending records.",
        }
      ),
      {
        id: "uk-politics-public-integrity",
        title: "UK politics and public integrity",
        jurisdiction: "United Kingdom",
        schema: politicsDatasetRelease.schema,
        version: politicsDatasetRelease.catalogueVersion,
        reviewedOn: null,
        updatePolicy: {
          cadence:
            "Per-dataset cadences are published in the politics dataset catalogue; catalogue releases are irregular and source- or correction-driven.",
          nextReleaseDate: null,
        },
        correctionChannel: {
          publicUrl: correctionsUrl,
          accountRequired: true,
          privateOrSensitiveIntakeAvailable: politicsBulkDataApproval !== null,
          ...(politicsBulkDataApproval
            ? { privateUrl: politicsBulkDataApproval.confidentialIntakeUrl }
            : {}),
          warning: politicsBulkDataApproval
            ? "Use the confidential intake for private, personal or safety-sensitive evidence; never put it in a public GitHub issue."
            : "Do not put private, personal or safety-sensitive information in a public GitHub issue. A confidential intake is not live.",
        },
        screenedOn: politicsDatasetRelease.screenedOn,
        screeningStatus: politicsDatasetRelease.screeningStatus,
        humanApproval: politicsBulkDataApproval
          ? {
              status: "approved",
              approver: politicsBulkDataApproval.approver,
              approvedOn: politicsBulkDataApproval.approvedOn,
              admissionDigest: politicsBulkDataApproval.admissionDigest,
            }
          : politicsDatasetRelease.humanApproval,
        admissionDigest: politicsDatasetAdmissionDigest,
        admissionDigestScope: politicsDatasetAdmissionDigestScope,
        publication: {
          fullDatasetAvailable: politicsBulkDataAvailable,
          status: politicsBulkDataEmergencyStop
            ? "emergency-stopped"
            : politicsBulkDataAvailable
              ? politicsBulkDataApproval
                ? "open"
                : "development-preview"
              : politicsBulkDataApproval
                ? "approved-disabled"
                : "publication-review",
          humanApproval: politicsBulkDataApproval
            ? {
                status: "approved",
                approver: politicsBulkDataApproval.approver,
                approvedOn: politicsBulkDataApproval.approvedOn,
                admissionDigest: politicsBulkDataApproval.admissionDigest,
              }
            : politicsDatasetRelease.humanApproval,
          confidentialIntake: politicsBulkDataApproval
            ? {
                status: "live",
                url: politicsBulkDataApproval.confidentialIntakeUrl,
              }
            : { status: "not-live-production-blocker" },
          reviewBoundary:
            "The bulk catalogue contains only allowlisted non-personal, aggregate and screened organisation-only projections. Human approval remains a separate publication condition; named lookup gates never create a bulk people export.",
          notConfidentiality:
            "The emergency stop controls hosted bulk serving; material already lawfully copied from a public release cannot be recalled.",
        },
        licence: politicsDatasetRelease.licence,
        attribution: `${politicsDatasetRelease.licence.attribution}, UK politics open datasets, catalogue version ${politicsDatasetRelease.catalogueVersion}.`,
        resources: {
          overview: "/v1/politics/uk",
          manifest: "/v1/politics/uk/manifest",
          catalog: "/v1/politics/uk/datasets",
          schema: "/v1/politics/uk/datasets/schema",
          sources: "/v1/politics/uk/datasets/official-sources",
          rights: "/v1/politics/uk/datasets/rights",
          admissions: "/v1/politics/uk/datasets/admissions",
          humanGuide: "https://taxsorted.io/uk/politics/api",
          corrections: correctionsUrl,
        },
        datasetCount: politicsOpenDatasets.length,
      },
    ],
  };
}

export function buildOpenDataRights() {
  return {
    schema: "taxsorted.open-data-rights/1",
    status: "mixed-rights-read-before-reuse",
    curation: contentLicence,
    curationAppliesTo:
      "TaxSorted-written selection, structure and summaries where TaxSorted has rights to license them.",
    sourceMaterial:
      "Linked source material keeps source-specific copyright, database, contractual and personal-data conditions. Unresolved replication rights permit only TaxSorted-authored metadata, links and independently written summaries.",
    automationRule:
      "Do not interpret this service's curation licence as a blanket licence over upstream material. Follow each dataset's source ledger and rights statement.",
    datasetRights: {
      taxSystem: "/v1/tax-system/uk/sources",
      taxIndustry: "/v1/tax-industry/uk/sources",
      charities: "/v1/charities/uk/sources",
      publicFunding: "/v1/public-funding/uk/sources",
      politics: "/v1/politics/uk/datasets/rights",
    },
    publicIssueTracker: "https://github.com/cambridgetcg/taxsorted.io/issues",
    correctionChannel: {
      publicUrl: correctionsUrl,
      accountRequired: true,
      privateOrSensitiveIntakeAvailable: false,
      warning:
        "Do not put private, personal or safety-sensitive information in a public GitHub issue. A private correction route is not live.",
    },
  };
}

export function createOpenDataRoutes(options: OpenDataRouteOptions = {}) {
  const app = new Hono();
  const body = canonicalJson(buildOpenDataCatalog(options));
  const etag = representationEtag(body);
  const rightsBody = canonicalJson(buildOpenDataRights());
  const rightsEtag = representationEtag(rightsBody);

  app.get("/", (c) => {
    const parameters = [...new URL(c.req.url).searchParams.keys()];
    if (parameters.length) {
      c.header("Cache-Control", "no-store");
      return c.json(
        { error: "unknown_query_parameter", parameters: [...new Set(parameters)].sort() },
        400
      );
    }
    catalogHeaders(c, etag);
    if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
      return c.body(null, 304);
    }
    return c.body(body, 200, { "Content-Type": "application/json; charset=utf-8" });
  });

  app.get("/rights", (c) => {
    const parameters = [...new URL(c.req.url).searchParams.keys()];
    if (parameters.length) {
      c.header("Cache-Control", "no-store");
      return c.json(
        { error: "unknown_query_parameter", parameters: [...new Set(parameters)].sort() },
        400
      );
    }
    catalogHeaders(c, rightsEtag, rightsPath, contentLicence.url);
    if (ifNoneMatchMatches(c.req.header("If-None-Match"), rightsEtag)) {
      return c.body(null, 304);
    }
    return c.body(rightsBody, 200, { "Content-Type": "application/json; charset=utf-8" });
  });

  app.all("*", (c) => {
    c.header("Cache-Control", "no-store");
    return c.json({ error: "not_found" }, 404);
  });

  return app;
}
