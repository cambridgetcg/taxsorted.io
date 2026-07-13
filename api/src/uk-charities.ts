// Safety boundary: this corpus explains the UK charity system without turning
// public registers into a people, belief or outreach database. Broken source,
// evidence and graph references fail at load time so uncertainty stays visible.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "invalid calendar date");
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const text = z.string().trim().min(1);
const nonEmptyStrings = z.array(text).min(1);
const httpsUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), "URL must use HTTPS");
const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const jurisdictions = z.array(
  z.enum([
    "United Kingdom",
    "England",
    "Wales",
    "England and Wales",
    "Scotland",
    "Northern Ireland",
  ])
).min(1);

const admittedTaxRuleIds = [
  "rule-ita-2007-s539",
  "rule-ita-2007-s540",
  "rule-ita-2007-s541",
  "rule-ita-2007-s542",
  "rule-ita-2007-s543",
  "rule-ita-2007-s562",
  "rule-ita-2007-s563",
  "rule-ita-2007-s564",
  "rule-cta-2010-s492",
  "rule-cta-2010-s493",
  "rule-cta-2010-s494",
  "rule-cta-2010-s495",
  "rule-cta-2010-s496",
  "rule-cta-2010-s515",
  "rule-cta-2010-s516",
  "rule-cta-2010-s517",
] as const;

const admittedOfficialProcedureIds = [
  "procedure-ita-2007-s542-attribution-specification",
  "procedure-cta-2010-s495-attribution-specification",
] as const;

