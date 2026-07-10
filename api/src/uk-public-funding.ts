// Provenance-first map of how UK public money is authorised, allocated and
// scrutinised. The JSON is the reviewed release; this module makes broken
// sources, evidence pointers, money dimensions and graph links fail at boot.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ukTaxSystem } from "./uk-tax-system.js";

const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const text = z.string().trim().min(1);
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const nonEmptyStrings = z.array(text).min(1);
const httpsUrl = z.string().url().refine((value) => value.startsWith("https://"), {
  message: "URL must use HTTPS",
});
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "invalid calendar date");
const financialYear = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .refine((value) => {
    const [start, end] = value.split("-").map(Number);
    return end === (start + 1) % 100;
  }, "financial year must name consecutive years, for example 2026-27");

const evidenceSchema = z
  .array(
    strictObject({
      sourceId: id,
      fields: z.array(z.string().regex(/^\//)).min(1),
      locator: text,
      observedOn: date,
      method: z.enum([
        "manual-review",
        "derived-join",
        "calculated-from-published-figures",
      ]),
    })
  )
  .min(1);

const evidenced = {
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
};

const sourceSchema = strictObject({
  id,
  title: text,
  publisher: text,
  url: httpsUrl,
  authorityLevel: z.enum([
    "primary-law",
    "official-budget",
    "official-estimate",
    "official-accounts",
    "official-statistics",
    "official-policy",
    "official-guidance",
    "official-register",
    "public-audit",
    "parliamentary-scrutiny",
    "independent-fiscal-analysis",
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
  kind: text,
  sectors: nonEmptyStrings,
  jurisdictions: nonEmptyStrings,
  status: z.enum(["active", "transitional", "historical", "planned"]),
  fundingRoles: nonEmptyStrings,
  purpose: text,
  legalBasis: text,
  website: httpsUrl,
  taxSystemRefs: z.array(id),
  transparencyNotes: z.array(text),
  activeFrom: date.optional(),
  activeTo: date.optional(),
  ...evidenced,
});

const governanceUnitSchema = strictObject({
  id,
  name: text,
  kind: z.enum(["board", "committee", "panel", "directorate", "advisory-group"]),
  institutionId: id,
  authority: text,
  purpose: text,
  powers: nonEmptyStrings,
  limits: nonEmptyStrings,
  chairOfficeId: id.nullable(),
  memberOfficeIds: z.array(id),
  membershipUrl: httpsUrl.nullable(),
  meetingsUrl: httpsUrl.nullable(),
  transparencyNotes: z.array(text),
  activeFrom: date.optional(),
  activeTo: date.optional(),
  ...evidenced,
});

const currentHolderPublicationSchema = strictObject({
  mode: z.literal("official-source-link-only"),
  url: httpsUrl,
  asOf: date,
  reason: text,
});

const officeSchema = strictObject({
  id,
  name: text,
  institutionId: id,
  kind: text,
  responsibility: text,
  decisionScope: text,
  constraints: nonEmptyStrings,
  appointment: text,
  accountability: text,
  governanceUnitIds: z.array(id),
  currentHolderPublication: currentHolderPublicationSchema,
  transparencyNotes: z.array(text),
  activeFrom: date.optional(),
  activeTo: date.optional(),
  ...evidenced,
});

const relationshipSchema = strictObject({
  id,
  fromId: id,
  toId: id,
  type: z.enum([
    "part-of",
    "sponsors",
    "appoints",
    "chairs",
    "member-of",
    "governs",
    "oversees",
    "sets-policy-for",
    "collects-revenue",
    "pays-into-pool",
    "authorises-limit",
    "sets-budget-control",
    "issues-cash",
    "adjusts-block-grant",
    "allocates-to",
    "grants",
    "delegates-function",
    "directs-resource-limit",
    "pays",
    "commissions",
    "holds-commissioning-responsibility",
    "leads-commissioning-for",
    "selects-provider-under",
    "contracts-with",
    "sets-payment-method-for",
    "administers-payment",
    "reimburses",
    "pools-under",
    "regulates",
    "audits",
    "scrutinises",
    "reports-actual-spend",
    "reports-to",
    "accounts-to",
    "advises",
    "recommends-to",
    "operates",
    "collects-for",
    "transfers-to",
    "consolidates-accounts-for",
  ]),
  explanation: text,
  doesNotProve: nonEmptyStrings,
  validFrom: date.optional(),
  validTo: date.optional(),
  ...evidenced,
});

const fundSchema = strictObject({
  id,
  name: text,
  kind: text,
  jurisdictions: nonEmptyStrings,
  operatorInstitutionIds: nonEmptyStrings,
  purpose: text,
  inflows: nonEmptyStrings,
  outflows: nonEmptyStrings,
  restrictions: nonEmptyStrings,
  notEquivalentTo: nonEmptyStrings,
  ...evidenced,
});

const programmeSchema = strictObject({
  id,
  name: text,
  sector: text,
  jurisdictions: nonEmptyStrings,
  status: z.enum(["active", "planned", "historical", "transitional"]),
  purpose: text,
  populationScope: text,
  beneficiaryTags: nonEmptyStrings,
  leadInstitutionIds: nonEmptyStrings,
  deliveryInstitutionIds: z.array(id),
  fundingMechanismIds: z.array(id),
  transparencyNotes: z.array(text),
  ...evidenced,
});

const fundingMechanismSchema = strictObject({
  id,
  name: text,
  kind: text,
  sectors: nonEmptyStrings,
  jurisdictions: nonEmptyStrings,
  status: z.enum(["active", "planned", "historical", "transitional"]),
  decisionInstitutionIds: nonEmptyStrings,
  payerInstitutionIds: nonEmptyStrings,
  recipientInstitutionIds: z.array(id),
  fundIds: z.array(id),
  programmeIds: z.array(id),
  allocationMethod: text,
  conditions: nonEmptyStrings,
  explanation: text,
  doesNotProve: nonEmptyStrings,
  ...evidenced,
});

const allocationSchema = strictObject({
  id,
  name: text,
  fromId: id,
  toId: id,
  programmeIds: z.array(id),
  fundingMechanismId: id.nullable(),
  amountMinor: z
    .number()
    .int()
    .min(Number.MIN_SAFE_INTEGER)
    .max(Number.MAX_SAFE_INTEGER),
  negativeAmountExplanation: text.optional(),
  currency: z.literal("GBP"),
  financialYear,
  status: z.enum(["forecast", "plan", "authorised", "revised", "outturn"]),
  budgetBoundary: text,
  accountingBasis: z.enum(["cash", "accrual", "mixed", "not-stated"]),
  grossOrNet: z.enum(["gross", "net", "not-stated"]),
  priceBasis: z.enum(["nominal", "real", "not-stated"]),
  asOf: date,
  containedInAllocationId: id.optional(),
  additiveGroup: text.optional(),
  notComparableToIds: z.array(id).optional(),
  traceabilityWarning: text,
  ...evidenced,
}).superRefine((item, context) => {
  if (item.amountMinor < 0 && !item.negativeAmountExplanation) {
    context.addIssue({
      code: "custom",
      path: ["negativeAmountExplanation"],
      message: "a negative allocation needs an explicit explanation",
    });
  }
  if (item.amountMinor >= 0 && item.negativeAmountExplanation) {
    context.addIssue({
      code: "custom",
      path: ["negativeAmountExplanation"],
      message: "negativeAmountExplanation is only valid for a negative amount",
    });
  }
});

const contactSchema = strictObject({
  id,
  institutionIds: z.array(id),
  governanceUnitIds: z.array(id),
  officeIds: z.array(id),
  label: text,
  kind: z.enum(["contact-page", "web-form", "email", "phone", "postal-address"]),
  value: text,
  purpose: text,
  functionalOnly: z.literal(true),
  ...evidenced,
}).superRefine((item, context) => {
  if (item.kind === "contact-page" || item.kind === "web-form") {
    try {
      const parsed = new URL(item.value);
      if (parsed.protocol !== "https:") throw new Error("not HTTPS");
    } catch {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "contact pages and web forms must be HTTPS URLs",
      });
    }
  }
  if (item.kind === "email" && !z.string().email().safeParse(item.value).success) {
    context.addIssue({
      code: "custom",
      path: ["value"],
      message: "email contacts must be valid email addresses",
    });
  }
  if (item.kind === "phone") {
    const digits = item.value.replace(/\D/g, "");
    if (!/^[+()0-9 .-]+$/.test(item.value) || digits.length < 7 || digits.length > 15) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "phone contacts must contain a plausible public phone number",
      });
    }
  }
});

