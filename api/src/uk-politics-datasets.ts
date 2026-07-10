// Stable dataset definitions screened as candidates for public mirroring and application use.
//
// These are screened TaxSorted projections, never raw upstream payloads. Named
// people, declarations, counterparties and operational records do not belong
// in this bulk registry even when a purpose-bound lookup may exist elsewhere.

import {
  enforcementInstitutions,
  enforcementPowerCards,
  enforcementRelationships,
  enforcementTransparencyCollections,
  financeDatasetCatalog,
  integritySources,
  observableOfficialLanguageMethod,
} from "./uk-integrity-system.js";
import {
  campaignFinanceRules,
  electionActors,
  electionProcess,
  officePowerAssessments,
  politicsSystemSources,
  publicPoliticalFunding,
  relationshipEvidenceLanes,
} from "./uk-politics-system.js";
import { canonicalJson, representationEtag } from "./open-data.js";

export type OpenDatasetRecord = { id: string } & Record<string, unknown>;

export type PoliticsOpenDataset = {
  id: string;
  title: string;
  description: string;
  topics: string[];
  privacyClass: "non-personal" | "aggregate" | "organisation-only";
  coverage: string;
  updateCadence: string;
  schemaVersion: string;
  primaryKey: "id";
  fields: string[];
  sourceIds: string[];
  records: OpenDatasetRecord[];
};

export type PoliticsBulkPublicationApproval = {
  approver: string;
  approvedOn: string;
  admissionDigest: string;
  confidentialIntakeUrl: string;
};

export const politicsDatasetRelease = {
  schema: "taxsorted.uk.open-dataset-catalog/1",
  catalogueVersion: "1.0.0",
  snapshotAsOf: "2026-07-10",
  screenedOn: "2026-07-10",
  screeningStatus: "agent-screened-against-draft-checklist",
  humanApproval: {
    status: "pending",
    approver: null,
    condition:
      "Yu adopts the publication boundary, reviews the per-dataset admission ledger, and a confidential safety-reporting route is live.",
  },
  admissionRecords: "/v1/politics/uk/datasets/admissions",
  compatibility:
    "Dataset and record IDs are opaque permanent identifiers and must not be recycled. New optional fields may be added within schema major 1. Removing a field, making an existing field required or nullable, or changing its type, meaning, primary key or money unit requires a new schema major. A public release and tombstone ledger is still needed to make non-reuse independently auditable across time.",
  access: {
    authentication: "none",
    price: "free",
    methods: ["GET", "HEAD", "OPTIONS"],
    cors: "*",
    formats: ["json", "csv", "ndjson"],
    bulkDownloads: true,
    mirroring:
      "Prefer the static downloads and send If-None-Match when polling. A 304 response means that exact representation is unchanged.",
  },
  licence: {
    name: "Source-specific open terms; TaxSorted curation CC BY-SA 4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    attribution: "TaxSorted (taxsorted.io)",
    note:
      "Keep sourceIds with reused records and follow each publisher's terms in the official-sources dataset. Unresolved upstream replication rights permit only TaxSorted-authored metadata, links and independently written summaries, not copied source records. The software's AGPL licence is not a blanket data licence.",
  },
  safety:
    "Bulk datasets contain only allowlisted institutional, aggregate or organisation-only projections screened against the draft checklist. Per-dataset admission records are published, but human decisions remain pending; this is not a claim of zero downstream risk. Publication approval for a named lookup never silently creates a bulk people export.",
} as const;

export const politicsDatasetRights = {
  schema: "taxsorted.uk.open-dataset-rights/1",
  status: "mixed-rights-read-before-reuse",
  curation: politicsDatasetRelease.licence,
  curationAppliesTo:
    "TaxSorted-written selection, structure, short summaries and method text where TaxSorted has rights to license them.",
  sourceMaterial:
    "Linked or represented source material keeps its publisher's rights, database terms and personal-data conditions. TaxSorted's curation licence does not replace them. When replication rights are unresolved, TaxSorted may distribute only its own metadata, links and independently written summaries.",
  automationRule:
    "Do not interpret the HTTP rel=license link as a claim that every upstream field is CC BY-SA 4.0. Resolve sourceIds through the official-sources dataset and confirm uncertain terms with the publisher.",
  sourceLedger: "/v1/politics/uk/datasets/official-sources",
  admissionLedger: "/v1/politics/uk/datasets/admissions",
  correctionMethod: "/v1/politics/uk/integrity/corrections",
  publicIssueTracker: "https://github.com/cambridgetcg/taxsorted.io/issues",
} as const;

