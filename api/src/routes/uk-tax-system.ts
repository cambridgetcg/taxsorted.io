// Public, static UK tax-system graph. It never creates a taxpayer session and
// every non-source detail response resolves its evidence back to the source ledger.

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
import {
  ukTaxSystem,
  ukTaxSystemSchema,
  type UkTaxSystem,
} from "../uk-tax-system.js";

const basePath = "/v1/tax-system/uk";
const correctionsUrl = "https://github.com/cambridgetcg/taxsorted.io/issues";
const rightsUrl = "/v1/open-data/rights";
const exportFormats = ["json", "ndjson", "csv"] as const;
type ExportFormat = (typeof exportFormats)[number];

type CollectionName =
  | "sources"
  | "actors"
  | "relationships"
  | "frameworks"
  | "rules"
  | "accountTypes"
  | "systems"
  | "permissions"
  | "pipelineStages"
  | "cases"
  | "transparencyGaps";

const paths: Record<string, CollectionName> = {
  sources: "sources",
  actors: "actors",
  relationships: "relationships",
  frameworks: "frameworks",
  rules: "rules",
  accounts: "accountTypes",
  systems: "systems",
  permissions: "permissions",
  pipeline: "pipelineStages",
  cases: "cases",
  gaps: "transparencyGaps",
};

const publicWhenClosed = new Set(["sources", "gaps"]);
const commonQueryKeys = ["q", "limit", "offset"] as const;
type ExactFilterKey =
  | "kind"
  | "sector"
  | "category"
  | "layer"
  | "lane"
  | "status"
  | "type"
  | "authority"
  | "jurisdiction"
  | "actorId"
  | "stageId"
  | "ruleId"
  | "systemId"
  | "sourceId";

const filterKeysByCollection: Record<CollectionName, readonly ExactFilterKey[]> = {
  sources: ["status", "authority", "sourceId"],
  actors: ["kind", "sector", "jurisdiction", "sourceId"],
  relationships: ["type", "actorId", "sourceId"],
  frameworks: ["ruleId", "sourceId"],
  rules: ["kind", "actorId", "sourceId"],
  accountTypes: ["category", "actorId", "sourceId"],
  systems: ["layer", "actorId", "systemId", "sourceId"],
  permissions: ["category", "actorId", "sourceId"],
  pipelineStages: ["lane", "actorId", "stageId", "ruleId", "systemId", "sourceId"],
  cases: ["status", "actorId", "stageId", "sourceId"],
  transparencyGaps: ["status", "actorId", "stageId", "ruleId", "systemId", "sourceId"],
};

const advertisedFilterKeys = [
  ...new Set([...commonQueryKeys, ...Object.values(filterKeysByCollection).flat()]),
];

const collectionDescriptions: Record<CollectionName, string> = {
  sources:
    "The reviewed source ledger: authority, freshness, reuse status, supported claims and explicit limits.",
  actors:
    "Public, private, professional, judicial and parliamentary actors, their roles, contacts, origins and limits.",
  relationships:
    "Directed, evidence-backed relationships showing who appoints, oversees, regulates, supplies, contracts with or hears appeals from whom.",
  frameworks:
    "Public explanations for why tax machinery exists, how it works and the tension or trade-off it creates.",
  rules:
    "Acts, regulations, codes, charters and internal frameworks, with their makers, administrators and enforcers kept distinct.",
  accountTypes:
    "Identity, taxpayer-view, agent, ledger, payment-reference and developer accounts, including what each account is not.",
  systems:
    "Published identity, filing, ledger, payment, debt, risk and integration systems and their bounded connections.",
  permissions:
    "Licences, authorisations, registrations, supervision, certificates, recognition and access rights without flattening them into one status.",
  pipelineStages:
    "Conditional stages from law and fact collection through assessment, payment, challenge, debt recovery or prosecution.",
  cases:
    "Selected decided and pending cases that expose how rules, powers, deadlines and safeguards operate in practice.",
  transparencyGaps:
    "Known missing, conflicting, time-sensitive or deliberately bounded evidence.",
};

const referenceTargets: Record<CollectionName, Record<string, string | string[]>> = {
  sources: {},
  actors: { sourceIds: "sources" },
  relationships: {
    fromActorId: "actors",
    toActorId: "actors",
    sourceIds: "sources",
  },
  frameworks: { ruleIds: "rules", sourceIds: "sources" },
  rules: {
    madeByActorIds: "actors",
    administeredByActorIds: "actors",
    enforcedByActorIds: "actors",
    sourceIds: "sources",
  },
  accountTypes: { operatorActorIds: "actors", sourceIds: "sources" },
  systems: {
    operatorActorIds: "actors",
    privatePartnerActorIds: "actors",
    connectedSystemIds: "systems",
    sourceIds: "sources",
  },
  permissions: {
    grantedByActorIds: "actors",
    overseenByActorIds: "actors",
    sourceIds: "sources",
  },
  pipelineStages: {
    collectorActorIds: "actors",
    otherActorIds: "actors",
    ruleIds: "rules",
    systemIds: "systems",
    nextStageIds: "pipeline",
    sourceIds: "sources",
  },
  cases: {
    courtActorId: "actors",
    stageIds: "pipeline",
    sourceIds: "sources",
  },
  transparencyGaps: {
    affectedIds: Object.keys(paths),
    sourceIds: "sources",
  },
};

