// Public, static map of the UK charity-sector system. It explains institutions,
// legal structures and disclosure rules; it is deliberately not a directory of
// organisations or people, and it never creates a taxpayer session.

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
import { problemDetails } from "../problem-details.js";
import {
  ukCharities,
  ukCharitiesSchema,
  type UkCharities,
} from "../uk-charities.js";
import {
  ukCharityAccountabilityFramework,
  ukCharityAccountabilitySchemaDocument,
} from "../uk-charity-accountability.js";

const basePath = "/v1/charities/uk";
const datasetId = "uk-charities-sector";
const correctionsUrl = "https://github.com/cambridgetcg/taxsorted.io/issues";
const correctionSafety =
  "The public issue tracker is only for non-personal factual corrections. " +
  "Do not post personal contact details, belief data, home addresses or safeguarding information; this release has no confidential intake.";
const charitySafetyWalls = [
  "No charity-by-charity, trustee or people directory is published in this sector corpus.",
  "No personal religion or belief is inferred from an organisation-level charitable purpose.",
  "No fuzzy name, address, domain or person join creates an organisation relationship.",
  "No trust, honesty, faith, efficiency or impact leaderboard is emitted.",
  "Missing evidence is not treated as proof that a statement is false.",
] as const;
const agentDiscoveryUrl = "/agent.txt";
const rightsUrl = "/v1/open-data/rights";
const exportFormats = ["json", "ndjson", "csv"] as const;
type ExportFormat = (typeof exportFormats)[number];

type CollectionName =
  | "sources"
  | "regulators"
  | "registers"
  | "legalForms"
  | "taxTreatments"
  | "obligations"
  | "fundingMechanisms"
  | "financeDisclosures"
  | "controlModels"
  | "helpRoutes"
  | "pipelineStages"
  | "transparencyGaps";

const paths: Record<string, CollectionName> = {
  sources: "sources",
  regulators: "regulators",
  registers: "registers",
  "legal-forms": "legalForms",
  "tax-treatments": "taxTreatments",
  obligations: "obligations",
  funding: "fundingMechanisms",
  finance: "financeDisclosures",
  control: "controlModels",
  help: "helpRoutes",
  pipeline: "pipelineStages",
  gaps: "transparencyGaps",
};

// These collections describe the official source doors and the known limits.
// They stay available while wider publication is paused so closure is legible.
const publicWhenClosed = new Set(["sources", "registers", "gaps"]);
const commonQueryKeys = ["q", "limit", "offset"] as const;
type ExactFilterKey =
  | "jurisdiction"
  | "kind"
  | "type"
  | "status"
  | "taxType"
  | "obligationType"
  | "fundingType"
  | "helpCategory"
  | "sourceId"
  | "regulatorId";

const filterKeysByCollection: Record<CollectionName, readonly ExactFilterKey[]> = {
  sources: ["jurisdiction", "status", "sourceId"],
  regulators: ["jurisdiction", "kind", "regulatorId", "sourceId"],
  registers: ["jurisdiction", "kind", "regulatorId", "sourceId"],
  legalForms: ["jurisdiction", "regulatorId", "sourceId"],
  taxTreatments: ["jurisdiction", "taxType", "sourceId"],
  obligations: ["jurisdiction", "obligationType", "regulatorId", "sourceId"],
  fundingMechanisms: ["jurisdiction", "fundingType", "sourceId"],
  financeDisclosures: ["jurisdiction", "type", "sourceId"],
  controlModels: ["jurisdiction", "type", "sourceId"],
  helpRoutes: ["jurisdiction", "helpCategory", "regulatorId", "sourceId"],
  pipelineStages: ["jurisdiction", "sourceId"],
  transparencyGaps: ["status", "sourceId"],
};

const advertisedFilterKeys = [
  ...new Set([...commonQueryKeys, ...Object.values(filterKeysByCollection).flat()]),
];