const policeJurisdictionIds: Record<string, string> = {
  "England and Wales": "england-and-wales",
  Scotland: "scotland",
  "Northern Ireland": "northern-ireland",
};

const policeRankIds: Record<string, string> = {
  Constable: "constable",
  Sergeant: "sergeant",
  Inspector: "inspector",
  "Chief Inspector": "chief-inspector",
  Superintendent: "superintendent",
  "Chief Superintendent": "chief-superintendent",
  "Assistant Chief Constable": "assistant-chief-constable",
  "Deputy Chief Constable": "deputy-chief-constable",
  "Chief Constable": "chief-constable",
};

function durableIdPart(table: Record<string, string>, label: string, kind: string) {
  const id = table[label];
  if (!id) {
    throw new TypeError(`${kind} “${label}” needs an explicit durable ID before publication.`);
  }
  return id;
}

function sourceReferences(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(sourceReferences);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) =>
    key === "sourceIds" && Array.isArray(nested)
      ? nested.filter((id): id is string => typeof id === "string")
      : sourceReferences(nested)
  );
}

// Explicit output projections are the bulk-safety boundary. A new top-level
// property is ignored, while a new nested object path stops boot, until a
// reviewer deliberately adds it to the corresponding contract here.
export const politicsDatasetFieldAllowlist: Record<string, readonly string[]> = {
  "official-sources": [
    "id", "jurisdictions", "kind", "personalData", "publisher", "retrievedAt",
    "reuse", "sourceFamily", "sourceId", "supports", "title", "url",
  ],
  "finance-dataset-catalog": [
    "id", "endpoint", "excluded", "publicationClass", "safeProjection", "sourceIds",
    "status", "title",
  ],
  "enforcement-institutions": [
    "id", "jurisdiction", "kind", "name", "officialContact", "publicDataEndpoint",
    "role", "sourceIds",
  ],
  "enforcement-governance": [
    "id", "from", "negativeConstraint", "scope", "sourceIds", "to", "type",
  ],
  "enforcement-office-power": [
    "id", "calculation", "constraints", "evidenceCoverage", "exerciseMode",
    "jurisdiction", "lawAsAt", "methodVersion", "officeFamily", "officeId",
    "officeName", "researchDepth", "scores", "sourceIds", "warning",
  ],
  "police-ranks": ["id", "jurisdiction", "order", "rank", "sourceIds"],
  "police-pay-ranges-england-wales": [
    "id", "asAt", "currency", "effectiveFrom", "jurisdiction", "maximumMinor",
    "minimumMinor", "period", "rank", "sourceIds",
  ],
  "police-benefits-england-wales": [
    "id", "asAt", "detail", "effectiveFrom", "jurisdiction", "kind", "sourceIds",
  ],
  "enforcement-workforce-sources": [
    "id", "coverage", "jurisdiction", "sourceIds", "url",
  ],
  "enforcement-funding-sources": ["id", "coverage", "jurisdiction", "sourceIds"],
  "enforcement-vacancy-links": ["id", "label", "url"],
  "private-security-boundary": ["id", "excluded", "included", "sourceIds", "status"],
  "election-actors": [
    "id", "chosenBy", "kind", "name", "notResponsibleFor", "responsibleFor", "sourceIds",
  ],
  "election-process": [
    "id", "order", "publicRecords", "responsibleActorIds", "sourceIds", "summary", "title",
  ],
  "campaign-finance-rules": [
    "id", "currentRuleSnapshot", "lane", "responsibleActorId", "sourceIds",
  ],
  "public-political-funding": [
    "id", "currentSnapshot", "name", "purpose", "recipient", "sourceIds",
  ],
  "political-office-power": [
    "id", "assessmentId", "calculation", "calibrationStatus", "checks", "dimensions",
    "evidenceStatus", "jurisdiction", "lawAsAt", "methodVersion", "officeFamily", "officeId",
    "officeName", "researchDepth", "reviewedAt", "schema", "sourceIds",
  ],
  "relationship-evidence-lanes": [
    "id", "apiStatus", "doesNotProve", "joinRule", "label", "proves", "sourceIds",
  ],
  "observable-official-language-method": [
    "id", "allowedCorpora", "authorship", "authorshipRule", "deterministicMetrics",
    "minimumCorpus", "name", "prohibited", "purpose", "requiredOutput", "schema", "status",
  ],
};

