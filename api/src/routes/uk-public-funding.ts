// Public, static graph of UK public funding. It is deliberately sessionless:
// one immutable reviewed snapshot serves query, detail and bulk representations.

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
  ukPublicFunding,
  ukPublicFundingSchema,
  type UkPublicFunding,
} from "../uk-public-funding.js";

const basePath = "/v1/public-funding/uk";
const correctionsUrl = "https://github.com/cambridgetcg/taxsorted.io/issues";
const rightsUrl = "/v1/open-data/rights";
const exportFormats = ["json", "ndjson", "csv"] as const;
type ExportFormat = (typeof exportFormats)[number];

export const ukPublicFundingCollectionPaths = {
  sources: "sources",
  institutions: "institutions",
  governance: "governanceUnits",
  offices: "offices",
  relationships: "relationships",
  funds: "funds",
  programmes: "programmes",
  mechanisms: "fundingMechanisms",
  allocations: "allocations",
  contacts: "contacts",
  locations: "officeLocations",
  pipeline: "pipelineStages",
  gaps: "transparencyGaps",
} as const;

type CollectionName = (typeof ukPublicFundingCollectionPaths)[keyof typeof ukPublicFundingCollectionPaths];
const paths: Record<string, CollectionName> = ukPublicFundingCollectionPaths;
const publicWhenClosed = new Set(["sources", "gaps"]);
const commonQueryKeys = ["q", "limit", "offset"] as const;
type ExactFilterKey =
  | "kind"
  | "sector"
  | "jurisdiction"
  | "status"
  | "fundingRole"
  | "beneficiaryTag"
  | "type"
  | "institutionId"
  | "governanceUnitId"
  | "officeId"
  | "fundId"
  | "programmeId"
  | "mechanismId"
  | "financialYear"
  | "budgetBoundary"
  | "accountingBasis"
  | "grossOrNet"
  | "priceBasis"
  | "lane"
  | "sourceId";

const filterKeysByCollection: Record<CollectionName, readonly ExactFilterKey[]> = {
  sources: ["status", "sourceId"],
  institutions: ["kind", "sector", "jurisdiction", "status", "fundingRole", "sourceId"],
  governanceUnits: ["kind", "institutionId", "officeId", "sourceId"],
  offices: ["kind", "institutionId", "governanceUnitId", "sourceId"],
  relationships: [
    "type",
    "institutionId",
    "governanceUnitId",
    "officeId",
    "fundId",
    "programmeId",
    "mechanismId",
    "sourceId",
  ],
  funds: ["kind", "jurisdiction", "institutionId", "sourceId"],
  programmes: [
    "sector",
    "jurisdiction",
    "status",
    "beneficiaryTag",
    "institutionId",
    "mechanismId",
    "sourceId",
  ],
  fundingMechanisms: [
    "kind",
    "sector",
    "jurisdiction",
    "status",
    "institutionId",
    "fundId",
    "programmeId",
    "sourceId",
  ],
  allocations: [
    "status",
    "institutionId",
    "fundId",
    "programmeId",
    "mechanismId",
    "financialYear",
    "budgetBoundary",
    "accountingBasis",
    "grossOrNet",
    "priceBasis",
    "sourceId",
  ],
  contacts: ["kind", "institutionId", "governanceUnitId", "officeId", "sourceId"],
  officeLocations: ["kind", "institutionId", "governanceUnitId", "officeId", "sourceId"],
  pipelineStages: [
    "lane",
    "institutionId",
    "fundId",
    "programmeId",
    "mechanismId",
    "sourceId",
  ],
  transparencyGaps: [
    "status",
    "institutionId",
    "governanceUnitId",
    "officeId",
    "fundId",
    "programmeId",
    "mechanismId",
    "sourceId",
  ],
};