const officeLocationSchema = strictObject({
  id,
  institutionIds: z.array(id),
  governanceUnitIds: z.array(id),
  officeIds: z.array(id),
  label: text,
  kind: z.enum([
    "headquarters",
    "public-office",
    "correspondence-address",
    "committee-venue",
    "service-location",
  ]),
  addressLines: nonEmptyStrings,
  locality: text,
  postalCode: text.optional(),
  country: text,
  publicAccess: z.enum(["public", "appointment", "restricted", "not-stated"]),
  note: text,
  residential: z.literal(false),
  ...evidenced,
});

const pipelineStageSchema = strictObject({
  id,
  lane: text,
  order: z.number().int().nonnegative(),
  name: text,
  trigger: text,
  responsibleInstitutionIds: nonEmptyStrings,
  otherNodeIds: z.array(id),
  fundIds: z.array(id),
  programmeIds: z.array(id),
  fundingMechanismIds: z.array(id),
  input: text,
  output: text,
  explanation: text,
  limits: nonEmptyStrings,
  nextStageIds: z.array(id),
  ...evidenced,
});

const transparencyGapSchema = strictObject({
  id,
  title: text,
  detail: text,
  consequence: text,
  status: z.enum(["open", "source-conflict", "time-sensitive", "bounded-by-design"]),
  affectedIds: nonEmptyStrings,
  ...evidenced,
});

