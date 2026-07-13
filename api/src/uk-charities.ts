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
  "rule-ita-2007-s544-loss-calculation",
  "rule-ita-2007-s544-miscellaneous-transaction",
  "rule-ita-2007-s545-expenditure-scope",
  "rule-ita-2007-s546-commitment-timing",
  "rule-ita-2007-s547-overseas-reasonable-steps",
  "rule-ita-2007-s548-same-year-recycling",
  "rule-ita-2007-s558-listed-purpose-gateway",
  "rule-ita-2007-s558-unlisted-claim-route",
  "rule-ita-2007-s558-allowable-purpose",
  "rule-ita-2007-s559-security-types",
  "rule-ita-2007-s560-security-conditions",
  "rule-ita-2007-s561-approved-loan",
  "rule-cta-2010-s497-loss-calculation",
  "rule-cta-2010-s497-miscellaneous-transaction",
  "rule-cta-2010-s498-expenditure-scope",
  "rule-cta-2010-s499-commitment-timing",
  "rule-cta-2010-s500-overseas-reasonable-steps",
  "rule-cta-2010-s501-same-period-recycling",
  "rule-cta-2010-s511-listed-purpose-gateway",
  "rule-cta-2010-s511-unlisted-claim-route",
  "rule-cta-2010-s511-allowable-purpose",
  "rule-cta-2010-s512-security-types",
  "rule-cta-2010-s513-security-conditions",
  "rule-cta-2010-s514-approved-loan",
  "rule-tcga-1992-s256-charitable-gain-exemption",
  "rule-tcga-1992-s256-cessation-deemed-disposal",
  "rule-tcga-1992-s256-attributed-gains-chargeable",
  "rule-tcga-1992-s256a-trust-gain-attribution",
  "rule-tcga-1992-s256b-trust-gain-specification",
  "rule-tcga-1992-s256c-company-gain-attribution",
  "rule-tcga-1992-s256d-company-gain-specification",
] as const;

const admittedTaxRuleInstruments = {
  "ita-2007": {
    title: "Income Tax Act 2007",
    legislationClass: "ukpga",
    year: 2007,
    number: 3,
  },
  "cta-2010": {
    title: "Corporation Tax Act 2010",
    legislationClass: "ukpga",
    year: 2010,
    number: 4,
  },
  "tcga-1992": {
    title: "Taxation of Chargeable Gains Act 1992",
    legislationClass: "ukpga",
    year: 1992,
    number: 12,
  },
} as const;

function admittedTaxRuleAuthority(ruleId: string) {
  const match = /^rule-(ita-2007|cta-2010|tcga-1992)-s([0-9]+[a-z]?)(?:-|$)/.exec(ruleId);
  if (!match) throw new Error(`Tax rule lacks an admitted authority identity: ${ruleId}`);
  const instrument = admittedTaxRuleInstruments[
    match[1] as keyof typeof admittedTaxRuleInstruments
  ];
  const sectionId = match[2];
  const section = sectionId.toUpperCase();
  return {
    authoritySourceId: `src-${match[1]}-s${sectionId}`,
    citation: `${instrument.title} s ${section}`,
    sourceTitlePrefix: `${instrument.title}, section ${section} —`,
    selector: {
      kind: "section" as const,
      legislationClass: instrument.legislationClass,
      year: instrument.year,
      number: instrument.number,
      section,
    },
  };
}

const admittedTaxRuleAuthorityById: ReadonlyMap<
  string,
  ReturnType<typeof admittedTaxRuleAuthority>
> = new Map(admittedTaxRuleIds.map((ruleId) => [ruleId, admittedTaxRuleAuthority(ruleId)]));