const collectionDescriptions: Record<CollectionName, string> = {
  sources: "Reviewed public sources, their authority, freshness, reuse position and limits.",
  institutions: "Public institutions and delivery-body classes, with jurisdiction, purpose and funding role kept explicit.",
  governanceUnits: "Boards, committees, panels and directorates, including their authority, membership structure, powers and limits.",
  offices: "Formal public offices and responsibilities. Holder names are deliberately left at the linked official source.",
  relationships: "Directed institutional, accountability and money-governance relationships, each with a negative inference boundary.",
  funds: "Legally or administratively distinct public funds, including permitted inflows, outflows and restrictions.",
  programmes: "The public purpose and aggregate population scope for health, education and cross-government spending.",
  fundingMechanisms: "Formulae, grants, mandates, commissions and other mechanisms that determine how money may move.",
  allocations: "Dated GBP amounts with complete budget, accounting, gross/net, price and comparison dimensions.",
  contacts: "Generic functional public contact routes only; never private or personal channels.",
  officeLocations: "Published non-residential institutional offices and correspondence locations.",
  pipelineStages: "Possible stages from tax collection and Parliamentary authority to allocation, delivery, accounts and audit.",
  transparencyGaps: "Known missing, conflicting, time-sensitive or deliberately bounded evidence.",
};

const mixedGraphTargets = [
  "institutions",
  "governance",
  "offices",
  "funds",
  "programmes",
  "mechanisms",
];
const referenceTargets: Record<CollectionName, Record<string, string | string[]>> = {
  sources: {},
  institutions: {
    taxSystemRefs: "/v1/tax-system/uk (record ID may belong to any collection)",
    sourceIds: "sources",
  },
  governanceUnits: {
    institutionId: "institutions",
    chairOfficeId: "offices",
    memberOfficeIds: "offices",
    sourceIds: "sources",
  },
  offices: {
    institutionId: "institutions",
    governanceUnitIds: "governance",
    sourceIds: "sources",
  },
  relationships: { fromId: mixedGraphTargets, toId: mixedGraphTargets, sourceIds: "sources" },
  funds: { operatorInstitutionIds: "institutions", sourceIds: "sources" },
  programmes: {
    leadInstitutionIds: "institutions",
    deliveryInstitutionIds: "institutions",
    fundingMechanismIds: "mechanisms",
    sourceIds: "sources",
  },
  fundingMechanisms: {
    decisionInstitutionIds: "institutions",
    payerInstitutionIds: "institutions",
    recipientInstitutionIds: "institutions",
    fundIds: "funds",
    programmeIds: "programmes",
    sourceIds: "sources",
  },
  allocations: {
    fromId: mixedGraphTargets,
    toId: mixedGraphTargets,
    programmeIds: "programmes",
    fundingMechanismId: "mechanisms",
    containedInAllocationId: "allocations",
    notComparableToIds: "allocations",
    sourceIds: "sources",
  },
  contacts: {
    institutionIds: "institutions",
    governanceUnitIds: "governance",
    officeIds: "offices",
    sourceIds: "sources",
  },
  officeLocations: {
    institutionIds: "institutions",
    governanceUnitIds: "governance",
    officeIds: "offices",
    sourceIds: "sources",
  },
  pipelineStages: {
    responsibleInstitutionIds: "institutions",
    otherNodeIds: mixedGraphTargets,
    fundIds: "funds",
    programmeIds: "programmes",
    fundingMechanismIds: "mechanisms",
    nextStageIds: "pipeline",
    sourceIds: "sources",
  },
  transparencyGaps: { affectedIds: Object.keys(paths), sourceIds: "sources" },
};

const fieldMeanings: Record<string, string> = {
  amountMinor: "Integer pence. Divide by 100 only when presenting GBP; never treat it as whole pounds.",
  negativeAmountExplanation: "Required when amountMinor is negative; states whether the source means income, repayment, transfer, netting or another signed measure.",
  financialYear: "UK financial year in YYYY-YY form.",
  budgetBoundary: "The spending-control or accounting boundary used by the source; unlike boundaries must not be silently combined.",
  accountingBasis: "Whether the amount is reported on a cash, accrual, mixed or unstated basis.",
  grossOrNet: "Whether the amount is before or after the source's stated income, receipts or recoveries.",
  priceBasis: "Whether the amount uses nominal prices, real prices, or does not state a price basis.",
  containedInAllocationId: "A larger allocation that already contains this amount; the two must not be added together.",
  additiveGroup: "A curator-declared group within which amounts may be additive only when every other comparison dimension also matches.",
  notComparableToIds: "Allocation IDs whose published measures must not be compared as like-for-like.",
  traceabilityWarning: "Plain-language limit on tracing pooled tax receipts or interpreting this allocation as actual spending.",
  currentHolderPublication: "A link to the official holder page and its observation date; TaxSorted does not copy the holder's name into this corpus.",
  functionalOnly: "True confirms this is an institutional function channel, not a person's private contact.",
  residential: "False confirms the published location is not represented as a residential address.",
  populationScope: "Aggregate service or beneficiary scope; never an individual-level recipient record.",
  beneficiaryTags: "Machine-readable aggregate beneficiary groups; never identities or individual recipient records.",
};