const collectionDescriptions: Record<CollectionName, string> = {
  sources:
    "The reviewed source ledger: authority, freshness, reuse status, supported claims and explicit limits.",
  regulators:
    "The UK charity regulators and tax authorities, with their public roles, jurisdiction and role-based contact doors.",
  registers:
    "Official register services and downloads, including coverage gaps, access conditions and safe ways to identify organisations at source.",
  legalForms:
    "Legal forms used by charities and related bodies, separating governance and asset restrictions from the misleading idea of an equity owner.",
  taxTreatments:
    "Conditional charity tax treatments, their public-benefit rationale, qualifying use, limits and possible clawback or liability.",
  obligations:
    "Registration, reporting, accounts, returns, governance and tax obligations, including thresholds and responsible authorities.",
  fundingMechanisms:
    "Common public and private funding routes, with the conditions, disclosures and source systems that travel with them.",
  financeDisclosures:
    "What official filings may disclose about income, spending, assets, reserves and remuneration without turning bands into named personal pay.",
  controlModels:
    "Governance, membership, trusteeship, statutory control, subsidiaries and related-party structures without treating trustees as beneficial owners.",
  helpRoutes:
    "Role-based public contact routes and plain prompts for asking an authority or support body what it can actually help with.",
  pipelineStages:
    "The bounded collection pipeline from official source discovery through rights review, exact-ID joins, validation, publication and correction.",
  transparencyGaps:
    "Known missing, conflicting, time-sensitive or deliberately excluded information.",
};

const collectionRecordNames: Record<CollectionName, string> = {
  sources: "source",
  regulators: "regulator",
  registers: "register",
  legalForms: "legal form",
  taxTreatments: "tax treatment",
  obligations: "obligation",
  fundingMechanisms: "funding mechanism",
  financeDisclosures: "finance disclosure",
  controlModels: "control model",
  helpRoutes: "help route",
  pipelineStages: "pipeline stage",
  transparencyGaps: "transparency gap",
};

const referenceTargets: Record<CollectionName, Record<string, string | string[]>> = {
  sources: {},
  regulators: { sourceIds: "sources", "evidence[].sourceId": "sources" },
  registers: {
    regulatorIds: "regulators",
    sourceIds: "sources",
    "evidence[].sourceId": "sources",
  },
  legalForms: {
    regulatorIds: "regulators",
    sourceIds: "sources",
    "evidence[].sourceId": "sources",
  },
  taxTreatments: {
    sourceIds: "sources",
    "evidence[].sourceId": "sources",
  },
  obligations: {
    regulatorIds: "regulators",
    sourceIds: "sources",
    "evidence[].sourceId": "sources",
  },
  fundingMechanisms: {
    taxTreatmentIds: "tax-treatments",
    sourceIds: "sources",
    "evidence[].sourceId": "sources",
  },
  financeDisclosures: {
    registerIds: "registers",
    sourceIds: "sources",
    "evidence[].sourceId": "sources",
  },
  controlModels: {
    legalFormIds: "legal-forms",
    sourceIds: "sources",
    "evidence[].sourceId": "sources",
  },
  helpRoutes: {
    regulatorIds: "regulators",
    registerIds: "registers",
    sourceIds: "sources",
    "evidence[].sourceId": "sources",
  },
  pipelineStages: {
    registerIds: "registers",
    nextStageIds: "pipeline",
    sourceIds: "sources",
    "evidence[].sourceId": "sources",
  },
  transparencyGaps: {
    affectedIds: Object.keys(paths),
    sourceIds: "sources",
    "evidence[].sourceId": "sources",
  },
};

const schemaDocument = {
  $id: `https://api.taxsorted.io${basePath}/schema`,
  title: "TaxSorted UK charity-sector system corpus",
  ...z.toJSONSchema(ukCharitiesSchema),
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

function itemsFor(corpus: UkCharities, name: CollectionName): Identified[] {
  return corpus[name] as unknown as Identified[];
}

function recordIndex(corpus: UkCharities) {
  const records = new Map<string, RecordLocation>();
  for (const [path, corpusKey] of Object.entries(paths)) {
    for (const data of itemsFor(corpus, corpusKey)) {
      if (records.has(data.id)) {
        throw new Error(`Duplicate UK charity-sector record ID: ${data.id}`);
      }
      records.set(data.id, { path, corpusKey, data });
    }
  }
  return records;
}

function schemaPropertiesFor(name: CollectionName) {
  return (
    schemaDocument as {
      properties?: Record<string, { items?: { properties?: Record<string, unknown> } }>;
    }
  ).properties?.[name]?.items?.properties;
}

function columnsFor(rows: readonly Identified[], name: CollectionName) {
  const schemaProperties = schemaPropertiesFor(name);
  return [
    ...new Set([
      ...Object.keys(schemaProperties ?? {}),
      ...rows.flatMap((row) => Object.keys(row)),
    ]),
  ].sort();
}

function exportBody(
  rows: readonly Identified[],
  name: CollectionName,
  format: ExportFormat
) {
  if (format === "json") return canonicalJson(rows);
  if (format === "ndjson") return serializeNdjson(rows);
  return serializeCsv(rows, { columns: columnsFor(rows, name) });
}

function exportFilename(path: string, version: string, format: ExportFormat) {
  const safeVersion = version.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `taxsorted-uk-charities-${path}-${safeVersion}.${format}`;
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

function collectionDictionary(corpus: UkCharities) {
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
      collectionRecordNames[name],
      referenceTargets[name]
    ),
  }));
}