const schemaDocument = {
  $id: `https://api.taxsorted.io${basePath}/schema`,
  title: "TaxSorted UK tax-system corpus",
  ...z.toJSONSchema(ukTaxSystemSchema),
};

const mediaTypes: Record<ExportFormat, string> = {
  json: "application/json; charset=utf-8",
  ndjson: "application/x-ndjson; charset=utf-8",
  csv: "text/csv; charset=utf-8",
};

type Identified = { id: string; sourceIds?: string[] } & Record<string, unknown>;

function itemsFor(corpus: UkTaxSystem, name: CollectionName): Identified[] {
  return corpus[name] as unknown as Identified[];
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
  return `taxsorted-uk-tax-system-${path}-${safeVersion}.${format}`;
}

function exportLinks(path: string) {
  return Object.fromEntries(
    exportFormats.map((format) => {
      const type = mediaTypes[format].split(";", 1)[0];
      return [
        format,
        {
          href: `${basePath}/exports/${path}/${format}`,
          type,
          mediaType: type,
        },
      ];
    })
  );
}

function collectionDictionary(corpus: UkTaxSystem) {
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
      path === "pipeline" ? "pipeline stage" : path.replace(/s$/, ""),
      referenceTargets[name]
    ),
  }));
}

function dictionary(corpus: UkTaxSystem) {
  return {
    schema: "taxsorted.open-data-dictionary/1",
    dataset: "uk-tax-system",
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
        "Field evidence resolves to a declared source and an existing JSON Pointer.",
        "Source review dates, actor active dates and relationship validity dates have valid order.",
        "Pipeline lane/order pairs are unique and a stage cannot point to itself.",
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
      ordering:
        "Corpus order is curated for reading and is not a ranking or promised enforcement sequence. Within one version it is stable; use IDs when joining or comparing versions.",
      pipeline:
        "nextStageIds names possible next steps, not a guaranteed ladder. Triggers, rights and safeguards remain part of every stage.",
      permissions:
        "Licence, authorisation, registration, supervision, certificate, recognition and access are separate categories and must not be treated as synonyms.",
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

function exportIndex(corpus: UkTaxSystem, publicDataEnabled: boolean) {
  return {
    schema: "taxsorted.open-data-exports/1",
    dataset: "uk-tax-system",
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
      const links = exportLinks(path);
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
                ...links[format],
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
  corpus: UkTaxSystem,
  etag: string,
  canonicalPath: string,
  alternates: Array<{ href: string; type: string }> = [],
  linkCanonicalPath = canonicalPath
) {
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
      `</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
      ...alternates.map(
        (alternate) =>
          `<${alternate.href}>; rel="alternate"; type="${alternate.type}"`
      ),
    ].join(", ")
  );
}

function cacheableRepresentation(
  c: Context,
  corpus: UkTaxSystem,
  body: string,
  canonicalPath: string,
  contentType: string,
  options: {
    disposition?: string;
    alternates?: Array<{ href: string; type: string }>;
    etag?: string;
  } = {}
) {
  const etag = options.etag ?? representationEtag(body);
  cacheHeaders(c, corpus, etag, canonicalPath, options.alternates);
  if (options.disposition) c.header("Content-Disposition", options.disposition);
  if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
    return c.body(null, 304);
  }
  return c.body(body, 200, { "Content-Type": contentType });
}

function cacheableJson(c: Context, corpus: UkTaxSystem, value: unknown) {
  return cacheableRepresentation(
    c,
    corpus,
    canonicalJson(value),
    relativeUrl(c),
    "application/json; charset=utf-8"
  );
}

function noStore(c: Context) {
  c.header("Cache-Control", "no-store");
}

function rejectStaticQuery(c: Context) {
  const parameters = [...new URL(c.req.url).searchParams.keys()];
  if (parameters.length === 0) return undefined;
  noStore(c);
  return c.json(
    { error: "unknown_query_parameter", parameters: [...new Set(parameters)].sort() },
    400
  );
}

function evidenceFor(corpus: UkTaxSystem, item: Identified) {
  const ids = new Set(item.sourceIds ?? []);
  return corpus.sources.filter((source) => ids.has(source.id));
}

function searchable(item: Identified) {
  return JSON.stringify(item).toLocaleLowerCase("en-GB");
}

function includesValue(item: Identified, fields: string[], value: string) {
  return fields.some((field) => {
    const candidate = item[field];
    return candidate === value || (Array.isArray(candidate) && candidate.includes(value));
  });
}

function exactFilter(
  collection: CollectionName,
  item: Identified,
  key: ExactFilterKey,
  value: string
) {
  if (key === "sourceId") {
    return collection === "sources" ? item.id === value : includesValue(item, ["sourceIds"], value);
  }
  if (key === "actorId") {
    const fieldsByCollection: Partial<Record<CollectionName, string[]>> = {
      relationships: ["fromActorId", "toActorId"],
      rules: ["madeByActorIds", "administeredByActorIds", "enforcedByActorIds"],
      accountTypes: ["operatorActorIds"],
      systems: ["operatorActorIds", "privatePartnerActorIds"],
      permissions: ["grantedByActorIds", "overseenByActorIds"],
      pipelineStages: ["collectorActorIds", "otherActorIds"],
      cases: ["courtActorId"],
      transparencyGaps: ["affectedIds"],
    };
    return includesValue(item, fieldsByCollection[collection] ?? [], value);
  }
  if (key === "stageId") {
    if (collection === "pipelineStages") {
      return item.id === value || includesValue(item, ["nextStageIds"], value);
    }
    return includesValue(item, collection === "cases" ? ["stageIds"] : ["affectedIds"], value);
  }
  if (key === "ruleId") {
    if (collection === "rules") return item.id === value;
    return includesValue(item, collection === "transparencyGaps" ? ["affectedIds"] : ["ruleIds"], value);
  }
  if (key === "systemId") {
    if (collection === "systems") {
      return item.id === value || includesValue(item, ["connectedSystemIds"], value);
    }
    return includesValue(item, collection === "transparencyGaps" ? ["affectedIds"] : ["systemIds"], value);
  }
  const aliases: Partial<Record<ExactFilterKey, string>> = {
    authority: "authorityLevel",
    jurisdiction: "jurisdictions",
  };
  const candidate = item[aliases[key] ?? key];
  return candidate === value || (Array.isArray(candidate) && candidate.includes(value));
}

function validFilterValue(
  corpus: UkTaxSystem,
  collection: CollectionName,
  key: ExactFilterKey,
  value: string
) {
  const idsByFilter: Partial<Record<ExactFilterKey, Set<string>>> = {
    actorId: new Set(corpus.actors.map((item) => item.id)),
    stageId: new Set(corpus.pipelineStages.map((item) => item.id)),
    ruleId: new Set(corpus.rules.map((item) => item.id)),
    systemId: new Set(corpus.systems.map((item) => item.id)),
    sourceId: new Set(corpus.sources.map((item) => item.id)),
  };
  const knownIds = idsByFilter[key];
  if (knownIds) return knownIds.has(value);
  const actualKey =
    key === "authority" ? "authorityLevel" : key === "jurisdiction" ? "jurisdictions" : key;
  const allowed = allowedValuesFromJsonSchema(schemaDocument, collection, actualKey);
  return allowed ? allowed.includes(value) : true;
}

function enrichedActor(corpus: UkTaxSystem, actor: Identified) {
  const actorId = actor.id;
  return {
    data: actor,
    evidence: evidenceFor(corpus, actor),
    relationships: corpus.relationships.filter(
      (relation) => relation.fromActorId === actorId || relation.toActorId === actorId
    ),
    systems: corpus.systems.filter(
      (system) =>
        system.operatorActorIds.includes(actorId) ||
        system.privatePartnerActorIds.includes(actorId)
    ),
    permissions: corpus.permissions.filter(
      (permission) =>
        permission.grantedByActorIds.includes(actorId) ||
        permission.overseenByActorIds.includes(actorId)
    ),
    pipelineStages: corpus.pipelineStages.filter(
      (stage) =>
        stage.collectorActorIds.includes(actorId) || stage.otherActorIds.includes(actorId)
    ),
  };
}

export type UkTaxSystemRouteOptions = {
  corpus?: UkTaxSystem;
  publicDataEnabled?: boolean;
};

export function createUkTaxSystemRoutes(options: UkTaxSystemRouteOptions = {}) {
  // A route is one immutable release snapshot. Copy caller-owned data so a
  // later mutation cannot split precomputed exports from query/detail views.
  const corpus = structuredClone(options.corpus ?? ukTaxSystem);
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
    if (!publicDataEnabled && protectedPath) {
      noStore(c);
      return c.json(
        {
          error: "publication_review_pending",
          message: "The reviewed source ledger and gap register remain public while the full graph is closed.",
          sources: "/v1/tax-system/uk/sources",
          gaps: "/v1/tax-system/uk/gaps",
        },
        503
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
      lanes: [
        {
          id: "hmrc-main",
          description: "Main civil path for taxes administered by HMRC, from rule to collection and challenge.",
        },
        {
          id: "local-tax",
          description: "Council Tax and non-domestic rates, collected by local authorities under different court machinery.",
        },
        {
          id: "devolved-tax",
          description: "Taxes administered by Revenue Scotland and the Welsh Revenue Authority.",
        },
        {
          id: "criminal-tax",
          description: "The separate investigation and independent prosecution path for suspected tax crime.",
        },
      ],
      routes: {
        fullGraph: "/v1/tax-system/uk/graph",
        collections: Object.keys(paths).map((path) => `/v1/tax-system/uk/${path}`),
        item: "/v1/tax-system/uk/{collection}/{id}",
        filters: advertisedFilterKeys,
        schema: `${basePath}/schema`,
        dictionary: `${basePath}/dictionary`,
        exports: `${basePath}/exports`,
        export: `${basePath}/exports/{collection}/{json|ndjson|csv}`,
      },
      related: {
        industryEntryAndBarriers: "/v1/tax-industry/uk",
        openDataCatalog: "/v1/open-data",
        openApi: "/openapi.json",
      },
      startHere: [
        "Read frameworks for the public justification and its tensions.",
        "Follow pipeline nextStageIds for the actual collection and enforcement paths.",
        "Resolve every sourceId in sources; read doesNotProve as well as supports.",
        "Read gaps before treating the map as complete.",
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
      noStore(c);
      return c.json({ error: "not_found" }, 404);
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
        noStore(c);
        return c.json({ error: "unknown_filter", filters: [...new Set(unknown)].sort() }, 400);
      }
      const repeated = [...new Set(searchParams.keys())].filter(
        (key) => searchParams.getAll(key).length > 1
      );
      if (repeated.length) {
        noStore(c);
        return c.json({ error: "repeated_filter", filters: repeated.sort() }, 400);
      }
      const q = c.req.query("q")?.trim();
      if (q && q.length > 100) {
        noStore(c);
        return c.json({ error: "query_too_long", maximum: 100 }, 400);
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
        noStore(c);
        return c.json({ error: "invalid_page", limits: { limit: [1, 100], offset: "0 or greater" } }, 400);
      }

      const filters = Object.fromEntries(
        filterKeysByCollection[name].flatMap((key: ExactFilterKey) => {
          const value = c.req.query(key)?.trim();
          return value ? [[key, value]] : [];
        })
      );
      for (const [key, value] of Object.entries(filters)) {
        if (!validFilterValue(corpus, name, key as ExactFilterKey, value)) {
          noStore(c);
          return c.json({ error: "invalid_filter", filter: key, value }, 400);
        }
      }
      let matches = itemsFor(corpus, name);
      if (q) {
        const needle = q.toLocaleLowerCase("en-GB");
        matches = matches.filter((item) => searchable(item).includes(needle));
      }
      for (const [key, value] of Object.entries(filters)) {
        matches = matches.filter((item) =>
          exactFilter(name, item, key as ExactFilterKey, value)
        );
      }
      const page = matches.slice(offset, offset + limit);
      const body = {
        data: page,
        page: { total: matches.length, returned: page.length, limit, offset },
        filters: { ...(q ? { q } : {}), ...filters },
        provenance: {
          corpusVersion: corpus.meta.version,
          reviewedOn: corpus.meta.reviewedOn,
          sourceLedger: "/v1/tax-system/uk/sources",
          gaps: "/v1/tax-system/uk/gaps",
        },
      };
      return cacheableJson(c, corpus, body);
    });

    app.get(`/${path}/:id`, (c) => {
      const invalidQuery = rejectStaticQuery(c);
      if (invalidQuery) return invalidQuery;
      const item = itemsFor(corpus, name).find((candidate) => candidate.id === c.req.param("id"));
      if (!item) {
        noStore(c);
        return c.json({ error: "not_found", collection: path, id: c.req.param("id") }, 404);
      }
      if (name === "actors") return cacheableJson(c, corpus, enrichedActor(corpus, item));
      if (name === "sources") return cacheableJson(c, corpus, { data: item });
      return cacheableJson(c, corpus, { data: item, evidence: evidenceFor(corpus, item) });
    });
  }

  // Keep every request inside this public namespace out of the taxpayer
  // session middleware, including misspelled paths and unsupported methods.
  app.all("*", (c) => {
    noStore(c);
    return c.json({ error: "not_found" }, 404);
  });

  return app;
}