const schemaDocument = {
  $id: `https://api.taxsorted.io${basePath}/schema`,
  title: "TaxSorted UK public-funding corpus",
  ...z.toJSONSchema(ukPublicFundingSchema),
};
const mediaTypes: Record<ExportFormat, string> = {
  json: "application/json; charset=utf-8",
  ndjson: "application/x-ndjson; charset=utf-8",
  csv: "text/csv; charset=utf-8",
};
type Identified = { id: string; sourceIds?: string[] } & Record<string, unknown>;

function itemsFor(corpus: UkPublicFunding, name: CollectionName): Identified[] {
  return corpus[name] as unknown as Identified[];
}

function columnsFor(rows: readonly Identified[], name: CollectionName) {
  const schemaProperties = (
    schemaDocument as { properties?: Record<string, { items?: { properties?: Record<string, unknown> } }> }
  ).properties?.[name]?.items?.properties;
  return [
    ...new Set([
      ...Object.keys(schemaProperties ?? {}),
      ...rows.flatMap((row) => Object.keys(row)),
    ]),
  ].sort();
}

function exportBody(rows: readonly Identified[], name: CollectionName, format: ExportFormat) {
  if (format === "json") return canonicalJson(rows);
  if (format === "ndjson") return serializeNdjson(rows);
  return serializeCsv(rows, { columns: columnsFor(rows, name) });
}

function exportFilename(path: string, version: string, format: ExportFormat) {
  const safeVersion = version.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `taxsorted-uk-public-funding-${path}-${safeVersion}.${format}`;
}

function exportLinks(path: string) {
  return Object.fromEntries(
    exportFormats.map((format) => {
      const type = mediaTypes[format].split(";", 1)[0];
      return [format, { href: `${basePath}/exports/${path}/${format}`, type, mediaType: type }];
    })
  );
}

function collectionDictionary(corpus: UkPublicFunding) {
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
      referenceTargets[name],
      fieldMeanings
    ),
  }));
}

function dictionary(corpus: UkPublicFunding) {
  return {
    schema: "taxsorted.open-data-dictionary/1",
    dataset: "uk-public-funding",
    corpusSchema: corpus.schema,
    version: corpus.meta.version,
    reviewedOn: corpus.meta.reviewedOn,
    structuralSchema: `https://api.taxsorted.io${basePath}/schema`,
    corrections: correctionsUrl,
    validation: {
      structuralSchema:
        "Describes fields and scalar constraints. It is not the complete boot acceptance contract.",
      bootOnlyInvariants: [
        "IDs are unique across the dataset and every typed internal and tax-system reference resolves.",
        "Every substantive source has field evidence resolving to an existing JSON Pointer.",
        "Source and active/valid date ranges have valid order.",
        "Allocation containment is acyclic; self-comparisons and self-transfers are rejected.",
        "Every contact and location resolves to at least one institution, governance unit or formal office.",
        "Pipeline lane/order pairs are unique and stages cannot point to themselves.",
      ],
    },
    conventions: {
      ids: "Use the complete stable dataset ID, never array position or a rebuilt display name.",
      idStability:
        "A display label may change without changing its ID. A retired ID will not be reused for a different meaning; a public tombstone feed is not yet available.",
      references:
        "ID and IDs fields join to the collections named below. Mixed graph targets are explicitly listed.",
      evidence:
        "sourceIds joins to sources. Evidence entries name the supported JSON Pointer fields, locator, observation date and method.",
      sourceLimits:
        "supports states what a source can support; doesNotProve prevents stronger inference.",
      money:
        "An amount is comparable or additive only when its financial year, state, boundary, accounting basis, gross/net basis and price basis agree and its containment metadata permits it.",
      traceability:
        "Most tax receipts are pooled. A public allocation is not proof that a named tax pound paid for a named service or that authority became outturn spending.",
      people:
        "Offices are roles, not people. Current-holder fields contain only a dated official link and never copy a holder name into the corpus.",
      missingValues:
        "An empty array records no values for that plural field. null means the field applies but has no value. Omitted optional fields are absent.",
      dates: "Calendar dates use YYYY-MM-DD; financial years use YYYY-YY.",
      ordering:
        "Corpus array order is curated for reading and is not a rank. Pipeline order applies only within one lane.",
      search:
        "q is a case-insensitive substring search over the complete serialized record, including provenance text.",
      schemaCompatibility:
        "The final /1 is the meaning-compatible major. Removing a field or changing its type or meaning requires a new major.",
    },
    formats: {
      json: "Lossless UTF-8 TaxSorted deterministic JSON; not RFC 8785/JCS.",
      ndjson: "Lossless TaxSorted deterministic JSON, one complete record per line.",
      csv: "Spreadsheet convenience format. Nested values remain deterministic JSON and common formula prefixes are mitigated.",
    },
    collections: collectionDictionary(corpus),
  };
}

