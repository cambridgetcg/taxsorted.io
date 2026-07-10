import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { requireApiKey } from "./api-key.js";
import { sdltRoutes } from "./routes/sdlt.js";
import { ukTaxIndustrySchema } from "./uk-tax-industry.js";
import { ukTaxSystemSchema } from "./uk-tax-system.js";

const MAX_CALCULATION_BODY_BYTES = 16 * 1024;

function requestIdFor(c: { get: (key: "requestId") => string }): string {
  return c.get("requestId") ?? "unavailable";
}

const TaxSystemCollection = z.enum([
  "actors",
  "relationships",
  "frameworks",
  "rules",
  "accounts",
  "systems",
  "permissions",
  "pipeline",
  "cases",
  "sources",
  "gaps",
]);
const TaxSystemQuery = z.object({
  q: z.string().max(100).optional(),
  kind: z.string().optional(),
  sector: z.string().optional(),
  category: z.string().optional(),
  layer: z.string().optional(),
  lane: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  authority: z.string().optional(),
  jurisdiction: z.string().optional(),
  actorId: z.string().optional(),
  stageId: z.string().optional(),
  ruleId: z.string().optional(),
  systemId: z.string().optional(),
  sourceId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});
const PublicJson = z.object({}).passthrough().openapi("UkTaxSystemResponse");

const TaxIndustryCollection = z.enum([
  "sources",
  "institutions",
  "roles",
  "qualifications",
  "gates",
  "pathways",
  "study",
  "compensation",
  "barriers",
  "gaps",
]);
const TaxIndustryQuery = z.object({
  q: z.string().max(100).optional(),
  kind: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  legalStatus: z.string().optional(),
  type: z.string().optional(),
  gateId: z.string().optional(),
  roleId: z.string().optional(),
  qualificationId: z.string().optional(),
  institutionId: z.string().optional(),
  sourceId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});
const TaxIndustryPublicJson = z.object({}).passthrough().openapi("UkTaxIndustryResponse");

const ContentLicence = z
  .object({ name: z.string(), url: z.string().url() })
  .openapi("ContentLicence");
const OpenDataRecord = z
  .object({ id: z.string().describe("Stable, dataset-wide record identifier.") })
  .passthrough()
  .openapi("OpenDataRecord");
const DictionaryField = z
  .object({
    name: z.string(),
    field: z.string(),
    type: z.string(),
    required: z.boolean(),
    requiredWithin: z.string(),
    nullable: z.boolean(),
    meaning: z.string(),
    allowedValues: z.array(z.unknown()).optional(),
  })
  .openapi("DictionaryField");
const DictionaryCollection = z
  .object({
    pathName: z.string(),
    corpusKey: z.string(),
    description: z.string(),
    count: z.number().int().nonnegative(),
    identityField: z.literal("id"),
    itemUrlTemplate: z.string(),
    queryUrl: z.string(),
    queryFilters: z.array(z.string()),
    schemaPointer: z.string().url(),
    references: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
    csvColumns: z.array(z.string()),
    fields: z.array(DictionaryField),
  })
  .openapi("DictionaryCollection");
const DataDictionary = z
  .object({
    schema: z.literal("taxsorted.open-data-dictionary/1"),
    dataset: z.string(),
    corpusSchema: z.string(),
    version: z.string(),
    reviewedOn: z.string(),
    structuralSchema: z.string().url(),
    corrections: z.string().url(),
    validation: z.object({
      structuralSchema: z.string(),
      bootOnlyInvariants: z.array(z.string()),
    }),
    conventions: z.record(z.string(), z.string()),
    formats: z.record(z.string(), z.string()),
    collections: z.array(DictionaryCollection),
  })
  .openapi("DataDictionary");
const ExportFormatLink = z
  .object({
    href: z.string(),
    type: z.string(),
    mediaType: z.string(),
    filename: z.string(),
    bytes: z.number().int().nonnegative(),
    etag: z.string(),
  })
  .openapi("ExportFormatLink");
const ExportCollection = z
  .object({
    pathName: z.string(),
    corpusKey: z.string(),
    count: z.number().int().nonnegative(),
    available: z.boolean(),
    csvColumns: z.array(z.string()),
    formats: z.object({
      json: ExportFormatLink,
      ndjson: ExportFormatLink,
      csv: ExportFormatLink,
    }),
  })
  .openapi("ExportCollection");
const DatasetExportIndex = z
  .object({
    schema: z.literal("taxsorted.open-data-exports/1"),
    dataset: z.string(),
    version: z.string(),
    reviewedOn: z.string(),
    licence: ContentLicence,
    attribution: z.string(),
    attributionInstructions: z.string(),
    corrections: z.string().url(),
    rules: z.record(z.string(), z.string()),
    collections: z.array(ExportCollection),
  })
  .openapi("DatasetExportIndex");
const OpenDataDataset = z
  .object({
    id: z.string(),
    title: z.string(),
    jurisdiction: z.string(),
    schema: z.string(),
    version: z.string(),
    reviewedOn: z.string().nullable(),
    updatePolicy: z.object({
      cadence: z.string(),
      nextReleaseDate: z.string().nullable(),
    }),
    correctionChannel: z.object({
      publicUrl: z.string().url(),
      accountRequired: z.boolean(),
      privateOrSensitiveIntakeAvailable: z.boolean(),
      warning: z.string(),
    }),
    publication: z.object({
      fullDatasetAvailable: z.boolean(),
      reviewBoundary: z.string(),
      notConfidentiality: z.string(),
    }),
    licence: z.object({}).passthrough(),
    attribution: z.string(),
    resources: z.record(z.string(), z.union([z.string(), z.null()])),
    datasetCount: z.number().int().nonnegative().optional(),
  })
  .passthrough()
  .openapi("OpenDataDataset");