const politicalPowerDimensionIds = [
  "appointments",
  "budget",
  "enforcement",
  "executive",
  "legislative",
  "oversight",
] as const;

const politicalPowerDimensionFields = [
  "basis",
  "exercise",
  "limits",
  "reason",
  "score",
  "sourceIds",
] as const;

// Paths are relative to a record. Array items use the array field's path, so
// `checks.description` means `description` on every object in `checks`.
export const politicsDatasetNestedFieldAllowlist: Record<string, readonly string[]> = {
  "official-sources": [],
  "finance-dataset-catalog": [],
  "enforcement-institutions": ["officialContact.label", "officialContact.url"],
  "enforcement-governance": [],
  "enforcement-office-power": [
    "calculation.display",
    "calculation.maximum",
    "calculation.raw",
    "scores.appointments",
    "scores.coercive",
    "scores.operational",
    "scores.prosecution",
    "scores.resources",
    "scores.rulesSanctions",
    "scores.scope",
  ],
  "police-ranks": [],
  "police-pay-ranges-england-wales": [],
  "police-benefits-england-wales": [],
  "enforcement-workforce-sources": [],
  "enforcement-funding-sources": [],
  "enforcement-vacancy-links": [],
  "private-security-boundary": [],
  "election-actors": [],
  "election-process": [],
  "campaign-finance-rules": [
    "currentRuleSnapshot.asAt",
    "currentRuleSnapshot.election",
    "currentRuleSnapshot.enforcement",
    "currentRuleSnapshot.limit",
    "currentRuleSnapshot.reporting",
  ],
  "public-political-funding": [
    "currentSnapshot.amountKind",
    "currentSnapshot.annualPoolGbp",
    "currentSnapshot.asAt",
  ],
  "political-office-power": [
    "calculation.band",
    "calculation.display",
    "calculation.maximum",
    "calculation.raw",
    "checks.description",
    "checks.sourceIds",
    ...politicalPowerDimensionIds.flatMap((dimension) => [
      `dimensions.${dimension}`,
      ...politicalPowerDimensionFields.map(
        (field) => `dimensions.${dimension}.${field}`
      ),
    ]),
    "jurisdiction.activeWhen",
    "jurisdiction.competence",
    "jurisdiction.level",
    "jurisdiction.territories",
    "researchDepth.deepDomains",
    "researchDepth.rule",
  ],
  "relationship-evidence-lanes": [],
  "observable-official-language-method": [
    "minimumCorpus.dates",
    "minimumCorpus.documents",
    "minimumCorpus.spanDays",
    "minimumCorpus.words",
  ],
};

function collectNestedPaths(
  value: unknown,
  prefix: string,
  paths: Set<string>
): void {
  if (Array.isArray(value)) {
    for (const item of value) collectNestedPaths(item, prefix, paths);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    const path = `${prefix}.${key}`;
    paths.add(path);
    collectNestedPaths(nested, path, paths);
  }
}

function nestedPaths(records: readonly OpenDatasetRecord[]): string[] {
  const paths = new Set<string>();
  for (const record of records) {
    for (const [field, value] of Object.entries(record)) {
      collectNestedPaths(value, field, paths);
    }
  }
  return [...paths].sort();
}