const evidenceSchema = z.array(
  strictObject({
    sourceId: id,
    fields: z.array(z.string().regex(/^\//)).min(1),
    locator: text,
    observedOn: date,
    method: z.enum(["manual-review", "editorial-analysis", "derived-exact-id-mapping"]),
  })
).min(1);

const sourceSchema = strictObject({
  id,
  title: text,
  publisher: text,
  url: httpsUrl,
  authorityLevel: z.enum([
    "primary-law",
    "statutory-regulator",
    "government-guidance",
    "government-data",
    "official-register",
    "tax-authority-guidance",
    "data-protection-regulator",
  ]),
  jurisdictions,
  reviewedOn: date,
  reviewAfter: date,
  lastUpdated: date.optional(),
  status: z.enum(["current", "partly-current", "historical", "availability-uncertain"]),
  reuseStatus: z.enum(["confirmed", "conditional", "link-only", "unknown"]),
  publicationMode: z.enum(["normalised-summary", "metadata-only", "link-only"]),
  licence: strictObject({
    name: text,
    url: httpsUrl,
    attribution: text.optional(),
  }).nullable(),
  supports: nonEmptyStrings,
  doesNotProve: nonEmptyStrings,
});

const recordBase = {
  id,
  name: text,
  jurisdictions,
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
};

const regulatorSchema = strictObject({
  ...recordBase,
  kind: z.enum([
    "charity-regulator",
    "tax-authority",
    "company-registrar",
    "local-rating-authority",
    "data-protection-regulator",
  ]),
  role: text,
  powers: nonEmptyStrings,
  limits: nonEmptyStrings,
  website: httpsUrl,
});

const registerSchema = strictObject({
  ...recordBase,
  kind: z.enum(["charity-register", "company-register", "public-grants", "public-contracts"]),
  regulatorIds: z.array(id),
  accessMode: z.enum(["search", "bulk-download", "download-and-api", "export-on-demand"]),
  accessUrl: httpsUrl,
  updateCadence: text,
  stableIdentifiers: z.array(text),
  availableOrganisationFields: nonEmptyStrings,
  excludedOrUnreliable: nonEmptyStrings,
  rightsAndConditions: nonEmptyStrings,
  containsPersonalData: z.boolean(),
  ingestionStatus: z.enum(["metadata-only", "ready-after-review", "manual-only", "fail-closed"]),
  ingestionReason: text,
});

const legalFormSchema = strictObject({
  ...recordBase,
  incorporated: z.boolean(),
  separateLegalPersonality: z.boolean(),
  regulatorIds: z.array(id),
  governingDocument: text,
  governance: text,
  membership: text,
  assetHolding: text,
  ownerModel: text,
  reportingShape: text,
  notEquivalentTo: nonEmptyStrings,
});

const taxTreatmentSchema = strictObject({
  ...recordBase,
  taxType: z.enum([
    "recognition",
    "income-and-gains",
    "trading",
    "gift-aid",
    "vat",
    "business-rates",
    "property-transaction",
    "cross-tax-rationale",
  ]),
  position: z.enum([
    "administrative-recognition",
    "conditional-relief",
    "taxable-unless-relief",
    "no-blanket-exemption",
    "taxsorted-analysis",
  ]),
  eligibility: text,
  benefit: text,
  conditions: nonEmptyStrings,
  whenTaxOrClawbackCanArise: nonEmptyStrings,
  reasoningStatus: z.enum(["official-summary", "taxsorted-analysis"]),
  reasoning: text,
  notEquivalentTo: nonEmptyStrings,
});

const treatmentFieldPointer = z.enum([
  "/taxType",
  "/position",
  "/eligibility",
  "/benefit",
  "/conditions",
  "/whenTaxOrClawbackCanArise",
  "/reasoningStatus",
  "/reasoning",
  "/notEquivalentTo",
]);

const taxRuleSchema = strictObject({
  ...recordBase,
  taxTreatmentId: id,
  treatmentFieldPointers: z.array(treatmentFieldPointer).min(1),
  reasoningStepIds: z.array(
    z.enum(["classification", "conditions", "effects", "source-reading"])
  ).min(1),
  citation: text,
  authoritySourceId: id,
  administeredByRegulatorIds: nonEmptyStrings,
  taxpayerClass: z.enum([
    "charity-cross-tax",
    "charitable-trust-income-tax",
    "charitable-company-corporation-tax",
  ]),
  ruleRole: z.enum([
    "gateway",
    "restriction",
    "calculation",
    "attribution",
    "definition",
    "transition",
    "procedure",
  ]),
  ruleSummary: text,
  summaryAuthority: z.literal("taxsorted-analysis-of-primary-law"),
  applicabilityConditions: nonEmptyStrings,
  effectiveFrom: date.nullable(),
  effectiveTo: date.nullable(),
  temporalStatus: z.enum(["current", "prospective", "historical", "partly-current"]),
  doesNotProve: nonEmptyStrings,
});

const obligationSchema = strictObject({
  ...recordBase,
  obligationType: z.enum([
    "charitable-status",
    "registration",
    "annual-reporting",
    "accounts",
    "tax-return",
    "governance",
    "company-filing",
    "data-protection",
  ]),
  regulatorIds: z.array(id),
  appliesTo: text,
  trigger: text,
  requirement: nonEmptyStrings,
  deadline: text,
  nonCompliance: nonEmptyStrings,
  practicalCheck: text,
});

const fundingMechanismSchema = strictObject({
  ...recordBase,
  category: z.enum([
    "donation",
    "grant",
    "contract",
    "primary-purpose-trading",
    "non-primary-trading",
    "investment-and-property",
    "fundraising-event",
  ]),
  flow: text,
  taxTreatmentIds: z.array(id),
  publicEvidence: nonEmptyStrings,
  limits: nonEmptyStrings,
  safeUse: text,
});

const financeDisclosureSchema = strictObject({
  ...recordBase,
  disclosureType: z.enum([
    "income-and-spend",
    "assets-and-liabilities",
    "employee-pay-bands",
    "trustee-remuneration",
    "subsidiaries-and-related-parties",
    "public-funding",
    "filed-accounts",
  ]),
  registerIds: z.array(id),
  coverage: text,
  whatPublicCanSee: nonEmptyStrings,
  interpretation: text,
  privacyBoundary: text,
});

const controlModelSchema = strictObject({
  ...recordBase,
  modelType: z.enum([
    "trustee-stewardship",
    "incorporated-entity",
    "trust-asset-holding",
    "membership-governance",
    "subsidiary-control",
    "statutory-company-control",
  ]),
  legalFormIds: z.array(id),
  decisionRights: text,
  assetPosition: text,
  accountability: nonEmptyStrings,
  misleadingLabel: text,
});

const helpRouteSchema = strictObject({
  ...recordBase,
  helpCategory: z.enum([
    "find-an-organisation",
    "ask-an-organisation",
    "regulatory-help",
    "tax-help",
    "rates-help",
    "funding-due-diligence",
  ]),
  registerIds: z.array(id),
  regulatorIds: z.array(id),
  serviceUrl: httpsUrl,
  purpose: text,
  firstStep: text,
  askFor: nonEmptyStrings,
  safeContactRule: nonEmptyStrings,
  basis: z.enum(["official-process", "taxsorted-practical-guidance"]),
});

const officialProcedureSchema = strictObject({
  ...recordBase,
  taxTreatmentId: id,
  treatmentFieldPointers: z.array(treatmentFieldPointer).min(1),
  taxpayerClass: z.enum([
    "charitable-trust-income-tax",
    "charitable-company-corporation-tax",
  ]),
  procedureType: z.literal("attribution-specification-determination"),
  graphNodeKind: z.literal("process"),
  trigger: text,
  summaryAuthority: z.literal("taxsorted-analysis-of-primary-law"),
  applicability: z.literal("conditional-sector-map-case-selection-required"),
  requiredCaseSelectors: z.array(
    z.enum([
      "decision-type",
      "hmrc-requirement-made-date",
      "specification-notice-status",
      "specification-notice-date-if-given",
      "taxpayer-class",
      "tax-period",
      "jurisdiction",
    ])
  ).min(1),
  steps: nonEmptyStrings,
  timeLimit: text,
  paymentEffect: text,
  possibleOutcomes: nonEmptyStrings,
  administeredByRegulatorIds: z.array(id).min(1),
  handledByRegulatorIds: z.array(id).min(1),
  decisionByRegulatorIds: z.array(id).min(1),
  taxRuleIds: nonEmptyStrings,
  nextProcedureIds: z.array(id),
  legalBasisSourceIds: nonEmptyStrings,
  doesNotProve: nonEmptyStrings,
});

const pipelineStageSchema = strictObject({
  ...recordBase,
  lane: z.enum(["source-admission", "collection", "publication", "help-discovery"]),
  order: z.number().int().nonnegative(),
  trigger: text,
  registerIds: z.array(id),
  action: text,
  checks: nonEmptyStrings,
  output: text,
  publicationDecision: z.enum(["continue", "metadata-only", "quarantine", "publish", "stop"]),
  nextStageIds: z.array(id),
});

const gapSchema = strictObject({
  ...recordBase,
  title: text,
  detail: text,
  consequence: text,
  status: z.enum(["open", "source-conflict", "time-sensitive", "bounded-by-design"]),
  affectedIds: nonEmptyStrings,
});

export const ukCharitiesSchema = strictObject({
  schema: z.literal("taxsorted.uk.charities/2"),
  meta: strictObject({
    title: text,
    version: text,
    reviewedOn: date,
    jurisdiction: z.literal("United Kingdom"),
    coverage: nonEmptyStrings,
    exclusions: nonEmptyStrings,
    editorialRules: nonEmptyStrings,
    contentLicence: strictObject({ name: text, url: httpsUrl }),
    warning: text,
  }),
  sources: z.array(sourceSchema).min(1),
  regulators: z.array(regulatorSchema).min(1),
  registers: z.array(registerSchema).min(1),
  legalForms: z.array(legalFormSchema).min(1),
  taxTreatments: z.array(taxTreatmentSchema).min(1),
  taxRules: z.array(taxRuleSchema).min(1),
  obligations: z.array(obligationSchema).min(1),
  fundingMechanisms: z.array(fundingMechanismSchema).min(1),
  financeDisclosures: z.array(financeDisclosureSchema).min(1),
  controlModels: z.array(controlModelSchema).min(1),
  helpRoutes: z.array(helpRouteSchema).min(1),
  officialProcedures: z.array(officialProcedureSchema).min(1),
  pipelineStages: z.array(pipelineStageSchema).min(1),
  transparencyGaps: z.array(gapSchema).min(1),
});

export type UkCharities = z.infer<typeof ukCharitiesSchema>;

const defaultDataPath = fileURLToPath(
  new URL("../../research/uk/charities/data/uk-charities.json", import.meta.url)
);

type EvidenceItem = {
  id: string;
  sourceIds: string[];
  evidence: Array<{ sourceId: string; fields: string[]; observedOn: string }>;
};

function jsonPointerExists(item: unknown, pointer: string) {
  let current: unknown = item;
  for (const raw of pointer.slice(1).split("/")) {
    const part = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(current)) {
      if (!/^\d+$/.test(part) || Number(part) >= current.length) return false;
      current = current[Number(part)];
      continue;
    }
    if (typeof current !== "object" || current === null || !Object.hasOwn(current, part)) {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return true;
}

function checkEvidence(
  issues: string[],
  item: EvidenceItem,
  sourcesById: ReadonlyMap<string, { reviewedOn: string }>,
  reviewedOn: string
) {
  for (const entry of item.evidence) {
    const source = sourcesById.get(entry.sourceId);
    if (!source) {
      issues.push(`${item.id} evidence refers to unknown source: ${entry.sourceId}`);
    }
    if (!item.sourceIds.includes(entry.sourceId)) {
      issues.push(`${item.id} evidence source is missing from sourceIds: ${entry.sourceId}`);
    }
    if (entry.observedOn > reviewedOn) {
      issues.push(`${item.id} evidence is observed after corpus review date: ${entry.observedOn}`);
    }
    if (source && entry.observedOn > source.reviewedOn) {
      issues.push(
        `${item.id} evidence is observed after source review date: ${entry.sourceId} ${entry.observedOn}`
      );
    }
    const evidenceFields = new Set<string>();
    for (const field of entry.fields) {
      if (evidenceFields.has(field)) {
        issues.push(`${item.id} evidence repeats field pointer: ${field}`);
      }
      evidenceFields.add(field);
      const root = field.slice(1).split("/", 1)[0];
      if (root === "sourceIds" || root === "evidence") {
        issues.push(`${item.id} evidence points into provenance metadata: ${field}`);
      }
      if (!jsonPointerExists(item, field)) {
        issues.push(`${item.id} evidence points to a missing field: ${field}`);
      }
    }
  }
  for (const sourceId of item.sourceIds) {
    if (!item.evidence.some((entry) => entry.sourceId === sourceId)) {
      issues.push(`${item.id} source has no field evidence: ${sourceId}`);
    }
  }
}

export function validateUkCharitiesGraph(corpus: UkCharities) {
  const issues: string[] = [];
  const contentCollections = [
    corpus.regulators,
    corpus.registers,
    corpus.legalForms,
    corpus.taxTreatments,
    corpus.taxRules,
    corpus.obligations,
    corpus.fundingMechanisms,
    corpus.financeDisclosures,
    corpus.controlModels,
    corpus.helpRoutes,
    corpus.officialProcedures,
    corpus.pipelineStages,
    corpus.transparencyGaps,
  ];
  // Sources and content records are combined exactly once for global ID checks.
  const allItems = [...corpus.sources, ...contentCollections.flat()];
  const allIds = new Set<string>();
  for (const item of allItems) {
    if (allIds.has(item.id)) issues.push(`duplicate id: ${item.id}`);
    allIds.add(item.id);
  }

  const sourcesById = new Map(corpus.sources.map((item) => [item.id, item]));
  const regulatorIds = new Set(corpus.regulators.map((item) => item.id));
  const registerIds = new Set(corpus.registers.map((item) => item.id));
  const legalFormIds = new Set(corpus.legalForms.map((item) => item.id));
  const taxTreatmentIds = new Set(corpus.taxTreatments.map((item) => item.id));
  const taxRuleIds = new Set(corpus.taxRules.map((item) => item.id));
  const officialProcedureIds = new Set(corpus.officialProcedures.map((item) => item.id));
  const pipelineStageIds = new Set(corpus.pipelineStages.map((item) => item.id));
  const checkUniqueValues = (owner: string, values: string[], kind: string) => {
    const seen = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) issues.push(`${owner} repeats ${kind}: ${value}`);
      seen.add(value);
    }
  };
  const check = (owner: string, values: string[], known: Set<string>, kind: string) => {
    checkUniqueValues(owner, values, `${kind} reference`);
    for (const value of values) {
      if (!known.has(value)) issues.push(`${owner} refers to unknown ${kind}: ${value}`);
    }
  };
  for (const [label, actual, expected] of [
    ["tax rule", taxRuleIds, new Set<string>(admittedTaxRuleIds)],
    ["official procedure", officialProcedureIds, new Set<string>(admittedOfficialProcedureIds)],
  ] as const) {
    for (const expectedId of expected) {
      if (!actual.has(expectedId)) issues.push(`missing admitted ${label}: ${expectedId}`);
    }
    for (const actualId of actual) {
      if (!expected.has(actualId)) issues.push(`unadmitted ${label}: ${actualId}`);
    }
  }

  const sourceUrls = new Set<string>();
  for (const source of corpus.sources) {
    checkUniqueValues(source.id, source.jurisdictions, "jurisdiction");
    if (source.reviewAfter < source.reviewedOn) {
      issues.push(`${source.id} reviewAfter precedes reviewedOn`);
    }
    if (source.reviewedOn > corpus.meta.reviewedOn) {
      issues.push(`${source.id} is reviewed after corpus review date`);
    }
    if (source.lastUpdated && source.lastUpdated > corpus.meta.reviewedOn) {
      issues.push(`${source.id} lastUpdated is after corpus review date`);
    }
    if (sourceUrls.has(source.url)) issues.push(`duplicate source URL: ${source.url}`);
    sourceUrls.add(source.url);
  }
  const evidenceItems = contentCollections.flat() as EvidenceItem[];
  const expandJurisdictions = (values: string[]) => {
    const expanded = new Set<string>();
    for (const value of values) {
      if (value === "United Kingdom") {
        for (const nation of ["England", "Wales", "Scotland", "Northern Ireland"]) {
          expanded.add(nation);
        }
      } else if (value === "England and Wales") {
        expanded.add("England");
        expanded.add("Wales");
      } else {
        expanded.add(value);
      }
    }
    return expanded;
  };
  for (const item of evidenceItems) {
    checkUniqueValues(item.id, item.sourceIds, "sourceId");
    checkUniqueValues(
      item.id,
      (item as EvidenceItem & { jurisdictions: string[] }).jurisdictions,
      "jurisdiction"
    );
    checkEvidence(issues, item, sourcesById, corpus.meta.reviewedOn);
    const itemJurisdictions = expandJurisdictions(
      (item as EvidenceItem & { jurisdictions: string[] }).jurisdictions
    );
    const supportedJurisdictions = expandJurisdictions(
      item.sourceIds.flatMap((sourceId) => sourcesById.get(sourceId)?.jurisdictions ?? [])
    );
    for (const jurisdiction of itemJurisdictions) {
      if (!supportedJurisdictions.has(jurisdiction)) {
        issues.push(`${item.id} lacks source coverage for jurisdiction: ${jurisdiction}`);
      }
    }
  }
  for (const item of corpus.registers) {
    check(item.id, item.regulatorIds, regulatorIds, "regulator");
  }
  for (const item of corpus.legalForms) {
    check(item.id, item.regulatorIds, regulatorIds, "regulator");
  }
  for (const item of corpus.obligations) {
    check(item.id, item.regulatorIds, regulatorIds, "regulator");
  }
  for (const item of corpus.fundingMechanisms) {
    check(item.id, item.taxTreatmentIds, taxTreatmentIds, "tax treatment");
  }
  const exactPrimaryLawUrl = /^https:\/\/www\.legislation\.gov\.uk\/(?:ukpga|uksi|ukla|asp|asc|anaw|nia|nisi)\/[^?#]+\/(?:section|regulation|article|rule|schedule\/[^/]+\/paragraph)\/[^/?#]+(?:\/[^?#]+)*$/;
  const reasoningStepByTreatmentPointer = new Map<
    string,
    "classification" | "conditions" | "effects" | "source-reading"
  >([
    ["/taxType", "classification"],
    ["/position", "classification"],
    ["/eligibility", "conditions"],
    ["/conditions", "conditions"],
    ["/benefit", "effects"],
    ["/whenTaxOrClawbackCanArise", "effects"],
    ["/reasoningStatus", "source-reading"],
    ["/reasoning", "source-reading"],
    ["/notEquivalentTo", "source-reading"],
  ]);
  for (const item of corpus.taxRules) {
    if (item.taxTreatmentId !== "tax-non-charitable-expenditure") {
      issues.push(`${item.id} is outside the admitted non-charitable-expenditure treatment`);
    }
    check(item.id, [item.taxTreatmentId], taxTreatmentIds, "tax treatment");
    check(item.id, item.administeredByRegulatorIds, regulatorIds, "administering regulator");
    for (const regulatorId of item.administeredByRegulatorIds) {
      const regulator = corpus.regulators.find((candidate) => candidate.id === regulatorId);
      if (regulator && regulator.kind !== "tax-authority") {
        issues.push(`${item.id} administrator is not a tax authority: ${regulatorId}`);
      }
    }
    const treatment = corpus.taxTreatments.find(
      (candidate) => candidate.id === item.taxTreatmentId
    );
    if (treatment) {
      checkUniqueValues(item.id, item.treatmentFieldPointers, "treatment field pointer");
      checkUniqueValues(item.id, item.reasoningStepIds, "reasoning step");
      for (const pointer of item.treatmentFieldPointers) {
        if (!jsonPointerExists(treatment, pointer)) {
          issues.push(`${item.id} points to a missing treatment field: ${pointer}`);
        }
        const expectedStep = reasoningStepByTreatmentPointer.get(pointer);
        if (expectedStep && !item.reasoningStepIds.includes(expectedStep)) {
          issues.push(`${item.id} omits reasoning step ${expectedStep} for ${pointer}`);
        }
      }
      const expectedSteps = new Set(
        item.treatmentFieldPointers.flatMap((pointer) => {
          const step = reasoningStepByTreatmentPointer.get(pointer);
          return step ? [step] : [];
        })
      );
      for (const step of item.reasoningStepIds) {
        if (!expectedSteps.has(step)) {
          issues.push(`${item.id} declares unused reasoning step: ${step}`);
        }
      }
    }
    if (!item.sourceIds.includes(item.authoritySourceId)) {
      issues.push(`${item.id} authority source is missing from sourceIds: ${item.authoritySourceId}`);
    }
    const authority = sourcesById.get(item.authoritySourceId);
    if (
      !authority
      || authority.authorityLevel !== "primary-law"
      || authority.status !== "current"
      || authority.reuseStatus !== "confirmed"
      || authority.publicationMode !== "metadata-only"
      || authority.publisher !== "legislation.gov.uk"
      || !exactPrimaryLawUrl.test((authority as { url: string }).url)
    ) {
      issues.push(`${item.id} authority source is not an admitted exact current primary-law provision`);
    }
    const citation = /^(.*) (\d{4}) s ([0-9A-Za-z]+)$/.exec(item.citation);
    if (
      !citation
      || !authority?.title.startsWith(`${citation[1]} ${citation[2]}, section ${citation[3]} `)
      || !authority.url.endsWith(`/section/${citation[3]}`)
    ) {
      issues.push(`${item.id} citation does not identify its exact authority source`);
    }
    if (
      (item.citation.startsWith("Income Tax Act ")
        && item.taxpayerClass !== "charitable-trust-income-tax")
      || (item.citation.startsWith("Corporation Tax Act ")
        && item.taxpayerClass !== "charitable-company-corporation-tax")
    ) {
      issues.push(`${item.id} taxpayer class conflicts with its cited instrument`);
    }
    if (item.effectiveFrom && item.effectiveTo && item.effectiveFrom > item.effectiveTo) {
      issues.push(`${item.id} effectiveFrom is after effectiveTo`);
    }
  }
  for (const item of corpus.financeDisclosures) {
    check(item.id, item.registerIds, registerIds, "register");
  }
  for (const item of corpus.controlModels) {
    check(item.id, item.legalFormIds, legalFormIds, "legal form");
  }
  for (const item of corpus.helpRoutes) {
    check(item.id, item.registerIds, registerIds, "register");
    check(item.id, item.regulatorIds, regulatorIds, "regulator");
  }
  for (const item of corpus.officialProcedures) {
    if (item.taxTreatmentId !== "tax-non-charitable-expenditure") {
      issues.push(`${item.id} is outside the admitted non-charitable-expenditure treatment`);
    }
    check(item.id, [item.taxTreatmentId], taxTreatmentIds, "tax treatment");
    check(item.id, item.taxRuleIds, taxRuleIds, "tax rule");
    check(item.id, item.nextProcedureIds, officialProcedureIds, "official procedure");
    check(item.id, item.administeredByRegulatorIds, regulatorIds, "administering regulator");
    check(item.id, item.handledByRegulatorIds, regulatorIds, "handling regulator");
    check(item.id, item.decisionByRegulatorIds, regulatorIds, "decision regulator");
    check(item.id, item.legalBasisSourceIds, new Set(corpus.sources.map((source) => source.id)), "legal-basis source");
    if (new Set(item.requiredCaseSelectors).size !== item.requiredCaseSelectors.length) {
      issues.push(`${item.id} repeats a required case selector`);
    }
    for (const [role, regulatorIdsForRole] of [
      ["administering", item.administeredByRegulatorIds],
      ["handling", item.handledByRegulatorIds],
      ["decision", item.decisionByRegulatorIds],
    ] as const) {
      if (regulatorIdsForRole.length === 0) {
        issues.push(`${item.id} has no ${role} regulator`);
      }
    }
    const requiredSelectors = new Set(item.requiredCaseSelectors);
    const minimumSelectors = [
      "decision-type",
      "hmrc-requirement-made-date",
      "specification-notice-status",
      "specification-notice-date-if-given",
      "taxpayer-class",
      "tax-period",
      "jurisdiction",
    ] as const;
    for (const selector of minimumSelectors) {
      if (!requiredSelectors.has(selector as typeof item.requiredCaseSelectors[number])) {
        issues.push(`${item.id} omits required case selector: ${selector}`);
      }
    }
    const linkedRules = item.taxRuleIds.flatMap((ruleId) => {
      const rule = corpus.taxRules.find((candidate) => candidate.id === ruleId);
      return rule ? [rule] : [];
    });
    for (const rule of linkedRules) {
      if (
        rule.taxTreatmentId !== item.taxTreatmentId
        || rule.taxpayerClass !== item.taxpayerClass
      ) {
        issues.push(`${item.id} links a tax rule from another treatment or taxpayer class: ${rule.id}`);
      }
    }
    for (const nextProcedureId of item.nextProcedureIds) {
      const nextProcedure = corpus.officialProcedures.find(
        (candidate) => candidate.id === nextProcedureId
      );
      if (
        nextProcedure
        && (
          nextProcedure.taxTreatmentId !== item.taxTreatmentId
          || nextProcedure.taxpayerClass !== item.taxpayerClass
        )
      ) {
        issues.push(`${item.id} links a next procedure from another treatment or taxpayer class: ${nextProcedure.id}`);
      }
    }
    const linkedAuthoritySourceIds = [
      ...new Set(linkedRules.map((rule) => rule.authoritySourceId)),
    ].sort();
    const declaredLegalBasisSourceIds = [...item.legalBasisSourceIds].sort();
    if (linkedAuthoritySourceIds.join("\u0000") !== declaredLegalBasisSourceIds.join("\u0000")) {
      issues.push(`${item.id} legal bases do not exactly match linked tax rule authorities`);
    }
    const linkedTreatmentPointers = [
      ...new Set(linkedRules.flatMap((rule) => rule.treatmentFieldPointers)),
    ].sort();
    const declaredTreatmentPointers = [...item.treatmentFieldPointers].sort();
    if (linkedTreatmentPointers.join("\u0000") !== declaredTreatmentPointers.join("\u0000")) {
      issues.push(`${item.id} treatment fields do not exactly match linked tax rules`);
    }
    const linkedAdministratorIds = [
      ...new Set(linkedRules.flatMap((rule) => rule.administeredByRegulatorIds)),
    ].sort();
    for (const [role, regulatorIdsForRole] of [
      ["administering", item.administeredByRegulatorIds],
      ["handling", item.handledByRegulatorIds],
      ["decision", item.decisionByRegulatorIds],
    ] as const) {
      if ([...regulatorIdsForRole].sort().join("\u0000") !== linkedAdministratorIds.join("\u0000")) {
        issues.push(`${item.id} ${role} regulators do not exactly match linked tax rule administrators`);
      }
    }
    const treatment = corpus.taxTreatments.find(
      (candidate) => candidate.id === item.taxTreatmentId
    );
    if (treatment) {
      checkUniqueValues(item.id, item.treatmentFieldPointers, "treatment field pointer");
      for (const pointer of item.treatmentFieldPointers) {
        if (!jsonPointerExists(treatment, pointer)) {
          issues.push(`${item.id} points to a missing treatment field: ${pointer}`);
        }
      }
    }
    for (const sourceId of item.legalBasisSourceIds) {
      const source = sourcesById.get(sourceId);
      if (!item.sourceIds.includes(sourceId)) {
        issues.push(`${item.id} legal-basis source is missing from sourceIds: ${sourceId}`);
      }
      if (
        !source
        || source.authorityLevel !== "primary-law"
        || source.status !== "current"
        || source.reuseStatus !== "confirmed"
        || source.publicationMode !== "metadata-only"
        || !exactPrimaryLawUrl.test((source as { url: string }).url)
      ) {
        issues.push(`${item.id} legal basis is not an admitted exact primary-law provision: ${sourceId}`);
      }
    }
    if (item.nextProcedureIds.includes(item.id)) {
      issues.push(`${item.id} points to itself`);
    }
  }

  const laneOrders = new Set<string>();
  for (const item of corpus.pipelineStages) {
    const laneOrder = `${item.lane}:${item.order}`;
    if (laneOrders.has(laneOrder)) issues.push(`duplicate pipeline order: ${laneOrder}`);
    laneOrders.add(laneOrder);
    check(item.id, item.registerIds, registerIds, "register");
    check(item.id, item.nextStageIds, pipelineStageIds, "pipeline stage");
    if (item.nextStageIds.includes(item.id)) issues.push(`${item.id} points to itself`);
  }
  for (const item of corpus.transparencyGaps) {
    check(item.id, item.affectedIds, allIds, "corpus item");
  }

  const forbiddenTopLevel = ["organisations", "people", "trustees", "grantRecipients"];
  for (const key of forbiddenTopLevel) {
    if (Object.hasOwn(corpus, key)) issues.push(`forbidden top-level collection: ${key}`);
  }
  const exclusions = corpus.meta.exclusions.join(" ").toLowerCase();
  for (const phrase of ["no charity organisation records", "no people", "no inferred beliefs"]) {
    if (!exclusions.includes(phrase)) issues.push(`meta exclusions must state: ${phrase}`);
  }

  if (issues.length) {
    throw new Error(`UK charities corpus is invalid:\n- ${issues.join("\n- ")}`);
  }
  return corpus;
}

export function loadUkCharities(path = defaultDataPath): UkCharities {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  return validateUkCharitiesGraph(ukCharitiesSchema.parse(raw));
}

export const ukCharities = loadUkCharities();
