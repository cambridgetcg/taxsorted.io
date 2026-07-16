// Open, deterministic distributions of the non-personal UK politics corpus.
// Existing purpose-bound and named routes keep their own response contracts;
// this layer is additive and contains no bulk people export.

import { Hono, type Context } from "hono";
import {
  attachmentContentDisposition,
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
  serializeCsv,
  serializeNdjson,
} from "../open-data.js";
import {
  findPoliticsOpenDataset,
  isPoliticsBulkPublicationApproval,
  politicsDatasetAdmissionDigest,
  politicsDatasetAdmissionDigestScope,
  politicsDatasetAdmissionsFor,
  politicsDatasetRelease,
  politicsDatasetRights,
  politicsOpenDatasets,
  type OpenDatasetRecord,
  type PoliticsBulkPublicationApproval,
  type PoliticsOpenDataset,
} from "../uk-politics-datasets.js";
import { problemDetails, type ProblemNextAction } from "../problem-details.js";

const API_ROOT = "/v1/politics/uk";
const DATASETS_ROOT = `${API_ROOT}/datasets`;
const RIGHTS_PATH = `${DATASETS_ROOT}/rights`;
const ADMISSIONS_PATH = `${DATASETS_ROOT}/admissions`;
const SUPPORTED_FORMATS = ["json", "csv", "ndjson"] as const;
type DownloadFormat = (typeof SUPPORTED_FORMATS)[number];

const MEDIA_TYPES: Record<DownloadFormat, string> = {
  json: "application/json; charset=UTF-8",
  csv: "text/csv; charset=UTF-8",
  ndjson: "application/x-ndjson; charset=UTF-8",
};

function checksumFromEtag(etag: string) {
  return etag.slice('"sha256-'.length, -1);
}

function datasetVersion(dataset: PoliticsOpenDataset) {
  return `sha256:${checksumFromEtag(representationEtag(canonicalJson(dataset.records)))}`;
}

function typeOf(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number" && Number.isInteger(value)) return "integer";
  return typeof value === "object" ? "object" : typeof value;
}

function fieldDescriptors(dataset: PoliticsOpenDataset) {
  return dataset.fields.map((name) => {
    const values = dataset.records.map((record) => record[name]);
    const types = [...new Set(values.map(typeOf).filter((type) => type !== "undefined"))].sort();
    const nullable = values.some((value) => value === null);
    const optional = values.some((value) => value === undefined);
    return {
      name,
      types,
      nullable,
      optional,
      required: !optional,
      csvEncoding:
        types.includes("array") || types.includes("object")
          ? "canonical-json-in-cell"
          : "scalar",
    };
  });
}

function distributions(dataset: PoliticsOpenDataset) {
  const root = `${DATASETS_ROOT}/${dataset.id}`;
  return SUPPORTED_FORMATS.map((format) => ({
    format,
    mediaType: MEDIA_TYPES[format].split(";", 1)[0],
    url: `${root}/download?format=${format}`,
  }));
}

type BulkAvailability =
  | "open"
  | "development-preview"
  | "approved-disabled"
  | "publication-review"
  | "emergency-stopped";

function descriptor(
  dataset: PoliticsOpenDataset,
  availability: BulkAvailability,
  approval: PoliticsBulkPublicationApproval | null
) {
  return {
    id: dataset.id,
    title: dataset.title,
    description: dataset.description,
    topics: dataset.topics,
    availability,
    authentication: "none" as const,
    privacyClass: dataset.privacyClass,
    containsPersonalRecords: false,
    coverage: dataset.coverage,
    updateCadence: dataset.updateCadence,
    snapshotAsOf: politicsDatasetRelease.snapshotAsOf,
    screenedOn: politicsDatasetRelease.screenedOn,
    screeningStatus: politicsDatasetRelease.screeningStatus,
    humanApprovalStatus: approval ? "approved" : politicsDatasetRelease.humanApproval.status,
    schemaVersion: dataset.schemaVersion,
    datasetVersion: datasetVersion(dataset),
    primaryKey: dataset.primaryKey,
    recordCount: dataset.records.length,
    fields: fieldDescriptors(dataset),
    sourceIds: dataset.sourceIds,
    licence: politicsDatasetRelease.licence,
    links: {
      self: `${DATASETS_ROOT}/${dataset.id}`,
      schema: `${DATASETS_ROOT}/${dataset.id}/schema`,
      catalogue: DATASETS_ROOT,
      corrections: `${API_ROOT}/integrity/corrections`,
      sourceLedger: `${DATASETS_ROOT}/official-sources`,
      rights: RIGHTS_PATH,
    },
    distributions: distributions(dataset),
  };
}