function dataset(
  input: Omit<PoliticsOpenDataset, "fields" | "sourceIds" | "schemaVersion" | "primaryKey"> & {
    schemaVersion?: string;
  }
): PoliticsOpenDataset {
  const allowedFields = politicsDatasetFieldAllowlist[input.id];
  const allowedNestedFields = politicsDatasetNestedFieldAllowlist[input.id];
  if (!allowedFields || allowedFields[0] !== "id" || new Set(allowedFields).size !== allowedFields.length) {
    throw new TypeError(`Dataset ${input.id} needs one unique, id-first field allowlist.`);
  }
  if (!allowedNestedFields || new Set(allowedNestedFields).size !== allowedNestedFields.length) {
    throw new TypeError(`Dataset ${input.id} needs one unique nested-field allowlist.`);
  }
  const records = input.records.map((record) => {
    const projected = Object.fromEntries(
      allowedFields.flatMap((field) =>
        Object.hasOwn(record, field) ? [[field, structuredClone(record[field])]] : []
      )
    ) as OpenDatasetRecord;
    if (typeof projected.id !== "string" || projected.id.length === 0) {
      throw new TypeError(`Dataset ${input.id} contains a record without a durable string ID.`);
    }
    return projected;
  }).sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  );
  const actualNestedFields = nestedPaths(records);
  const expectedNestedFields = [...allowedNestedFields].sort();
  if (
    actualNestedFields.length !== expectedNestedFields.length ||
    actualNestedFields.some((path, index) => path !== expectedNestedFields[index])
  ) {
    const expected = new Set(expectedNestedFields);
    const actual = new Set(actualNestedFields);
    const unexpected = actualNestedFields.filter((path) => !expected.has(path));
    const missing = expectedNestedFields.filter((path) => !actual.has(path));
    throw new TypeError(
      `Dataset ${input.id} nested-field contract changed. Unexpected: ${unexpected.join(", ") || "none"}; missing: ${missing.join(", ") || "none"}.`
    );
  }
  const schemaVersion = input.schemaVersion ?? "1.0.0";
  if (!/^\d+\.\d+\.\d+$/.test(schemaVersion)) {
    throw new TypeError(`Dataset ${input.id} needs a semantic schema version.`);
  }
  return {
    ...input,
    schemaVersion,
    primaryKey: "id",
    fields: [...allowedFields],
    sourceIds: [...new Set(sourceReferences(records))].sort(),
    records,
  };
}

const officialSourceRecords: OpenDatasetRecord[] = [
  ...politicsSystemSources.map(({ id: sourceId, ...source }) => ({
    id: `political-system:${sourceId}`,
    sourceId,
    sourceFamily: "political-system",
    ...source,
  })),
  ...integritySources.map(({ id: sourceId, ...source }) => ({
    id: `public-integrity:${sourceId}`,
    sourceId,
    sourceFamily: "public-integrity",
    ...source,
  })),
];

const rankRecords: OpenDatasetRecord[] =
  enforcementTransparencyCollections.ranksAndRoles.families.flatMap((family) =>
    family.order.map((rank, index) => {
      const jurisdictionId = durableIdPart(
        policeJurisdictionIds,
        family.jurisdiction,
        "Police jurisdiction"
      );
      const rankId = durableIdPart(policeRankIds, rank, "Police rank");
      return {
        // The order is data, not identity. Inserting a rank must not rename all
        // ranks below it in somebody else's mirror.
        id: `${jurisdictionId}:${rankId}`,
        jurisdiction: family.jurisdiction,
        rank,
        order: index + 1,
        sourceIds: family.sourceIds,
      };
    })
  );

const pay = enforcementTransparencyCollections.payAndBenefits.currentEnglandWales;
const payRangeRecords: OpenDatasetRecord[] = pay.rankRanges.map((range) => {
  const rankId = durableIdPart(policeRankIds, range.rank, "Police rank");
  return {
    id: `england-wales:${pay.effectiveFrom}:${rankId}`,
    jurisdiction: "England and Wales",
    effectiveFrom: pay.effectiveFrom,
    asAt: pay.asAt,
    rank: range.rank,
    minimumMinor: range.minimumMinor,
    maximumMinor: range.maximumMinor,
    currency: "GBP",
    period: "year",
    sourceIds: pay.sourceIds,
  };
});

const payBenefitRecords: OpenDatasetRecord[] = pay.benefits.map((benefit) => ({
  id: `england-wales:${pay.effectiveFrom}:${benefit.kind}`,
  jurisdiction: "England and Wales",
  effectiveFrom: pay.effectiveFrom,
  asAt: pay.asAt,
  ...benefit,
  sourceIds: pay.sourceIds,
}));