function dictionary(corpus: UkCharities) {
  return {
    schema: "taxsorted.open-data-dictionary/1",
    dataset: datasetId,
    corpusSchema: corpus.schema,
    version: corpus.meta.version,
    reviewedOn: corpus.meta.reviewedOn,
    structuralSchema: `https://api.taxsorted.io${basePath}/schema`,
    corrections: correctionsUrl,
    correctionSafety,
    accountability: {
      status: ukCharityAccountabilityFramework.status,
      recordsAvailable: false,
      index: `${basePath}/accountability`,
      schema: `${basePath}/accountability/schema`,
      purpose: ukCharityAccountabilityFramework.purpose,
      publicationBlockers: ukCharityAccountabilityFramework.publicationBlockers,
      comparisonRule:
        "Words and recorded actions remain separate. Missing evidence is not contradiction; inconsistent-with requires exact alignment and human approval.",
    },
    scope: {
      organisationDirectory: false,
      peopleRecords: false,
      personalReligionOrBeliefData: false,
      explanation:
        "This release maps the sector system. Official registers remain the source for organisation records; no trustee, donor, beneficiary or belief profile is published here.",
    },
    validation: {
      structuralSchema:
        "Describes record fields, required values, scalar types and enums. It is not the complete boot acceptance contract.",
      bootOnlyInvariants: [
        "Calendar dates must be real dates, not only YYYY-MM-DD-shaped strings.",
        "URLs admitted by refined fields must use HTTPS; source URLs are unique.",
        "IDs are unique across the dataset; reference arrays contain no duplicates and every declared reference resolves.",
        "Each substantive record resolves its source IDs to the reviewed source ledger, and source review dates do not post-date the corpus review.",
        "Evidence sources resolve, evidence dates do not post-date the corpus, JSON Pointers exist and no pointer treats provenance metadata as evidence.",
        "The combined jurisdictions of cited sources cover every jurisdiction declared by a substantive record; field-level territorial meaning still requires human review.",
        "Pipeline lane orders are unique and a stage cannot point to itself.",
        "Forbidden people and charity-by-charity collections are absent and the release exclusions state the people and belief boundary.",
        "Every advertised exact filter maps to a field in the structural schema.",
      ],
    },
    conventions: {
      ids:
        "Record IDs are opaque, dataset-wide identifiers. Use the whole value, never a label or array position, when joining data.",
      idStability:
        "A display label may change without changing its ID. A retired ID will not be reused for another meaning. A tombstone feed is not yet available, so mirrors must compare corpus versions.",
      references:
        "Fields ending in Id or Ids normally contain IDs from the collection named in the collection dictionary.",
      futureOrganisationJoins:
        "A future charity-by-charity layer may join sources only through exact official organisation identifiers. Names, addresses, websites and people are never identity keys.",
      evidence:
        "sourceIds joins to sources. Read each source's supported claims and limits before carrying a statement forward.",
      ownership:
        "Owner is not used as a shortcut. Charities normally have no equity owner; legal form, trusteeship, membership, asset restrictions, statutory control and subsidiaries are separate concepts.",
      people:
        "No people records, trustee graph, named remuneration, personal contact details, biographies or inferred beliefs are part of this release.",
      religion:
        "An organisation-level charitable purpose does not establish any person's religion or belief and must never be used to infer one.",
      contacts:
        "Help routes are role-based public channels. They do not promise eligibility, funding or a particular answer.",
      dates: "Calendar dates use ISO 8601 YYYY-MM-DD and carry no time of day.",
      ordering:
        "Corpus order is curated for reading, not a ranking. Within one version it is stable; use IDs when comparing versions.",
      schemaCompatibility:
        "The final /1 in corpusSchema is the meaning-compatible major. Removing a field or changing its type or meaning requires a new major.",
      search:
        "q is a case-insensitive substring search across the complete sector record. It is not a charity-name, person or belief search.",
    },
    formats: {
      json:
        "Lossless UTF-8 array in TaxSorted deterministic JSON: keys sorted recursively, compact encoding and array order preserved. It is not RFC 8785/JCS.",
      ndjson:
        "Lossless UTF-8 JSON Lines using the same TaxSorted deterministic form, one record per line.",
      csv:
        "Spreadsheet convenience format. Nested values use deterministic JSON; a leading apostrophe mitigates common spreadsheet formula triggers.",
    },
    collections: collectionDictionary(corpus),
  };
}