const OpenDataCatalog = z
  .object({
    schema: z.literal("taxsorted.open-data-catalog/1"),
    title: z.string(),
    purpose: z.string(),
    access: z.object({
      authentication: z.literal("none"),
      price: z.literal("free"),
      methods: z.array(z.enum(["GET", "HEAD", "OPTIONS"])),
      cors: z.literal("*"),
      formats: z.array(z.enum(["json", "ndjson", "csv"])),
      openApi: z.string(),
      rateLimits: z.string(),
      availability: z.string(),
    }),
    reuse: z.object({
      taxSortedCurationLicence: ContentLicence,
      rights: z.string(),
      sourceRights: z.string(),
      noKeyRequired: z.literal(true),
      mirroring: z.string(),
      corrections: z.string().url(),
    }),
    datasets: z.array(OpenDataDataset),
  })
  .openapi("OpenDataCatalog");
const OpenDataRights = z
  .object({
    schema: z.literal("taxsorted.open-data-rights/1"),
    status: z.literal("mixed-rights-read-before-reuse"),
    curation: z.object({}).passthrough(),
    curationAppliesTo: z.string(),
    sourceMaterial: z.string(),
    automationRule: z.string(),
    datasetRights: z.record(z.string(), z.string()),
    publicIssueTracker: z.string().url(),
    correctionChannel: z.object({
      publicUrl: z.string().url(),
      accountRequired: z.boolean(),
      privateOrSensitiveIntakeAvailable: z.boolean(),
      warning: z.string(),
    }),
  })
  .openapi("OpenDataRights");
const ExportFormat = z.enum(["json", "ndjson", "csv"]);
const ConditionalRequestHeaders = z.object({
  "If-None-Match": z
    .string()
    .optional()
    .describe("Validator from a previous response for this same URL and format."),
});

const publicResponseHeaders = {
  ETag: {
    description: "Strong validator for the exact response representation.",
    schema: { type: "string" as const },
  },
  "Cache-Control": {
    description: "Public cache policy with bounded revalidation.",
    schema: { type: "string" as const },
  },
  Link: {
    description: "Canonical, licence, schema and alternate representation links.",
    schema: { type: "string" as const },
  },
  "Content-Location": {
    description: "Location of this representation; follow Link rel=canonical when it is an alias.",
    schema: { type: "string" as const },
  },
  "X-Corpus-Version": {
    description: "Reviewed tax-corpus version when the response belongs to a tax graph.",
    schema: { type: "string" as const },
  },
  "X-Corpus-Reviewed-On": {
    description: "Tax-corpus review date when the response belongs to a tax graph.",
    schema: { type: "string" as const },
  },
};
const taxExportResponseHeaders = {
  ...publicResponseHeaders,
  "Content-Disposition": {
    description: "Versioned download filename.",
    schema: { type: "string" as const },
  },
};
const redirectResponseHeaders = {
  ...publicResponseHeaders,
  Location: {
    description: "Canonical route to request instead.",
    schema: { type: "string" as const },
  },
};
const PoliticsPublicJson = z.object({}).passthrough().openapi("UkPoliticsOpenDataResponse");
const PoliticsDatasetField = z
  .object({
    name: z.string(),
    types: z.array(z.string()),
    nullable: z.boolean(),
    optional: z.boolean(),
    required: z.boolean(),
    csvEncoding: z.enum(["scalar", "canonical-json-in-cell"]),
  })
  .openapi("UkPoliticsDatasetField");
const PoliticsDatasetDescriptor = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    availability: z.enum([
      "open",
      "development-preview",
      "approved-disabled",
      "publication-review",
      "emergency-stopped",
    ]),
    authentication: z.literal("none"),
    containsPersonalRecords: z.literal(false),
    schemaVersion: z.string(),
    datasetVersion: z.string(),
    primaryKey: z.literal("id"),
    recordCount: z.number().int().nonnegative(),
    fields: z.array(PoliticsDatasetField),
    sourceIds: z.array(z.string()),
    links: z.object({}).passthrough(),
    distributions: z.array(z.object({}).passthrough()),
  })
  .passthrough()
  .openapi("UkPoliticsDatasetDescriptor");
const PoliticsDatasetCatalogue = z
  .object({
    schema: z.literal("taxsorted.uk.open-dataset-catalog/1"),
    title: z.string(),
    purpose: z.string(),
    access: z.object({}).passthrough(),
    licence: z.object({}).passthrough(),
    datasets: z.array(PoliticsDatasetDescriptor),
    queryServices: z.array(z.object({}).passthrough()),
    links: z.object({}).passthrough(),
  })
  .passthrough()
  .openapi("UkPoliticsDatasetCatalogue");
const PoliticsDatasetEnvelope = z
  .object({
    schema: z.literal("taxsorted.open-dataset/1"),
    dataset: PoliticsDatasetDescriptor,
    data: z.array(OpenDataRecord),
    links: z.object({}).passthrough(),
  })
  .openapi("UkPoliticsDatasetEnvelope");
const PoliticsDatasetId = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .openapi({ example: "enforcement-institutions" });
const PoliticsDownloadFormat = z.enum(["json", "csv", "ndjson"]);

const politicsRepresentationHeaders = {
  ...publicResponseHeaders,
  "Content-Location": {
    description: "Canonical location represented by this response.",
    schema: { type: "string" as const },
  },
  "Last-Modified": {
    description: "Snapshot date used by the static representation.",
    schema: { type: "string" as const },
  },
  "X-Checksum-SHA256": {
    description: "Lowercase hexadecimal SHA-256 of the exact response bytes.",
    schema: { type: "string" as const },
  },
};
const politicsDatasetHeaders = {
  ...politicsRepresentationHeaders,
  "X-Dataset-Id": {
    description: "Stable dataset or catalogue identifier.",
    schema: { type: "string" as const },
  },
  "X-Dataset-Version": {
    description: "Content-derived version of the current dataset or catalogue.",
    schema: { type: "string" as const },
  },
  "X-Schema-Version": {
    description: "Semantic schema version for this dataset.",
    schema: { type: "string" as const },
  },
  "X-Record-Count": {
    description: "Number of complete records in the representation.",
    schema: { type: "integer" as const, minimum: 0 },
  },
};
const politicsDownloadHeaders = {
  ...politicsDatasetHeaders,
  "Content-Disposition": {
    description: "Safe, version-named attachment filename.",
    schema: { type: "string" as const },
  },
};