export const politicsOpenDatasets: PoliticsOpenDataset[] = [
  dataset({
    id: "official-sources",
    title: "Official source and reuse ledger",
    description: "Official pages, APIs, registers, guidance and legislation used by the politics and integrity datasets.",
    topics: ["sources", "licensing", "provenance"],
    privacyClass: "non-personal",
    coverage: "Source-family metadata only; this is not a mirror of the upstream records.",
    updateCadence: "On every reviewed source or terms change",
    records: officialSourceRecords,
  }),
  dataset({
    id: "finance-dataset-catalog",
    title: "Finance and corporate dataset status",
    description: "What can be distributed now, what is mapped, and what remains closed for a stated licence or privacy reason.",
    topics: ["finance", "companies", "land", "lobbying", "procurement"],
    privacyClass: "non-personal",
    coverage: "Dataset-level publication decisions, not finance events or named-person records.",
    updateCadence: "On every source-family publication decision",
    records: financeDatasetCatalog as OpenDatasetRecord[],
  }),
  dataset({
    id: "enforcement-institutions",
    title: "UK law-enforcement and oversight institutions",
    description: "Institutional mandates, jurisdictions and official public contact routes across the UK systems.",
    topics: ["law-enforcement", "oversight", "prosecution", "private-security"],
    privacyClass: "non-personal",
    coverage: "Principal policing, prosecution and oversight institutions; not every specialist regulator or operational unit.",
    updateCadence: "On reviewed institutional or constitutional change",
    records: enforcementInstitutions as OpenDatasetRecord[],
  }),
  dataset({
    id: "enforcement-governance",
    title: "Law-enforcement governance relationships",
    description: "Typed appointment, strategy, command, inspection, complaint, prosecution and regulatory relationships.",
    topics: ["law-enforcement", "governance", "command", "accountability"],
    privacyClass: "non-personal",
    coverage: "Each edge carries the constraint that prevents accountability from being mistaken for operational command.",
    updateCadence: "On reviewed legal or governance change",
    records: enforcementRelationships as OpenDatasetRecord[],
  }),
  dataset({
    id: "enforcement-office-power",
    title: "Law-enforcement formal office-power cards",
    description: "Seven visible formal-authority dimensions with constraints, method version and source IDs.",
    topics: ["law-enforcement", "formal-power", "offices"],
    privacyClass: "non-personal",
    coverage: "Office baselines only. Scores never describe a holder's character, influence or integrity.",
    updateCadence: "On method version or reviewed legal-power change",
    records: enforcementPowerCards.map((card) => ({ id: card.officeId, ...card })),
  }),
  dataset({
    id: "police-ranks",
    title: "Generic UK police rank orders",
    description: "Generic rank families for England and Wales, Scotland and Northern Ireland.",
    topics: ["police", "ranks", "workforce"],
    privacyClass: "non-personal",
    coverage: "Generic ranks only; no personnel roster, collar number, posting, shift or incident command.",
    updateCadence: "On reviewed rank-structure change",
    records: rankRecords,
  }),
  dataset({
    id: "police-pay-ranges-england-wales",
    title: "Police base-pay ranges, England and Wales",
    description: "Current published annual base-pay minima and maxima by rank, in integer GBP minor units.",
    topics: ["police", "pay", "workforce"],
    privacyClass: "aggregate",
    coverage: "Base pay only; London and other allowances are separate.",
    updateCadence: "Each accepted pay settlement or correction",
    records: payRangeRecords,
  }),
  dataset({
    id: "police-benefits-england-wales",
    title: "Police benefits and progression, England and Wales",
    description: "Published pension, progression and allowance explanations kept separate from base salary.",
    topics: ["police", "benefits", "workforce"],
    privacyClass: "aggregate",
    coverage: "Generic terms, not one officer's remuneration.",
    updateCadence: "Each reviewed remuneration evidence update",
    records: payBenefitRecords,
  }),
  dataset({
    id: "enforcement-workforce-sources",
    title: "Law-enforcement workforce and demographics source map",
    description: "Official aggregate workforce and demographic publications with disclosure-control rules.",
    topics: ["law-enforcement", "workforce", "demographics"],
    privacyClass: "aggregate",
    coverage: enforcementTransparencyCollections.workforce.rule,
    updateCadence: "On each official statistical release",
    records: enforcementTransparencyCollections.workforce.datasets as OpenDatasetRecord[],
  }),
  dataset({
    id: "enforcement-funding-sources",
    title: "Law-enforcement funding source map",
    description: "Official police funding publications with measure-separation rules.",
    topics: ["law-enforcement", "funding", "budgets"],
    privacyClass: "aggregate",
    coverage: enforcementTransparencyCollections.funding.rule,
    updateCadence: "Each funding settlement or reviewed source update",
    records: enforcementTransparencyCollections.funding.datasets as OpenDatasetRecord[],
  }),
  dataset({
    id: "enforcement-vacancy-links",
    title: "Official law-enforcement recruitment routes",
    description: "Official application doors without collecting applicant information.",
    topics: ["law-enforcement", "jobs", "vacancies"],
    privacyClass: "non-personal",
    coverage: enforcementTransparencyCollections.vacancies.rule,
    updateCadence: "Checked on reviewed source update; follow the official route for live vacancies",
    records: enforcementTransparencyCollections.vacancies.routes as OpenDatasetRecord[],
  }),
  dataset({
    id: "private-security-boundary",
    title: "Private-security transparency boundary",
    description: "What is reusable about the SIA and verified companies, and what remains a purpose-bound individual lookup.",
    topics: ["private-security", "regulation", "companies"],
    privacyClass: "organisation-only",
    coverage: "Institution and company-first; no bulk worker or licence-holder directory.",
    updateCadence: "On reviewed regulatory or publication change",
    records: [{ id: "uk-private-security-boundary", ...enforcementTransparencyCollections.privateSecurity }],
  }),
  dataset({
    id: "election-actors",
    title: "UK Parliamentary election actors",
    description: "Who is responsible for each election function and what they are not responsible for.",
    topics: ["elections", "institutions", "responsibility"],
    privacyClass: "non-personal",
    coverage: "UK Parliamentary general-election foundation; local and devolved variants are separate.",
    updateCadence: "On reviewed election-law or responsibility change",
    records: electionActors as OpenDatasetRecord[],
  }),
  dataset({
    id: "election-process",
    title: "UK Parliamentary election process",
    description: "Ordered election stages, responsible actor IDs, public records and sources.",
    topics: ["elections", "process", "public-records"],
    privacyClass: "non-personal",
    coverage: "UK Parliamentary general-election foundation.",
    updateCadence: "On reviewed election-law or process change",
    records: electionProcess as OpenDatasetRecord[],
  }),
  dataset({
    id: "campaign-finance-rules",
    title: "Campaign-finance rules",
    description: "Effective-dated candidate, party, non-party and regulated-funding lanes.",
    topics: ["elections", "campaign-finance", "regulation"],
    privacyClass: "non-personal",
    coverage: "Rules and thresholds, not donation or spending records.",
    updateCadence: "On enacted rule or official-guidance change",
    records: campaignFinanceRules as OpenDatasetRecord[],
  }),
  dataset({
    id: "public-political-funding",
    title: "Public political-funding schemes",
    description: "Public democratic-support schemes kept separate from private donations and campaign spending.",
    topics: ["politics", "public-funding", "parliament"],
    privacyClass: "non-personal",
    coverage: publicPoliticalFunding.principle,
    updateCadence: "On reviewed scheme, formula or allocation change",
    records: publicPoliticalFunding.schemes as OpenDatasetRecord[],
  }),
  dataset({
    id: "political-office-power",
    title: "UK political formal office-power cards",
    description: "Six visible formal-authority dimensions, constraints and evidence for political offices.",
    topics: ["politics", "formal-power", "offices"],
    privacyClass: "non-personal",
    coverage: "Office assessments only; multiple offices and their holders are never merged into one person score.",
    updateCadence: "On method version or reviewed legal-power change",
    records: officePowerAssessments.map((assessment) => ({
      id: assessment.officeId,
      ...assessment,
    })),
  }),
  dataset({
    id: "relationship-evidence-lanes",
    title: "Public relationship evidence lanes",
    description: "What each declaration, meeting, benefit, lobbying or procurement record proves and does not prove.",
    topics: ["politics", "relationships", "evidence"],
    privacyClass: "non-personal",
    coverage: "Method records only; no named relationship or influence graph.",
    updateCadence: "On evidence-method or source-family change",
    records: relationshipEvidenceLanes as OpenDatasetRecord[],
  }),
  dataset({
    id: "observable-official-language-method",
    schemaVersion: "2.0.0",
    title: "Observable official-language method",
    description: "Permitted reproducible surface measures and prohibited personality or psychographic labels.",
    topics: ["official-texts", "method", "language"],
    privacyClass: "non-personal",
    coverage: "Method only; identifiable analysis remains unpublished pending its separate review.",
    updateCadence: "On reviewed methodology or data-protection decision",
    records: [{
      id: "observable-official-language-method",
      authorship: "TaxSorted-authored method; no upstream record is reproduced",
      ...observableOfficialLanguageMethod,
    }],
  }),
];