const admittedOfficialProcedureTreatmentById = {
  "procedure-ita-2007-s542-attribution-specification": "tax-non-charitable-expenditure",
  "procedure-cta-2010-s495-attribution-specification": "tax-non-charitable-expenditure",
  "procedure-trust-tma-1970-s7-chargeability-notification": "tax-income-and-gains",
  "procedure-trust-tma-1970-ss8a-9-return-self-assessment": "tax-income-and-gains",
  "procedure-trust-tma-1970-s9za-taxpayer-amendment": "tax-income-and-gains",
  "procedure-trust-tma-1970-s9zb-hmrc-correction-rejection": "tax-income-and-gains",
  "procedure-trust-tma-1970-s9a-enquiry-opening": "tax-income-and-gains",
  "procedure-trust-tma-1970-s9c-jeopardy-amendment": "tax-income-and-gains",
  "procedure-trust-tma-1970-s28a-closure-amendment": "tax-income-and-gains",
  "procedure-trust-tma-1970-s28c-no-return-determination": "tax-income-and-gains",
  "procedure-trust-tma-1970-ss29-34-36-discovery-assessment": "tax-income-and-gains",
  "procedure-trust-tma-1970-s59b-payment": "tax-income-and-gains",
  "procedure-trust-tma-1970-ss31-31a-appeal-initiation": "tax-income-and-gains",
  "procedure-company-fa-1998-sch18-p2-chargeability-notification": "tax-income-and-gains",
  "procedure-company-fa-1998-sch18-pp3-7-14-return-self-assessment": "tax-income-and-gains",
  "procedure-company-fa-1998-sch18-p15-taxpayer-amendment": "tax-income-and-gains",
  "procedure-company-fa-1998-sch18-p16-hmrc-correction-rejection": "tax-income-and-gains",
  "procedure-company-fa-1998-sch18-p24-enquiry-opening": "tax-income-and-gains",
  "procedure-company-fa-1998-sch18-p30-jeopardy-amendment": "tax-income-and-gains",
  "procedure-company-fa-1998-sch18-pp32-34-closure-amendment": "tax-income-and-gains",
  "procedure-company-fa-1998-sch18-pp36-39-40-no-return-determination": "tax-income-and-gains",
  "procedure-company-fa-1998-sch18-pp41-48-discovery-assessment": "tax-income-and-gains",
  "procedure-company-tma-1970-ss59d-59e-payment": "tax-income-and-gains",
  "procedure-company-fa-1998-sch18-pp30-34-48-appeal-initiation": "tax-income-and-gains",
  "procedure-charity-cross-tax-tma-1970-ss49a-49f-hmrc-review": "tax-income-and-gains",
  "procedure-charity-cross-tax-tma-1970-s49d-direct-tribunal-notification": "tax-income-and-gains",
  "procedure-charity-cross-tax-tma-1970-s49g-post-review-tribunal-notification": "tax-income-and-gains",
  "procedure-charity-cross-tax-tma-1970-s49h-unaccepted-review-offer-tribunal-notification": "tax-income-and-gains",
  "procedure-charity-cross-tax-tma-1970-s50-tribunal-outcome": "tax-income-and-gains",
  "procedure-charity-cross-tax-tma-1970-s55-payment-postponement": "tax-income-and-gains",
  "procedure-charity-cross-tax-fa-2008-s127-england-wales-goods-recovery": "tax-income-and-gains",
  "procedure-charity-cross-tax-fa-2008-s128-scotland-summary-warrant": "tax-income-and-gains",
  "procedure-charity-cross-tax-tma-1970-s61-northern-ireland-distraint": "tax-income-and-gains",
  "procedure-tcga-1992-s256b-gains-attribution-specification": "tax-non-charitable-expenditure",
  "procedure-tcga-1992-s256d-gains-attribution-specification": "tax-non-charitable-expenditure",
} as const;

