// Public, static map of entry into the UK tax-services industry. Requests are
// sessionless; non-source detail responses resolve the surrounding gates and evidence.

import { createHash } from "node:crypto";
import { Hono, type Context } from "hono";
import { z } from "zod";
import {
  attachmentContentDisposition,
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
  serializeCsv,
  serializeNdjson,
} from "../open-data.js";
import {
  allowedValuesFromJsonSchema,
  fieldsFromJsonSchema,
} from "../open-data-dictionary.js";
import { problemDetails, type ProblemNextAction } from "../problem-details.js";
import {
  ukTaxIndustry,
  ukTaxIndustrySchema,
  type UkTaxIndustry,
} from "../uk-tax-industry.js";

const basePath = "/v1/tax-industry/uk";
const correctionsUrl = "https://github.com/cambridgetcg/taxsorted.io/issues";
const rightsUrl = "/v1/open-data/rights";
const exportFormats = ["json", "ndjson", "csv"] as const;
type ExportFormat = (typeof exportFormats)[number];

type CollectionName =
  | "sources"
  | "institutions"
  | "roles"
  | "qualifications"
  | "gates"
  | "pathways"
  | "studyResources"
  | "compensation"
  | "barriers"
  | "transparencyGaps";

const paths: Record<string, CollectionName> = {
  sources: "sources",
  institutions: "institutions",
  roles: "roles",
  qualifications: "qualifications",
  gates: "gates",
  pathways: "pathways",
  study: "studyResources",
  compensation: "compensation",
  barriers: "barriers",
  gaps: "transparencyGaps",
};

const publicWhenClosed = new Set(["sources", "gaps"]);
const commonQueryKeys = ["q", "limit", "offset"] as const;
type ExactFilterKey =
  | "kind"
  | "category"
  | "status"
  | "legalStatus"
  | "type"
  | "gateId"
  | "roleId"
  | "qualificationId"
  | "institutionId"
  | "sourceId";

const filterKeysByCollection: Record<CollectionName, readonly ExactFilterKey[]> = {
  sources: ["status", "sourceId"],
  institutions: ["kind", "sourceId"],
  roles: ["category", "gateId", "qualificationId", "sourceId"],
  qualifications: ["status", "institutionId", "sourceId"],
  gates: ["type", "legalStatus", "roleId", "qualificationId", "institutionId", "sourceId"],
  pathways: ["gateId", "roleId", "qualificationId", "sourceId"],
  studyResources: ["qualificationId", "institutionId", "sourceId"],
  compensation: ["roleId", "institutionId", "sourceId"],
  barriers: ["type", "gateId", "qualificationId", "institutionId", "sourceId"],
  transparencyGaps: [
    "status",
    "gateId",
    "roleId",
    "qualificationId",
    "institutionId",
    "sourceId",
  ],
};

const advertisedFilterKeys = [
  ...new Set([
    ...commonQueryKeys,
    ...Object.values(filterKeysByCollection).flat(),
  ]),
];

const collectionDescriptions: Record<CollectionName, string> = {
  sources:
    "The reviewed source ledger: authority, freshness, reuse status, supported claims and explicit limits.",
  institutions:
    "Public authorities, regulators, professional bodies, firms, trainers and software platforms, including their origins, funding and limits.",
  roles:
    "Kinds of tax work, showing reserved acts, generally open work, entry routes and risk boundaries separately.",
  qualifications:
    "Qualifications and memberships, with entry rules, assessments, experience, costs, maintenance and what each credential does not authorise.",
  gates:
    "Legal, regulatory, platform, professional and employer gates, each with its trigger, controller, burden and lawful low-friction route.",
  pathways:
    "Ordered routes from a stated starting point to a defined role or capability, including optional steps and stop conditions.",
  studyResources:
    "Official and commercial study material, with access, cost, coverage and limitations.",
  compensation:
    "Dated pay and firm-economics evidence whose unlike measures remain deliberately separate.",
  barriers:
    "How access barriers work, who creates them, their stated rationale, who bears them and available safeguards or alternatives.",
  transparencyGaps:
    "Known missing, conflicting, time-sensitive or deliberately bounded evidence.",
};