type AdmissionNotes = {
  risks: readonly string[];
  mitigations: readonly string[];
};

const admissionNotes: Record<string, AdmissionNotes> = {
  "official-sources": {
    risks: ["A source URL or reuse summary can become stale or be mistaken for legal clearance."],
    mitigations: ["Keep retrieval dates and uncertain reuse states visible; source terms override TaxSorted's summary."],
  },
  "finance-dataset-catalog": {
    risks: ["A mapped or gated source can be mistaken for an available event dataset."],
    mitigations: ["Publish explicit status, safe projection and excluded fields; include no finance events or named counterparties."],
  },
  "enforcement-institutions": {
    risks: ["Institutional contacts could drift into named or private contact detail."],
    mitigations: ["Allow only generic official contact labels and URLs under an exact nested-path contract."],
  },
  "enforcement-governance": {
    risks: ["Accountability, funding or appointment edges can be misread as operational command."],
    mitigations: ["Every edge carries a negative constraint and a typed relationship."],
  },
  "enforcement-office-power": {
    risks: ["A formal-authority score can be treated as objective or attached to the worth of an office holder."],
    mitigations: ["Carry all seven dimensions, method version, sources and legal constraints; include no holder names or leaderboard."],
  },
  "police-ranks": {
    risks: ["Generic hierarchy can be mistaken for a live command chain or personnel roster."],
    mitigations: ["Publish rank families and order only; exclude names, postings, shifts, collar numbers and incidents."],
  },
  "police-pay-ranges-england-wales": {
    risks: ["Base ranges can be mistaken for one officer's pay or total remuneration."],
    mitigations: ["Use generic rank ranges, integer minor units, effective dates and an explicit allowance exclusion."],
  },
  "police-benefits-england-wales": {
    risks: ["Generic benefit descriptions can be mistaken for an individual's entitlement."],
    mitigations: ["Keep generic terms separate from salary and publish no employee or payroll record."],
  },
  "enforcement-workforce-sources": {
    risks: ["Future demographic cells could create small-cell, differencing or linkage risk."],
    mitigations: ["Publish source and coverage metadata only; no statistical cells or person-level workforce records are included."],
  },
  "enforcement-funding-sources": {
    risks: ["Funding allocations can be confused with expenditure, operational control or outcomes."],
    mitigations: ["Publish source-map metadata only and preserve the measure-separation rule."],
  },
  "enforcement-vacancy-links": {
    risks: ["A link list can become stale or be expanded into applicant collection."],
    mitigations: ["Link only to official recruitment doors; collect no application, applicant or vacancy-contact data."],
  },
  "private-security-boundary": {
    risks: ["Regulatory transparency can be repurposed into a bulk worker or licence-holder directory."],
    mitigations: ["Publish the institution-and-company boundary only; keep individual checks purpose-bound at the official source."],
  },
  "election-actors": {
    risks: ["A principal Westminster map can be mistaken for every UK election actor or power."],
    mitigations: ["State the parliamentary scope and publish both responsibilities and explicit non-responsibilities."],
  },
  "election-process": {
    risks: ["A compact sequence can oversimplify variants or become stale after legal change."],
    mitigations: ["Label it a parliamentary foundation and retain responsible actor IDs, public records and source IDs."],
  },
  "campaign-finance-rules": {
    risks: ["Rules or thresholds can become stale or be treated as complete legal advice."],
    mitigations: ["Keep effective dates, lane, responsible actor and source IDs; publish no donation or spending events."],
  },
  "public-political-funding": {
    risks: ["Public schemes can be confused with private donations, spending or personal benefit."],
    mitigations: ["Keep schemes, purpose, recipient class, amount kind, snapshot date and sources separate."],
  },
  "political-office-power": {
    risks: ["A provisional office score can be treated as objective, universal or a score of its holder."],
    mitigations: ["Carry six dimensions, calculation, jurisdiction, checks, evidence, constraints and method version; never merge offices into a person score."],
  },
  "relationship-evidence-lanes": {
    risks: ["A donation, meeting, filing or award can be turned into an unsupported claim of influence or guilt."],
    mitigations: ["Every lane states what it proves, what it does not prove and the exact-identifier join rule."],
  },
  "observable-official-language-method": {
    risks: ["Surface language measures can be repurposed into personality, intent or psychographic labels."],
    mitigations: ["Publish the TaxSorted-authored method only, including prohibited outputs; publish no identifiable analysis."],
  },
};