const admittedOfficialProcedureLegalBasisById: ReadonlyMap<string, readonly string[]> = new Map([
  ["procedure-ita-2007-s542-attribution-specification", ["src-ita-2007-s542"]],
  ["procedure-cta-2010-s495-attribution-specification", ["src-cta-2010-s495"]],
  ["procedure-trust-tma-1970-s7-chargeability-notification", ["src-tma-1970-s7"]],
  ["procedure-trust-tma-1970-ss8a-9-return-self-assessment", ["src-tma-1970-s8a", "src-tma-1970-s9"]],
  ["procedure-trust-tma-1970-s9za-taxpayer-amendment", ["src-tma-1970-s9za"]],
  ["procedure-trust-tma-1970-s9zb-hmrc-correction-rejection", ["src-tma-1970-s9zb"]],
  ["procedure-trust-tma-1970-s9a-enquiry-opening", ["src-tma-1970-s9a"]],
  ["procedure-trust-tma-1970-s9c-jeopardy-amendment", ["src-tma-1970-s9c", "src-tma-1970-s31", "src-tma-1970-s31a"]],
  ["procedure-trust-tma-1970-s28a-closure-amendment", ["src-tma-1970-s28a", "src-tma-1970-s31", "src-tma-1970-s31a"]],
  ["procedure-trust-tma-1970-s28c-no-return-determination", ["src-tma-1970-s28c"]],
  ["procedure-trust-tma-1970-ss29-34-36-discovery-assessment", ["src-tma-1970-s29", "src-tma-1970-s34", "src-tma-1970-s36", "src-tma-1970-s31", "src-tma-1970-s31a", "src-tma-1970-s30a"]],
  ["procedure-trust-tma-1970-s59b-payment", ["src-tma-1970-s59b"]],
  ["procedure-trust-tma-1970-ss31-31a-appeal-initiation", ["src-tma-1970-s31", "src-tma-1970-s31a", "src-tma-1970-s49"]],
  ["procedure-company-fa-1998-sch18-p2-chargeability-notification", ["src-fa-1998-sch18-p2"]],
  ["procedure-company-fa-1998-sch18-pp3-7-14-return-self-assessment", ["src-fa-1998-sch18-p3", "src-fa-1998-sch18-p7", "src-fa-1998-sch18-p14"]],
  ["procedure-company-fa-1998-sch18-p15-taxpayer-amendment", ["src-fa-1998-sch18-p15"]],
  ["procedure-company-fa-1998-sch18-p16-hmrc-correction-rejection", ["src-fa-1998-sch18-p16"]],
  ["procedure-company-fa-1998-sch18-p24-enquiry-opening", ["src-fa-1998-sch18-p24"]],
  ["procedure-company-fa-1998-sch18-p30-jeopardy-amendment", ["src-fa-1998-sch18-p30"]],
  ["procedure-company-fa-1998-sch18-pp32-34-closure-amendment", ["src-fa-1998-sch18-p32", "src-fa-1998-sch18-p34"]],
  ["procedure-company-fa-1998-sch18-pp36-39-40-no-return-determination", ["src-fa-1998-sch18-p36", "src-fa-1998-sch18-p39", "src-fa-1998-sch18-p40"]],
  ["procedure-company-fa-1998-sch18-pp41-48-discovery-assessment", ["src-fa-1998-sch18-p41", "src-fa-1998-sch18-p42", "src-fa-1998-sch18-p43", "src-fa-1998-sch18-p44", "src-fa-1998-sch18-p45", "src-fa-1998-sch18-p46", "src-fa-1998-sch18-p48", "src-fa-1998-sch18-p47"]],
  ["procedure-company-tma-1970-ss59d-59e-payment", ["src-tma-1970-s59d", "src-tma-1970-s59e"]],
  ["procedure-company-fa-1998-sch18-pp30-34-48-appeal-initiation", ["src-fa-1998-sch18-p30", "src-fa-1998-sch18-p34", "src-fa-1998-sch18-p48", "src-tma-1970-s49"]],
  ["procedure-charity-cross-tax-tma-1970-ss49a-49f-hmrc-review", ["src-tma-1970-s49a", "src-tma-1970-s49b", "src-tma-1970-s49c", "src-tma-1970-s49e", "src-tma-1970-s49f"]],
  ["procedure-charity-cross-tax-tma-1970-s49d-direct-tribunal-notification", ["src-tma-1970-s49d"]],
  ["procedure-charity-cross-tax-tma-1970-s49g-post-review-tribunal-notification", ["src-tma-1970-s49g"]],
  ["procedure-charity-cross-tax-tma-1970-s49h-unaccepted-review-offer-tribunal-notification", ["src-tma-1970-s49h"]],
  ["procedure-charity-cross-tax-tma-1970-s50-tribunal-outcome", ["src-tma-1970-s50"]],
  ["procedure-charity-cross-tax-tma-1970-s55-payment-postponement", ["src-tma-1970-s55"]],
  ["procedure-charity-cross-tax-fa-2008-s127-england-wales-goods-recovery", ["src-fa-2008-s127", "src-tcea-2007-sch12-p2"]],
  ["procedure-charity-cross-tax-fa-2008-s128-scotland-summary-warrant", ["src-fa-2008-s128"]],
  ["procedure-charity-cross-tax-tma-1970-s61-northern-ireland-distraint", ["src-tma-1970-s61"]],
  ["procedure-tcga-1992-s256b-gains-attribution-specification", ["src-tcga-1992-s256b"]],
  ["procedure-tcga-1992-s256d-gains-attribution-specification", ["src-tcga-1992-s256d"]],
]);

const admittedOfficialProcedureIds = Object.keys(
  admittedOfficialProcedureTreatmentById
);

export const charityTaxTypes = [
  "income-tax",
  "capital-gains-tax",
  "corporation-tax",
] as const;

export const charityTaxRuleExplanationScopes = [
  "treatment-core",
  "supplementary-substantive",
  "administrative-procedure",
] as const;

export const charityTaxpayerClasses = [
  "charity-cross-tax",
  "charitable-trust-income-tax",
  "charitable-trust-capital-gains-tax",
  "charitable-trust-income-and-capital-gains-tax",
  "charitable-company-corporation-tax",
] as const;

export const charityProcedureTypes = [
  "attribution-specification-determination",
  "chargeability-notification",
  "return-and-self-assessment",
  "taxpayer-return-amendment",
  "hmrc-return-correction-and-taxpayer-rejection",
  "enquiry-opening",
  "jeopardy-amendment",
  "closure-notice-and-amendment",
  "no-return-determination-and-superseding-return",
  "discovery-assessment",
  "tax-payment",
  "appeal-initiation",
  "hmrc-review",
  "tribunal-notification",
  "tribunal-outcome",
  "payment-postponement",
  "taking-control-of-goods-recovery",
  "summary-warrant-recovery",
  "distraint-recovery",
] as const;

export const charityProcedureStages = [
  "attribution",
  "notification",
  "return",
  "amendment",
  "enquiry",
  "assessment",
  "payment",
  "appeal",
  "recovery",
] as const;

export const charityProcedureActorRoles = [
  "taxpayer",
  "tax-authority",
  "tribunal",
  "enforcement-agent",
  "sheriff",
  "sheriff-officer",
  "collector",
] as const;

export const charityProcedureChallengeModes = [
  "appeal",
  "reject-correction",
  "superseding-return",
  "separate-route",
  "none-in-this-provision",
] as const;

