// Provenance-first map of entry into the UK tax-services industry. The data
// deliberately separates legal permission, voluntary status and employer
// preference so a commercial convention cannot masquerade as law.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ukTaxSystem } from "./uk-tax-system.js";

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
const httpsUrl = z.string().url().refine((value) => value.startsWith("https://"), "URL must use HTTPS");
const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const moneyRangeSchema = strictObject({
  low: z.number().nonnegative(),
  high: z.number().nonnegative(),
}).refine((range) => range.low <= range.high, "money range low must not exceed high");

const evidenceSchema = z.array(
  strictObject({
    sourceId: id,
    fields: z.array(z.string().regex(/^\//)).min(1),
    locator: text,
    observedOn: date,
    method: z.enum(["manual-review", "derived-join", "calculated-from-published-fees"]),
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
    "official-register",
    "government-guidance",
    "government-careers",
    "professional-body",
    "company-report",
    "public-audit",
  ]),
  reviewedOn: date,
  reviewAfter: date,
  lastUpdated: date.optional(),
  status: z.enum(["current", "historical", "pending", "partly-current"]),
  reuseStatus: z.enum(["confirmed", "link-only", "unknown"]),
  publicationMode: z.enum(["normalised-summary", "metadata-only", "link-only"]),
  supports: nonEmptyStrings,
  doesNotProve: nonEmptyStrings,
  licence: strictObject({ name: text, url: httpsUrl.optional() }).nullable(),
});

const institutionSchema = strictObject({
  id,
  name: text,
  kind: z.enum([
    "public-authority",
    "statutory-regulator",
    "professional-body",
    "court",
    "professional-services-firm",
    "training-market",
    "software-platform",
  ]),
  legalForm: text,
  originDate: date.nullable(),
  originPeriod: text.nullable(),
  predecessors: z.array(text),
  origin: text,
  whyItExists: text,
  governance: text,
  fundingModel: text,
  currentScale: z.array(text),
  powerAndLimits: nonEmptyStrings,
  website: httpsUrl,
  taxSystemRefs: z.array(id),
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
  transparencyNotes: z.array(text),
}).refine((item) => item.originDate !== null || item.originPeriod !== null, {
  message: "institution needs an exact originDate or a bounded originPeriod",
});

const roleSchema = strictObject({
  id,
  name: text,
  category: z.enum([
    "tax-advice",
    "tax-compliance",
    "accountancy",
    "legal",
    "public-service",
    "insolvency",
    "debt-and-enforcement",
    "software",
  ]),
  work: nonEmptyStrings,
  legallyReserved: z.array(text),
  generallyUnreserved: z.array(text),
  requiredGateIds: z.array(id),
  conditionalGateIds: z.array(id),
  commonQualificationIds: z.array(id),
  protectedTitles: z.array(text),
  employeeEntry: text,
  independentEntry: text,
  riskBoundary: nonEmptyStrings,
  pathwayIds: nonEmptyStrings,
  compensationIds: z.array(id),
  taxSystemRefs: z.array(id),
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
});

const assessmentSchema = strictObject({
  name: text,
  format: text,
  durationMinutes: z.number().int().positive().optional(),
  passMarkPercent: z.number().min(0).max(100).optional(),
  choice: text.optional(),
});

const feeItemSchema = strictObject({
  label: text,
  amountGbp: z.number().nonnegative().optional(),
  rangeGbp: moneyRangeSchema.optional(),
  cadence: z.enum(["once", "per-attempt", "annual", "per-premises", "variable"]),
  required: z.boolean(),
  asOf: date,
  note: text,
}).refine((item) => (item.amountGbp !== undefined) !== (item.rangeGbp !== undefined), {
  message: "fee item needs exactly one of amountGbp or rangeGbp",
});

const qualificationSchema = strictObject({
  id,
  name: text,
  awardingInstitutionIds: nonEmptyStrings,
  status: z.enum([
    "voluntary-designation",
    "professional-membership",
    "statutory-precondition",
    "apprenticeship-standard",
  ]),
  level: text,
  designation: text.nullable(),
  entryRequirements: nonEmptyStrings,
  assessments: z.array(assessmentSchema).min(1),
  experienceRequirement: text,
  typicalDuration: text,
  feeItems: z.array(feeItemSchema),
  costSummary: text,
  exemptions: text,
  membershipAndMaintenance: text,
  publicRegister: httpsUrl.nullable(),
  studyResourceIds: nonEmptyStrings,
  barrierNotes: nonEmptyStrings,
  leastFrictionRoute: text,
  notEquivalentTo: nonEmptyStrings,
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
  volatile: z.boolean(),
});

const gateSchema = strictObject({
  id,
  name: text,
  type: z.enum([
    "business-formation",
    "statutory-registration",
    "aml-supervision",
    "data-protection",
    "client-authority",
    "professional-membership",
    "practising-certificate",
    "platform-access",
    "insurance",
    "court-certificate",
    "regulatory-authorisation",
    "employer-selection",
  ]),
  legalStatus: z.enum(["mandatory", "conditional", "voluntary-market-gate"]),
  trigger: text,
  controllerInstitutionIds: nonEmptyStrings,
  steps: nonEmptyStrings,
  requirements: nonEmptyStrings,
  feeItems: z.array(feeItemSchema),
  timing: text,
  renewal: text,
  publicRegister: httpsUrl.nullable(),
  refusalOrBreach: text,
  notEquivalentTo: nonEmptyStrings,
  leastFriction: text,
  roleIds: nonEmptyStrings,
  qualificationIds: z.array(id),
  taxSystemRefs: z.array(id),
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
  volatile: z.boolean(),
});

const pathwayStepSchema = strictObject({
  order: z.number().int().positive(),
  action: text,
  gateId: id.optional(),
  qualificationId: id.optional(),
  mandatory: z.boolean(),
  why: text,
  personalCost: text,
  time: text,
});

const pathwaySchema = strictObject({
  id,
  name: text,
  targetRoleIds: nonEmptyStrings,
  outcome: text,
  startingPoint: text,
  legalMinimum: nonEmptyStrings,
  marketCredibility: nonEmptyStrings,
  steps: z.array(pathwayStepSchema).min(1),
  estimatedTime: text,
  directCost: text,
  lowestFriction: text,
  tradeoffs: nonEmptyStrings,
  stopConditions: nonEmptyStrings,
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
});

const studyResourceSchema = strictObject({
  id,
  name: text,
  providerInstitutionIds: nonEmptyStrings,
  format: text,
  access: z.enum(["free", "paid", "mixed", "employer-funded"]),
  officialStatus: z.enum(["exam-body", "primary-material", "government-guidance", "commercial-tuition"]),
  qualificationIds: z.array(id),
  coverage: nonEmptyStrings,
  costAndAccess: text,
  limitations: nonEmptyStrings,
  url: httpsUrl,
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
  volatile: z.boolean(),
});

const compensationSchema = strictObject({
  id,
  label: text,
  roleIds: z.array(id),
  institutionIds: z.array(id),
  measure: z.enum([
    "salary-range",
    "advertised-apprenticeship-wage",
    "average-distributable-profit-per-partner",
    "fee-income",
    "tax-service-revenue",
  ]),
  amountGbp: z.number().nonnegative().optional(),
  rangeGbp: moneyRangeSchema.optional(),
  period: z.enum(["year", "financial-year", "one-off"]),
  geography: text,
  referencePeriod: text,
  sourceMethod: text,
  comparabilityWarning: text,
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
  volatile: z.boolean(),
}).refine((item) => (item.amountGbp !== undefined) !== (item.rangeGbp !== undefined), {
  message: "compensation item needs exactly one of amountGbp or rangeGbp",
});

const barrierSchema = strictObject({
  id,
  name: text,
  type: z.enum([
    "law",
    "regulatory-access",
    "professional-status",
    "employer-convention",
    "cost",
    "experience-loop",
    "platform-access",
    "information-asymmetry",
    "market-concentration",
  ]),
  createdByInstitutionIds: nonEmptyStrings,
  gateIds: z.array(id),
  qualificationIds: z.array(id),
  mechanism: text,
  statedRationale: text,
  burden: nonEmptyStrings,
  whoBenefits: nonEmptyStrings,
  whoBearsIt: nonEmptyStrings,
  lawfulLowFriction: text,
  countervailingSafeguard: text,
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
});

const gapSchema = strictObject({
  id,
  title: text,
  detail: text,
  consequence: text,
  status: z.enum(["open", "source-conflict", "time-sensitive", "bounded-by-design"]),
  affectedIds: nonEmptyStrings,
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
});

export const ukTaxIndustrySchema = strictObject({
  schema: z.literal("taxsorted.uk.tax-industry/1"),
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
  institutions: z.array(institutionSchema).min(1),
  roles: z.array(roleSchema).min(1),
  qualifications: z.array(qualificationSchema).min(1),
  gates: z.array(gateSchema).min(1),
  pathways: z.array(pathwaySchema).min(1),
  studyResources: z.array(studyResourceSchema).min(1),
  compensation: z.array(compensationSchema).min(1),
  barriers: z.array(barrierSchema).min(1),
  transparencyGaps: z.array(gapSchema).min(1),
});

export type UkTaxIndustry = z.infer<typeof ukTaxIndustrySchema>;

const defaultDataPath = fileURLToPath(
  new URL("../../research/uk/tax-industry/data/uk-tax-industry.json", import.meta.url)
);

type Evidenced = {
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
    } else if (typeof current === "object" && current !== null && Object.hasOwn(current, part)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return false;
    }
  }
  return true;
}