function buildCatalogue(
  bulkDataAvailable: boolean,
  bulkDataEmergencyStop: boolean,
  approval: PoliticsBulkPublicationApproval | null
) {
  const availability: BulkAvailability = bulkDataAvailable
    ? approval
      ? "open"
      : "development-preview"
    : bulkDataEmergencyStop
      ? "emergency-stopped"
      : approval
        ? "approved-disabled"
        : "publication-review";
  return {
    ...politicsDatasetRelease,
    access: {
      ...politicsDatasetRelease.access,
      bulkDownloads: bulkDataAvailable,
    },
    humanApproval: approval
      ? {
          status: "approved",
          approver: approval.approver,
          approvedOn: approval.approvedOn,
          admissionDigest: approval.admissionDigest,
        }
      : politicsDatasetRelease.humanApproval,
    admissionDigest: politicsDatasetAdmissionDigest,
    admissionDigestScope: politicsDatasetAdmissionDigestScope,
    title: "TaxSorted UK politics open datasets",
    purpose:
      "Make public political systems, money rules and institutional power easy to understand, copy, mirror and build upon without an account.",
    publication: {
      bulkDataAvailable,
      status: availability,
      humanApproval: approval
        ? {
            status: "approved",
            approver: approval.approver,
            approvedOn: approval.approvedOn,
            admissionDigest: approval.admissionDigest,
          }
        : "Pending until Yu adopts the publication boundary, reviews the admission ledger and a confidential safety-reporting route exists.",
      confidentialIntake: approval
        ? { status: "live", url: approval.confidentialIntakeUrl }
        : { status: "not-live-production-blocker" },
      emergencyStop:
        "POLITICS_BULK_DATA_EMERGENCY_STOP stops static record bodies without hiding the catalogue, admission ledger, rights statement or bulk dataset schemas.",
    },
    datasets: politicsOpenDatasets.map((dataset) =>
      descriptor(dataset, availability, approval)
    ),
    queryServices: [
      {
        id: "public-contract-awards-query",
        title: "Public contract awards with verified supplier disclosure",
        authentication: "none",
        format: "json",
        endpoint: `${API_ROOT}/relationships/contracts`,
        parameters: {
          from: "YYYY-MM-DD",
          to: "YYYY-MM-DD; inclusive window of at most 31 days",
          take: "1 to 20",
          cursor: "Opaque value returned by the previous response",
        },
        coverage:
          "Live Contracts Finder award releases. Buyer identity follows the official award; supplier names require a verified organisation identifier. Contacts and addresses are removed.",
      },
      {
        id: "police-force-directory-query",
        title: "Police-force institution directory",
        authentication: "none",
        format: "json",
        endpoint: `${API_ROOT}/enforcement/forces`,
        coverage: "Live force institutions and purpose-bound institutional details from data.police.uk.",
      },
    ],
    links: {
      self: DATASETS_ROOT,
      manifestAlias: `${API_ROOT}/manifest`,
      generalSchema: `${DATASETS_ROOT}/schema`,
      sources: `${DATASETS_ROOT}/official-sources`,
      rights: RIGHTS_PATH,
      admissions: ADMISSIONS_PATH,
      openApi: "/openapi.json",
      humanGuide: "https://taxsorted.io/uk/politics/api",
      corrections: `${API_ROOT}/integrity/corrections`,
    },
  };
}