export const ukPublicFundingSchema = strictObject({
  schema: z.literal("taxsorted.uk.public-funding/1"),
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
  governanceUnits: z.array(governanceUnitSchema).min(1),
  offices: z.array(officeSchema).min(1),
  relationships: z.array(relationshipSchema).min(1),
  funds: z.array(fundSchema).min(1),
  programmes: z.array(programmeSchema).min(1),
  fundingMechanisms: z.array(fundingMechanismSchema).min(1),
  allocations: z.array(allocationSchema).min(1),
  contacts: z.array(contactSchema).min(1),
  officeLocations: z.array(officeLocationSchema).min(1),
  pipelineStages: z.array(pipelineStageSchema).min(1),
  transparencyGaps: z.array(transparencyGapSchema).min(1),
});

export type UkPublicFunding = z.infer<typeof ukPublicFundingSchema>;

const defaultDataPath = fileURLToPath(
  new URL("../../research/uk/public-funding/data/uk-public-funding.json", import.meta.url)
);

type EvidencedRecord = {
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

function taxSystemIds() {
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

export function validateUkPublicFundingGraph(corpus: UkPublicFunding) {
  const issues: string[] = [];
  const substantiveCollections = [
    corpus.institutions,
    corpus.governanceUnits,
    corpus.offices,
    corpus.relationships,
    corpus.funds,
    corpus.programmes,
    corpus.fundingMechanisms,
    corpus.allocations,
    corpus.contacts,
    corpus.officeLocations,
    corpus.pipelineStages,
    corpus.transparencyGaps,
  ];
  const allCollections = [corpus.sources, ...substantiveCollections];
  const allIds = allCollections.flatMap((items) => items.map((item) => item.id));
  const knownIds = new Set(allIds);
  const seen = new Set<string>();
  for (const itemId of allIds) {
    if (seen.has(itemId)) issues.push(`duplicate id: ${itemId}`);
    seen.add(itemId);
  }

  const sourceIds = new Set(corpus.sources.map((item) => item.id));
  const institutionIds = new Set(corpus.institutions.map((item) => item.id));
  const governanceUnitIds = new Set(corpus.governanceUnits.map((item) => item.id));
  const officeIds = new Set(corpus.offices.map((item) => item.id));
  const fundIds = new Set(corpus.funds.map((item) => item.id));
  const programmeIds = new Set(corpus.programmes.map((item) => item.id));
  const mechanismIds = new Set(corpus.fundingMechanisms.map((item) => item.id));
  const allocationIds = new Set(corpus.allocations.map((item) => item.id));
  const pipelineIds = new Set(corpus.pipelineStages.map((item) => item.id));
  const graphNodeIds = new Set([
    ...institutionIds,
    ...governanceUnitIds,
    ...officeIds,
    ...fundIds,
    ...programmeIds,
    ...mechanismIds,
  ]);
  const externalTaxSystemIds = taxSystemIds();

  const check = (owner: string, values: string[], accepted: Set<string>, kind: string) => {
    for (const value of values) {
      if (!accepted.has(value)) issues.push(`${owner} refers to unknown ${kind}: ${value}`);
    }
  };
  const checkUnique = (owner: string, values: string[], kind: string) => {
    const repeated = values.filter((value, index) => values.indexOf(value) !== index);
    for (const value of new Set(repeated)) issues.push(`${owner} repeats ${kind}: ${value}`);
  };
  const checkDates = (
    owner: string,
    from: string | undefined,
    to: string | undefined,
    fromName: string,
    toName: string
  ) => {
    if (from && to && from > to) issues.push(`${owner} ${fromName} is after ${toName}`);
  };

  for (const source of corpus.sources) {
    checkUnique(source.id, source.supports, "supported claim");
    checkUnique(source.id, source.doesNotProve, "source limitation");
    if (source.reviewedOn > corpus.meta.reviewedOn) {
      issues.push(`${source.id} was reviewed after the corpus review date`);
    }
    if (source.reviewAfter < source.reviewedOn) {
      issues.push(`${source.id} reviewAfter precedes reviewedOn`);
    }
    if (source.lastUpdated && source.lastUpdated > source.reviewedOn) {
      issues.push(`${source.id} lastUpdated is after reviewedOn`);
    }
  }

  for (const item of substantiveCollections.flat() as EvidencedRecord[]) {
    checkUnique(item.id, item.sourceIds, "source reference");
    check(item.id, item.sourceIds, sourceIds, "source");
    for (const sourceId of item.sourceIds) {
      if (!item.evidence.some((entry) => entry.sourceId === sourceId)) {
        issues.push(`${item.id} source has no field evidence: ${sourceId}`);
      }
    }
    for (const entry of item.evidence) {
      if (!sourceIds.has(entry.sourceId)) {
        issues.push(`${item.id} evidence refers to unknown source: ${entry.sourceId}`);
      }
      if (!item.sourceIds.includes(entry.sourceId)) {
        issues.push(`${item.id} evidence source is missing from sourceIds: ${entry.sourceId}`);
      }
      if (entry.observedOn > corpus.meta.reviewedOn) {
        issues.push(`${item.id} evidence is observed after corpus review date`);
      }
      checkUnique(item.id, entry.fields, `evidence pointer for ${entry.sourceId}`);
      for (const field of entry.fields) {
        if (
          field === "/evidence" ||
          field.startsWith("/evidence/") ||
          field === "/sourceIds" ||
          field.startsWith("/sourceIds/")
        ) {
          issues.push(`${item.id} evidence cannot cite provenance metadata: ${field}`);
        }
        if (!jsonPointerExists(item, field)) {
          issues.push(`${item.id} evidence points to a missing field: ${field}`);
        }
      }
    }
  }

  for (const item of corpus.institutions) {
    checkUnique(item.id, item.taxSystemRefs, "tax-system reference");
    check(item.id, item.taxSystemRefs, externalTaxSystemIds, "tax-system record");
    checkDates(item.id, item.activeFrom, item.activeTo, "activeFrom", "activeTo");
  }
  for (const item of corpus.governanceUnits) {
    check(item.id, [item.institutionId], institutionIds, "institution");
    check(item.id, item.chairOfficeId ? [item.chairOfficeId] : [], officeIds, "chair office");
    checkUnique(item.id, item.memberOfficeIds, "member office");
    check(item.id, item.memberOfficeIds, officeIds, "member office");
    checkDates(item.id, item.activeFrom, item.activeTo, "activeFrom", "activeTo");
  }
  for (const item of corpus.offices) {
    check(item.id, [item.institutionId], institutionIds, "institution");
    checkUnique(item.id, item.governanceUnitIds, "governance unit");
    check(item.id, item.governanceUnitIds, governanceUnitIds, "governance unit");
    checkDates(item.id, item.activeFrom, item.activeTo, "activeFrom", "activeTo");
    if (item.currentHolderPublication.asOf > corpus.meta.reviewedOn) {
      issues.push(`${item.id} current-holder link is observed after corpus review date`);
    }
  }
  for (const item of corpus.relationships) {
    check(item.id, [item.fromId, item.toId], graphNodeIds, "graph node");
    if (item.fromId === item.toId) issues.push(`${item.id} is a self-relationship`);
    checkDates(item.id, item.validFrom, item.validTo, "validFrom", "validTo");
  }
  for (const item of corpus.funds) {
    checkUnique(item.id, item.operatorInstitutionIds, "operator institution");
    check(item.id, item.operatorInstitutionIds, institutionIds, "operator institution");
  }
  for (const item of corpus.programmes) {
    checkUnique(item.id, item.leadInstitutionIds, "lead institution");
    checkUnique(item.id, item.deliveryInstitutionIds, "delivery institution");
    checkUnique(item.id, item.fundingMechanismIds, "funding mechanism");
    check(item.id, item.leadInstitutionIds, institutionIds, "lead institution");
    check(item.id, item.deliveryInstitutionIds, institutionIds, "delivery institution");
    check(item.id, item.fundingMechanismIds, mechanismIds, "funding mechanism");
  }
  for (const item of corpus.fundingMechanisms) {
    for (const [values, known, kind] of [
      [item.decisionInstitutionIds, institutionIds, "decision institution"],
      [item.payerInstitutionIds, institutionIds, "payer institution"],
      [item.recipientInstitutionIds, institutionIds, "recipient institution"],
      [item.fundIds, fundIds, "fund"],
      [item.programmeIds, programmeIds, "programme"],
    ] as const) {
      checkUnique(item.id, values, kind);
      check(item.id, values, known, kind);
    }
  }
  const allocationById = new Map(corpus.allocations.map((item) => [item.id, item]));
  const additiveSignatures = new Map<string, string>();
  for (const item of corpus.allocations) {
    check(item.id, [item.fromId, item.toId], graphNodeIds, "graph node");
    if (item.fromId === item.toId) issues.push(`${item.id} has the same source and recipient`);
    checkUnique(item.id, item.programmeIds, "programme");
    check(item.id, item.programmeIds, programmeIds, "programme");
    check(
      item.id,
      item.fundingMechanismId ? [item.fundingMechanismId] : [],
      mechanismIds,
      "funding mechanism"
    );
    check(
      item.id,
      item.containedInAllocationId ? [item.containedInAllocationId] : [],
      allocationIds,
      "containing allocation"
    );
    const notComparable = item.notComparableToIds ?? [];
    checkUnique(item.id, notComparable, "not-comparable allocation");
    check(item.id, notComparable, allocationIds, "not-comparable allocation");
    if (item.containedInAllocationId === item.id) {
      issues.push(`${item.id} cannot contain itself`);
    }
    if (notComparable.includes(item.id)) {
      issues.push(`${item.id} cannot be not-comparable with itself`);
    }
    for (const otherId of notComparable) {
      const other = allocationById.get(otherId);
      if (other && !(other.notComparableToIds ?? []).includes(item.id)) {
        issues.push(`${item.id} has a non-reciprocal not-comparable allocation: ${otherId}`);
      }
    }
    if (item.asOf > corpus.meta.reviewedOn) {
      issues.push(`${item.id} allocation is observed after corpus review date`);
    }
    if (item.additiveGroup) {
      const signature = [
        item.financialYear,
        item.status,
        item.budgetBoundary,
        item.accountingBasis,
        item.grossOrNet,
        item.priceBasis,
      ].join("|");
      const existing = additiveSignatures.get(item.additiveGroup);
      if (existing && existing !== signature) {
        issues.push(`${item.id} does not match additive group dimensions: ${item.additiveGroup}`);
      } else {
        additiveSignatures.set(item.additiveGroup, signature);
      }
      const parent = item.containedInAllocationId
        ? allocationById.get(item.containedInAllocationId)
        : undefined;
      if (parent?.additiveGroup === item.additiveGroup) {
        issues.push(`${item.id} cannot share an additive group with its containing allocation`);
      }
      for (const otherId of notComparable) {
        if (allocationById.get(otherId)?.additiveGroup === item.additiveGroup) {
          issues.push(`${item.id} marks a member of its additive group as not comparable: ${otherId}`);
        }
      }
    }
  }

  // Containment is a hierarchy, never a cycle.
  const allocationParent = new Map(
    corpus.allocations.flatMap((item) =>
      item.containedInAllocationId ? [[item.id, item.containedInAllocationId] as const] : []
    )
  );
  for (const start of allocationParent.keys()) {
    const walked = new Set<string>();
    let current: string | undefined = start;
    while (current) {
      if (walked.has(current)) {
        issues.push(`${start} has a cyclic allocation containment chain`);
        break;
      }
      walked.add(current);
      current = allocationParent.get(current);
    }
  }

  for (const item of [...corpus.contacts, ...corpus.officeLocations]) {
    const targetIds = [
      ...item.institutionIds,
      ...item.governanceUnitIds,
      ...item.officeIds,
    ];
    if (targetIds.length === 0) issues.push(`${item.id} has no institutional target`);
    checkUnique(item.id, targetIds, "institutional target");
    check(item.id, item.institutionIds, institutionIds, "institution");
    check(item.id, item.governanceUnitIds, governanceUnitIds, "governance unit");
    check(item.id, item.officeIds, officeIds, "office");
  }
  for (const item of corpus.contacts) {
    if (!item.evidence.some((entry) => entry.fields.includes("/value"))) {
      issues.push(`${item.id} has no field evidence for its public contact value`);
    }
    if (!item.evidence.some((entry) => entry.fields.includes("/purpose"))) {
      issues.push(`${item.id} has no field evidence for its contact purpose`);
    }
  }
  for (const item of corpus.officeLocations) {
    if (!item.evidence.some((entry) => entry.fields.includes("/addressLines"))) {
      issues.push(`${item.id} has no field evidence for its public address`);
    }
    if (!item.evidence.some((entry) => entry.fields.includes("/publicAccess"))) {
      issues.push(`${item.id} has no field evidence for its access status`);
    }
  }
  const laneOrder = new Set<string>();
  for (const item of corpus.pipelineStages) {
    const key = `${item.lane}:${item.order}`;
    if (laneOrder.has(key)) issues.push(`duplicate pipeline order: ${key}`);
    laneOrder.add(key);
    checkUnique(item.id, item.responsibleInstitutionIds, "responsible institution");
    check(item.id, item.responsibleInstitutionIds, institutionIds, "responsible institution");
    checkUnique(item.id, item.otherNodeIds, "other graph record");
    check(item.id, item.otherNodeIds, graphNodeIds, "other graph node");
    checkUnique(item.id, item.fundIds, "fund");
    checkUnique(item.id, item.programmeIds, "programme");
    checkUnique(item.id, item.fundingMechanismIds, "funding mechanism");
    checkUnique(item.id, item.nextStageIds, "next pipeline stage");
    check(item.id, item.fundIds, fundIds, "fund");
    check(item.id, item.programmeIds, programmeIds, "programme");
    check(item.id, item.fundingMechanismIds, mechanismIds, "funding mechanism");
    check(item.id, item.nextStageIds, pipelineIds, "pipeline stage");
    if (item.nextStageIds.includes(item.id)) issues.push(`${item.id} points to itself`);
  }
  for (const item of corpus.transparencyGaps) {
    checkUnique(item.id, item.affectedIds, "affected record");
    check(item.id, item.affectedIds, knownIds, "funding record");
  }

  if (issues.length) {
    throw new Error(`UK public-funding graph is invalid:\n- ${issues.join("\n- ")}`);
  }
  return corpus;
}

export function loadUkPublicFunding(path = defaultDataPath): UkPublicFunding {
  const parsed = ukPublicFundingSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  return validateUkPublicFundingGraph(parsed);
}

export const ukPublicFunding = loadUkPublicFunding();