const referenceTargets: Record<CollectionName, Record<string, string | string[]>> = {
  sources: {},
  institutions: {
    taxSystemRefs: "/v1/tax-system/uk (record ID may belong to any collection)",
    sourceIds: "sources",
  },
  roles: {
    requiredGateIds: "gates",
    conditionalGateIds: "gates",
    commonQualificationIds: "qualifications",
    pathwayIds: "pathways",
    compensationIds: "compensation",
    taxSystemRefs: "/v1/tax-system/uk (record ID may belong to any collection)",
    sourceIds: "sources",
  },
  qualifications: {
    awardingInstitutionIds: "institutions",
    studyResourceIds: "study",
    sourceIds: "sources",
  },
  gates: {
    controllerInstitutionIds: "institutions",
    roleIds: "roles",
    qualificationIds: "qualifications",
    taxSystemRefs: "/v1/tax-system/uk (record ID may belong to any collection)",
    sourceIds: "sources",
  },
  pathways: {
    targetRoleIds: "roles",
    "steps[].gateId": "gates",
    "steps[].qualificationId": "qualifications",
    sourceIds: "sources",
  },
  studyResources: {
    providerInstitutionIds: "institutions",
    qualificationIds: "qualifications",
    sourceIds: "sources",
  },
  compensation: {
    roleIds: "roles",
    institutionIds: "institutions",
    sourceIds: "sources",
  },
  barriers: {
    createdByInstitutionIds: "institutions",
    gateIds: "gates",
    qualificationIds: "qualifications",
    sourceIds: "sources",
  },
  transparencyGaps: {
    affectedIds: Object.keys(paths),
    sourceIds: "sources",
  },
};

const schemaDocument = {
  $id: `https://api.taxsorted.io${basePath}/schema`,
  title: "TaxSorted UK tax-industry corpus",
  ...z.toJSONSchema(ukTaxIndustrySchema),
};

const mediaTypes: Record<ExportFormat, string> = {
  json: "application/json; charset=utf-8",
  ndjson: "application/x-ndjson; charset=utf-8",
  csv: "text/csv; charset=utf-8",
};

type Identified = { id: string; sourceIds?: string[] } & Record<string, unknown>;
type RecordLocation = {
  path: string;
  corpusKey: CollectionName;
  data: Identified;
};

function itemsFor(corpus: UkTaxIndustry, name: CollectionName): Identified[] {
  return corpus[name] as unknown as Identified[];
}

function recordIndex(corpus: UkTaxIndustry) {
  const records = new Map<string, RecordLocation>();
  for (const [path, corpusKey] of Object.entries(paths)) {
    for (const data of itemsFor(corpus, corpusKey)) {
      if (records.has(data.id)) {
        throw new Error(`Duplicate UK tax-industry record ID: ${data.id}`);
      }
      records.set(data.id, { path, corpusKey, data });
    }
  }
  return records;
}

function columnsFor(rows: readonly Identified[], name: CollectionName) {
  const schemaProperties = (
    schemaDocument as { properties?: Record<string, { items?: { properties?: Record<string, unknown> } }> }
  ).properties?.[name]?.items?.properties;
  return [...new Set([...
    Object.keys(schemaProperties ?? {}),
    ...rows.flatMap((row) => Object.keys(row)),
  ])].sort();
}

function exportBody(rows: readonly Identified[], name: CollectionName, format: ExportFormat) {
  if (format === "json") return canonicalJson(rows);
  if (format === "ndjson") return serializeNdjson(rows);
  return serializeCsv(rows, { columns: columnsFor(rows, name) });
}

function exportFilename(path: string, version: string, format: ExportFormat) {
  const safeVersion = version.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `taxsorted-uk-tax-industry-${path}-${safeVersion}.${format}`;
}

function exportLinks(path: string) {
  return Object.fromEntries(
    exportFormats.map((format) => [
      format,
      {
        href: `${basePath}/exports/${path}/${format}`,
        type: mediaTypes[format].split(";", 1)[0],
        mediaType: mediaTypes[format].split(";", 1)[0],
      },
    ])
  );
}

function collectionDictionary(corpus: UkTaxIndustry) {
  return Object.entries(paths).map(([path, name]) => ({
    pathName: path,
    corpusKey: name,
    description: collectionDescriptions[name],
    count: itemsFor(corpus, name).length,
    identityField: "id",
    itemUrlTemplate: `${basePath}/${path}/{id}`,
    queryUrl: `${basePath}/${path}`,
    queryFilters: [...commonQueryKeys, ...filterKeysByCollection[name]],
    schemaPointer: `https://api.taxsorted.io${basePath}/schema#/properties/${name}/items`,
    references: referenceTargets[name],
    csvColumns: columnsFor(itemsFor(corpus, name), name),
    fields: fieldsFromJsonSchema(
      schemaDocument,
      name,
      path === "study" ? "study resource" : path.replace(/s$/, ""),
      referenceTargets[name]
    ),
  }));
}