function registerOpenDataOpenApi(app: OpenAPIHono) {
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/open-data",
    operationId: "listOpenDataDatasets",
    summary: "Discover TaxSorted public datasets",
    description:
      "Public, sessionless catalog of tax-system, tax-industry and politics/public-integrity datasets, licences, review dates, schemas, dictionaries and bulk exports. No API key is read or required.",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Open-data catalog and reuse contract.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: OpenDataCatalog } },
      },
      304: {
        description: "This exact catalog representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/open-data/rights",
    operationId: "getOpenDataRights",
    summary: "Read the curation and source-rights boundary",
    description:
      "Machine-readable warning that TaxSorted's curation licence does not replace source-specific rights or personal-data duties.",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Mixed-rights statement and dataset-specific rights routes.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: OpenDataRights } },
      },
      304: {
        description: "This exact rights statement is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  for (const route of [
    ["/v1/open-data", "Check the open-data catalogue"],
    ["/v1/open-data/rights", "Check the mixed-rights statement"],
  ] as const) {
    app.openAPIRegistry.registerPath({
      method: "head",
      path: route[0],
      summary: route[1],
      description: "Returns the same validators and links as GET without a response body.",
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: { description: "Current representation metadata.", headers: publicResponseHeaders },
        304: { description: "The supplied ETag still identifies this representation.", headers: publicResponseHeaders },
        400: { description: "Static routes do not accept query parameters." },
      },
    });
  }
}