function recordSchema(dataset: PoliticsOpenDataset) {
  const fields = fieldDescriptors(dataset);
  const properties = Object.fromEntries(
    fields.map((field) => {
      const jsonTypes = field.types.map((type) =>
        ["string", "number", "integer", "boolean", "object", "array", "null"].includes(type)
          ? type
          : "string"
      );
      const uniqueTypes = [...new Set(jsonTypes)];
      return [
        field.name,
        {
          type: uniqueTypes.length === 1 ? uniqueTypes[0] : uniqueTypes,
          ...(field.csvEncoding === "canonical-json-in-cell"
            ? { description: "CSV distributions encode this value as canonical JSON in one cell." }
            : {}),
        },
      ];
    })
  );
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://api.taxsorted.io${DATASETS_ROOT}/${dataset.id}/schema`,
    title: `${dataset.title} record`,
    type: "object",
    required: fields.filter((field) => field.required).map((field) => field.name),
    properties,
    // Optional fields may be added within a schema major. This keeps a schema
    // cached by a mirror forward-compatible with that additive change.
    additionalProperties: true,
  };
}

function generalSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://api.taxsorted.io${DATASETS_ROOT}/schema`,
    title: "TaxSorted UK politics open-data responses",
    type: "object",
    oneOf: [
      {
        title: "Dataset catalogue",
        required: ["schema", "title", "purpose", "access", "datasets", "links"],
        properties: {
          schema: { const: politicsDatasetRelease.schema },
          title: { type: "string" },
          purpose: { type: "string" },
          access: { type: "object" },
          datasets: { type: "array", items: { type: "object", required: ["id"] } },
          links: { type: "object" },
        },
      },
      {
        title: "Dataset envelope",
        required: ["schema", "dataset", "data", "links"],
        properties: {
          schema: { const: "taxsorted.open-dataset/1" },
          dataset: { type: "object", required: ["id", "schemaVersion", "recordCount"] },
          data: { type: "array", items: { type: "object", required: ["id"] } },
          links: { type: "object" },
        },
      },
    ],
    compatibility: politicsDatasetRelease.compatibility,
  };
}