export const charityProcedureSelectors = [
  "taxpayer-class",
  "tax-type",
  "tax-period",
  "jurisdiction",
  "document-or-decision-type",
  "notice-to-file-status",
  "notice-to-file-date",
  "notice-withdrawal-status",
  "notice-withdrawal-date-if-withdrawn",
  "tax-year-end",
  "return-filing-date",
  "return-filing-status",
  "filing-deadline",
  "amendment-date",
  "hmrc-correction-date",
  "enquiry-window-end",
  "enquiry-open-date",
  "closure-notice-date",
  "loss-of-tax-behaviour",
  "discovery-date",
  "hmrc-awareness-information-status",
  "prevailing-practice-status",
  "relevant-deadline",
  "payment-due-date",
  "amount-due",
  "appealable-decision",
  "decision-notice-date",
  "appeal-notice-date",
  "review-offer-or-request-status",
  "review-conclusion-date",
  "tribunal-notification-date",
  "postponement-request-status",
  "postponement-decision-status",
  "appeal-status",
  "payment-status",
  "recovery-territory",
  "demand-date",
  "neglect-or-refusal-status",
  "statutory-waiting-period-end",
  "warrant-status",
  "warrant-date",
  "control-or-distraint-date",
  "company-payment-regime",
  "accounting-period-end",
  "hmrc-requirement-made-date",
  "specification-notice-status",
  "specification-notice-date-if-given",
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
    "tribunal",
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

const authoritySelectorSchema = z.discriminatedUnion("kind", [
  strictObject({
    kind: z.literal("section"),
    legislationClass: z.enum(["ukpga", "ukla", "asp", "asc", "anaw", "nia"]),
    year: z.number().int().min(1000).max(9999),
    number: z.number().int().positive(),
    section: text,
  }),
  strictObject({
    kind: z.literal("schedule-paragraph"),
    legislationClass: z.enum(["ukpga", "ukla", "asp", "asc", "anaw", "nia"]),
    year: z.number().int().min(1000).max(9999),
    number: z.number().int().positive(),
    schedule: text,
    paragraph: text,
  }),
]);

const temporalApplicabilitySchema = strictObject({
  basis: z.enum([
    "all-current-cases-subject-to-conditions",
    "event-date",
    "accounting-period",
    "legacy-contract-transition",
  ]),
  eventType: text.nullable(),
  startsOnOrAfter: date.nullable(),
  endsBefore: date.nullable(),
  legacyContractSignedBefore: date.nullable(),
  legacyContractMustNotBeVariedOnOrAfter: date.nullable(),
  transitionAuthoritySourceIds: z.array(id),
});

const taxRuleSchema = strictObject({
  ...recordBase,
  taxTreatmentId: id,
  relatedTaxTreatmentIds: z.array(id).optional(),
  treatmentFieldPointers: z.array(treatmentFieldPointer).min(1),
  reasoningStepIds: z.array(
    z.enum(["classification", "conditions", "effects", "source-reading"])
  ).min(1),
  citation: text,
  authoritySourceId: id,
  authoritySelector: authoritySelectorSchema,
  administeredByRegulatorIds: nonEmptyStrings,
  taxpayerClass: z.enum(charityTaxpayerClasses),
  taxTypes: z.array(z.enum(charityTaxTypes)).min(1),
  explanationScope: z.enum(charityTaxRuleExplanationScopes),
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
  temporalApplicability: temporalApplicabilitySchema,
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
  taxpayerClass: z.enum(charityTaxpayerClasses),
  taxTypes: z.array(z.enum(charityTaxTypes)).min(1),
  procedureStage: z.enum(charityProcedureStages),
  procedureType: z.enum(charityProcedureTypes),
  graphNodeKind: z.enum(["process", "route", "consequence"]),
  performedByRoles: z.array(z.enum(charityProcedureActorRoles)).min(1),
  trigger: text,
  summaryAuthority: z.literal("taxsorted-analysis-of-primary-law"),
  applicability: z.literal("conditional-sector-map-case-selection-required"),
  requiredCaseSelectors: z.array(z.enum(charityProcedureSelectors)).min(1),
  steps: nonEmptyStrings,
  timeLimit: text,
  paymentEffect: text,
  possibleOutcomes: nonEmptyStrings,
  administeredByRegulatorIds: z.array(id).min(1),
  handledByRegulatorIds: z.array(id).min(1),
  decisionByRegulatorIds: z.array(id),
  taxRuleIds: z.array(id),
  nextProcedureIds: z.array(id),
  nextProcedureMeaning: z.literal("possible-not-mandatory"),
  challengeMode: z.enum(charityProcedureChallengeModes),
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
  temporalApplicability: temporalApplicabilitySchema.optional(),
});

export const ukCharitiesSchema = strictObject({
  schema: z.literal("taxsorted.uk.charities/3"),
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

const ukCharitiesSupplementSchema = strictObject({
  schema: z.literal("taxsorted.uk.charities.supplement/1"),
  sources: z.array(sourceSchema).optional(),
  regulators: z.array(regulatorSchema).optional(),
  taxRules: z.array(taxRuleSchema).optional(),
  officialProcedures: z.array(officialProcedureSchema).optional(),
  transparencyGaps: z.array(gapSchema).optional(),
});

export type UkCharities = z.infer<typeof ukCharitiesSchema>;

const defaultDataPath = fileURLToPath(
  new URL("../../research/uk/charities/data/uk-charities.json", import.meta.url)
);
const defaultSupplementPaths = [
  fileURLToPath(
    new URL(
      "../../research/uk/charities/data/uk-charity-tax-law-additions.json",
      import.meta.url
    )
  ),
  fileURLToPath(
    new URL(
      "../../research/uk/charities/data/uk-charity-tax-procedure-additions.json",
      import.meta.url
    )
  ),
] as const;

type EvidenceItem = {
  id: string;
  sourceIds: string[];
  evidence: Array<{
    sourceId: string;
    fields: string[];
    observedOn: string;
    method: "manual-review" | "editorial-analysis" | "derived-exact-id-mapping";
  }>;
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

function authoritySelectorUrl(
  selector: z.infer<typeof authoritySelectorSchema>
): string {
  const root = `https://www.legislation.gov.uk/${selector.legislationClass}/${selector.year}/${selector.number}`;
  return selector.kind === "section"
    ? `${root}/section/${selector.section}`
    : `${root}/schedule/${selector.schedule}/paragraph/${selector.paragraph}`;
}

function authorityDisplayCitation(
  sourceTitle: string,
  selector: z.infer<typeof authoritySelectorSchema>
): string | null {
  const marker = selector.kind === "section" ? ", section " : ", Schedule ";
  const markerIndex = sourceTitle.indexOf(marker);
  if (markerIndex <= 0) return null;
  const instrumentTitle = sourceTitle.slice(0, markerIndex);
  return selector.kind === "section"
    ? `${instrumentTitle} s ${selector.section}`
    : `${instrumentTitle} Sch ${selector.schedule} para ${selector.paragraph}`;
}

function taxpayerFamily(value: string): "trust" | "company" | "cross" {
  if (value === "charity-cross-tax") return "cross";
  return value.startsWith("charitable-trust-") ? "trust" : "company";
}

function compatibleTaxpayerClasses(left: string, right: string): boolean {
  const leftFamily = taxpayerFamily(left);
  const rightFamily = taxpayerFamily(right);
  return leftFamily === "cross" || rightFamily === "cross" || leftFamily === rightFamily;
}

function expectedTaxTypesForClass(
  taxpayerClass: typeof charityTaxpayerClasses[number]
): readonly (typeof charityTaxTypes[number])[] | null {
  if (taxpayerClass === "charity-cross-tax") return null;
  if (taxpayerClass === "charitable-trust-income-tax") return ["income-tax"];
  if (taxpayerClass === "charitable-trust-capital-gains-tax") return ["capital-gains-tax"];
  if (taxpayerClass === "charitable-trust-income-and-capital-gains-tax") {
    return ["income-tax", "capital-gains-tax"];
  }
  return ["corporation-tax"];
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return [...left].sort().join("\u0000") === [...right].sort().join("\u0000");
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

function checkSubstantiveEvidenceCoverage(issues: string[], item: EvidenceItem) {
  const coveredRoots = new Set(
    item.evidence.flatMap((entry) =>
      entry.fields.map((pointer) => pointer.slice(1).split("/", 1)[0])
    )
  );
  for (const field of Object.keys(item)) {
    if (["id", "sourceIds", "evidence"].includes(field)) continue;
    if (!coveredRoots.has(field)) {
      issues.push(`${item.id} has no evidence pointer for public field: ${field}`);
    }
  }
}

function checkEvidenceMethod(
  issues: string[],
  item: EvidenceItem,
  pointer: string,
  method: EvidenceItem["evidence"][number]["method"]
) {
  const supportingEntries = item.evidence.filter((entry) => entry.fields.includes(pointer));
  if (
    supportingEntries.length === 0
    || supportingEntries.some((entry) => entry.method !== method)
  ) {
    issues.push(`${item.id} must evidence ${pointer} with ${method}`);
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
  const checkTemporalApplicability = (
    owner: string,
    temporal: z.infer<typeof temporalApplicabilitySchema>
  ) => {
    if (
      temporal.startsOnOrAfter
      && temporal.endsBefore
      && temporal.startsOnOrAfter >= temporal.endsBefore
    ) {
      issues.push(`${owner} temporal applicability has an empty or reversed interval`);
    }
    if (
      temporal.basis === "event-date"
      && (!temporal.eventType || !temporal.startsOnOrAfter)
    ) {
      issues.push(`${owner} event-date applicability needs an event type and start date`);
    }
    if (temporal.basis === "legacy-contract-transition") {
      if (
        !temporal.legacyContractSignedBefore
        || !temporal.legacyContractMustNotBeVariedOnOrAfter
        || temporal.transitionAuthoritySourceIds.length === 0
      ) {
        issues.push(
          `${owner} legacy-contract transition needs both cutoff dates and transition authority`
        );
      }
    } else if (
      temporal.legacyContractSignedBefore
      || temporal.legacyContractMustNotBeVariedOnOrAfter
    ) {
      issues.push(`${owner} declares legacy-contract dates outside a legacy transition`);
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
    checkSubstantiveEvidenceCoverage(issues, item);
    checkEvidenceMethod(issues, item, "/authoritySelector", "derived-exact-id-mapping");
    checkEvidenceMethod(issues, item, "/explanationScope", "editorial-analysis");
    checkEvidenceMethod(issues, item, "/summaryAuthority", "editorial-analysis");
    checkTemporalApplicability(item.id, item.temporalApplicability);
    const admittedAuthority = admittedTaxRuleAuthorityById.get(item.id);
    if (
      !admittedAuthority
      || item.authoritySourceId !== admittedAuthority.authoritySourceId
      || item.citation !== admittedAuthority.citation
      || item.authoritySelector.kind !== admittedAuthority.selector.kind
      || item.authoritySelector.legislationClass !== admittedAuthority.selector.legislationClass
      || item.authoritySelector.year !== admittedAuthority.selector.year
      || item.authoritySelector.number !== admittedAuthority.selector.number
      || item.authoritySelector.section !== admittedAuthority.selector.section
    ) {
      issues.push(`${item.id} authority does not match its admitted rule identity`);
    }
    if (item.taxTreatmentId !== "tax-non-charitable-expenditure") {
      issues.push(`${item.id} is outside the admitted non-charitable-expenditure treatment`);
    }
    check(item.id, [item.taxTreatmentId], taxTreatmentIds, "tax treatment");
    check(
      item.id,
      item.relatedTaxTreatmentIds ?? [],
      taxTreatmentIds,
      "related tax treatment"
    );
    checkUniqueValues(
      item.id,
      item.relatedTaxTreatmentIds ?? [],
      "related tax treatment"
    );
    if (item.relatedTaxTreatmentIds?.includes(item.taxTreatmentId)) {
      issues.push(`${item.id} repeats its primary tax treatment as a related treatment`);
    }
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
    checkUniqueValues(item.id, item.taxTypes, "tax type");
    check(
      item.id,
      item.temporalApplicability.transitionAuthoritySourceIds,
      new Set(corpus.sources.map((source) => source.id)),
      "transition authority source"
    );
    for (const sourceId of item.temporalApplicability.transitionAuthoritySourceIds) {
      if (!item.sourceIds.includes(sourceId)) {
        issues.push(`${item.id} transition authority is missing from sourceIds: ${sourceId}`);
      }
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
    if (
      admittedAuthority
      && authority
      && !authority.title.startsWith(admittedAuthority.sourceTitlePrefix)
    ) {
      issues.push(`${item.id} authority title does not match its admitted rule identity`);
    }
    if (authority?.url !== authoritySelectorUrl(item.authoritySelector)) {
      issues.push(`${item.id} citation does not identify its exact authority source`);
    }
    const expectedCitation = authority
      ? authorityDisplayCitation(authority.title, item.authoritySelector)
      : null;
    if (!expectedCitation || item.citation !== expectedCitation) {
      issues.push(`${item.id} display citation conflicts with its machine authority selector`);
    }
    if (
      (item.citation.startsWith("Income Tax Act ")
        && taxpayerFamily(item.taxpayerClass) !== "trust")
      || (item.citation.startsWith("Corporation Tax Act ")
        && item.taxpayerClass !== "charitable-company-corporation-tax")
    ) {
      issues.push(`${item.id} taxpayer class conflicts with its cited instrument`);
    }
    const expectedTaxTypes = expectedTaxTypesForClass(item.taxpayerClass);
    if (expectedTaxTypes && !sameStringSet(item.taxTypes, expectedTaxTypes)) {
      issues.push(`${item.id} tax types conflict with its taxpayer class`);
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
    checkSubstantiveEvidenceCoverage(issues, item);
    checkEvidenceMethod(issues, item, "/summaryAuthority", "editorial-analysis");
    checkEvidenceMethod(issues, item, "/applicability", "editorial-analysis");
    checkEvidenceMethod(issues, item, "/nextProcedureMeaning", "editorial-analysis");
    const expectedTreatment = admittedOfficialProcedureTreatmentById[
      item.id as keyof typeof admittedOfficialProcedureTreatmentById
    ];
    if (expectedTreatment && item.taxTreatmentId !== expectedTreatment) {
      issues.push(
        `${item.id} uses ${item.taxTreatmentId}; admitted treatment is ${expectedTreatment}`
      );
    }
    const expectedLegalBasisSourceIds = admittedOfficialProcedureLegalBasisById.get(item.id);
    if (
      !expectedLegalBasisSourceIds
      || !sameStringSet(item.legalBasisSourceIds, expectedLegalBasisSourceIds)
    ) {
      issues.push(`${item.id} legal bases do not match its admitted procedure identity`);
    }
    check(item.id, [item.taxTreatmentId], taxTreatmentIds, "tax treatment");
    check(item.id, item.taxRuleIds, taxRuleIds, "tax rule");
    check(item.id, item.nextProcedureIds, officialProcedureIds, "official procedure");
    check(item.id, item.administeredByRegulatorIds, regulatorIds, "administering regulator");
    check(item.id, item.handledByRegulatorIds, regulatorIds, "handling regulator");
    check(item.id, item.decisionByRegulatorIds, regulatorIds, "decision regulator");
    check(item.id, item.legalBasisSourceIds, new Set(corpus.sources.map((source) => source.id)), "legal-basis source");
    checkUniqueValues(item.id, item.taxTypes, "tax type");
    checkUniqueValues(item.id, item.performedByRoles, "performed-by role");
    if (new Set(item.requiredCaseSelectors).size !== item.requiredCaseSelectors.length) {
      issues.push(`${item.id} repeats a required case selector`);
    }
    const expectedTaxTypes = expectedTaxTypesForClass(item.taxpayerClass);
    if (expectedTaxTypes && !sameStringSet(item.taxTypes, expectedTaxTypes)) {
      issues.push(`${item.id} tax types conflict with its taxpayer class`);
    }
    for (const [role, regulatorIdsForRole] of [
      ["administering", item.administeredByRegulatorIds],
      ["handling", item.handledByRegulatorIds],
    ] as const) {
      if (regulatorIdsForRole.length === 0) {
        issues.push(`${item.id} has no ${role} regulator`);
      }
    }
    for (const regulatorId of item.administeredByRegulatorIds) {
      const regulator = corpus.regulators.find((candidate) => candidate.id === regulatorId);
      if (regulator && !["tax-authority", "tribunal"].includes(regulator.kind)) {
        issues.push(`${item.id} administrator is not a tax authority or tribunal: ${regulatorId}`);
      }
    }
    for (const regulatorId of item.decisionByRegulatorIds) {
      const regulator = corpus.regulators.find((candidate) => candidate.id === regulatorId);
      if (regulator && !["tax-authority", "tribunal"].includes(regulator.kind)) {
        issues.push(`${item.id} decision regulator is not a tax authority or tribunal: ${regulatorId}`);
      }
    }
    const hasTribunalDecision = item.decisionByRegulatorIds.some((regulatorId) =>
      corpus.regulators.find((candidate) => candidate.id === regulatorId)?.kind === "tribunal"
    );
    if (item.performedByRoles.includes("tribunal") !== hasTribunalDecision) {
      issues.push(`${item.id} tribunal role and tribunal decision regulator do not align`);
    }
    const requiredSelectors = new Set(item.requiredCaseSelectors);
    const minimumSelectors = [
      "taxpayer-class",
      "tax-type",
      "tax-period",
      "jurisdiction",
      "document-or-decision-type",
    ] as const;
    for (const selector of minimumSelectors) {
      if (!requiredSelectors.has(selector as typeof item.requiredCaseSelectors[number])) {
        issues.push(`${item.id} omits required case selector: ${selector}`);
      }
    }
    const typeSpecificSelectors: Partial<Record<
      typeof item.procedureType,
      readonly (typeof item.requiredCaseSelectors[number])[]
    >> = {
      "attribution-specification-determination": [
        "hmrc-requirement-made-date",
        "specification-notice-status",
        "specification-notice-date-if-given",
      ],
      "chargeability-notification": ["notice-to-file-status"],
      "return-and-self-assessment": [
        "notice-to-file-status",
        "notice-to-file-date",
        "return-filing-date",
        "filing-deadline",
      ],
      "taxpayer-return-amendment": ["return-filing-date", "amendment-date"],
      "hmrc-return-correction-and-taxpayer-rejection": [
        "return-filing-date",
        "hmrc-correction-date",
        "relevant-deadline",
      ],
      "enquiry-opening": ["return-filing-date", "enquiry-window-end", "enquiry-open-date"],
      "jeopardy-amendment": ["enquiry-open-date"],
      "closure-notice-and-amendment": ["enquiry-open-date", "closure-notice-date"],
      "no-return-determination-and-superseding-return": [
        "notice-to-file-date",
        "filing-deadline",
        "return-filing-date",
        "relevant-deadline",
      ],
      "discovery-assessment": [
        "return-filing-status",
        "discovery-date",
        "hmrc-awareness-information-status",
        "loss-of-tax-behaviour",
        "relevant-deadline",
      ],
      "tax-payment": [
        "payment-due-date",
        "amount-due",
        "appeal-status",
        "payment-status",
        "postponement-decision-status",
      ],
      "appeal-initiation": ["appealable-decision", "decision-notice-date", "appeal-notice-date"],
      "hmrc-review": ["review-offer-or-request-status", "review-conclusion-date"],
      "tribunal-notification": ["tribunal-notification-date"],
      "tribunal-outcome": ["tribunal-notification-date"],
      "payment-postponement": [
        "appealable-decision",
        "postponement-request-status",
        "postponement-decision-status",
        "appeal-status",
        "payment-status",
      ],
      "taking-control-of-goods-recovery": [
        "recovery-territory",
        "amount-due",
        "appeal-status",
        "payment-status",
        "postponement-decision-status",
      ],
      "summary-warrant-recovery": [
        "recovery-territory",
        "amount-due",
        "demand-date",
        "statutory-waiting-period-end",
        "warrant-status",
        "warrant-date",
        "appeal-status",
        "payment-status",
        "postponement-decision-status",
      ],
      "distraint-recovery": [
        "recovery-territory",
        "amount-due",
        "demand-date",
        "neglect-or-refusal-status",
        "control-or-distraint-date",
        "appeal-status",
        "payment-status",
        "postponement-decision-status",
      ],
    };
    for (const selector of typeSpecificSelectors[item.procedureType] ?? []) {
      if (!requiredSelectors.has(selector)) {
        issues.push(`${item.id} omits procedure-specific selector: ${selector}`);
      }
    }
    if (
      item.procedureType === "chargeability-notification"
      && item.taxpayerClass === "charitable-trust-income-and-capital-gains-tax"
      && !["tax-year-end", "notice-withdrawal-status", "notice-withdrawal-date-if-withdrawn"]
        .every((selector) => requiredSelectors.has(selector as typeof item.requiredCaseSelectors[number]))
    ) {
      issues.push(`${item.id} omits a trust notification clock selector`);
    }
    if (
      item.procedureType === "chargeability-notification"
      && item.taxpayerClass === "charitable-company-corporation-tax"
      && !requiredSelectors.has("accounting-period-end")
    ) {
      issues.push(`${item.id} omits the company notification clock selector`);
    }
    if (
      item.procedureType === "discovery-assessment"
      && item.taxpayerClass === "charitable-company-corporation-tax"
      && !requiredSelectors.has("prevailing-practice-status")
    ) {
      issues.push(`${item.id} omits the company prevailing-practice selector`);
    }
    const linkedRules = item.taxRuleIds.flatMap((ruleId) => {
      const rule = corpus.taxRules.find((candidate) => candidate.id === ruleId);
      return rule ? [rule] : [];
    });
    for (const rule of linkedRules) {
      if (
        rule.taxTreatmentId !== item.taxTreatmentId
        || !compatibleTaxpayerClasses(rule.taxpayerClass, item.taxpayerClass)
        || !rule.taxTypes.some((taxType) => item.taxTypes.includes(taxType))
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
          || !compatibleTaxpayerClasses(nextProcedure.taxpayerClass, item.taxpayerClass)
          || !nextProcedure.taxTypes.some((taxType) => item.taxTypes.includes(taxType))
        )
      ) {
        issues.push(`${item.id} links a next procedure from another treatment or taxpayer class: ${nextProcedure.id}`);
      }
    }
    const linkedAuthoritySourceIds = new Set(
      linkedRules.map((rule) => rule.authoritySourceId)
    );
    for (const sourceId of linkedAuthoritySourceIds) {
      if (!item.legalBasisSourceIds.includes(sourceId)) {
        issues.push(`${item.id} omits a linked tax rule authority from its legal bases: ${sourceId}`);
      }
    }
    const linkedTreatmentPointers = [
      ...new Set(linkedRules.flatMap((rule) => rule.treatmentFieldPointers)),
    ].sort();
    const declaredTreatmentPointers = [...item.treatmentFieldPointers].sort();
    if (
      linkedRules.length > 0
      && linkedTreatmentPointers.join("\u0000") !== declaredTreatmentPointers.join("\u0000")
    ) {
      issues.push(`${item.id} treatment fields do not exactly match linked tax rules`);
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
        || source.publisher !== "legislation.gov.uk"
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
    if (item.temporalApplicability) {
      checkTemporalApplicability(item.id, item.temporalApplicability);
      check(
        item.id,
        item.temporalApplicability.transitionAuthoritySourceIds,
        new Set(corpus.sources.map((source) => source.id)),
        "transition authority source"
      );
      for (const sourceId of item.temporalApplicability.transitionAuthoritySourceIds) {
        if (!item.sourceIds.includes(sourceId)) {
          issues.push(`${item.id} transition authority is missing from sourceIds: ${sourceId}`);
        }
      }
    }
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

export function loadUkCharities(
  path = defaultDataPath,
  supplementPaths: readonly string[] = path === defaultDataPath ? defaultSupplementPaths : []
): UkCharities {
  const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  for (const supplementPath of supplementPaths) {
    const supplement = ukCharitiesSupplementSchema.parse(
      JSON.parse(readFileSync(supplementPath, "utf8"))
    );
    for (const collection of [
      "sources",
      "regulators",
      "taxRules",
      "officialProcedures",
      "transparencyGaps",
    ] as const) {
      if (!supplement[collection]?.length) continue;
      const existing = raw[collection];
      if (!Array.isArray(existing)) {
        throw new Error(`UK charities base corpus is missing ${collection}`);
      }
      existing.push(...supplement[collection]);
    }
  }
  return validateUkCharitiesGraph(ukCharitiesSchema.parse(raw));
}

export const ukCharities = loadUkCharities();