function registerTaxSystemOpenApi(app: OpenAPIHono) {
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk",
    operationId: "getUkTaxSystemOverview",
    summary: "Map the UK tax system",
    description:
      "Public, sessionless overview of actors, authority, accounts, collection lanes, permissions, evidence and known gaps.",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Dataset overview, route map, counts and review boundary.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: PublicJson } },
      },
      304: { description: "This exact overview is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/map",
    operationId: "redirectUkTaxSystemMap",
    summary: "Follow the legacy UK tax-system map route",
    description: "Compatibility redirect to the canonical tax-system overview.",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      308: { description: "Permanent redirect to /v1/tax-system/uk.", headers: redirectResponseHeaders },
      304: { description: "The redirect representation is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/{collection}",
    operationId: "queryUkTaxSystemCollection",
    summary: "Query a UK tax-system collection",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxSystemCollection }),
      query: TaxSystemQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Filtered records with paging and provenance metadata.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: PublicJson } },
      },
      304: { description: "This exact query representation is unchanged.", headers: publicResponseHeaders },
      400: { description: "Unknown or invalid filter." },
      503: { description: "Full graph publication remains closed; sources and gaps stay public." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/{collection}/{id}",
    operationId: "getUkTaxSystemRecord",
    summary: "Read one evidence-backed UK tax-system record",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxSystemCollection, id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description: "The record and its resolved sources; actor records include joined relations.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: PublicJson } },
      },
      404: { description: "No record with that ID in the collection." },
      304: { description: "This exact record representation is unchanged.", headers: publicResponseHeaders },
      400: { description: "Detail routes do not accept query parameters." },
      503: { description: "Full graph publication remains closed." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/graph",
    operationId: "downloadUkTaxSystemGraph",
    summary: "Download the complete reviewed UK tax-system graph",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "The complete static corpus, including source limitations and gaps.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: ukTaxSystemSchema } },
      },
      304: { description: "The supplied ETag still identifies this exact graph.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
      503: { description: "Full graph publication remains closed." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/manifest",
    operationId: "getUkTaxSystemManifest",
    summary: "Read the UK tax-system release manifest",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Version, review date, deterministic graph-byte SHA-256, counts, licence and distribution links.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: PublicJson } },
      },
      304: { description: "This exact manifest is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/schema",
    operationId: "getUkTaxSystemSchema",
    summary: "Read the structural UK tax-system JSON Schema",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Structural JSON Schema generated from the Zod record shape; the dictionary lists boot-only graph invariants.",
        headers: publicResponseHeaders,
        content: { "application/schema+json": { schema: PublicJson } },
      },
      304: { description: "This exact schema is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/dictionary",
    operationId: "getUkTaxSystemDictionary",
    summary: "Read the plain-language UK tax-system data dictionary",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Collection aliases, meanings, filters, references, CSV columns and reuse conventions.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: DataDictionary } },
      },
      304: { description: "This exact dictionary is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/exports",
    operationId: "listUkTaxSystemExports",
    summary: "List complete UK tax-system collection exports",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Format links, filenames, sizes and exact-byte ETags for every collection.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: DatasetExportIndex } },
      },
      304: { description: "This exact export index is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/exports/{collection}/{format}",
    operationId: "downloadUkTaxSystemCollection",
    summary: "Download one complete UK tax-system collection",
    description:
      "JSON and NDJSON use lossless TaxSorted deterministic JSON (not RFC 8785/JCS). CSV keeps nested values as deterministic JSON and mitigates common spreadsheet-formula prefixes.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxSystemCollection, format: ExportFormat }),
    },
    security: [],
    responses: {
      200: {
        description: "Complete, unpaginated collection attachment.",
        headers: taxExportResponseHeaders,
        content: {
          "application/json": { schema: z.array(OpenDataRecord) },
          "application/x-ndjson": { schema: z.string() },
          "text/csv": { schema: z.string() },
        },
      },
      304: { description: "This exact export format is unchanged.", headers: taxExportResponseHeaders },
      400: { description: "Static export routes do not accept query parameters." },
      404: { description: "Unknown collection or format." },
      503: { description: "This collection is still inside the publication review boundary." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-system/uk/map",
    operationId: "headUkTaxSystemMapRedirect",
    summary: "Check the legacy UK tax-system map redirect",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      308: { description: "Permanent redirect metadata.", headers: redirectResponseHeaders },
      304: { description: "The redirect representation is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });

  for (const [path, operationId, summary, mayBeClosed] of [
    ["/v1/tax-system/uk", "headUkTaxSystemOverview", "Check the UK tax-system overview", false],
    ["/v1/tax-system/uk/graph", "headUkTaxSystemGraph", "Check the complete UK tax-system graph", true],
    ["/v1/tax-system/uk/manifest", "headUkTaxSystemManifest", "Check the UK tax-system manifest", false],
    ["/v1/tax-system/uk/schema", "headUkTaxSystemSchema", "Check the UK tax-system structural schema", false],
    ["/v1/tax-system/uk/dictionary", "headUkTaxSystemDictionary", "Check the UK tax-system dictionary", false],
    ["/v1/tax-system/uk/exports", "headUkTaxSystemExports", "Check the UK tax-system export index", false],
  ] as const) {
    app.openAPIRegistry.registerPath({
      method: "head",
      path,
      operationId,
      summary,
      description: "Returns the same validators and links as GET without a response body.",
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: mayBeClosed
        ? {
            200: { description: "Current representation metadata.", headers: publicResponseHeaders },
            304: { description: "The supplied ETag still identifies this representation.", headers: publicResponseHeaders },
            400: { description: "Static routes do not accept query parameters." },
            503: { description: "Full graph publication remains closed." },
          }
        : {
            200: { description: "Current representation metadata.", headers: publicResponseHeaders },
            304: { description: "The supplied ETag still identifies this representation.", headers: publicResponseHeaders },
            400: { description: "Static routes do not accept query parameters." },
          },
    });
  }
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-system/uk/{collection}",
    operationId: "headUkTaxSystemCollectionQuery",
    summary: "Check a UK tax-system collection query",
    description: "Returns the GET query's validators and links without its response body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxSystemCollection }),
      query: TaxSystemQuery,
    },
    security: [],
    responses: {
      200: { description: "Current query metadata.", headers: publicResponseHeaders },
      304: { description: "The supplied ETag still identifies this query representation.", headers: publicResponseHeaders },
      400: { description: "Unknown or invalid filter." },
      503: { description: "Full graph publication remains closed; sources and gaps stay public." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-system/uk/{collection}/{id}",
    operationId: "headUkTaxSystemRecord",
    summary: "Check one UK tax-system record",
    description: "Returns the record's validators and links without its response body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxSystemCollection, id: z.string() }),
    },
    security: [],
    responses: {
      200: { description: "Current record metadata.", headers: publicResponseHeaders },
      304: { description: "The supplied ETag still identifies this record representation.", headers: publicResponseHeaders },
      400: { description: "Detail routes do not accept query parameters." },
      404: { description: "No record with that ID in the collection." },
      503: { description: "Full graph publication remains closed." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-system/uk/exports/{collection}/{format}",
    operationId: "headUkTaxSystemCollectionExport",
    summary: "Check one UK tax-system collection export",
    description: "Returns download validators, size-independent links and filename without the export body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxSystemCollection, format: ExportFormat }),
    },
    security: [],
    responses: {
      200: { description: "Current export metadata.", headers: taxExportResponseHeaders },
      304: { description: "The supplied ETag still identifies this export.", headers: taxExportResponseHeaders },
      400: { description: "Static export routes do not accept query parameters." },
      404: { description: "Unknown collection or format." },
      503: { description: "This collection is still inside the publication review boundary." },
    },
  });
}

function registerTaxIndustryOpenApi(app: OpenAPIHono) {
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk",
    operationId: "getUkTaxIndustryOverview",
    summary: "Map entry into the UK tax-services industry",
    description:
      "Public, sessionless overview of roles, qualifications, legal and market gates, pathways, pay evidence, barriers and source limitations.",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Dataset overview, route map, counts and review boundary.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: TaxIndustryPublicJson } },
      },
      304: { description: "This exact overview is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/map",
    operationId: "redirectUkTaxIndustryMap",
    summary: "Follow the legacy UK tax-industry map route",
    description: "Compatibility redirect to the canonical tax-industry overview.",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      308: { description: "Permanent redirect to /v1/tax-industry/uk.", headers: redirectResponseHeaders },
      304: { description: "The redirect representation is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/{collection}",
    operationId: "queryUkTaxIndustryCollection",
    summary: "Query a UK tax-industry collection",
    description:
      "Filters are collection-specific; unsupported filters return 400. Pathway gateId and qualificationId filters inspect pathway steps.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxIndustryCollection }),
      query: TaxIndustryQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Filtered records with paging and provenance metadata.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: TaxIndustryPublicJson } },
      },
      400: { description: "Unknown or invalid filter." },
      304: { description: "This exact query representation is unchanged.", headers: publicResponseHeaders },
      503: { description: "Full map publication remains closed; sources and gaps stay public." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/{collection}/{id}",
    operationId: "getUkTaxIndustryRecord",
    summary: "Read one evidence-backed UK tax-industry record",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxIndustryCollection, id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description: "The record, resolved sources and relevant joined records.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: TaxIndustryPublicJson } },
      },
      404: { description: "No record with that ID in the collection." },
      304: { description: "This exact record representation is unchanged.", headers: publicResponseHeaders },
      400: { description: "Detail routes do not accept query parameters." },
      503: { description: "Full map publication remains closed." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/graph",
    operationId: "downloadUkTaxIndustryGraph",
    summary: "Download the complete reviewed UK tax-industry graph",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "The complete static corpus, including source limitations and gaps.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: ukTaxIndustrySchema } },
      },
      304: { description: "The supplied ETag still identifies this exact graph.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
      503: { description: "Full map publication remains closed." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/manifest",
    operationId: "getUkTaxIndustryManifest",
    summary: "Read the UK tax-industry release manifest",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Version, review date, deterministic graph-byte SHA-256, counts, licence and distribution links.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: TaxIndustryPublicJson } },
      },
      304: { description: "This exact manifest is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/schema",
    operationId: "getUkTaxIndustrySchema",
    summary: "Read the structural UK tax-industry JSON Schema",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Structural JSON Schema generated from the Zod record shape; the dictionary lists boot-only graph and cross-field invariants.",
        headers: publicResponseHeaders,
        content: { "application/schema+json": { schema: TaxIndustryPublicJson } },
      },
      304: { description: "This exact schema is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/dictionary",
    operationId: "getUkTaxIndustryDictionary",
    summary: "Read the plain-language UK tax-industry data dictionary",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Collection aliases, meanings, filters, references, CSV columns and reuse conventions.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: DataDictionary } },
      },
      304: { description: "This exact dictionary is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/exports",
    operationId: "listUkTaxIndustryExports",
    summary: "List complete UK tax-industry collection exports",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Format links, filenames, sizes and exact-byte ETags for every collection.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: DatasetExportIndex } },
      },
      304: { description: "This exact export index is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/exports/{collection}/{format}",
    operationId: "downloadUkTaxIndustryCollection",
    summary: "Download one complete UK tax-industry collection",
    description:
      "JSON and NDJSON use lossless TaxSorted deterministic JSON (not RFC 8785/JCS). CSV keeps nested values as deterministic JSON and mitigates common spreadsheet-formula prefixes.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxIndustryCollection, format: ExportFormat }),
    },
    security: [],
    responses: {
      200: {
        description: "Complete, unpaginated collection attachment.",
        headers: taxExportResponseHeaders,
        content: {
          "application/json": { schema: z.array(OpenDataRecord) },
          "application/x-ndjson": { schema: z.string() },
          "text/csv": { schema: z.string() },
        },
      },
      304: { description: "This exact export format is unchanged.", headers: taxExportResponseHeaders },
      400: { description: "Static export routes do not accept query parameters." },
      404: { description: "Unknown collection or format." },
      503: { description: "This collection is still inside the publication review boundary." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-industry/uk/map",
    operationId: "headUkTaxIndustryMapRedirect",
    summary: "Check the legacy UK tax-industry map redirect",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      308: { description: "Permanent redirect metadata.", headers: redirectResponseHeaders },
      304: { description: "The redirect representation is unchanged.", headers: publicResponseHeaders },
      400: { description: "Static routes do not accept query parameters." },
    },
  });

  for (const [path, operationId, summary, mayBeClosed] of [
    ["/v1/tax-industry/uk", "headUkTaxIndustryOverview", "Check the UK tax-industry overview", false],
    ["/v1/tax-industry/uk/graph", "headUkTaxIndustryGraph", "Check the complete UK tax-industry graph", true],
    ["/v1/tax-industry/uk/manifest", "headUkTaxIndustryManifest", "Check the UK tax-industry manifest", false],
    ["/v1/tax-industry/uk/schema", "headUkTaxIndustrySchema", "Check the UK tax-industry structural schema", false],
    ["/v1/tax-industry/uk/dictionary", "headUkTaxIndustryDictionary", "Check the UK tax-industry dictionary", false],
    ["/v1/tax-industry/uk/exports", "headUkTaxIndustryExports", "Check the UK tax-industry export index", false],
  ] as const) {
    app.openAPIRegistry.registerPath({
      method: "head",
      path,
      operationId,
      summary,
      description: "Returns the same validators and links as GET without a response body.",
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: mayBeClosed
        ? {
            200: { description: "Current representation metadata.", headers: publicResponseHeaders },
            304: { description: "The supplied ETag still identifies this representation.", headers: publicResponseHeaders },
            400: { description: "Static routes do not accept query parameters." },
            503: { description: "Full map publication remains closed." },
          }
        : {
            200: { description: "Current representation metadata.", headers: publicResponseHeaders },
            304: { description: "The supplied ETag still identifies this representation.", headers: publicResponseHeaders },
            400: { description: "Static routes do not accept query parameters." },
          },
    });
  }
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-industry/uk/{collection}",
    operationId: "headUkTaxIndustryCollectionQuery",
    summary: "Check a UK tax-industry collection query",
    description: "Returns the GET query's validators and links without its response body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxIndustryCollection }),
      query: TaxIndustryQuery,
    },
    security: [],
    responses: {
      200: { description: "Current query metadata.", headers: publicResponseHeaders },
      304: { description: "The supplied ETag still identifies this query representation.", headers: publicResponseHeaders },
      400: { description: "Unknown or invalid filter." },
      503: { description: "Full map publication remains closed; sources and gaps stay public." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-industry/uk/{collection}/{id}",
    operationId: "headUkTaxIndustryRecord",
    summary: "Check one UK tax-industry record",
    description: "Returns the record's validators and links without its response body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxIndustryCollection, id: z.string() }),
    },
    security: [],
    responses: {
      200: { description: "Current record metadata.", headers: publicResponseHeaders },
      304: { description: "The supplied ETag still identifies this record representation.", headers: publicResponseHeaders },
      400: { description: "Detail routes do not accept query parameters." },
      404: { description: "No record with that ID in the collection." },
      503: { description: "Full map publication remains closed." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-industry/uk/exports/{collection}/{format}",
    operationId: "headUkTaxIndustryCollectionExport",
    summary: "Check one UK tax-industry collection export",
    description: "Returns download validators, size-independent links and filename without the export body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxIndustryCollection, format: ExportFormat }),
    },
    security: [],
    responses: {
      200: { description: "Current export metadata.", headers: taxExportResponseHeaders },
      304: { description: "The supplied ETag still identifies this export.", headers: taxExportResponseHeaders },
      400: { description: "Static export routes do not accept query parameters." },
      404: { description: "Unknown collection or format." },
      503: { description: "This collection is still inside the publication review boundary." },
    },
  });
}