function commonHeaders(
  c: Context,
  body: string,
  options: {
    contentLocation: string;
    canonicalLocation?: string;
    resourceId?: string;
    recordCount?: number;
    dataset?: PoliticsOpenDataset;
    schemaVersion?: string;
    attachmentFilename?: string;
    describedBy?: string[];
    licenseLocation?: string;
  }
) {
  const etag = representationEtag(body);
  const version = options.dataset
    ? datasetVersion(options.dataset)
    : options.resourceId
      ? `sha256:${checksumFromEtag(etag)}`
      : undefined;
  c.header("Cache-Control", "public, max-age=3600, must-revalidate");
  c.header("Content-Language", "en-GB");
  c.header("Content-Location", options.contentLocation);
  c.header("ETag", etag);
  c.header("Last-Modified", new Date(`${politicsDatasetRelease.snapshotAsOf}T00:00:00Z`).toUTCString());
  c.header("X-Content-Type-Options", "nosniff");
  const resourceId = options.dataset?.id ?? options.resourceId;
  const recordCount = options.dataset?.records.length ?? options.recordCount;
  if (resourceId) c.header("X-Dataset-Id", resourceId);
  if (version) c.header("X-Dataset-Version", version);
  if (options.schemaVersion) c.header("X-Schema-Version", options.schemaVersion);
  if (recordCount !== undefined) c.header("X-Record-Count", String(recordCount));
  c.header("X-Checksum-SHA256", checksumFromEtag(etag));
  const canonicalLocation = options.canonicalLocation ?? options.contentLocation;
  const describedBy =
    options.describedBy ??
    (options.dataset ? [`${DATASETS_ROOT}/${options.dataset.id}/schema`] : []);
  const links = options.dataset
    ? [
        `<${canonicalLocation}>; rel="canonical"`,
        ...describedBy.map(
          (url) => `<${url}>; rel="describedby"; type="application/schema+json"`
        ),
        `<${options.licenseLocation ?? RIGHTS_PATH}>; rel="license"`,
        `<${DATASETS_ROOT}>; rel="collection"`,
        ...SUPPORTED_FORMATS.map(
          (format) =>
            `<${DATASETS_ROOT}/${options.dataset!.id}/download?format=${format}>; rel="alternate"; type="${MEDIA_TYPES[format].split(";", 1)[0]}"`
        ),
      ]
    : [
        `<${canonicalLocation}>; rel="canonical"`,
        ...describedBy.map(
          (url) => `<${url}>; rel="describedby"; type="application/schema+json"`
        ),
        `<${options.licenseLocation ?? RIGHTS_PATH}>; rel="license"`,
        `</openapi/politics-uk.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
        `</openapi.json>; rel="related"; type="application/vnd.oai.openapi+json;version=3.1"; title="Full API"`,
      ];
  c.header("Link", links.join(", "));
  if (options.attachmentFilename) {
    c.header("Content-Disposition", attachmentContentDisposition(options.attachmentFilename));
  }
  return etag;
}

function deterministicResponse(
  c: Context,
  body: string,
  contentType: string,
  options: Parameters<typeof commonHeaders>[2]
) {
  const etag = commonHeaders(c, body, options);
  if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) return c.body(null, 304);
  return c.body(body, 200, { "Content-Type": contentType });
}

function datasetNotFound(c: Context) {
  const detail =
    "No static dataset screened as a public-distribution candidate has that ID.";
  return problemDetails(c, 404, {
    error: "dataset_not_found",
    detail,
    extensions: {
      message: detail,
      catalogue: DATASETS_ROOT,
    },
    nextActions: [
      {
        method: "GET",
        href: DATASETS_ROOT,
        description: "List the screened public-distribution candidates.",
      },
    ],
  });
}

function datasetEnvelope(
  dataset: PoliticsOpenDataset,
  availability: BulkAvailability,
  approval: PoliticsBulkPublicationApproval | null
) {
  return {
    schema: "taxsorted.open-dataset/1",
    dataset: descriptor(dataset, availability, approval),
    data: dataset.records,
    links: {
      self: `${DATASETS_ROOT}/${dataset.id}`,
      schema: `${DATASETS_ROOT}/${dataset.id}/schema`,
      catalogue: DATASETS_ROOT,
    },
  };
}

function downloadBody(
  dataset: PoliticsOpenDataset,
  format: DownloadFormat,
  availability: BulkAvailability,
  approval: PoliticsBulkPublicationApproval | null
) {
  if (format === "csv") {
    return serializeCsv(dataset.records as OpenDatasetRecord[], { columns: dataset.fields });
  }
  if (format === "ndjson") return serializeNdjson(dataset.records);
  return canonicalJson(datasetEnvelope(dataset, availability, approval));
}

export type UkPoliticsDatasetRouteOptions = {
  bulkDataEmergencyStop?: boolean;
  bulkDataEnabled?: boolean;
  bulkDataApproval?: PoliticsBulkPublicationApproval | null;
};

export function createUkPoliticsDatasetRoutes(
  options: UkPoliticsDatasetRouteOptions = {}
) {
  const app = new Hono();
  const bulkDataEmergencyStop = options.bulkDataEmergencyStop ?? false;
  const bulkDataApproval = isPoliticsBulkPublicationApproval(
    options.bulkDataApproval
  )
    ? options.bulkDataApproval
    : null;
  const bulkDataAvailable =
    (options.bulkDataEnabled ?? true) && !bulkDataEmergencyStop;
  const bulkAvailability: BulkAvailability = bulkDataAvailable
    ? bulkDataApproval
      ? "open"
      : "development-preview"
    : bulkDataEmergencyStop
      ? "emergency-stopped"
      : bulkDataApproval
        ? "approved-disabled"
        : "publication-review";

  const stopped = (c: Context) => {
    const error = bulkDataEmergencyStop
      ? "bulk_data_emergency_stop"
      : bulkDataApproval
        ? "bulk_data_publication_disabled"
        : "bulk_data_publication_review_needed";
    const detail = bulkDataEmergencyStop
      ? "Static UK politics record bodies are temporarily stopped for safety review. The catalogue, admission ledger, rights statement and bulk dataset schemas remain readable."
      : bulkDataApproval
        ? "The admission ledger is approved, but hosted bulk publication is disabled. The catalogue, admission ledger, rights statement and bulk dataset schemas remain readable."
        : "Static UK politics record bodies are closed until a human approves the public-distribution review and a confidential safety-reporting route exists. The catalogue, admission ledger, rights statement and bulk dataset schemas remain readable.";
    const nextActions: ProblemNextAction[] = [
      {
        method: "GET",
        href: DATASETS_ROOT,
        description: "Read the dataset catalogue and publication state.",
      },
      {
        method: "GET",
        href: ADMISSIONS_PATH,
        description: "Read the publication admission ledger.",
      },
    ];
    return problemDetails(c, 503, {
      error,
      detail,
      extensions: {
        message: detail,
        catalogue: DATASETS_ROOT,
        rights: RIGHTS_PATH,
        admissions: ADMISSIONS_PATH,
      },
      nextActions,
    });
  };

  app.get("/", (c) => {
    const value = {
      schema: "taxsorted.uk.politics-api/1",
      title: "TaxSorted UK politics and public integrity",
      purpose: "Source-linked public records for understanding democracy, money and formal institutional power.",
      statusNote:
        "TaxSorted reports what official sources and screened summaries say; that is not a guarantee that every underlying claim is true.",
      access: {
        ...politicsDatasetRelease.access,
        bulkDownloads: bulkDataAvailable,
      },
      publication: {
        bulkDataAvailable,
        status: bulkAvailability,
        humanApproval: bulkDataApproval
          ? {
              status: "approved",
              approver: bulkDataApproval.approver,
              approvedOn: bulkDataApproval.approvedOn,
              admissionDigest: bulkDataApproval.admissionDigest,
            }
          : politicsDatasetRelease.humanApproval,
      },
      publicOfficePathways: {
        status: bulkDataEmergencyStop ? "emergency-stopped" : "open",
        normalPublicationGates: "independent",
        emergencyStop: "politics-bulk-data-emergency-stop",
        methods: ["GET", "HEAD"],
        writes: false,
      },
      publicDecisionPathways: {
        status: bulkDataEmergencyStop ? "emergency-stopped" : "open",
        normalPublicationGates: "independent",
        emergencyStop: "politics-bulk-data-emergency-stop",
        methods: ["GET", "HEAD"],
        writes: false,
      },
      start: DATASETS_ROOT,
      links: {
        publicOfficePathways: `${API_ROOT}/public-office-pathways`,
        publicDecisionPathways: `${API_ROOT}/public-decision-pathways`,
        datasets: DATASETS_ROOT,
        manifest: `${API_ROOT}/manifest`,
        sources: `${API_ROOT}/sources`,
        rights: RIGHTS_PATH,
        admissions: ADMISSIONS_PATH,
        openApi: "/openapi.json",
        humanGuide: "https://taxsorted.io/uk/politics/api",
      },
    };
    const body = canonicalJson(value);
    return deterministicResponse(c, body, MEDIA_TYPES.json, { contentLocation: API_ROOT });
  });

  const catalogue = (c: Context) => {
    const body = canonicalJson(
      buildCatalogue(
        bulkDataAvailable,
        bulkDataEmergencyStop,
        bulkDataApproval
      )
    );
    return deterministicResponse(c, body, MEDIA_TYPES.json, {
      contentLocation: DATASETS_ROOT,
      resourceId: "uk-politics-catalogue",
      recordCount: politicsOpenDatasets.length,
      schemaVersion: politicsDatasetRelease.catalogueVersion,
      describedBy: [`${DATASETS_ROOT}/schema`],
    });
  };
  app.get("/datasets", catalogue);
  app.get("/manifest", catalogue);

  app.get("/datasets/schema", (c) => {
    const body = canonicalJson(generalSchema());
    return deterministicResponse(c, body, "application/schema+json; charset=UTF-8", {
      contentLocation: `${DATASETS_ROOT}/schema`,
      schemaVersion: "1.0.0",
    });
  });

  app.get("/datasets/rights", (c) => {
    const body = canonicalJson(politicsDatasetRights);
    return deterministicResponse(c, body, MEDIA_TYPES.json, {
      contentLocation: RIGHTS_PATH,
      schemaVersion: "1.0.0",
      licenseLocation: politicsDatasetRelease.licence.url,
    });
  });

  app.get("/datasets/admissions", (c) => {
    const admissionRecords = politicsDatasetAdmissionsFor(bulkDataApproval);
    const body = canonicalJson({
      schema: "taxsorted.uk.dataset-admission-ledger/1",
      status: bulkDataApproval
        ? "human-approved"
        : "agent-screened-human-decision-pending",
      screenedOn: politicsDatasetRelease.screenedOn,
      humanOwner: "Yu",
      admissionDigest: politicsDatasetAdmissionDigest,
      admissionDigestScope: politicsDatasetAdmissionDigestScope,
      confidentialIntake: bulkDataApproval
        ? { status: "live", url: bulkDataApproval.confidentialIntakeUrl }
        : { status: "not-live-production-blocker" },
      records: admissionRecords,
      links: {
        catalogue: DATASETS_ROOT,
        rights: RIGHTS_PATH,
        corrections: `${API_ROOT}/integrity/corrections`,
      },
    });
    return deterministicResponse(c, body, MEDIA_TYPES.json, {
      contentLocation: ADMISSIONS_PATH,
      resourceId: "uk-politics-admission-ledger",
      recordCount: admissionRecords.length,
      schemaVersion: "1.0.0",
    });
  });

  app.get("/datasets/:datasetId/schema", (c) => {
    const dataset = findPoliticsOpenDataset(c.req.param("datasetId"));
    if (!dataset) return datasetNotFound(c);
    const path = `${DATASETS_ROOT}/${dataset.id}/schema`;
    const body = canonicalJson(recordSchema(dataset));
    return deterministicResponse(c, body, "application/schema+json; charset=UTF-8", {
      contentLocation: path,
      dataset,
      schemaVersion: dataset.schemaVersion,
      describedBy: [],
    });
  });

  app.get("/datasets/:datasetId/download", (c) => {
    const dataset = findPoliticsOpenDataset(c.req.param("datasetId"));
    if (!dataset) return datasetNotFound(c);
    if (!bulkDataAvailable) return stopped(c);
    const url = new URL(c.req.url);
    const unknown = [...new Set([...url.searchParams.keys()].filter((key) => key !== "format"))];
    const formats = url.searchParams.getAll("format");
    const format = formats.length === 1 ? formats[0] : null;
    if (
      unknown.length ||
      !format ||
      !SUPPORTED_FORMATS.includes(format as DownloadFormat)
    ) {
      const detail = "Choose one exact format value.";
      return problemDetails(c, 400, {
        error: "invalid_format",
        detail,
        extensions: {
          message: detail,
          supportedFormats: SUPPORTED_FORMATS,
          unknownParameters: unknown,
        },
        nextActions: [
          {
            method: "GET",
            href: `${DATASETS_ROOT}/${dataset.id}`,
            description: "Read this dataset's explicit distribution URLs.",
          },
        ],
      });
    }
    const typedFormat = format as DownloadFormat;
    const body = downloadBody(
      dataset,
      typedFormat,
      bulkAvailability,
      bulkDataApproval
    );
    const filename = `taxsorted-uk-${dataset.id}-v${dataset.schemaVersion.split(".", 1)[0]}.${typedFormat === "ndjson" ? "ndjson" : typedFormat}`;
    const contentLocation = `${DATASETS_ROOT}/${dataset.id}/download?format=${typedFormat}`;
    return deterministicResponse(c, body, MEDIA_TYPES[typedFormat], {
      contentLocation,
      dataset,
      schemaVersion: dataset.schemaVersion,
      attachmentFilename: filename,
    });
  });

  app.get("/datasets/:datasetId", (c) => {
    const dataset = findPoliticsOpenDataset(c.req.param("datasetId"));
    if (!dataset) return datasetNotFound(c);
    if (!bulkDataAvailable) return stopped(c);
    const body = canonicalJson(datasetEnvelope(dataset, bulkAvailability, bulkDataApproval));
    return deterministicResponse(c, body, MEDIA_TYPES.json, {
      contentLocation: `${DATASETS_ROOT}/${dataset.id}`,
      dataset,
      schemaVersion: dataset.schemaVersion,
    });
  });

  return app;
}