function dictionary(corpus: UkTaxIndustry) {
  return {
    schema: "taxsorted.open-data-dictionary/1",
    dataset: "uk-tax-industry",
    corpusSchema: corpus.schema,
    version: corpus.meta.version,
    reviewedOn: corpus.meta.reviewedOn,
    structuralSchema: `https://api.taxsorted.io${basePath}/schema`,
    corrections: correctionsUrl,
    validation: {
      structuralSchema:
        "Describes record fields, required values, scalar types and enums. It is not the complete boot acceptance contract.",
      bootOnlyInvariants: [
        "Calendar dates must be real dates, not only YYYY-MM-DD-shaped strings.",
        "IDs are unique across the dataset and every typed reference resolves.",
        "Field evidence resolves to a declared source and an existing non-provenance JSON Pointer.",
        "Role, gate, pathway, study-resource and compensation edges satisfy their reciprocal graph rules.",
        "Pathway step orders are unique and contiguous from 1.",
        "Money records contain exactly one amount or range and no inverted range.",
        "An institution has an exact origin date or a bounded origin period.",
      ],
    },
    conventions: {
      ids:
        "Record IDs are opaque, dataset-wide identifiers. Use the whole value, not its apparent words, and never use array position as identity.",
      idStability:
        "A display name may change without changing its ID. A retired ID will not be reused for a different meaning. A tombstone feed is not yet available, so mirrors must compare corpus versions.",
      references:
        "Fields ending in Id or Ids normally contain IDs from the collection named below. Mixed-target fields are labelled explicitly.",
      evidence:
        "sourceIds joins to sources. evidence entries say which source supports which JSON Pointer fields, where the supporting passage was found and when it was observed.",
      sourceLimits:
        "supports states the permitted inference; doesNotProve prevents a source from carrying a stronger claim than it supports.",
      missingValues:
        "An empty array means no value is recorded for that plural field. null means the field applies but no value is available. An omitted optional field is not present in that record.",
      dates: "Calendar dates use ISO 8601 YYYY-MM-DD. They carry no time of day.",
      money:
        "amountGbp and rangeGbp are decimal pound amounts from dated evidence, not minor-unit transaction values or personal earnings promises.",
      ordering:
        "Corpus order is curated for reading and is not a ranking. Within one version it is stable; use IDs when joining or comparing versions.",
      schemaCompatibility:
        "The final /1 in corpusSchema is the meaning-compatible major. The published schema is snapshot-specific and rejects unknown fields; strict validators must fetch the schema matching the corpus version, while forward-compatible readers should tolerate new optional fields. Removing a field or changing its type or meaning requires a new major.",
      search:
        "q is a case-insensitive substring search over the complete serialized record, including provenance text. Exact filters are safer for legal or relational questions.",
    },
    formats: {
      json:
        "Lossless UTF-8 array in TaxSorted deterministic JSON: object keys sorted recursively, compact encoding, array order preserved. This is not RFC 8785/JCS.",
      ndjson:
        "Lossless UTF-8 JSON Lines using the same TaxSorted deterministic form: one complete record per line.",
      csv:
        "Spreadsheet convenience format, not a security boundary. Nested arrays and objects use TaxSorted deterministic JSON. A leading apostrophe mitigates common formula triggers beginning =, +, - or @, including after ASCII whitespace; importer behavior varies.",
    },
    collections: collectionDictionary(corpus),
  };
}

function exportIndex(corpus: UkTaxIndustry, publicDataEnabled: boolean) {
  return {
    schema: "taxsorted.open-data-exports/1",
    dataset: "uk-tax-industry",
    version: corpus.meta.version,
    reviewedOn: corpus.meta.reviewedOn,
    licence: corpus.meta.contentLicence,
    attribution: `TaxSorted (taxsorted.io), “${corpus.meta.title}”, version ${corpus.meta.version}, https://api.taxsorted.io${basePath}/graph, ${corpus.meta.contentLicence.name} (${corpus.meta.contentLicence.url}).`,
    attributionInstructions:
      "Keep this attribution with reused copies and state whether you changed the material.",
    corrections: correctionsUrl,
    rules: {
      completeness: "Each file contains the complete, unpaginated collection for this corpus version.",
      json: "Lossless TaxSorted deterministic JSON; not RFC 8785/JCS.",
      ndjson: "Lossless TaxSorted deterministic JSON; one record per line with a final newline.",
      csv: "Spreadsheet convenience copy that mitigates common formula triggers; nested values remain deterministic JSON inside cells.",
      etag: "Each listed ETag is a SHA-256 validator for the exact bytes of that format, not a signature.",
      closedMetadata:
        "When a hosted release is paused, counts, columns, byte lengths and hashes remain public by design. The switch is not a confidentiality boundary and the corpus belongs only in a public repository after approval.",
    },
    collections: Object.entries(paths).map(([path, name]) => {
      const rows = itemsFor(corpus, name);
      const available = publicDataEnabled || publicWhenClosed.has(path);
      return {
        pathName: path,
        corpusKey: name,
        count: rows.length,
        available,
        csvColumns: columnsFor(rows, name),
        formats: Object.fromEntries(
          exportFormats.map((format) => {
            const body = exportBody(rows, name, format);
            return [
              format,
              {
                ...exportLinks(path)[format],
                filename: exportFilename(path, corpus.meta.version, format),
                bytes: Buffer.byteLength(body),
                etag: representationEtag(body),
              },
            ];
          })
        ),
      };
    }),
  };
}