function allTaxSystemIds() {
  return new Set(
    [
      ...ukTaxSystem.sources,
      ...ukTaxSystem.actors,
      ...ukTaxSystem.relationships,
      ...ukTaxSystem.frameworks,
      ...ukTaxSystem.rules,
      ...ukTaxSystem.accountTypes,
      ...ukTaxSystem.systems,
      ...ukTaxSystem.permissions,
      ...ukTaxSystem.pipelineStages,
      ...ukTaxSystem.cases,
      ...ukTaxSystem.transparencyGaps,
    ].map((item) => item.id)
  );
}

export function validateUkTaxIndustryGraph(corpus: UkTaxIndustry) {
  const issues: string[] = [];
  const collections = [
    corpus.sources,
    corpus.institutions,
    corpus.roles,
    corpus.qualifications,
    corpus.gates,
    corpus.pathways,
    corpus.studyResources,
    corpus.compensation,
    corpus.barriers,
    corpus.transparencyGaps,
  ];
  const allIds = collections.flatMap((items) => items.map((item) => item.id));
  const seen = new Set<string>();
  for (const itemId of allIds) {
    if (seen.has(itemId)) issues.push(`duplicate id: ${itemId}`);
    seen.add(itemId);
  }

  const sourceIds = new Set(corpus.sources.map((item) => item.id));
  const institutionIds = new Set(corpus.institutions.map((item) => item.id));
  const roleIds = new Set(corpus.roles.map((item) => item.id));
  const qualificationIds = new Set(corpus.qualifications.map((item) => item.id));
  const gateIds = new Set(corpus.gates.map((item) => item.id));
  const pathwayIds = new Set(corpus.pathways.map((item) => item.id));
  const studyIds = new Set(corpus.studyResources.map((item) => item.id));
  const compensationIds = new Set(corpus.compensation.map((item) => item.id));
  const taxSystemIds = allTaxSystemIds();
  const knownIds = new Set(allIds);
  const check = (owner: string, values: string[], known: Set<string>, kind: string) => {
    for (const value of values) if (!known.has(value)) issues.push(`${owner} refers to unknown ${kind}: ${value}`);
  };
  const checkUnique = (owner: string, values: string[], kind: string) => {
    const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
    for (const value of new Set(duplicates)) issues.push(`${owner} repeats ${kind}: ${value}`);
  };
  const compareEdges = (owner: string, declared: string[], derived: string[], kind: string) => {
    const declaredSet = new Set(declared);
    const derivedSet = new Set(derived);
    const missing = [...derivedSet].filter((value) => !declaredSet.has(value));
    const extra = [...declaredSet].filter((value) => !derivedSet.has(value));
    for (const value of missing) issues.push(`${owner} is missing reciprocal ${kind}: ${value}`);
    for (const value of extra) issues.push(`${owner} has one-sided ${kind}: ${value}`);
  };

  for (const source of corpus.sources) {
    checkUnique(source.id, source.supports, "supports claim");
    checkUnique(source.id, source.doesNotProve, "limitation claim");
    if (source.reviewedOn > corpus.meta.reviewedOn) issues.push(`${source.id} was reviewed after the corpus review date`);
    if (source.reviewAfter < source.reviewedOn) issues.push(`${source.id} reviewAfter precedes reviewedOn`);
    if (source.lastUpdated && source.lastUpdated > source.reviewedOn) {
      issues.push(`${source.id} lastUpdated is after the source review date`);
    }
  }

  const evidenced = collections.slice(1).flat() as Evidenced[];
  for (const item of evidenced) {
    checkUnique(item.id, item.sourceIds, "source reference");
    check(item.id, item.sourceIds, sourceIds, "source");
    for (const sourceId of item.sourceIds) {
      if (!item.evidence.some((entry) => entry.sourceId === sourceId)) {
        issues.push(`${item.id} source has no field evidence: ${sourceId}`);
      }
    }
    for (const entry of item.evidence) {
      if (!sourceIds.has(entry.sourceId)) issues.push(`${item.id} evidence refers to unknown source: ${entry.sourceId}`);
      if (!item.sourceIds.includes(entry.sourceId)) issues.push(`${item.id} evidence source is missing from sourceIds: ${entry.sourceId}`);
      if (entry.observedOn > corpus.meta.reviewedOn) issues.push(`${item.id} evidence is observed after corpus review date`);
      checkUnique(item.id, entry.fields, `evidence pointer for ${entry.sourceId}`);
      for (const field of entry.fields) {
        if (field === "/evidence" || field.startsWith("/evidence/") || field === "/sourceIds" || field.startsWith("/sourceIds/")) {
          issues.push(`${item.id} evidence cannot cite provenance metadata as substantive support: ${field}`);
        }
        if (!jsonPointerExists(item, field)) issues.push(`${item.id} evidence points to a missing field: ${field}`);
      }
    }
  }

  for (const item of corpus.institutions) {
    checkUnique(item.id, item.taxSystemRefs, "tax-system reference");
    check(item.id, item.taxSystemRefs, taxSystemIds, "tax-system record");
  }
  for (const role of corpus.roles) {
    checkUnique(role.id, role.requiredGateIds, "required gate");
    checkUnique(role.id, role.conditionalGateIds, "conditional gate");
    checkUnique(role.id, role.commonQualificationIds, "common qualification");
    checkUnique(role.id, role.pathwayIds, "pathway");
    checkUnique(role.id, role.compensationIds, "compensation record");
    checkUnique(role.id, role.taxSystemRefs, "tax-system reference");
    const conditional = new Set(role.conditionalGateIds);
    for (const gateId of role.requiredGateIds) {
      if (conditional.has(gateId)) issues.push(`${role.id} lists the same gate as required and conditional: ${gateId}`);
    }
    check(role.id, role.requiredGateIds, gateIds, "gate");
    check(role.id, role.conditionalGateIds, gateIds, "gate");
    check(role.id, role.commonQualificationIds, qualificationIds, "qualification");
    check(role.id, role.pathwayIds, pathwayIds, "pathway");
    check(role.id, role.compensationIds, compensationIds, "compensation record");
    check(role.id, role.taxSystemRefs, taxSystemIds, "tax-system record");
    compareEdges(
      role.id,
      [...role.requiredGateIds, ...role.conditionalGateIds],
      corpus.gates.filter((gate) => gate.roleIds.includes(role.id)).map((gate) => gate.id),
      "gate edge"
    );
    compareEdges(
      role.id,
      role.pathwayIds,
      corpus.pathways.filter((pathway) => pathway.targetRoleIds.includes(role.id)).map((pathway) => pathway.id),
      "pathway edge"
    );
    compareEdges(
      role.id,
      role.compensationIds,
      corpus.compensation.filter((item) => item.roleIds.includes(role.id)).map((item) => item.id),
      "compensation edge"
    );
  }
  for (const qualification of corpus.qualifications) {
    checkUnique(qualification.id, qualification.awardingInstitutionIds, "awarding institution");
    checkUnique(qualification.id, qualification.studyResourceIds, "study resource");
    check(qualification.id, qualification.awardingInstitutionIds, institutionIds, "institution");
    check(qualification.id, qualification.studyResourceIds, studyIds, "study resource");
    const names = qualification.assessments.map((assessment) => assessment.name);
    if (new Set(names).size !== names.length) issues.push(`${qualification.id} repeats an assessment name`);
    for (const fee of qualification.feeItems) {
      if (fee.rangeGbp && fee.rangeGbp.low > fee.rangeGbp.high) issues.push(`${qualification.id} has an inverted fee range`);
    }
    compareEdges(
      qualification.id,
      qualification.studyResourceIds,
      corpus.studyResources.filter((resource) => resource.qualificationIds.includes(qualification.id)).map((resource) => resource.id),
      "study-resource edge"
    );
  }
  for (const gate of corpus.gates) {
    checkUnique(gate.id, gate.controllerInstitutionIds, "controller institution");
    checkUnique(gate.id, gate.roleIds, "role");
    checkUnique(gate.id, gate.qualificationIds, "qualification");
    checkUnique(gate.id, gate.taxSystemRefs, "tax-system reference");
    check(gate.id, gate.controllerInstitutionIds, institutionIds, "institution");
    check(gate.id, gate.roleIds, roleIds, "role");
    check(gate.id, gate.qualificationIds, qualificationIds, "qualification");
    check(gate.id, gate.taxSystemRefs, taxSystemIds, "tax-system record");
  }
  for (const pathway of corpus.pathways) {
    checkUnique(pathway.id, pathway.targetRoleIds, "target role");
    check(pathway.id, pathway.targetRoleIds, roleIds, "role");
    const orders = pathway.steps.map((step) => step.order);
    if (new Set(orders).size !== orders.length) issues.push(`${pathway.id} repeats a step order`);
    const expectedOrders = pathway.steps.map((_, index) => index + 1);
    if (orders.some((order, index) => order !== expectedOrders[index])) {
      issues.push(`${pathway.id} steps must be stored in contiguous order starting at 1`);
    }
    for (const step of pathway.steps) {
      if (step.gateId) check(pathway.id, [step.gateId], gateIds, "gate");
      if (step.qualificationId) check(pathway.id, [step.qualificationId], qualificationIds, "qualification");
    }
  }
  for (const resource of corpus.studyResources) {
    checkUnique(resource.id, resource.providerInstitutionIds, "provider institution");
    checkUnique(resource.id, resource.qualificationIds, "qualification");
    check(resource.id, resource.providerInstitutionIds, institutionIds, "institution");
    check(resource.id, resource.qualificationIds, qualificationIds, "qualification");
  }
  for (const item of corpus.compensation) {
    checkUnique(item.id, item.roleIds, "role");
    checkUnique(item.id, item.institutionIds, "institution");
    check(item.id, item.roleIds, roleIds, "role");
    check(item.id, item.institutionIds, institutionIds, "institution");
    if (item.rangeGbp && item.rangeGbp.low > item.rangeGbp.high) issues.push(`${item.id} has an inverted pay range`);
  }
  for (const barrier of corpus.barriers) {
    checkUnique(barrier.id, barrier.createdByInstitutionIds, "creating institution");
    checkUnique(barrier.id, barrier.gateIds, "gate");
    checkUnique(barrier.id, barrier.qualificationIds, "qualification");
    check(barrier.id, barrier.createdByInstitutionIds, institutionIds, "institution");
    check(barrier.id, barrier.gateIds, gateIds, "gate");
    check(barrier.id, barrier.qualificationIds, qualificationIds, "qualification");
  }
  for (const gap of corpus.transparencyGaps) {
    checkUnique(gap.id, gap.affectedIds, "affected record");
    check(gap.id, gap.affectedIds, knownIds, "industry record");
  }

  if (issues.length) throw new Error(`UK tax-industry graph invalid:\n- ${issues.join("\n- ")}`);
  return corpus;
}

export function loadUkTaxIndustry(path = defaultDataPath) {
  const parsed = ukTaxIndustrySchema.parse(JSON.parse(readFileSync(path, "utf8")));
  return validateUkTaxIndustryGraph(parsed);
}

export const ukTaxIndustry = loadUkTaxIndustry();