function registerPoliticsOpenApi(app: OpenAPIHono) {
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk",
    summary: "Discover the open UK politics API",
    description:
      "Public, sessionless entry point for political-system, public-integrity and reusable bulk datasets. No API key is required.",
    security: [],
    responses: {
      200: {
        description: "Access policy and links to the dataset catalogue, manifest, sources and OpenAPI document.",
        headers: politicsRepresentationHeaders,
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      304: { description: "The supplied ETag still identifies the current representation.", headers: politicsRepresentationHeaders },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets",
    summary: "List reusable UK politics datasets",
    description:
      "Stable dataset IDs, fields, record counts, source IDs, reuse notes, update cadence and JSON/CSV/NDJSON download links.",
    security: [],
    responses: {
      200: {
        description: "The deterministic open dataset catalogue.",
        headers: politicsDatasetHeaders,
        content: { "application/json": { schema: PoliticsDatasetCatalogue } },
      },
      304: { description: "The supplied ETag still identifies the current catalogue.", headers: politicsDatasetHeaders },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/manifest",
    summary: "Read the UK politics dataset manifest",
    description: "Compatibility alias for the canonical /v1/politics/uk/datasets catalogue.",
    security: [],
    responses: {
      200: {
        description: "The deterministic open dataset catalogue.",
        headers: politicsDatasetHeaders,
        content: { "application/json": { schema: PoliticsDatasetCatalogue } },
      },
      304: { description: "The supplied ETag still identifies the current catalogue.", headers: politicsDatasetHeaders },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets/schema",
    summary: "Read the shared catalogue and dataset-envelope JSON Schema",
    security: [],
    responses: {
      200: {
        description: "JSON Schema for the catalogue and TaxSorted open-dataset envelope.",
        headers: politicsRepresentationHeaders,
        content: { "application/schema+json": { schema: PoliticsPublicJson } },
      },
      304: { description: "The supplied ETag still identifies the schema.", headers: politicsRepresentationHeaders },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets/rights",
    summary: "Read the mixed-rights and reuse boundary",
    description:
      "Explains which TaxSorted-written layers use CC BY-SA 4.0 and why linked source material keeps source-specific terms.",
    security: [],
    responses: {
      200: {
        description: "Machine-readable curation and source-rights boundary.",
        headers: politicsRepresentationHeaders,
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      304: { description: "The supplied ETag still identifies the rights statement.", headers: politicsRepresentationHeaders },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets/admissions",
    summary: "Read every dataset admission record and pending human decision",
    description:
      "Publishes the purpose, coverage limit, field contract, rights decision, foreseeable risks and mitigations recorded for each bulk dataset.",
    security: [],
    responses: {
      200: {
        description: "Machine-readable admission ledger; human approval remains pending.",
        headers: politicsDatasetHeaders,
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      304: { description: "The supplied ETag still identifies the admission ledger.", headers: politicsDatasetHeaders },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets/{datasetId}",
    summary: "Read one complete dataset screened for public distribution",
    security: [],
    request: { params: z.object({ datasetId: PoliticsDatasetId }) },
    responses: {
      200: {
        description: "Dataset descriptor, stable records and distribution links.",
        headers: politicsDatasetHeaders,
        content: { "application/json": { schema: PoliticsDatasetEnvelope } },
      },
      304: { description: "The supplied ETag still identifies this representation.", headers: politicsDatasetHeaders },
      404: { description: "No screened static dataset has that ID." },
      503: { description: "Bulk publication is awaiting approval or has been emergency-stopped." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets/{datasetId}/schema",
    summary: "Read a dataset's record JSON Schema",
    security: [],
    request: { params: z.object({ datasetId: PoliticsDatasetId }) },
    responses: {
      200: {
        description: "JSON Schema and the stable field contract for one record.",
        headers: politicsDatasetHeaders,
        content: { "application/schema+json": { schema: PoliticsPublicJson } },
      },
      304: { description: "The supplied ETag still identifies the schema.", headers: politicsDatasetHeaders },
      404: { description: "No screened static dataset has that ID." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets/{datasetId}/download",
    summary: "Download a complete UK politics dataset",
    description:
      "JSON is a self-describing envelope; CSV uses the catalogue field order and canonical JSON for nested cells; NDJSON contains one canonical record per line.",
    security: [],
    request: {
      params: z.object({ datasetId: PoliticsDatasetId }),
      query: z.object({ format: PoliticsDownloadFormat }),
    },
    responses: {
      200: {
        description: "A deterministic attachment with representation-specific ETag and checksum headers.",
        headers: politicsDownloadHeaders,
        content: {
          "application/json": { schema: PoliticsDatasetEnvelope },
          "text/csv": { schema: z.string() },
          "application/x-ndjson": { schema: z.string() },
        },
      },
      304: { description: "The supplied ETag still identifies the requested format.", headers: politicsDownloadHeaders },
      400: { description: "Choose exactly one supported format." },
      404: { description: "No screened static dataset has that ID." },
      503: { description: "Bulk publication is awaiting approval or has been emergency-stopped." },
    },
  });

  for (const route of [
    { path: "/v1/politics/uk", summary: "Check UK politics API discovery metadata" },
    { path: "/v1/politics/uk/datasets/schema", summary: "Check the shared open-data schema" },
    { path: "/v1/politics/uk/datasets/rights", summary: "Check the mixed-rights statement" },
  ] as const) {
    app.openAPIRegistry.registerPath({
      method: "head",
      path: route.path,
      summary: route.summary,
      description: "Returns the same validators and metadata as GET, without a response body.",
      security: [],
      responses: {
        200: { description: "Current representation metadata.", headers: politicsRepresentationHeaders },
        304: { description: "The supplied ETag still identifies this representation.", headers: politicsRepresentationHeaders },
      },
    });
  }

  for (const route of [
    { path: "/v1/politics/uk/datasets", summary: "Check the UK politics dataset catalogue" },
    { path: "/v1/politics/uk/manifest", summary: "Check the UK politics dataset manifest" },
    { path: "/v1/politics/uk/datasets/admissions", summary: "Check the dataset admission ledger" },
  ] as const) {
    app.openAPIRegistry.registerPath({
      method: "head",
      path: route.path,
      summary: route.summary,
      description: "Returns the same validators and metadata as GET, without a response body.",
      security: [],
      responses: {
        200: { description: "Current representation metadata.", headers: politicsDatasetHeaders },
        304: { description: "The supplied ETag still identifies this representation.", headers: politicsDatasetHeaders },
      },
    });
  }

  for (const route of [
    { path: "/v1/politics/uk/datasets/{datasetId}", summary: "Check one UK politics dataset" },
    { path: "/v1/politics/uk/datasets/{datasetId}/schema", summary: "Check one dataset record schema" },
  ] as const) {
    app.openAPIRegistry.registerPath({
      method: "head",
      path: route.path,
      summary: route.summary,
      description: "Returns the same validators and metadata as GET, without a response body.",
      security: [],
      request: { params: z.object({ datasetId: PoliticsDatasetId }) },
      responses: {
        200: { description: "Current representation metadata.", headers: politicsDatasetHeaders },
        304: { description: "The supplied ETag still identifies this representation.", headers: politicsDatasetHeaders },
        404: { description: "No screened static dataset has that ID." },
      },
    });
  }

  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/politics/uk/datasets/{datasetId}/download",
    summary: "Check one downloadable UK politics representation",
    description: "Returns the attachment metadata and exact-format validator without a response body.",
    security: [],
    request: {
      params: z.object({ datasetId: PoliticsDatasetId }),
      query: z.object({ format: PoliticsDownloadFormat }),
    },
    responses: {
      200: { description: "Current attachment metadata.", headers: politicsDownloadHeaders },
      304: { description: "The supplied ETag still identifies this format.", headers: politicsDownloadHeaders },
      400: { description: "Choose exactly one supported format." },
      404: { description: "No screened static dataset has that ID." },
      503: { description: "Bulk publication is awaiting approval or has been emergency-stopped." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/relationships/contracts",
    summary: "Query public contract awards with verified supplier disclosure",
    description:
      "Queries a bounded Contracts Finder award window. Direct contacts and addresses are removed, and supplier names require a verified public organisation identifier.",
    security: [],
    request: {
      query: z.object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        take: z.coerce.number().int().min(1).max(20).optional(),
        cursor: z.string().min(1).max(2_000).optional(),
      }),
    },
    responses: {
      200: {
        description: "A page of source-linked awards; supplier names require a verified public organisation identifier.",
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      422: { description: "Invalid dates, span, page size or cursor." },
      502: { description: "The named official source failed or changed shape." },
      504: { description: "The named official source timed out." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/enforcement/forces",
    summary: "List police-force institutions from data.police.uk",
    description: "Returns institutional force IDs and names, not an officer roster.",
    security: [],
    responses: {
      200: {
        description: "The current institution directory and its stated territorial gaps.",
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      502: { description: "The named official source failed or changed shape." },
      504: { description: "The named official source timed out." },
    },
  });

  const staticPoliticsRoutes = [
    ["/v1/politics/uk/system", "Read the non-personal UK political-system map"],
    ["/v1/politics/uk/elections/process", "Read the UK Parliamentary election process"],
    ["/v1/politics/uk/funding/rules", "Read effective-dated campaign-finance rules"],
    ["/v1/politics/uk/funding/public", "Read public political-funding schemes"],
    ["/v1/politics/uk/power/method", "Read the political office-power method"],
    ["/v1/politics/uk/power/offices", "List political office-power cards"],
    ["/v1/politics/uk/budgets/accountability", "Read public-money accountability lanes"],
    ["/v1/politics/uk/relationships/method", "Read the relationship-evidence method"],
    ["/v1/politics/uk/relationships/schema", "Read the evidence-event schema"],
    ["/v1/politics/uk/relationships/datasets", "Read finance-source publication states"],
    ["/v1/politics/uk/enforcement/method", "Read the enforcement evidence method"],
    ["/v1/politics/uk/enforcement/institutions", "List enforcement and oversight institutions"],
    ["/v1/politics/uk/enforcement/governance", "Read enforcement governance relationships"],
    ["/v1/politics/uk/enforcement/ranks", "Read generic police rank families"],
    ["/v1/politics/uk/enforcement/pay-benefits", "Read police pay and benefit evidence"],
    ["/v1/politics/uk/enforcement/workforce", "Read aggregate workforce source coverage"],
    ["/v1/politics/uk/enforcement/funding", "Read enforcement funding source coverage"],
    ["/v1/politics/uk/enforcement/vacancies", "Read official enforcement recruitment routes"],
    ["/v1/politics/uk/enforcement/activities", "Read safe institutional activity coverage"],
    ["/v1/politics/uk/enforcement/private-security", "Read the private-security boundary"],
    ["/v1/politics/uk/enforcement/power/method", "Read the enforcement office-power method"],
    ["/v1/politics/uk/enforcement/power/offices", "List enforcement office-power cards"],
    ["/v1/politics/uk/enforcement/communication-method", "Read the official-language analysis method"],
    ["/v1/politics/uk/integrity", "Read the public-integrity scope and publication state"],
    ["/v1/politics/uk/integrity/sources", "Read the public-integrity source registry"],
    ["/v1/politics/uk/integrity/corrections", "Read the correction and restriction method"],
    ["/v1/politics/uk/history/method", "Read the effective-dated political-history method"],
    ["/v1/politics/uk/law/watch", "Read proposed political-system legislation"],
    ["/v1/politics/uk/sources", "Read politics coverage, sources, licences and gaps"],
  ] as const;

  for (const [path, summary] of staticPoliticsRoutes) {
    app.openAPIRegistry.registerPath({
      method: "get",
      path,
      summary,
      security: [],
      responses: {
        200: {
          description: "Source-linked public reference data.",
          content: { "application/json": { schema: PoliticsPublicJson } },
        },
        503: { description: "Bulk publication is awaiting approval or has been emergency-stopped." },
      },
    });
  }

  const dynamicPoliticsRoutes = [
    ["/v1/politics/uk/power/offices/{officeId}", "officeId", "Read one political office-power card"],
    ["/v1/politics/uk/enforcement/institutions/{institutionId}", "institutionId", "Read one enforcement institution"],
    ["/v1/politics/uk/enforcement/power/offices/{officeId}", "officeId", "Read one enforcement office-power card"],
    ["/v1/politics/uk/enforcement/forces/{forceId}", "forceId", "Read one police-force institution"],
    ["/v1/politics/uk/enforcement/forces/{forceId}/leaders", "forceId", "Read separately gated force-published senior officers"],
  ] as const;

  for (const [path, parameter, summary] of dynamicPoliticsRoutes) {
    app.openAPIRegistry.registerPath({
      method: "get",
      path,
      summary,
      security: [],
      request: {
        params: z.object({ [parameter]: z.string().min(1).max(200) }),
      },
      responses: {
        200: {
          description: "Source-linked public response.",
          content: { "application/json": { schema: PoliticsPublicJson } },
        },
        404: { description: "No matching public record." },
        503: { description: "A named-data or bulk-data safety gate is closed." },
      },
    });
  }

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/people",
    summary: "Search current Parliament people when the publication gate is open",
    security: [],
    request: {
      query: z.object({
        q: z.string().max(100).optional(),
        house: z.enum(["all", "commons", "lords"]).optional(),
        partyId: z.coerce.number().int().positive().optional(),
        skip: z.coerce.number().int().min(0).max(10_000).optional(),
        take: z.coerce.number().int().min(1).max(20).optional(),
      }),
    },
    responses: {
      200: { description: "A bounded page of current members.", content: { "application/json": { schema: PoliticsPublicJson } } },
      422: { description: "Invalid query." },
      503: { description: "The current-person publication gate is closed." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/people/{id}",
    summary: "Read one current Parliament person when the publication gate is open",
    security: [],
    request: { params: z.object({ id: z.coerce.number().int().positive().max(100_000) }) },
    responses: {
      200: { description: "One current member and purpose-bound public records.", content: { "application/json": { schema: PoliticsPublicJson } } },
      404: { description: "The person was not found or is not current." },
      503: { description: "The current-person publication gate is closed." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/parties",
    summary: "List active Parliamentary parties",
    security: [],
    request: { query: z.object({ house: z.enum(["all", "commons", "lords"]).optional() }) },
    responses: {
      200: { description: "Active parties by selected House.", content: { "application/json": { schema: PoliticsPublicJson } } },
      422: { description: "Invalid House." },
      503: { description: "The current politics publication gate is closed." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/roles",
    summary: "List current government or opposition posts",
    security: [],
    request: { query: z.object({ kind: z.enum(["government", "opposition"]) }) },
    responses: {
      200: { description: "Current posts and holders.", content: { "application/json": { schema: PoliticsPublicJson } } },
      422: { description: "Invalid role kind." },
      503: { description: "The current-person publication gate is closed." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/funding/donations",
    summary: "Query verified-company political donations when both gates are open",
    security: [],
    request: {
      query: z.object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        recipient: z.string().max(100).optional(),
        skip: z.coerce.number().int().min(0).max(100_000).optional(),
        take: z.coerce.number().int().min(1).max(100).optional(),
      }),
    },
    responses: {
      200: { description: "A bounded company-only donation page.", content: { "application/json": { schema: PoliticsPublicJson } } },
      422: { description: "Invalid dates or pagination." },
      503: { description: "Reuse confirmation or privacy review is not complete." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/relationships/ministerial-benefits",
    summary: "Query monthly ministerial gifts and hospitality when its gate is open",
    security: [],
    request: {
      query: z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        department: z.string().min(1).max(100),
        type: z.enum(["all", "gift", "hospitality"]).optional(),
      }),
    },
    responses: {
      200: { description: "Source-reported monthly records without name-based joining.", content: { "application/json": { schema: PoliticsPublicJson } } },
      404: { description: "No matching published attachment." },
      422: { description: "Invalid month, department or record type." },
      503: { description: "The ministerial-benefits publication gate is closed." },
    },
  });
}

/** Register the machine API before any browser-session middleware is added. */
export function registerDeveloperApi(app: OpenAPIHono, apiOrigin: string) {
  app.openAPIRegistry.registerComponent("securitySchemes", "WorkspaceKey", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "ts_test_<32-byte-secret>",
    description:
      "A TaxSorted workspace key. The SDLT calculation route requires the sdlt:calculate scope.",
  });
  registerOpenDataOpenApi(app);
  registerTaxSystemOpenApi(app);
  registerTaxIndustryOpenApi(app);
  registerPoliticsOpenApi(app);

  app.use(
    "/v1/uk/sdlt/*",
    bodyLimit({
      maxSize: MAX_CALCULATION_BODY_BYTES,
      onError: (c) =>
        c.json(
          {
            error: "request_too_large",
            message: "Keep calculation requests at or below 16 KiB.",
            requestId: requestIdFor(c),
          },
          413
        ),
    })
  );
  app.use("/v1/uk/sdlt/*", async (c, next) => {
    if (c.req.method === "POST") {
      const mediaType = c.req.header("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase();
      if (mediaType !== "application/json") {
        return c.json(
          {
            error: "unsupported_media_type",
            message: "Send calculation facts as application/json.",
            requestId: requestIdFor(c),
          },
          415
        );
      }
    }
    await next();
  });
  app.use("/v1/uk/sdlt/*", requireApiKey("sdlt:calculate"));
  app.route("/v1/uk/sdlt", sdltRoutes);

  app.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "TaxSorted API",
      version: "0.1.0",
      description:
        "Deterministic, effective-dated tax decisions and reviewed public maps, with primary sources and explicit review boundaries. TaxSorted-authored documentation, summaries and curation use CC BY-SA 4.0; linked sources retain their own terms; the server source code uses AGPL-3.0.",
      license: {
        name: "CC BY-SA 4.0 (API documentation and TaxSorted-authored curation)",
        url: "https://creativecommons.org/licenses/by-sa/4.0/",
      },
    },
    servers: [{ url: apiOrigin }],
  });
}