export const politicsDatasetAdmissions = politicsOpenDatasets.map((dataset) => {
  const notes = admissionNotes[dataset.id];
  if (!notes) throw new TypeError(`Dataset ${dataset.id} needs an admission record.`);
  if (
    notes.risks.length === 0 ||
    notes.mitigations.length === 0 ||
    [...notes.risks, ...notes.mitigations].some((note) => note.trim().length === 0)
  ) {
    throw new TypeError(
      `Dataset ${dataset.id} needs non-empty admission risks and mitigations.`
    );
  }
  return {
    schema: "taxsorted.uk.dataset-admission/1",
    id: `admission:${dataset.id}`,
    datasetId: dataset.id,
    datasetSchemaVersion: dataset.schemaVersion,
    status: "agent-screened-human-decision-pending",
    screenedOn: politicsDatasetRelease.screenedOn,
    humanDecision: { status: "pending", approver: null },
    publicPurpose: dataset.description,
    coverageLimits: dataset.coverage,
    snapshotAsOf: politicsDatasetRelease.snapshotAsOf,
    updateCadence: dataset.updateCadence,
    recordCount: dataset.records.length,
    privacyClass: dataset.privacyClass,
    containsPersonalRecords: false,
    minimisation: {
      topLevelFields: [...politicsDatasetFieldAllowlist[dataset.id]],
      nestedObjectPaths: [...politicsDatasetNestedFieldAllowlist[dataset.id]],
      rule: "A new top-level field is omitted and an unknown nested path stops boot until reviewed.",
    },
    sourceIds: [...dataset.sourceIds],
    rightsDecision:
      "Mixed rights. Unresolved upstream replication rights permit only TaxSorted-authored metadata, links and independent summaries.",
    aggregationReview:
      dataset.privacyClass === "aggregate"
        ? "This release contains generic ranges, terms or source metadata, not person-level rows or demographic cells. Re-review small cells, differencing, intersections and linkage before adding statistics."
        : "No person-level or statistical microdata is included. Re-review linkage and re-identification before changing that boundary.",
    foreseeableRisks: [...notes.risks],
    mitigations: [
      "Exact top-level and nested output contracts are tested.",
      "Named-person approval cannot silently create a bulk people export.",
      ...notes.mitigations,
    ],
    correctionMethod: "/v1/politics/uk/integrity/corrections",
    confidentialIntake: "not-live-production-blocker",
  } as const;
});