type PublicationStatus = "open" | "publication-review" | "emergency-stopped";

function publicationStatus(publicDataEnabled: boolean, emergencyStop: boolean): PublicationStatus {
  if (emergencyStop) return "emergency-stopped";
  return publicDataEnabled ? "open" : "publication-review";
}

function exportIndex(
  corpus: UkCharities,
  publicDataEnabled: boolean,
  emergencyStop: boolean
) {
  const status = publicationStatus(publicDataEnabled, emergencyStop);
  const fullCorpusAvailable = status === "open";
  return {
    schema: "taxsorted.open-data-exports/1",
    dataset: datasetId,
    version: corpus.meta.version,
    reviewedOn: corpus.meta.reviewedOn,
    licence: corpus.meta.contentLicence,
    publicationStatus: status,
    attribution: `TaxSorted (taxsorted.io), “${corpus.meta.title}”, version ${corpus.meta.version}, https://api.taxsorted.io${basePath}/graph, ${corpus.meta.contentLicence.name} (${corpus.meta.contentLicence.url}).`,
    attributionInstructions:
      "Keep this attribution with reused copies and state whether you changed the material.",
    corrections: correctionsUrl,
    correctionSafety,
    rules: {
      completeness:
        "Each available file contains the complete, unpaginated sector collection for this corpus version.",
      boundary:
        "This is not a national charity or people directory. It contains only the bounded sector-system corpus described by the dictionary.",
      json: "Lossless TaxSorted deterministic JSON; not RFC 8785/JCS.",
      ndjson:
        "Lossless TaxSorted deterministic JSON, one record per line with a final newline.",
      csv:
        "Spreadsheet convenience copy with common formula-trigger mitigation; nested values remain deterministic JSON inside cells.",
      etag:
        "Each ETag is a SHA-256 validator for the exact bytes of that format, not a signature.",
      closedMetadata:
        "When publication is paused, counts, columns, byte lengths and hashes remain public. The switch is an operational brake, not a confidentiality boundary.",
    },
    collections: Object.entries(paths).map(([path, name]) => {
      const rows = itemsFor(corpus, name);
      const available = fullCorpusAvailable || publicWhenClosed.has(path);
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
  corpus: UkCharities,
  etag: string,
  canonicalPath: string,
  alternates: Array<{ href: string; type: string }> = [],
  linkCanonicalPath = canonicalPath,
  linkOptions: {
    includeSectorDescriptions?: boolean;
    related?: Array<{ href: string; type: string; title: string }>;
  } = {}
) {
  const includeSectorDescriptions =
    linkOptions.includeSectorDescriptions ?? true;
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
      ...(includeSectorDescriptions
        ? [
            `<${basePath}/dictionary>; rel="describedby"; type="application/json"`,
            `<${basePath}/schema>; rel="describedby"; type="application/schema+json"`,
          ]
        : []),
      `</openapi/charities-uk.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
      `</openapi.json>; rel="related"; type="application/vnd.oai.openapi+json;version=3.1"; title="Full API"`,
      `<${agentDiscoveryUrl}>; rel="related"; type="text/plain"; title="Agent discovery"`,
      ...(linkOptions.related ?? []).map(
        (related) =>
          `<${related.href}>; rel="related"; type="${related.type}"; title="${related.title}"`
      ),
      ...alternates.map(
        (alternate) =>
          `<${alternate.href}>; rel="alternate"; type="${alternate.type}"`
      ),
    ].join(", ")
  );
}

function cacheableRepresentation(
  c: Context,
  corpus: UkCharities,
  body: string,
  canonicalPath: string,
  contentType: string,
  options: {
    disposition?: string;
    alternates?: Array<{ href: string; type: string }>;
    etag?: string;
    canonicalLocation?: string;
    includeSectorDescriptions?: boolean;
    related?: Array<{ href: string; type: string; title: string }>;
  } = {}
) {
  const etag = options.etag ?? representationEtag(body);
  cacheHeaders(
    c,
    corpus,
    etag,
    canonicalPath,
    options.alternates,
    options.canonicalLocation ?? canonicalPath,
    {
      includeSectorDescriptions: options.includeSectorDescriptions,
      related: options.related,
    }
  );
  if (options.disposition) c.header("Content-Disposition", options.disposition);
  if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
    return c.body(null, 304);
  }
  return c.body(body, 200, { "Content-Type": contentType });
}

function cacheableJson(
  c: Context,
  corpus: UkCharities,
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

function noStore(c: Context) {
  c.header("Cache-Control", "no-store");
}

type NextAction = {
  action: string;
  method: "GET" | "HEAD";
  href: string;
  description: string;
};

function instructionalError(
  c: Context,
  status: 400 | 404 | 503,
  error: string,
  reason: string,
  details: Record<string, unknown> = {},
  nextActions: NextAction[] = [
    {
      action: "orient",
      method: "GET",
      href: basePath,
      description: "Read the dataset scope, publication state and available routes.",
    },
    {
      action: "inspect-contract",
      method: "GET",
      href: `${basePath}/dictionary`,
      description: "Read collection names, fields, filters and evidence rules.",
    },
  ]
) {
  noStore(c);
  return problemDetails(c, status, {
    error,
    detail: reason,
    nextActions,
    extensions: {
      schema: "taxsorted.charity-error/1",
      method: c.req.method,
      path: c.req.path,
      ...details,
      reason,
      walls_intact: true,
      walls: charitySafetyWalls,
      // Published before RFC 9457 adoption. Keep this alias until a versioned
      // charity error contract can remove it without surprising callers.
      next_actions: nextActions,
      docs: {
        openapi: "/openapi.json",
        dictionary: `${basePath}/dictionary`,
        agent_discovery: agentDiscoveryUrl,
      },
    },
  });
}

function rejectStaticQuery(c: Context) {
  const parameters = [...new URL(c.req.url).searchParams.keys()];
  if (parameters.length === 0) return undefined;
  return instructionalError(
    c,
    400,
    "unknown_query_parameter",
    "This static representation does not accept query parameters; use a collection query for filtering.",
    { parameters: [...new Set(parameters)].sort() },
    [
      {
        action: "query-a-collection",
        method: "GET",
        href: `${basePath}/{collection}`,
        description: "Choose a collection and use only the filters its dictionary entry allows.",
      },
      {
        action: "inspect-filters",
        method: "GET",
        href: `${basePath}/dictionary`,
        description: "Read the authoritative collection/filter mapping.",
      },
    ]
  );
}

function evidenceFor(corpus: UkCharities, item: Identified) {
  const ids = new Set(item.sourceIds ?? []);
  return corpus.sources.filter((source) => ids.has(source.id));
}

function searchable(item: Identified) {
  return JSON.stringify(item).toLocaleLowerCase("en-GB");
}

function includesValue(item: Identified, fields: readonly string[], value: string) {
  return fields.some((field) => {
    const candidate = item[field];
    return candidate === value || (Array.isArray(candidate) && candidate.includes(value));
  });
}

function candidateFields(collection: CollectionName, key: ExactFilterKey) {
  if (key === "jurisdiction") return ["jurisdictions"] as const;
  if (key === "fundingType") return ["category"] as const;
  if (key === "type" && collection === "financeDisclosures") {
    return ["disclosureType"] as const;
  }
  if (key === "type" && collection === "controlModels") {
    return ["modelType"] as const;
  }
  if (key === "sourceId") return ["sourceIds"] as const;
  if (key === "regulatorId") return ["regulatorIds"] as const;
  return [key] as const;
}

function assertFilterContracts() {
  for (const [collection, keys] of Object.entries(filterKeysByCollection) as Array<
    [CollectionName, readonly ExactFilterKey[]]
  >) {
    const properties = schemaPropertiesFor(collection) ?? {};
    for (const key of keys) {
      const fields =
        key === "sourceId" && collection === "sources"
          ? ["id"]
          : key === "regulatorId" && collection === "regulators"
            ? ["id"]
            : candidateFields(collection, key);
      if (!fields.some((field) => Object.hasOwn(properties, field))) {
        throw new Error(
          `UK charities filter ${collection}.${key} has no field in the structural schema`
        );
      }
    }
  }
}

function exactFilter(
  collection: CollectionName,
  item: Identified,
  key: ExactFilterKey,
  value: string
) {
  if (key === "sourceId" && collection === "sources") return item.id === value;
  if (key === "regulatorId" && collection === "regulators") return item.id === value;
  return includesValue(item, candidateFields(collection, key), value);
}

function validFilterValue(
  corpus: UkCharities,
  collection: CollectionName,
  key: ExactFilterKey,
  value: string
) {
  if (key === "sourceId") {
    return corpus.sources.some((source) => source.id === value);
  }
  if (key === "regulatorId") {
    return corpus.regulators.some((regulator) => regulator.id === value);
  }
  const declared = candidateFields(collection, key).flatMap(
    (field) =>
      allowedValuesFromJsonSchema(schemaDocument, collection, field) ?? []
  );
  return declared.length === 0 || [...new Set(declared)].includes(value);
}

function closedError(c: Context, emergencyStop: boolean) {
  const message = emergencyStop
    ? "The emergency stop is active. Source, register and gap records remain available; wider sector-system bodies are paused."
    : "Source, register and gap records remain available while the wider sector-system corpus is closed.";
  return instructionalError(
    c,
    503,
    emergencyStop ? "publication_emergency_stop" : "publication_review_pending",
    message,
    {
      message,
      sources: `${basePath}/sources`,
      registers: `${basePath}/registers`,
      gaps: `${basePath}/gaps`,
    },
    [
      {
        action: "inspect-sources",
        method: "GET",
        href: `${basePath}/sources`,
        description: "Read the source ledger and its reuse limits.",
      },
      {
        action: "use-official-registers",
        method: "GET",
        href: `${basePath}/registers`,
        description: "Find official organisation lookup doors while wider bodies are paused.",
      },
      {
        action: "inspect-gaps",
        method: "GET",
        href: `${basePath}/gaps`,
        description: "Read what remains unavailable, uncertain or deliberately excluded.",
      },
    ]
  );
}

export type UkCharitiesRouteOptions = {
  corpus?: UkCharities;
  publicDataEnabled?: boolean;
  emergencyStop?: boolean;
};

export function createUkCharitiesRoutes(options: UkCharitiesRouteOptions = {}) {
  // One route instance is one immutable release. Copy caller-owned data before
  // computing representations so later mutation cannot split views or hashes.
  const corpus = structuredClone(options.corpus ?? ukCharities);
  const publicDataEnabled = options.publicDataEnabled ?? false;
  const emergencyStop = options.emergencyStop ?? false;
  const status = publicationStatus(publicDataEnabled, emergencyStop);
  const fullCorpusAvailable = status === "open";
  // Query parameters are a public promise. Refuse to boot if a future schema
  // change would turn an advertised exact filter into a silent no-op.
  assertFilterContracts();
  const app = new Hono();
  const graphRepresentation = canonicalJson(corpus);
  const datasetHash = createHash("sha256").update(graphRepresentation).digest("hex");
  const schemaRepresentation = canonicalJson(schemaDocument);
  const dictionaryRepresentation = canonicalJson(dictionary(corpus));
  const exportIndexRepresentation = canonicalJson(
    exportIndex(corpus, publicDataEnabled, emergencyStop)
  );
  const accountabilityRepresentation = canonicalJson(
    ukCharityAccountabilityFramework
  );
  const accountabilitySchemaRepresentation = canonicalJson(
    ukCharityAccountabilitySchemaDocument
  );
  const graphEtag = representationEtag(graphRepresentation);
  const schemaEtag = representationEtag(schemaRepresentation);
  const dictionaryEtag = representationEtag(dictionaryRepresentation);
  const exportIndexEtag = representationEtag(exportIndexRepresentation);
  const accountabilityEtag = representationEtag(accountabilityRepresentation);
  const accountabilitySchemaEtag = representationEtag(
    accountabilitySchemaRepresentation
  );
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

    const isRead = c.req.method === "GET" || c.req.method === "HEAD";
    if (
      isRead &&
      !fullCorpusAvailable &&
      (protectedPath || protectedResolver)
    ) {
      return closedError(c, emergencyStop);
    }
    await next();
  });

  app.get("/", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    return cacheableJson(c, corpus, {
      dataset: datasetId,
      meta: corpus.meta,
      publication: {
        status,
        publicDataEnabled,
        emergencyStop,
        fullCorpusAvailable,
        baselineCollections: [...publicWhenClosed].sort(),
      },
      access: {
        authentication: "none",
        methods: ["GET", "HEAD"],
        writeMethods: false,
        agentDiscovery: agentDiscoveryUrl,
      },
      scope: {
        kind: "sector-system-map",
        organisationDirectory: false,
        peopleRecords: false,
        personalReligionOrBeliefData: false,
        namedPay: false,
        automatedWordsActionsVerdict: false,
        statement:
          "This release explains the UK charity-sector machinery. It is not a charity, trustee or religion directory.",
      },
      manifest: {
        datasetHash: `sha256:${datasetHash}`,
        datasetHashAlgorithm: "sha256(taxsorted-deterministic-json-utf8)",
      },
      counts: Object.fromEntries(
        Object.entries(paths).map(([path, name]) => [path, itemsFor(corpus, name).length])
      ),
      routes: {
        fullGraph: `${basePath}/graph`,
        collections: Object.keys(paths).map((path) => `${basePath}/${path}`),
        item: `${basePath}/{collection}/{id}`,
        record: `${basePath}/records/{id}`,
        filters: advertisedFilterKeys,
        schema: `${basePath}/schema`,
        dictionary: `${basePath}/dictionary`,
        manifest: `${basePath}/manifest`,
        exports: `${basePath}/exports`,
        export: `${basePath}/exports/{collection}/{json|ndjson|csv}`,
        accountability: `${basePath}/accountability`,
        accountabilitySchema: `${basePath}/accountability/schema`,
      },
      related: {
        openDataCatalog: "/v1/open-data",
        openApi: "/openapi.json",
        agentDiscovery: agentDiscoveryUrl,
        taxSystem: "/v1/tax-system/uk",
      },
      startHere: [
        "Read tax-treatments for conditional reliefs and their limits.",
        "Read legal-forms and control before using the word owner.",
        "Use registers to find the official organisation record at source.",
        "Use help for role-based public contact doors and honest request prompts.",
        "Read accountability before comparing an organisation's words with recorded actions; the contract publishes no organisation rows or scores.",
        "Resolve sourceIds and read gaps before treating the map as complete.",
      ],
    });
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
    return cacheableJson(c, corpus, {
      dataset: datasetId,
      schema: corpus.schema,
      version: corpus.meta.version,
      reviewedOn: corpus.meta.reviewedOn,
      datasetHash: `sha256:${datasetHash}`,
      datasetHashAlgorithm:
        "SHA-256 of the UTF-8 bytes returned by /graph using TaxSorted deterministic JSON.",
      publication: {
        status,
        publicDataEnabled,
        emergencyStop,
        fullCorpusAvailable,
      },
      access: {
        authentication: "none",
        methods: ["GET", "HEAD"],
        writeMethods: false,
        agentDiscovery: agentDiscoveryUrl,
      },
      counts: Object.fromEntries(
        Object.entries(paths).map(([path, name]) => [path, itemsFor(corpus, name).length])
      ),
      contentLicence: corpus.meta.contentLicence,
      schemaDocument: `${basePath}/schema`,
      dictionary: `${basePath}/dictionary`,
      exports: `${basePath}/exports`,
      recordResolver: `${basePath}/records/{id}`,
      accountability: {
        status: ukCharityAccountabilityFramework.status,
        recordsAvailable: false,
        index: `${basePath}/accountability`,
        schema: `${basePath}/accountability/schema`,
        blockers: ukCharityAccountabilityFramework.publicationBlockers,
      },
      corrections: correctionsUrl,
      correctionSafety,
      idPolicy: {
        scope: "dataset-wide sector concepts",
        syntax: "lowercase kebab-case",
        namesAreIdentity: false,
        reuse: "A retired ID is not reused for a different meaning.",
        tombstones: "not yet published",
      },
      exclusions: [
        "charity-by-charity organisation records",
        "people and trustee profiles",
        "named remuneration",
        "personal contact details",
        "religion or belief inference",
        "fuzzy name joins",
      ],
      notComplete: true,
    });
  });

  // This is an admission contract, not an organisation dataset. Publishing
  // the shape now lets builders align without pretending the two unresolved
  // safety gates or any organisation rows already exist.
  app.get("/accountability", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    return cacheableRepresentation(
      c,
      corpus,
      accountabilityRepresentation,
      `${basePath}/accountability`,
      "application/json; charset=utf-8",
      {
        etag: accountabilityEtag,
        includeSectorDescriptions: false,
        related: [
          {
            href: `${basePath}/accountability/schema`,
            type: "application/schema+json",
            title: "Candidate dataset schema",
          },
        ],
      }
    );
  });

  app.get("/accountability/schema", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    return cacheableRepresentation(
      c,
      corpus,
      accountabilitySchemaRepresentation,
      `${basePath}/accountability/schema`,
      "application/schema+json; charset=utf-8",
      {
        etag: accountabilitySchemaEtag,
        includeSectorDescriptions: false,
        related: [
          {
            href: `${basePath}/accountability`,
            type: "application/json",
            title: "Accountability framework",
          },
        ],
      }
    );
  });

  app.get("/records/:id", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    const id = c.req.param("id");
    const resolved = records.get(id);
    if (!resolved) {
      return instructionalError(
        c,
        404,
        "not_found",
        "No UK charity-sector record has this stable dataset ID.",
        { id },
        [
          {
            action: "orient",
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
      return instructionalError(
        c,
        404,
        "not_found",
        "The requested collection or export format is not part of this release.",
        { collection: path, format },
        [
          {
            action: "list-exports",
            method: "GET",
            href: `${basePath}/exports`,
            description: "Read the exact available collections, formats and filenames.",
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
        return instructionalError(
          c,
          400,
          "unknown_filter",
          "One or more filters are not admitted for this collection.",
          {
            filters: [...new Set(unknown)].sort(),
            collection: path,
            allowed_filters: [...allowedQueryKeys].sort(),
          },
          [
            {
              action: "inspect-collection-filters",
              method: "GET",
              href: `${basePath}/dictionary`,
              description: "Read the authoritative filter list for this collection.",
            },
          ]
        );
      }
      const repeated = [...new Set(searchParams.keys())].filter(
        (key) => searchParams.getAll(key).length > 1
      );
      if (repeated.length) {
        return instructionalError(
          c,
          400,
          "repeated_filter",
          "Each admitted filter may appear only once in a collection query.",
          { filters: repeated.sort(), collection: path }
        );
      }
      const q = c.req.query("q")?.trim();
      if (q && q.length > 100) {
        return instructionalError(
          c,
          400,
          "query_too_long",
          "The bounded text query exceeds the maximum length.",
          { maximum: 100, collection: path }
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
        return instructionalError(
          c,
          400,
          "invalid_page",
          "Pagination must use integer values inside the documented bounds.",
          {
            limits: { limit: [1, 100], offset: "0 or greater" },
            collection: path,
          }
        );
      }

      const filters = Object.fromEntries(
        filterKeysByCollection[name].flatMap((key: ExactFilterKey) => {
          const value = c.req.query(key)?.trim();
          return value ? [[key, value]] : [];
        })
      );
      for (const [key, value] of Object.entries(filters)) {
        if (!validFilterValue(corpus, name, key as ExactFilterKey, value)) {
          return instructionalError(
            c,
            400,
            "invalid_filter",
            "The filter is admitted for this collection, but its value is outside the declared vocabulary or source IDs.",
            { filter: key, value, collection: path }
          );
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
      return cacheableJson(c, corpus, {
        data: page,
        page: { total: matches.length, returned: page.length, limit, offset },
        filters: { ...(q ? { q } : {}), ...filters },
        provenance: {
          corpusVersion: corpus.meta.version,
          reviewedOn: corpus.meta.reviewedOn,
          sourceLedger: `${basePath}/sources`,
          registers: `${basePath}/registers`,
          gaps: `${basePath}/gaps`,
        },
      });
    });

    app.get(`/${path}/:id`, (c) => {
      const invalidQuery = rejectStaticQuery(c);
      if (invalidQuery) return invalidQuery;
      const item = itemsFor(corpus, name).find(
        (candidate) => candidate.id === c.req.param("id")
      );
      if (!item) {
        return instructionalError(
          c,
          404,
          "not_found",
          "No record with this exact dataset ID exists in the requested collection.",
          { collection: path, id: c.req.param("id") },
          [
            {
              action: "list-collection",
              method: "GET",
              href: `${basePath}/${path}`,
              description: "Read or filter the collection using its stable record IDs.",
            },
            {
              action: "inspect-identity-rules",
              method: "GET",
              href: `${basePath}/dictionary`,
              description: "Read why names, addresses and people are not identity keys.",
            },
          ]
        );
      }
      if (name === "sources") return cacheableJson(c, corpus, { data: item });
      return cacheableJson(c, corpus, {
        data: item,
        evidence: evidenceFor(corpus, item),
      });
    });
  }

  // Keep supported and misspelled requests inside this public namespace away
  // from downstream taxpayer identity middleware. This route is read-only.
  app.all("*", (c) => {
    return instructionalError(
      c,
      404,
      "not_found",
      "No read-only charity-sector route matches this path or method.",
      { path: c.req.path, method: c.req.method },
      [
        {
          action: "orient",
          method: "GET",
          href: basePath,
          description: "Read the dataset boundary and route map.",
        },
        {
          action: "discover-api",
          method: "GET",
          href: agentDiscoveryUrl,
          description: "Read the machine-addressed API discovery document.",
        },
      ]
    );
  });

  return app;
}