function exportIndex(corpus: UkPublicFunding, publicDataEnabled: boolean) {
  return {
    schema: "taxsorted.open-data-exports/1",
    dataset: "uk-public-funding",
    version: corpus.meta.version,
    reviewedOn: corpus.meta.reviewedOn,
    licence: corpus.meta.contentLicence,
    attribution: `TaxSorted (taxsorted.io), “${corpus.meta.title}”, version ${corpus.meta.version}, https://api.taxsorted.io${basePath}/graph, ${corpus.meta.contentLicence.name} (${corpus.meta.contentLicence.url}).`,
    attributionInstructions: "Keep this attribution, stable IDs and source IDs with reused copies and state whether you changed the material.",
    corrections: correctionsUrl,
    rules: {
      completeness: "Each file contains the complete, unpaginated collection for this corpus version.",
      json: "Lossless TaxSorted deterministic JSON; not RFC 8785/JCS.",
      ndjson: "Lossless TaxSorted deterministic JSON, one record per line with a final newline.",
      csv: "Spreadsheet convenience copy; nested values remain deterministic JSON inside cells.",
      etag: "Each ETag is a SHA-256 validator for the exact bytes of that format, not a signature.",
      closedMetadata:
        "Counts, columns, sizes and hashes remain public while hosted bodies are paused. This switch is not confidentiality or recall.",
    },
    collections: Object.entries(paths).map(([path, name]) => {
      const rows = itemsFor(corpus, name);
      const links = exportLinks(path);
      return {
        pathName: path,
        corpusKey: name,
        count: rows.length,
        available: publicDataEnabled || publicWhenClosed.has(path),
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
  corpus: UkPublicFunding,
  etag: string,
  canonicalPath: string,
  alternates: Array<{ href: string; type: string }> = []
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
      `<${canonicalPath}>; rel="canonical"`,
      `<${rightsUrl}>; rel="license"`,
      `<${correctionsUrl}>; rel="help"`,
      `<${basePath}/dictionary>; rel="describedby"; type="application/json"`,
      `<${basePath}/schema>; rel="describedby"; type="application/schema+json"`,
      `</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
      ...alternates.map(
        (alternate) => `<${alternate.href}>; rel="alternate"; type="${alternate.type}"`
      ),
    ].join(", ")
  );
}

function cacheableRepresentation(
  c: Context,
  corpus: UkPublicFunding,
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
  if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) return c.body(null, 304);
  return c.body(body, 200, { "Content-Type": contentType });
}

function cacheableJson(c: Context, corpus: UkPublicFunding, value: unknown) {
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
  if (key === "sector") return includesValue(item, ["sector", "sectors"], value);
  if (key === "jurisdiction") return includesValue(item, ["jurisdictions"], value);
  if (key === "fundingRole") return includesValue(item, ["fundingRoles"], value);
  if (key === "beneficiaryTag") return includesValue(item, ["beneficiaryTags"], value);
  if (key === "institutionId") {
    return includesValue(
      item,
      [
        "institutionId",
        "institutionIds",
        "operatorInstitutionIds",
        "leadInstitutionIds",
        "deliveryInstitutionIds",
        "decisionInstitutionIds",
        "payerInstitutionIds",
        "recipientInstitutionIds",
        "responsibleInstitutionIds",
        ...(collection === "relationships" || collection === "allocations" ? ["fromId", "toId"] : []),
        ...(collection === "transparencyGaps" ? ["affectedIds"] : []),
      ],
      value
    );
  }
  const fieldsByReference: Partial<Record<ExactFilterKey, string[]>> = {
    governanceUnitId: [
      "governanceUnitIds",
      ...(collection === "relationships" ? ["fromId", "toId"] : []),
      ...(collection === "transparencyGaps" ? ["affectedIds"] : []),
    ],
    officeId: [
      "chairOfficeId",
      "memberOfficeIds",
      "officeIds",
      ...(collection === "relationships" ? ["fromId", "toId"] : []),
      ...(collection === "transparencyGaps" ? ["affectedIds"] : []),
    ],
    fundId: [
      "fundIds",
      ...(collection === "relationships" || collection === "allocations" ? ["fromId", "toId"] : []),
      ...(collection === "transparencyGaps" ? ["affectedIds"] : []),
    ],
    programmeId: [
      "programmeIds",
      ...(collection === "relationships" ? ["fromId", "toId"] : []),
      ...(collection === "transparencyGaps" ? ["affectedIds"] : []),
    ],
    mechanismId: [
      "fundingMechanismId",
      "fundingMechanismIds",
      ...(collection === "relationships" ? ["fromId", "toId"] : []),
      ...(collection === "transparencyGaps" ? ["affectedIds"] : []),
    ],
  };
  if (fieldsByReference[key]) return includesValue(item, fieldsByReference[key]!, value);
  return includesValue(item, [key], value);
}

function validFilterValue(
  corpus: UkPublicFunding,
  collection: CollectionName,
  key: ExactFilterKey,
  value: string
) {
  const idsByFilter: Partial<Record<ExactFilterKey, Set<string>>> = {
    institutionId: new Set(corpus.institutions.map((item) => item.id)),
    governanceUnitId: new Set(corpus.governanceUnits.map((item) => item.id)),
    officeId: new Set(corpus.offices.map((item) => item.id)),
    fundId: new Set(corpus.funds.map((item) => item.id)),
    programmeId: new Set(corpus.programmes.map((item) => item.id)),
    mechanismId: new Set(corpus.fundingMechanisms.map((item) => item.id)),
    sourceId: new Set(corpus.sources.map((item) => item.id)),
    financialYear: new Set(corpus.allocations.map((item) => item.financialYear)),
  };
  const known = idsByFilter[key];
  if (known) return known.has(value);
  const schemaField =
    key === "sector" ? (collection === "programmes" ? "sector" : "sectors") :
    key === "jurisdiction" ? "jurisdictions" :
    key === "fundingRole" ? "fundingRoles" :
    key === "beneficiaryTag" ? "beneficiaryTags" : key;
  const allowed = allowedValuesFromJsonSchema(schemaDocument, collection, schemaField);
  return allowed ? allowed.includes(value) : true;
}

function evidenceFor(corpus: UkPublicFunding, item: Identified) {
  const sourceIds = new Set(item.sourceIds ?? []);
  return corpus.sources.filter((source) => sourceIds.has(source.id));
}

function joinsFor(corpus: UkPublicFunding, collection: CollectionName, item: Identified) {
  const itemId = item.id;
  const base = { data: item, evidence: evidenceFor(corpus, item) };
  const relationships = corpus.relationships.filter(
    (relationship) => relationship.fromId === itemId || relationship.toId === itemId
  );
  const allocations = corpus.allocations.filter(
    (allocation) =>
      allocation.fromId === itemId ||
      allocation.toId === itemId ||
      allocation.containedInAllocationId === itemId ||
      allocation.notComparableToIds?.includes(itemId)
  );
  if (collection === "institutions") {
    return {
      ...base,
      governanceUnits: corpus.governanceUnits.filter((unit) => unit.institutionId === itemId),
      offices: corpus.offices.filter((office) => office.institutionId === itemId),
      relationships,
      funds: corpus.funds.filter((fund) => fund.operatorInstitutionIds.includes(itemId)),
      programmes: corpus.programmes.filter(
        (programme) =>
          programme.leadInstitutionIds.includes(itemId) ||
          programme.deliveryInstitutionIds.includes(itemId)
      ),
      fundingMechanisms: corpus.fundingMechanisms.filter(
        (mechanism) =>
          mechanism.decisionInstitutionIds.includes(itemId) ||
          mechanism.payerInstitutionIds.includes(itemId) ||
          mechanism.recipientInstitutionIds.includes(itemId)
      ),
      allocations,
      contacts: corpus.contacts.filter((contact) => contact.institutionIds.includes(itemId)),
      locations: corpus.officeLocations.filter((location) => location.institutionIds.includes(itemId)),
    };
  }
  if (collection === "governanceUnits") {
    const unit = item as unknown as UkPublicFunding["governanceUnits"][number];
    const officeIds = new Set([...(unit.chairOfficeId ? [unit.chairOfficeId] : []), ...unit.memberOfficeIds]);
    return {
      ...base,
      offices: corpus.offices.filter(
        (office) => officeIds.has(office.id) || office.governanceUnitIds.includes(itemId)
      ),
      relationships,
      contacts: corpus.contacts.filter((contact) => contact.governanceUnitIds.includes(itemId)),
      locations: corpus.officeLocations.filter((location) => location.governanceUnitIds.includes(itemId)),
    };
  }
  if (collection === "offices") {
    return {
      ...base,
      governanceUnits: corpus.governanceUnits.filter(
        (unit) => unit.chairOfficeId === itemId || unit.memberOfficeIds.includes(itemId)
      ),
      relationships,
      contacts: corpus.contacts.filter((contact) => contact.officeIds.includes(itemId)),
      locations: corpus.officeLocations.filter((location) => location.officeIds.includes(itemId)),
    };
  }
  if (collection === "funds") {
    return {
      ...base,
      fundingMechanisms: corpus.fundingMechanisms.filter((mechanism) => mechanism.fundIds.includes(itemId)),
      relationships,
      allocations,
    };
  }
  if (collection === "programmes") {
    return {
      ...base,
      fundingMechanisms: corpus.fundingMechanisms.filter(
        (mechanism) => mechanism.programmeIds.includes(itemId)
      ),
      relationships,
      allocations: corpus.allocations.filter((allocation) => allocation.programmeIds.includes(itemId)),
    };
  }
  if (collection === "fundingMechanisms") {
    return {
      ...base,
      programmes: corpus.programmes.filter((programme) => programme.fundingMechanismIds.includes(itemId)),
      relationships,
      allocations: corpus.allocations.filter((allocation) => allocation.fundingMechanismId === itemId),
    };
  }
  if (collection === "allocations") {
    const reverseNotComparable = corpus.allocations.filter((allocation) =>
      allocation.notComparableToIds?.includes(itemId)
    );
    const outgoingNotComparable = corpus.allocations.filter((allocation) =>
      ((item.notComparableToIds as string[] | undefined) ?? []).includes(allocation.id)
    );
    return {
      ...base,
      contained: corpus.allocations.filter((allocation) => allocation.containedInAllocationId === itemId),
      container: corpus.allocations.find((allocation) => allocation.id === item.containedInAllocationId) ?? null,
      notComparableTo: [...new Map(
        [...outgoingNotComparable, ...reverseNotComparable].map((allocation) => [allocation.id, allocation])
      ).values()],
    };
  }
  return collection === "sources" ? { data: item } : base;
}

export type UkPublicFundingRouteOptions = {
  corpus?: UkPublicFunding;
  publicDataEnabled?: boolean;
  emergencyStop?: boolean;
};

export function createUkPublicFundingRoutes(options: UkPublicFundingRouteOptions = {}) {
  const corpus = structuredClone(options.corpus ?? ukPublicFunding);
  const emergencyStop = options.emergencyStop ?? false;
  const publicDataEnabled = (options.publicDataEnabled ?? false) && !emergencyStop;
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
  const preparedExports = new Map<string, { body: string; etag: string }>();
  for (const [path, name] of Object.entries(paths)) {
    for (const format of exportFormats) {
      const body = exportBody(itemsFor(corpus, name), name, format);
      preparedExports.set(`${path}/${format}`, { body, etag: representationEtag(body) });
    }
  }

  app.use("*", async (c, next) => {
    const relativePath = c.req.path.startsWith(basePath)
      ? c.req.path.slice(basePath.length)
      : c.req.path;
    const segments = relativePath.split("/").filter(Boolean);
    const collection = segments[0];
    const protectedCollection =
      paths[collection] !== undefined &&
      (segments.length === 1 || segments.length === 2) &&
      !publicWhenClosed.has(collection);
    const protectedExport =
      segments[0] === "exports" &&
      segments.length === 3 &&
      paths[segments[1]] !== undefined &&
      exportFormats.includes(segments[2] as ExportFormat) &&
      !publicWhenClosed.has(segments[1]);
    if (!publicDataEnabled && (collection === "graph" || protectedCollection || protectedExport)) {
      noStore(c);
      return c.json(
        {
          error: emergencyStop
            ? "publication_emergency_stopped"
            : "publication_review_pending",
          message:
            emergencyStop
              ? "The full public-funding graph is temporarily stopped while a publication issue is reviewed; sources and known gaps remain public."
              : "The reviewed source ledger and gap register remain public while the full public-funding graph is closed.",
          sources: `${basePath}/sources`,
          gaps: `${basePath}/gaps`,
        },
        503
      );
    }
    await next();
  });

  app.get("/", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    return cacheableJson(c, corpus, {
      meta: corpus.meta,
      manifest: {
        datasetHash: `sha256:${datasetHash}`,
        datasetHashAlgorithm: "sha256(taxsorted-deterministic-json-utf8)",
        publicDataEnabled,
        publicationStatus: emergencyStop
          ? "emergency-stopped"
          : publicDataEnabled
            ? "open"
            : "publication-review",
      },
      counts: Object.fromEntries(
        Object.entries(paths).map(([path, name]) => [path, itemsFor(corpus, name).length])
      ),
      routes: {
        fullGraph: `${basePath}/graph`,
        collections: Object.keys(paths).map((path) => `${basePath}/${path}`),
        item: `${basePath}/{collection}/{id}`,
        filters: [...new Set([...commonQueryKeys, ...Object.values(filterKeysByCollection).flat()])],
        manifest: `${basePath}/manifest`,
        schema: `${basePath}/schema`,
        dictionary: `${basePath}/dictionary`,
        exports: `${basePath}/exports`,
        export: `${basePath}/exports/{collection}/{json|ndjson|csv}`,
      },
      related: {
        taxCollectionAndEnforcement: "/v1/tax-system/uk",
        politicalSystemAndFormalPower: "/v1/politics/uk/system",
        openDataCatalog: "/v1/open-data",
        openApi: "/openapi.json",
      },
      startHere: [
        "Read pipeline for the difference between collection, authority, allocation, delivery and audit.",
        "Read every allocation's accounting and comparison dimensions before adding or comparing amounts.",
        "Resolve sourceIds and read doesNotProve and traceabilityWarning.",
        "Use offices for formal responsibility; follow the dated official link for a current holder.",
        "Read gaps before treating this coverage-first map as complete.",
      ],
    });
  });

  app.get("/manifest", (c) => {
    const invalidQuery = rejectStaticQuery(c);
    if (invalidQuery) return invalidQuery;
    return cacheableJson(c, corpus, {
      schema: corpus.schema,
      version: corpus.meta.version,
      reviewedOn: corpus.meta.reviewedOn,
      datasetHash: `sha256:${datasetHash}`,
      datasetHashAlgorithm:
        "SHA-256 of the exact UTF-8 TaxSorted deterministic JSON returned by /graph.",
      publicDataEnabled,
      publicationStatus: emergencyStop
        ? "emergency-stopped"
        : publicDataEnabled
          ? "open"
          : "publication-review",
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
    });
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
    const prepared = preparedExports.get(`${path}/${format}`)!;
    const links = exportLinks(path);
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
      const allowed = new Set<string>([...commonQueryKeys, ...filterKeysByCollection[name]]);
      const unknown = [...searchParams.keys()].filter((key) => !allowed.has(key));
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
        return c.json(
          { error: "invalid_page", limits: { limit: [1, 100], offset: "0 or greater" } },
          400
        );
      }
      const filters = Object.fromEntries(
        filterKeysByCollection[name].flatMap((key) => {
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
      return cacheableJson(c, corpus, {
        data,
        page: { total: matches.length, returned: data.length, limit, offset },
        filters: { ...(q ? { q } : {}), ...filters },
        provenance: {
          corpusVersion: corpus.meta.version,
          reviewedOn: corpus.meta.reviewedOn,
          sourceLedger: `${basePath}/sources`,
          gaps: `${basePath}/gaps`,
        },
      });
    });

    app.get(`/${path}/:id`, (c) => {
      const invalidQuery = rejectStaticQuery(c);
      if (invalidQuery) return invalidQuery;
      const item = itemsFor(corpus, name).find((candidate) => candidate.id === c.req.param("id"));
      if (!item) {
        noStore(c);
        return c.json({ error: "not_found", collection: path, id: c.req.param("id") }, 404);
      }
      return cacheableJson(c, corpus, joinsFor(corpus, name, item));
    });
  }

  app.all("*", (c) => {
    noStore(c);
    return c.json({ error: "not_found" }, 404);
  });

  return app;
}