const politicsDatasetAdmissionContent = politicsDatasetAdmissions.map((record) => {
  const {
    status,
    humanDecision,
    confidentialIntake,
    ...content
  } = record;
  void status;
  void humanDecision;
  void confidentialIntake;
  return content;
});

export const politicsDatasetAdmissionDigest = representationEtag(
  canonicalJson(politicsDatasetAdmissionContent)
).slice(1, -1);

export const politicsDatasetAdmissionDigestScope =
  "Canonical per-dataset admission content excluding changeable human-decision and confidential-intake state.";

export function isPoliticsBulkPublicationApproval(
  value: PoliticsBulkPublicationApproval | null | undefined
): value is PoliticsBulkPublicationApproval {
  if (
    !value ||
    value.approver.trim() !== value.approver ||
    value.approver.length < 1 ||
    value.approver.length > 120
  ) {
    return false;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (
    value.approvedOn < politicsDatasetRelease.screenedOn ||
    value.approvedOn > today
  ) {
    return false;
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value.approvedOn)
  ) {
    return false;
  }
  const [year, month, day] = value.approvedOn.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.toISOString().slice(0, 10) !== value.approvedOn) return false;
  if (value.admissionDigest !== politicsDatasetAdmissionDigest) return false;
  try {
    const intake = new URL(value.confidentialIntakeUrl);
    return (
      intake.protocol === "https:" &&
      intake.username === "" &&
      intake.password === "" &&
      intake.hostname.length > 0
    );
  } catch {
    return false;
  }
}

export function politicsDatasetAdmissionsFor(
  approval: PoliticsBulkPublicationApproval | null | undefined
) {
  if (!isPoliticsBulkPublicationApproval(approval)) return politicsDatasetAdmissions;
  return politicsDatasetAdmissions.map((record) => ({
    ...record,
    status: "human-approved",
    humanDecision: {
      status: "approved",
      approver: approval.approver,
      approvedOn: approval.approvedOn,
      admissionDigest: approval.admissionDigest,
    },
    confidentialIntake: {
      status: "live",
      url: approval.confidentialIntakeUrl,
    },
  }));
}

const extraAdmissionIds = Object.keys(admissionNotes).filter(
  (id) => !politicsOpenDatasets.some((dataset) => dataset.id === id)
);
if (extraAdmissionIds.length) {
  throw new TypeError(`Admission records name unknown datasets: ${extraAdmissionIds.join(", ")}.`);
}

export function findPoliticsOpenDataset(id: string) {
  return politicsOpenDatasets.find((candidate) => candidate.id === id);
}