function relativeUrl(c: Context) {
  const url = new URL(c.req.url);
  return `${url.pathname}${url.search}`;
}

function cacheHeaders(
  c: Context,
  corpus: UkTaxIndustry,
  etag: string,
  canonicalPath: string,
  alternates: Array<{ href: string; type: string }> = [],
  linkCanonicalPath = canonicalPath
) {
  // Keep publication rollback bounded. The production switch is an off-switch,
  // so protected bodies must not remain serveable from a day-long stale cache.
  c.header("Cache-Control", "public, max-age=300, must-revalidate");
  c.header("X-Corpus-Version", corpus.meta.version);
  c.header("X-Corpus-Reviewed-On", corpus.meta.reviewedOn);
  c.header("ETag", etag);
  c.header("Content-Language", "en-GB");
  c.header("Content-Location", canonicalPath);
  c.header("X-Content-Type-Options", "nosniff");
  c.header(
    "Link",
    [
      `<${linkCanonicalPath}>; rel="canonical"`,
      `<${rightsUrl}>; rel="license"`,
      `<${correctionsUrl}>; rel="help"`,
      `<${basePath}/dictionary>; rel="describedby"; type="application/json"`,
      `<${basePath}/schema>; rel="describedby"; type="application/schema+json"`,
      `</openapi/tax-industry-uk.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
      `</openapi.json>; rel="related"; type="application/vnd.oai.openapi+json;version=3.1"; title="Full API"`,
      ...alternates.map(
        (alternate) =>
          `<${alternate.href}>; rel="alternate"; type="${alternate.type}"`
      ),
    ].join(", ")
  );
}

function cacheableRepresentation(
  c: Context,
  corpus: UkTaxIndustry,
  body: string,
  canonicalPath: string,
  contentType: string,
  options: {
    disposition?: string;
    alternates?: Array<{ href: string; type: string }>;
    etag?: string;
    canonicalLocation?: string;
  } = {}
) {
  const etag = options.etag ?? representationEtag(body);
  cacheHeaders(
    c,
    corpus,
    etag,
    canonicalPath,
    options.alternates,
    options.canonicalLocation ?? canonicalPath
  );
  if (options.disposition) c.header("Content-Disposition", options.disposition);
  if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
    return c.body(null, 304);
  }
  return c.body(body, 200, { "Content-Type": contentType });
}

function cacheableJson(
  c: Context,
  corpus: UkTaxIndustry,
  value: unknown,
  options: { canonicalLocation?: string } = {}
) {
  return cacheableRepresentation(
    c,
    corpus,
    canonicalJson(value),
    relativeUrl(c),
    "application/json; charset=utf-8",
    options
  );
}

function publicProblem(
  c: Context,
  status: 400 | 404 | 503,
  error: string,
  detail: string,
  extensions: Readonly<Record<string, unknown>> = {},
  nextActions: readonly ProblemNextAction[] = []
) {
  return problemDetails(c, status, {
    error,
    detail,
    extensions,
    nextActions,
  });
}

function rejectStaticQuery(c: Context) {
  const parameters = [...new URL(c.req.url).searchParams.keys()];
  if (parameters.length === 0) return undefined;
  return publicProblem(
    c,
    400,
    "unknown_query_parameter",
    "This static resource does not accept query parameters.",
    { parameters: [...new Set(parameters)].sort() },
    [
      {
        method: "GET",
        href: c.req.path,
        description: "Retry the same public resource without a query string.",
      },
    ]
  );
}

function evidenceFor(corpus: UkTaxIndustry, item: Identified) {
  const sourceIds = new Set(item.sourceIds ?? []);
  return corpus.sources.filter((source) => sourceIds.has(source.id));
}

function includesValue(item: Identified, fields: string[], value: string) {
  return fields.some((field) => {
    const candidate = item[field];
    return candidate === value || (Array.isArray(candidate) && candidate.includes(value));
  });
}

function pathwayStepIncludes(item: Identified, field: "gateId" | "qualificationId", value: string) {
  const steps = item.steps;
  return Array.isArray(steps) && steps.some(
    (step) =>
      typeof step === "object" &&
      step !== null &&
      (step as Record<string, unknown>)[field] === value
  );
}

function exactFilter(
  collection: CollectionName,
  item: Identified,
  key: ExactFilterKey,
  value: string
) {
  if (key === "sourceId") {
    return collection === "sources"
      ? item.id === value
      : includesValue(item, ["sourceIds"], value);
  }
  if (key === "gateId") {
    if (collection === "roles") {
      return includesValue(item, ["requiredGateIds", "conditionalGateIds"], value);
    }
    if (collection === "pathways") return pathwayStepIncludes(item, "gateId", value);
    if (collection === "barriers") return includesValue(item, ["gateIds"], value);
    if (collection === "transparencyGaps") return includesValue(item, ["affectedIds"], value);
    return false;
  }
  if (key === "roleId") {
    if (collection === "gates" || collection === "compensation") {
      return includesValue(item, ["roleIds"], value);
    }
    if (collection === "pathways") return includesValue(item, ["targetRoleIds"], value);
    if (collection === "transparencyGaps") return includesValue(item, ["affectedIds"], value);
    return false;
  }
  if (key === "qualificationId") {
    if (collection === "roles") return includesValue(item, ["commonQualificationIds"], value);
    if (collection === "gates" || collection === "studyResources" || collection === "barriers") {
      return includesValue(item, ["qualificationIds"], value);
    }
    if (collection === "pathways") return pathwayStepIncludes(item, "qualificationId", value);
    if (collection === "transparencyGaps") return includesValue(item, ["affectedIds"], value);
    return false;
  }
  if (key === "institutionId") {
    const fieldsByCollection: Partial<Record<CollectionName, string[]>> = {
      qualifications: ["awardingInstitutionIds"],
      gates: ["controllerInstitutionIds"],
      studyResources: ["providerInstitutionIds"],
      compensation: ["institutionIds"],
      barriers: ["createdByInstitutionIds"],
      transparencyGaps: ["affectedIds"],
    };
    return includesValue(item, fieldsByCollection[collection] ?? [], value);
  }
  const candidate = item[key];
  return candidate === value || (Array.isArray(candidate) && candidate.includes(value));
}

function validFilterValue(
  corpus: UkTaxIndustry,
  collection: CollectionName,
  key: ExactFilterKey,
  value: string
) {
  const idsByFilter: Partial<Record<ExactFilterKey, Set<string>>> = {
    gateId: new Set(corpus.gates.map((item) => item.id)),
    roleId: new Set(corpus.roles.map((item) => item.id)),
    qualificationId: new Set(corpus.qualifications.map((item) => item.id)),
    institutionId: new Set(corpus.institutions.map((item) => item.id)),
    sourceId: new Set(corpus.sources.map((item) => item.id)),
  };
  const knownIds = idsByFilter[key];
  if (knownIds) return knownIds.has(value);
  const allowed = allowedValuesFromJsonSchema(schemaDocument, collection, key);
  return allowed ? allowed.includes(value) : true;
}

function enriched(corpus: UkTaxIndustry, collection: CollectionName, item: Identified) {
  const id = item.id;
  const base = { data: item, evidence: evidenceFor(corpus, item) };
  if (collection === "institutions") {
    return {
      ...base,
      qualifications: corpus.qualifications.filter((qualification) =>
        qualification.awardingInstitutionIds.includes(id)
      ),
      gates: corpus.gates.filter((gate) => gate.controllerInstitutionIds.includes(id)),
      compensation: corpus.compensation.filter((record) => record.institutionIds.includes(id)),
      barriers: corpus.barriers.filter((barrier) => barrier.createdByInstitutionIds.includes(id)),
    };
  }
  if (collection === "roles") {
    return {
      ...base,
      gates: corpus.gates.filter((gate) => gate.roleIds.includes(id)),
      qualifications: corpus.qualifications.filter((qualification) =>
        (item.commonQualificationIds as string[]).includes(qualification.id)
      ),
      pathways: corpus.pathways.filter((pathway) => pathway.targetRoleIds.includes(id)),
      compensation: corpus.compensation.filter((record) => record.roleIds.includes(id)),
    };
  }
  if (collection === "qualifications") {
    return {
      ...base,
      studyResources: corpus.studyResources.filter((resource) =>
        resource.qualificationIds.includes(id)
      ),
      pathways: corpus.pathways.filter((pathway) =>
        pathway.steps.some((step) => step.qualificationId === id)
      ),
      gates: corpus.gates.filter((gate) => gate.qualificationIds.includes(id)),
      barriers: corpus.barriers.filter((barrier) => barrier.qualificationIds.includes(id)),
    };
  }
  return base;
}

export type UkTaxIndustryRouteOptions = {
  corpus?: UkTaxIndustry;
  publicDataEnabled?: boolean;
};

export function createUkTaxIndustryRoutes(options: UkTaxIndustryRouteOptions = {}) {
  // A route is one immutable release snapshot. Copy caller-owned data so a
  // later mutation cannot split precomputed exports from query/detail views.
  const corpus = structuredClone(options.corpus ?? ukTaxIndustry);
  const publicDataEnabled = options.publicDataEnabled ?? false;
  const app = new Hono();
  const graphRepresentation = canonicalJson(corpus);
  const datasetHash = createHash("sha256").update(graphRepresentation).digest("hex");
  const schemaRepresentation = canonicalJson(schemaDocument);
  const dictionaryRepresentation = canonicalJson(dictionary(corpus));
  const exportIndexRepresentation = canonicalJson(exportIndex(corpus, publicDataEnabled));
  const graphEtag = representationEtag(graphRepresentation);
  const schemaEtag = representationEtag(schemaRepresentation);
  const dictionaryEtag = representationEtag(dictionaryRepresentation);
  const exportIndexEtag = representationEtag(exportIndexRepresentation);
  const records = recordIndex(corpus);
  const exportRepresentations = new Map<string, { body: string; etag: string }>();
  for (const [path, name] of Object.entries(paths)) {
    const rows = itemsFor(corpus, name);
    for (const format of exportFormats) {
      const body = exportBody(rows, name, format);
      exportRepresentations.set(`${path}/${format}`, {
        body,
        etag: representationEtag(body),
      });
    }
  }

  app.use("*", async (c, next) => {
    const relativePath = c.req.path.startsWith(basePath)
      ? c.req.path.slice(basePath.length)
      : c.req.path;
    const segments = relativePath.split("/").filter(Boolean);
    const collection = segments[0];
    const resolverRequest = segments[0] === "records" && segments.length === 2;
    const resolvedRecord = resolverRequest
      ? records.get(segments[1])
      : undefined;
    const collectionName = collection ? paths[collection] : undefined;
    const exportCollection = segments[0] === "exports" ? paths[segments[1]] : undefined;
    const exportFormat = segments[2] as ExportFormat | undefined;
    const protectedExport =
      segments.length === 3 &&
      exportCollection !== undefined &&
      exportFormat !== undefined &&
      exportFormats.includes(exportFormat) &&
      !publicWhenClosed.has(segments[1]);
    const protectedPath =
      collection === "graph" ||
      (collectionName !== undefined &&
        (segments.length === 1 || segments.length === 2) &&
        !publicWhenClosed.has(collection)) ||
      protectedExport;

    const protectedResolver =
      resolverRequest &&
      (!resolvedRecord || !publicWhenClosed.has(resolvedRecord.path));

    if (!publicDataEnabled && (protectedPath || protectedResolver)) {
      const message =
        "The reviewed source ledger and gap register remain public while the full industry map is closed.";
      return publicProblem(
        c,
        503,
        "publication_review_pending",
        message,
        {
          message,
          sources: "/v1/tax-industry/uk/sources",
          gaps: "/v1/tax-industry/uk/gaps",
        },
        [
          {
            method: "GET",
            href: `${basePath}/sources`,
            description: "Read the reviewed source ledger that remains public.",
          },
          {
            method: "GET",
            href: `${basePath}/gaps`,
            description: "Read the known gap register that remains public.",
          },
        ]
      );
    }
    await next();
  });

  app.get("/", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    const body = {
      meta: corpus.meta,
      manifest: {
        datasetHash: `sha256:${datasetHash}`,
        datasetHashAlgorithm: "sha256(taxsorted-deterministic-json-utf8)",
        publicDataEnabled,
      },
      counts: Object.fromEntries(
        Object.entries(paths).map(([path, name]) => [path, itemsFor(corpus, name).length])
      ),
      routes: {
        fullGraph: "/v1/tax-industry/uk/graph",
        collections: Object.keys(paths).map((path) => `/v1/tax-industry/uk/${path}`),
        item: "/v1/tax-industry/uk/{collection}/{id}",
        record: `${basePath}/records/{id}`,
        filters: advertisedFilterKeys,
        schema: `${basePath}/schema`,
        dictionary: `${basePath}/dictionary`,
        exports: `${basePath}/exports`,
        export: `${basePath}/exports/{collection}/{json|ndjson|csv}`,
      },
      related: {
        collectionAndEnforcementPipeline: "/v1/tax-system/uk",
        openDataCatalog: "/v1/open-data",
        openApi: "/openapi.json",
      },
      startHere: [
        "Choose a role, then compare requiredGateIds with commonQualificationIds.",
        "Use pathways for a lawful walk-through and explicit stop conditions.",
        "Read barriers for who created each gate, its rationale, burden and lower-friction route.",
        "Treat compensation as dated evidence, never a personal earnings promise.",
        "Resolve every sourceId and read doesNotProve before relying on a claim.",
        "Use exports to take a complete copy; no account or API key is required.",
      ],
    };
    return cacheableJson(c, corpus, body);
  });

  app.get("/map", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    const body = "";
    const etag = representationEtag(body);
    cacheHeaders(c, corpus, etag, `${basePath}/map`, [], basePath);
    c.header("Location", basePath);
    if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
      return c.body(null, 304);
    }
    return c.body(body, 308);
  });

  app.get("/manifest", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    const body = {
      schema: corpus.schema,
      version: corpus.meta.version,
      reviewedOn: corpus.meta.reviewedOn,
      datasetHash: `sha256:${datasetHash}`,
      datasetHashAlgorithm:
        "SHA-256 of the UTF-8 bytes returned by /graph using TaxSorted deterministic JSON.",
      publicDataEnabled,
      counts: Object.fromEntries(
        Object.entries(paths).map(([path, name]) => [path, itemsFor(corpus, name).length])
      ),
      contentLicence: corpus.meta.contentLicence,
      schemaDocument: `${basePath}/schema`,
      dictionary: `${basePath}/dictionary`,
      exports: `${basePath}/exports`,
      recordResolver: `${basePath}/records/{id}`,
      corrections: correctionsUrl,
      idPolicy: {
        scope: "dataset-wide",
        syntax: "lowercase kebab-case",
        reuse: "A retired ID is not reused for a different meaning.",
        tombstones: "not yet published",
      },
      notComplete: true,
    };
    return cacheableJson(c, corpus, body);
  });

  app.get("/records/:id", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    const id = c.req.param("id");
    const resolved = records.get(id);
    if (!resolved) {
      const message = "No UK tax-industry record has this stable dataset ID.";
      return publicProblem(
        c,
        404,
        "not_found",
        message,
        {
          message,
          id,
        },
        [
          {
            method: "GET",
            href: basePath,
            description: "Discover collections, filters and bulk exports.",
          },
        ]
      );
    }
    const canonicalUrl = `${basePath}/${resolved.path}/${resolved.data.id}`;
    return cacheableJson(
      c,
      corpus,
      {
        collection: resolved.path,
        corpusKey: resolved.corpusKey,
        canonicalUrl,
        data: resolved.data,
        links: {
          self: `${basePath}/records/${resolved.data.id}`,
          canonical: canonicalUrl,
        },
      },
      { canonicalLocation: canonicalUrl }
    );
  });

  app.get("/graph", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    return cacheableRepresentation(
      c,
      corpus,
      graphRepresentation,
      `${basePath}/graph`,
      "application/json; charset=utf-8",
      { etag: graphEtag }
    );
  });

  app.get("/schema", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    return cacheableRepresentation(
      c,
      corpus,
      schemaRepresentation,
      `${basePath}/schema`,
      "application/schema+json; charset=utf-8",
      { etag: schemaEtag }
    );
  });

  app.get("/dictionary", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    return cacheableRepresentation(
      c,
      corpus,
      dictionaryRepresentation,
      `${basePath}/dictionary`,
      "application/json; charset=utf-8",
      { etag: dictionaryEtag }
    );
  });

  app.get("/exports", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    return cacheableRepresentation(
      c,
      corpus,
      exportIndexRepresentation,
      `${basePath}/exports`,
      "application/json; charset=utf-8",
      { etag: exportIndexEtag }
    );
  });

  app.get("/exports/:collection/:format", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    const path = c.req.param("collection");
    const name = paths[path];
    const format = c.req.param("format") as ExportFormat;
    if (!name || !exportFormats.includes(format)) {
      return publicProblem(
        c,
        404,
        "not_found",
        "The requested collection or export format is not part of this release.",
        {},
        [
          {
            method: "GET",
            href: `${basePath}/exports`,
            description: "Read the available export collections and formats.",
          },
        ]
      );
    }
    const links = exportLinks(path);
    const prepared = exportRepresentations.get(`${path}/${format}`)!;
    return cacheableRepresentation(
      c,
      corpus,
      prepared.body,
      `${basePath}/exports/${path}/${format}`,
      mediaTypes[format],
      {
        disposition: attachmentContentDisposition(
          exportFilename(path, corpus.meta.version, format)
        ),
        alternates: exportFormats
          .filter((candidate) => candidate !== format)
          .map((candidate) => links[candidate]),
        etag: prepared.etag,
      }
    );
  });

  for (const [path, name] of Object.entries(paths)) {
    app.get(`/${path}`, (c) => {
      const searchParams = new URL(c.req.url).searchParams;
      const allowedQueryKeys = new Set<string>([
        ...commonQueryKeys,
        ...filterKeysByCollection[name],
      ]);
      const unknown = [...searchParams.keys()].filter(
        (key) => !allowedQueryKeys.has(key)
      );
      if (unknown.length) {
        return publicProblem(
          c,
          400,
          "unknown_filter",
          "One or more filters are not available for this collection.",
          { filters: [...new Set(unknown)].sort() },
          [
            {
              method: "GET",
              href: `${basePath}/dictionary`,
              description: "Read the filters declared for each collection.",
            },
          ]
        );
      }
      const repeated = [...new Set(searchParams.keys())].filter(
        (key) => searchParams.getAll(key).length > 1
      );
      if (repeated.length) {
        return publicProblem(
          c,
          400,
          "repeated_filter",
          "Each filter may appear at most once in a collection query.",
          { filters: repeated.sort() },
          [
            {
              method: "GET",
              href: `${basePath}/${path}`,
              description: "Retry the collection with each filter at most once.",
            },
          ]
        );
      }
      const q = c.req.query("q")?.trim();
      if (q && q.length > 100) {
        return publicProblem(
          c,
          400,
          "query_too_long",
          "The text query exceeds the maximum length of 100 characters.",
          { maximum: 100 },
          [
            {
              method: "GET",
              href: `${basePath}/${path}`,
              description: "Retry with a text query of at most 100 characters.",
            },
          ]
        );
      }
      const rawLimit = c.req.query("limit");
      const rawOffset = c.req.query("offset");
      const limit = rawLimit === undefined ? 100 : Number(rawLimit);
      const offset = rawOffset === undefined ? 0 : Number(rawOffset);
      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100 ||
        !Number.isInteger(offset) ||
        offset < 0
      ) {
        return publicProblem(
          c,
          400,
          "invalid_page",
          "Collection pages require an integer limit from 1 to 100 and an offset of 0 or greater.",
          { limits: { limit: [1, 100], offset: "0 or greater" } },
          [
            {
              method: "GET",
              href: `${basePath}/${path}?limit=100&offset=0`,
              description: "Restart this collection with a valid first page.",
            },
          ]
        );
      }

      const filters = Object.fromEntries(
        filterKeysByCollection[name].flatMap(
          (key: ExactFilterKey) => {
            const value = c.req.query(key)?.trim();
            return value ? [[key, value]] : [];
          }
        )
      );
      for (const [key, value] of Object.entries(filters)) {
        if (!validFilterValue(corpus, name, key as ExactFilterKey, value)) {
          return publicProblem(
            c,
            400,
            "invalid_filter",
            "The filter value is outside the declared vocabulary or stable IDs.",
            { filter: key, value },
            [
              {
                method: "GET",
                href: `${basePath}/dictionary`,
                description: "Read the allowed filter values and identity rules.",
              },
            ]
          );
        }
      }
      let matches = itemsFor(corpus, name);
      if (q) {
        const needle = q.toLocaleLowerCase("en-GB");
        matches = matches.filter((item) =>
          JSON.stringify(item).toLocaleLowerCase("en-GB").includes(needle)
        );
      }
      for (const [key, value] of Object.entries(filters)) {
        matches = matches.filter((item) =>
          exactFilter(name, item, key as ExactFilterKey, value)
        );
      }
      const data = matches.slice(offset, offset + limit);
      const body = {
        data,
        page: { total: matches.length, returned: data.length, limit, offset },
        filters: { ...(q ? { q } : {}), ...filters },
        provenance: {
          corpusVersion: corpus.meta.version,
          reviewedOn: corpus.meta.reviewedOn,
          sourceLedger: "/v1/tax-industry/uk/sources",
          gaps: "/v1/tax-industry/uk/gaps",
        },
      };
      return cacheableJson(c, corpus, body);
    });

    app.get(`/${path}/:id`, (c) => {
      const invalidQuery = rejectStaticQuery(c);
      if (invalidQuery) return invalidQuery;
      const item = itemsFor(corpus, name).find((candidate) => candidate.id === c.req.param("id"));
      if (!item) {
        return publicProblem(
          c,
          404,
          "not_found",
          "No record with this exact ID exists in the requested collection.",
          { collection: path, id: c.req.param("id") },
          [
            {
              method: "GET",
              href: `${basePath}/${path}`,
              description: "Read the collection and its stable record IDs.",
            },
          ]
        );
      }
      const body = name === "sources" ? { data: item } : enriched(corpus, name, item);
      return cacheableJson(c, corpus, body);
    });
  }

  app.all("*", (c) => {
    return publicProblem(
      c,
      404,
      "not_found",
      "No read-only UK tax-industry route matches this path or method.",
      {},
      [
        {
          method: "GET",
          href: basePath,
          description: "Read the dataset overview and available routes.",
        },
      ]
    );
  });

  return app;
}
