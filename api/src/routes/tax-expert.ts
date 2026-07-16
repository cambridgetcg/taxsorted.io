import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  PASSPORT_EVIDENCE_DEFINITIONS,
  PASSPORT_INCOME_SOURCE_IDS,
  TAX_POSITION_PASSPORT_EXAMPLE,
  UK_TAX_EXPERT_MANIFEST,
  assessMtdIncomeTax,
  type MtdIncomeTaxExpertRequest,
} from "@taxsorted/engine/uk/expert";
import { mtdIncomeTaxAssessmentRequestExample } from "../professional-tools-examples.js";
import {
  professionalAuthenticationResponseHeaders,
  professionalTaskResponseHeaders,
} from "../professional-tools-contract.js";
import {
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
} from "../open-data.js";
import { WhyGraphSchema } from "../why-graph.js";

const MAX_MONEY_PENCE = 1_000_000_000_000;

const KnownAnswer = z.union([z.boolean(), z.literal("unknown")]);
const KnownPence = z.union([
  z.number().int().nonnegative().max(MAX_MONEY_PENCE),
  z.literal("unknown"),
]);
const MtdIncomeRow = z.object({
  basis: z.enum(["submitted-return", "working-estimate", "unknown"]),
  residence: z.enum(["uk-resident", "non-uk-resident", "unknown"]),
  selfEmploymentGrossPence: KnownPence,
  ukPropertyGrossPence: KnownPence,
  foreignPropertyGrossPence: KnownPence,
}).strict();

const MtdReturnIndicator = z.enum([
  "sa103l-lloyds",
  "incapable-with-legal-representative",
  "sa103-averaging-relief",
  "qualifying-care-relief",
  "sa107-trusts-or-estates",
  "sa109-residence",
  "sa102m-minister-of-religion",
  "married-couples-allowance",
  "blind-persons-allowance",
]);
const MtdReturnIndicators = z.union([
  z.array(MtdReturnIndicator).max(9).superRefine((items, context) => {
    if (new Set(items).size !== items.length) {
      context.addIssue({ code: "custom", message: "Return indicators must not contain duplicates" });
    }
  }).openapi({ uniqueItems: true }),
  z.literal("not-checked"),
  z.literal("unknown"),
]);

export const MtdIncomeTaxAssessmentRequestSchema = z.object({
  schema: z.literal("taxsorted.uk.mtd-income-tax.request/1"),
  asOfDate: z.iso.date().openapi({
    description:
      "The date the caller wants the readiness position assessed for. A later date returns an unsupported outcome instead of projecting the current rules forward.",
    example: "2026-07-11",
  }),
  person: z.object({
    relevantReturnPosition: z.enum([
      "required-and-submitted",
      "required-not-submitted",
      "not-required",
      "unknown",
    ]),
    hadNationalInsuranceNumberAtStartOf2026To27: KnownAnswer,
  }).strict(),
  income: z.object({
    taxYears: z.object({
      "2024-25": MtdIncomeRow,
      "2025-26": MtdIncomeRow,
      "2026-27": MtdIncomeRow,
    }).strict(),
    atLeastOneRelevantReturnActivityContinuedAtEntry: KnownAnswer,
    lastRelevantActivityCessationDate: z.union([
      z.iso.date(),
      z.literal("at-least-one-continues"),
      z.literal("unknown"),
    ]),
    relevantReturnWasAmended: KnownAnswer,
    annualisationOrOtherSpecialRulesMayApply: KnownAnswer,
  }).strict(),
  exemption: z.object({
    returnIndicators: MtdReturnIndicators,
    digitalExclusion: z.enum([
      "hmrc-approved",
      "application-pending",
      "not-approved-or-pending",
      "unknown",
    ]),
    otherExemptionApplication: z.enum([
      "hmrc-approved-for-2026-27",
      "application-pending",
      "none",
      "not-checked",
      "unknown",
    ]),
  }).strict(),
  reporting: z.object({
    updatePeriod: z.enum(["standard", "calendar", "unknown"]),
  }).strict(),
}).strict().superRefine((value, context) => {
  const cessation = value.income.lastRelevantActivityCessationDate;
  if (cessation !== "unknown" && cessation !== "at-least-one-continues" && cessation > value.asOfDate) {
    context.addIssue({
      code: "custom",
      path: ["income", "lastRelevantActivityCessationDate"],
      message: "Final-source cessation cannot be after asOfDate",
    });
  }
}).openapi("MtdIncomeTaxAssessmentRequest");

const CoverageStage = z.enum(["mapped", "explained", "classified", "calculated", "prepared", "filed"]);
const Capability = z.object({
  id: z.string(),
  journey: z.string(),
  title: z.string(),
  status: z.enum(["available", "limited", "planned"]),
  stages: z.array(CoverageStage),
  scope: z.string(),
  exclusions: z.array(z.string()),
  humanHref: z.string().optional(),
  apiHref: z.string().optional(),
  review: z.object({ reviewedOn: z.iso.date(), owner: z.string() }),
});
const TaxExpertManifest = z.object({
  schema: z.literal("taxsorted.uk.tax-expert/1"),
  name: z.string(),
  reviewedOn: z.iso.date(),
  stance: z.string(),
  stages: z.array(CoverageStage),
  capabilities: z.array(Capability),
  privacy: z.object({
    browserChecks: z.string(),
    apiAssessments: z.string(),
    identifiersNeeded: z.array(z.string()),
  }),
  boundaries: z.array(z.string()),
}).openapi("UkTaxExpertManifest");

const TaxFactValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const TaxFact = z.object({
  path: z.string(),
  label: z.string(),
  value: TaxFactValue,
  material: z.boolean(),
});
const UnknownTaxFact = z.object({
  path: z.string(),
  label: z.string(),
  whyItMatters: z.string(),
  material: z.boolean(),
});
const TaxAssumption = z.object({
  id: z.string(),
  statement: z.string(),
  material: z.boolean(),
  acceptedByCaller: z.boolean(),
});
const TaxSource = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  url: z.url(),
  kind: z.enum([
    "primary-legislation",
    "secondary-legislation",
    "tertiary-legislation",
    "case-law",
    "hmrc-guidance",
    "hmrc-manual",
    "official-form",
    "policy-announcement",
    "professional-commentary",
  ]),
  legalForce: z.enum([
    "binding-law",
    "binding-in-stated-part",
    "precedent",
    "hmrc-position",
    "official-explanation",
    "proposal-only",
    "commentary",
  ]),
  status: z.enum(["proposed", "enacted-not-commenced", "in-force", "partly-in-force", "superseded", "historical"]),
  citation: z.string().optional(),
  territorialExtent: z.array(z.string()),
  effectiveFrom: z.iso.date().optional(),
  effectiveTo: z.iso.date().nullable().optional(),
  versionAsAt: z.iso.date().optional(),
  publishedOn: z.iso.date().optional(),
  updatedOn: z.iso.date().optional(),
  retrievedOn: z.iso.date(),
  reviewDueOn: z.iso.date(),
  contentHash: z.string().optional(),
  supports: z.array(z.string()),
  doesNotProve: z.array(z.string()),
});
const EvidenceClaim = z.object({
  id: z.string(),
  statement: z.string(),
  kind: z.enum(["law", "hmrc-position", "taxsorted-analysis", "calculation"]),
  support: z.enum(["direct", "derived", "contrary"]),
  sourceIds: z.array(z.string()),
});
const ReasoningStep = z.object({
  id: z.string(),
  statement: z.string(),
  factPaths: z.array(z.string()),
  claimIds: z.array(z.string()),
});
const NextAction = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string().optional(),
  responsibleParty: z.enum(["caller", "HMRC", "TaxSorted", "qualified-adviser"]),
});
const MtdPhase = z.object({
  incomeTaxYear: z.enum(["2024-25", "2025-26", "2026-27"]),
  mandatedFrom: z.iso.date(),
  thresholdPence: z.number().int().nonnegative(),
  qualifyingIncomePence: z.number().int().nonnegative().nullable(),
  basis: z.enum(["submitted-return", "working-estimate", "unknown"]),
  residence: z.enum(["uk-resident", "non-uk-resident", "unknown"]),
  assessment: z.enum([
    "above-threshold",
    "at-or-below-threshold",
    "forecast-above-threshold",
    "forecast-at-or-below-threshold",
    "unknown",
  ]),
});
const MtdObligation = z.object({
  id: z.string(),
  title: z.string(),
  dueDate: z.iso.date().nullable(),
  timing: z.enum(["active", "upcoming", "due-today", "passed"]),
  conditional: z.boolean(),
  condition: z.string().nullable(),
  periodStart: z.iso.date().nullable(),
  periodEnd: z.iso.date().nullable(),
  appliesPerBusiness: z.boolean(),
  expectedSubmissions: z.number().int().nonnegative().nullable(),
  sourceIds: z.array(z.string()),
});
const MtdDecision = z.object({
  decision: z.enum([
    "in_scope",
    "out_of_scope",
    "exempt",
    "exemption_possible",
    "hmrc_decision_needed",
    "insufficient_facts",
    "professional_review_needed",
    "source_review_required",
    "outside_supported_date",
  ]),
  headline: z.string(),
  reasonCodes: z.array(z.string()),
  currentPhase: MtdPhase,
  phases: z.array(MtdPhase),
  obligations: z.array(MtdObligation),
  penaltyPosition: z.object({
    applies: z.boolean(),
    conditional: z.boolean(),
    quarterlyPenaltyPoints2026To27: z.literal(false),
    quarterlyUpdatesStillRequired: z.boolean(),
    note: z.string(),
    sourceIds: z.array(z.string()),
  }),
  excludedIncomeTypes: z.array(z.string()),
  boundaries: z.array(z.string()),
});

const MtdIncomeTaxAssessmentResponse = z.object({
  schema: z.literal("taxsorted.tax-answer/1"),
  capability: z.object({
    id: z.string(),
    version: z.string(),
    jurisdiction: z.string(),
    taxType: z.string(),
    task: z.enum(["explain", "classify", "calculate", "plan", "prepare"]),
  }),
  status: z.enum(["determined", "needs_facts", "needs_professional_review", "conflicting_authority", "unsupported"]),
  applicability: z.object({
    effectiveDate: z.iso.date(),
    evaluatedOn: z.iso.date(),
    knowledgeAsOf: z.iso.date(),
    taxPeriod: z.object({ start: z.iso.date(), end: z.iso.date(), label: z.string() }).optional(),
    territories: z.array(z.string()),
    taxpayerTypes: z.array(z.string()),
    covered: z.boolean(),
    ruleIds: z.array(z.string()),
  }),
  facts: z.object({
    provided: z.array(TaxFact),
    derived: z.array(TaxFact),
    unknown: z.array(UnknownTaxFact),
    assumptions: z.array(TaxAssumption),
  }),
  answer: MtdDecision.nullable(),
  reasoning: z.object({
    steps: z.array(ReasoningStep),
    // tax-answer/1 grows additively: current runtime answers always emit the
    // graph. Forward-compatible readers accept the optional member; strict
    // validators must refresh this OpenAPI/capability version.
    whyGraph: WhyGraphSchema.optional(),
  }),
  evidence: z.object({ claims: z.array(EvidenceClaim), sources: z.array(TaxSource) }),
  confidence: z.object({
    level: z.enum(["high", "medium", "low"]),
    basis: z.array(z.string()),
    blockers: z.array(z.string()),
    notProbability: z.literal(true),
  }),
  escalation: z.object({
    required: z.boolean(),
    reasonCodes: z.array(z.string()),
    factsNeeded: z.array(z.string()),
    nextActions: z.array(NextAction),
  }),
  dataUse: z.object({
    stored: z.literal(false),
    retention: z.string(),
    usedForTraining: z.literal(false),
  }),
}).openapi("MtdIncomeTaxAssessmentResponse");

const PassportIsoInstant = z.iso.datetime({
  offset: false,
  local: false,
  precision: 3,
});
const PassportAnswer = z.enum(["yes", "no", "unknown"]);
const PassportIncomeSource = <const T extends (typeof PASSPORT_INCOME_SOURCE_IDS)[number]>(
  id: T,
) => z.object({
  id: z.literal(id),
  answer: PassportAnswer,
  origin: z.literal("user"),
}).strict();
const PassportEvidenceState = z.enum([
  "held",
  "missing",
  "not-checked",
  "not-expected",
]);
const PassportEvidenceReference = (
  definition: (typeof PASSPORT_EVIDENCE_DEFINITIONS)[number],
  supportsIncomeSourceIds: z.ZodType,
) => z.object({
  id: z.literal(definition.id),
  label: z.literal(definition.label),
  state: PassportEvidenceState,
  assertion: z.literal("named-by-user-not-inspected"),
  supportsIncomeSourceIds,
  guidanceHref: z.literal(definition.guidanceHref),
}).strict();
const PassportMtdIncomeTaxAssessmentResponse =
  MtdIncomeTaxAssessmentResponse.extend({
    capability: z.object({
      id: z.literal("uk.mtd-income-tax.readiness"),
      version: z.string(),
      jurisdiction: z.literal("United Kingdom"),
      taxType: z.literal("Making Tax Digital for Income Tax"),
      task: z.literal("classify"),
    }).strict(),
    reasoning: z.object({
      steps: z.array(ReasoningStep),
      whyGraph: WhyGraphSchema,
    }).strict(),
  }).strict();

export const TaxPositionPassportSchema = z.object({
  schema: z.literal("taxsorted.uk.tax-position-passport/1"),
  createdAt: PassportIsoInstant,
  assurance: z.object({
    identityVerified: z.literal(false),
    signed: z.literal(false),
    professionallyReviewed: z.literal(false),
    filed: z.literal(false),
  }).strict(),
  dataHandling: z.object({
    generationMode: z.literal("browser-local"),
    sentToTaxSorted: z.literal(false),
    storedInBrowser: z.boolean(),
    rawDocumentsIncluded: z.literal(false),
  }).strict(),
  profile: z.object({
    jurisdiction: z.literal("UK"),
    incomeSources: z.tuple([
      PassportIncomeSource("employment"),
      PassportIncomeSource("self-employment"),
      PassportIncomeSource("uk-property"),
      PassportIncomeSource("foreign-property"),
      PassportIncomeSource("other-or-complex"),
    ]),
    evidence: z.tuple([
      PassportEvidenceReference(
        PASSPORT_EVIDENCE_DEFINITIONS[0],
        z.tuple([z.literal("employment")]),
      ),
      PassportEvidenceReference(
        PASSPORT_EVIDENCE_DEFINITIONS[1],
        z.tuple([z.literal("self-employment")]),
      ),
      PassportEvidenceReference(
        PASSPORT_EVIDENCE_DEFINITIONS[2],
        z.tuple([z.literal("self-employment")]),
      ),
      PassportEvidenceReference(
        PASSPORT_EVIDENCE_DEFINITIONS[3],
        z.tuple([z.literal("uk-property")]),
      ),
      PassportEvidenceReference(
        PASSPORT_EVIDENCE_DEFINITIONS[4],
        z.tuple([z.literal("uk-property")]),
      ),
      PassportEvidenceReference(
        PASSPORT_EVIDENCE_DEFINITIONS[5],
        z.tuple([z.literal("foreign-property")]),
      ),
      PassportEvidenceReference(
        PASSPORT_EVIDENCE_DEFINITIONS[6],
        z.tuple([z.literal("foreign-property")]),
      ),
      PassportEvidenceReference(
        PASSPORT_EVIDENCE_DEFINITIONS[7],
        z.tuple([
          z.literal("self-employment"),
          z.literal("uk-property"),
          z.literal("foreign-property"),
        ]),
      ),
    ]),
  }).strict(),
  positions: z.array(z.object({
    kind: z.literal("mtd-income-tax-readiness"),
    request: MtdIncomeTaxAssessmentRequestSchema,
    answer: PassportMtdIncomeTaxAssessmentResponse,
  }).strict()).max(1),
  coverage: z.object({
    included: z.array(z.string()),
    excluded: z.array(z.string()),
  }).strict(),
  userReview: z.object({
    selfCheckedAt: PassportIsoInstant.nullable(),
    meaning: z.literal("checked-by-user-not-professional-approval"),
  }).strict(),
  boundaries: z.array(z.string()),
}).strict().openapi("TaxPositionPassport");

const TaxPositionPassportJsonSchema = z.object({}).passthrough()
  .openapi("TaxPositionPassportJsonSchema");

// Keep this public schema compact and static. Converting the full nested
// TaxAnswer/why-graph Zod tree at process startup exceeds the 256 MB API
// machine boundary. The existing OpenAPI components remain canonical.
const passportOpenApiSchemaBase =
  "https://api.taxsorted.io/openapi/tax-expert-uk.json#/components/schemas";
const passportIsoInstantJsonSchema = {
  type: "string",
  format: "date-time",
  pattern:
    "^\\d{4}-\\d{2}-\\d{2}T(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\.\\d{3}Z$",
} as const;
const passportIncomeSourceJsonSchemas = PASSPORT_INCOME_SOURCE_IDS.map(
  (id) => ({
    type: "object",
    properties: {
      id: { const: id },
      answer: { enum: ["yes", "no", "unknown"] },
      origin: { const: "user" },
    },
    required: ["id", "answer", "origin"],
    additionalProperties: false,
  }),
);
const passportEvidenceJsonSchemas = PASSPORT_EVIDENCE_DEFINITIONS.map(
  (definition) => ({
    type: "object",
    properties: {
      id: { const: definition.id },
      label: { const: definition.label },
      state: {
        enum: ["held", "missing", "not-checked", "not-expected"],
      },
      assertion: { const: "named-by-user-not-inspected" },
      supportsIncomeSourceIds: {
        type: "array",
        prefixItems: definition.supportsIncomeSourceIds.map((id) => ({
          const: id,
        })),
        minItems: definition.supportsIncomeSourceIds.length,
        maxItems: definition.supportsIncomeSourceIds.length,
      },
      guidanceHref: { const: definition.guidanceHref },
    },
    required: [
      "id",
      "label",
      "state",
      "assertion",
      "supportsIncomeSourceIds",
      "guidanceHref",
    ],
    additionalProperties: false,
  }),
);

export const taxPositionPassportJsonSchemaDocument = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id:
    "https://api.taxsorted.io/v1/uk/tax-expert/tax-position-passport/schema",
  title: "TaxSorted UK Tax Position Passport",
  description:
    "Portable browser-local UK tax-position handoff. It contains no identity verification, signature, professional approval or filing receipt.",
  type: "object",
  properties: {
    schema: { const: "taxsorted.uk.tax-position-passport/1" },
    createdAt: passportIsoInstantJsonSchema,
    assurance: {
      type: "object",
      properties: {
        identityVerified: { const: false },
        signed: { const: false },
        professionallyReviewed: { const: false },
        filed: { const: false },
      },
      required: [
        "identityVerified",
        "signed",
        "professionallyReviewed",
        "filed",
      ],
      additionalProperties: false,
    },
    dataHandling: {
      type: "object",
      properties: {
        generationMode: { const: "browser-local" },
        sentToTaxSorted: { const: false },
        storedInBrowser: { type: "boolean" },
        rawDocumentsIncluded: { const: false },
      },
      required: [
        "generationMode",
        "sentToTaxSorted",
        "storedInBrowser",
        "rawDocumentsIncluded",
      ],
      additionalProperties: false,
    },
    profile: {
      type: "object",
      properties: {
        jurisdiction: { const: "UK" },
        incomeSources: {
          type: "array",
          prefixItems: passportIncomeSourceJsonSchemas,
          minItems: PASSPORT_INCOME_SOURCE_IDS.length,
          maxItems: PASSPORT_INCOME_SOURCE_IDS.length,
        },
        evidence: {
          type: "array",
          prefixItems: passportEvidenceJsonSchemas,
          minItems: PASSPORT_EVIDENCE_DEFINITIONS.length,
          maxItems: PASSPORT_EVIDENCE_DEFINITIONS.length,
        },
      },
      required: ["jurisdiction", "incomeSources", "evidence"],
      additionalProperties: false,
    },
    positions: {
      type: "array",
      maxItems: 1,
      items: {
        type: "object",
        properties: {
          kind: { const: "mtd-income-tax-readiness" },
          request: {
            $ref:
              `${passportOpenApiSchemaBase}/MtdIncomeTaxAssessmentRequest`,
          },
          answer: {
            allOf: [
              {
                $ref:
                  `${passportOpenApiSchemaBase}/MtdIncomeTaxAssessmentResponse`,
              },
              {
                type: "object",
                properties: {
                  schema: {},
                  capability: {
                    type: "object",
                    properties: {
                      id: { const: "uk.mtd-income-tax.readiness" },
                      version: { type: "string" },
                      jurisdiction: { const: "United Kingdom" },
                      taxType: {
                        const: "Making Tax Digital for Income Tax",
                      },
                      task: { const: "classify" },
                    },
                    required: [
                      "id",
                      "version",
                      "jurisdiction",
                      "taxType",
                      "task",
                    ],
                    additionalProperties: false,
                  },
                  status: {},
                  applicability: {},
                  facts: {},
                  answer: {},
                  reasoning: {
                    type: "object",
                    properties: {
                      steps: {},
                      whyGraph: {},
                    },
                    required: ["steps", "whyGraph"],
                    additionalProperties: false,
                  },
                  evidence: {},
                  confidence: {},
                  escalation: {},
                  dataUse: {},
                },
                required: ["capability", "reasoning"],
                additionalProperties: false,
              },
            ],
          },
        },
        required: ["kind", "request", "answer"],
        additionalProperties: false,
      },
    },
    coverage: {
      type: "object",
      properties: {
        included: { type: "array", items: { type: "string" } },
        excluded: { type: "array", items: { type: "string" } },
      },
      required: ["included", "excluded"],
      additionalProperties: false,
    },
    userReview: {
      type: "object",
      properties: {
        selfCheckedAt: {
          anyOf: [passportIsoInstantJsonSchema, { type: "null" }],
        },
        meaning: {
          const: "checked-by-user-not-professional-approval",
        },
      },
      required: ["selfCheckedAt", "meaning"],
      additionalProperties: false,
    },
    boundaries: { type: "array", items: { type: "string" } },
  },
  required: [
    "schema",
    "createdAt",
    "assurance",
    "dataHandling",
    "profile",
    "positions",
    "coverage",
    "userReview",
    "boundaries",
  ],
  additionalProperties: false,
  "x-taxsorted-structural-dependencies": [
    "https://api.taxsorted.io/openapi/tax-expert-uk.json",
  ],
  "x-taxsorted-runtime-invariants": [
    "Income-source and evidence entries use the canonical order and exact definitions.",
    "Evidence marked not-expected must agree with the income-source map.",
    "The complete MTD request and TaxAnswer must match the same capability and pass TaxAnswer semantic invariants.",
    "Forbidden identity, contact and tax-reference keys are rejected.",
  ],
};

const passportSchemaRepresentation = canonicalJson(
  taxPositionPassportJsonSchemaDocument,
);
const passportSchemaEtag = representationEtag(passportSchemaRepresentation);
const passportExampleRepresentation = canonicalJson(
  TAX_POSITION_PASSPORT_EXAMPLE,
);
const passportExampleEtag = representationEtag(passportExampleRepresentation);

const ApiError = z.object({
  error: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
  requiredScope: z.string().optional(),
  access: z.object({
    availability: z.literal("credentialed-design-partner"),
    publicSelfServiceKeyProvisioning: z.literal(false),
    confidentialAccessRequestIntake: z.literal(false),
    browserAccountProvidesWorkspaceKey: z.literal(false),
    workspaceKeyIdentifiesCallingWorkspace: z.literal(true),
    requestFactsMayBePersonalData: z.literal(true),
  }).optional(),
  nextActions: z.array(z.object({
    id: z.string(),
    method: z.literal("GET"),
    href: z.string(),
    accepts: z.array(z.string()),
    description: z.string(),
  })).optional(),
  issues: z.array(z.object({ path: z.string(), code: z.string(), message: z.string() })).optional(),
}).openapi("TaxExpertApiError");

const manifestRoute = createRoute({
  method: "get",
  path: "/",
  operationId: "getUkTaxExpertManifest",
  summary: "See what the UK tax expert can and cannot do",
  description: "Public coverage registry. Stages distinguish mapped, explained, classified, calculated, prepared and filed capability.",
  tags: ["UK tax expert"],
  security: [],
  responses: {
    200: {
      description: "Current UK tax-expert coverage and boundaries.",
      content: { "application/json": { schema: TaxExpertManifest } },
    },
  },
});

const passportSchemaRoute = createRoute({
  method: "get",
  path: "/tax-position-passport/schema",
  operationId: "getTaxPositionPassportSchema",
  summary: "Read the Tax Position Passport JSON Schema",
  description:
    "Static public schema only. TaxSorted has no Passport upload, cloud-storage or share-link endpoint.",
  tags: ["UK tax expert"],
  security: [],
  responses: {
    200: {
      description: "JSON Schema for taxsorted.uk.tax-position-passport/1.",
      content: {
        "application/schema+json": {
          schema: TaxPositionPassportJsonSchema,
        },
      },
    },
    304: { description: "The exact schema representation is unchanged." },
  },
});

const passportExampleRoute = createRoute({
  method: "get",
  path: "/tax-position-passport/examples/mtd-income-tax",
  operationId: "getTaxPositionPassportMtdExample",
  summary: "Read a synthetic MTD Tax Position Passport",
  description:
    "Static example containing invented facts. It demonstrates the complete request-and-answer handoff without publishing taxpayer data.",
  tags: ["UK tax expert"],
  security: [],
  responses: {
    200: {
      description: "Synthetic Tax Position Passport example.",
      content: {
        "application/json": {
          schema: TaxPositionPassportSchema,
        },
      },
    },
    304: { description: "The exact example representation is unchanged." },
  },
});

const assessmentRoute = createRoute({
  method: "post",
  path: "/mtd-income-tax/assessments",
  "x-taxsorted-required-workspace-scopes": ["tax-expert:assess"],
  "x-taxsorted-why-graph": {
    schema: "taxsorted.why-graph/1",
    responseJsonPointer: "/reasoning/whyGraph",
    scope: "reached-result-trace-not-complete-law-map",
    currentlyEmitted: true,
  },
  "x-taxsorted-retry": {
    applicationOrExternalStateChange: false,
    duplicateRequestStateEffect: "none",
    byteStabilityGuaranteedAcrossTime: false,
    compareWhenRepeating: [
      "capability version",
      "evaluatedOn and knowledgeAsOf",
      "source IDs, retrievedOn and reviewDueOn",
    ],
  },
  operationId: "assessMtdIncomeTaxReadiness",
  summary: "Assess MTD Income Tax readiness and 2026/27 deadlines",
  description: "Stateless classification from explicit Self Assessment, gross-income and exemption facts, the trusted server evaluation date and the admitted ruleset and source ledger. Unknown is never read as zero. The route does not sign up, file or persist case facts.",
  tags: ["UK tax expert"],
  security: [{ WorkspaceKey: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: MtdIncomeTaxAssessmentRequestSchema,
          example: mtdIncomeTaxAssessmentRequestExample,
        },
      },
    },
  },
  responses: {
    200: {
      description: "A determined result or an explicit missing-fact, HMRC-decision, source-review or professional-review path.",
      headers: professionalTaskResponseHeaders,
      content: { "application/json": { schema: MtdIncomeTaxAssessmentResponse } },
    },
    400: { description: "Malformed JSON or duplicate object fields.", headers: professionalTaskResponseHeaders, content: { "application/json": { schema: ApiError } } },
    401: { description: "Missing, malformed, expired or revoked workspace key.", headers: professionalAuthenticationResponseHeaders, content: { "application/json": { schema: ApiError } } },
    403: { description: "The workspace key lacks tax-expert:assess.", headers: professionalAuthenticationResponseHeaders, content: { "application/json": { schema: ApiError } } },
    413: { description: "The body is larger than 16 KiB.", headers: professionalTaskResponseHeaders, content: { "application/json": { schema: ApiError } } },
    415: { description: "The body is not application/json.", headers: professionalTaskResponseHeaders, content: { "application/json": { schema: ApiError } } },
    422: { description: "The JSON facts do not match the strict request schema.", headers: professionalTaskResponseHeaders, content: { "application/json": { schema: ApiError } } },
    500: { description: "Unexpected server error; request facts are not echoed.", headers: professionalTaskResponseHeaders, content: { "application/json": { schema: ApiError } } },
  },
});

function requestIdFor(c: { get: (key: "requestId") => string }): string {
  return c.get("requestId") ?? "unavailable";
}

export function createUkTaxExpertRoutes() {
  const routes = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json({
          error: "invalid_request",
          message: "Some explicit tax facts are missing or invalid.",
          requestId: requestIdFor(c),
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        }, 422);
      }
    },
  });

  routes.openapi(manifestRoute, (c) => {
    c.header("Cache-Control", "public, max-age=300, must-revalidate");
    c.header(
      "Link",
      [
        '</openapi/tax-expert-uk.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"',
        '</v1/uk/tax-expert/tax-position-passport/schema>; rel="describedby"; type="application/schema+json"; title="Tax Position Passport"',
        '</v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax>; rel="example"; type="application/json"; title="Synthetic Tax Position Passport"',
      ].join(", "),
    );
    return c.json({
      ...UK_TAX_EXPERT_MANIFEST,
      stages: [...UK_TAX_EXPERT_MANIFEST.stages],
      capabilities: UK_TAX_EXPERT_MANIFEST.capabilities.map((capability) => ({
        ...capability,
        stages: [...capability.stages],
        exclusions: [...capability.exclusions],
      })),
      privacy: {
        ...UK_TAX_EXPERT_MANIFEST.privacy,
        identifiersNeeded: [...UK_TAX_EXPERT_MANIFEST.privacy.identifiersNeeded],
      },
      boundaries: [...UK_TAX_EXPERT_MANIFEST.boundaries],
    }, 200);
  });
  routes.openapi(passportSchemaRoute, (c) => {
    c.header("Cache-Control", "public, max-age=300, must-revalidate");
    c.header("Content-Type", "application/schema+json; charset=utf-8");
    c.header("ETag", passportSchemaEtag);
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Schema-Version", "taxsorted.uk.tax-position-passport/1");
    c.header(
      "Link",
      [
        '</v1/uk/tax-expert/tax-position-passport/schema>; rel="canonical"; type="application/schema+json"',
        '</v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax>; rel="example"; type="application/json"',
        '</openapi/tax-expert-uk.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"',
      ].join(", "),
    );
    if (
      ifNoneMatchMatches(
        c.req.header("If-None-Match"),
        passportSchemaEtag,
      )
    ) {
      return c.body(null, 304);
    }
    return c.body(passportSchemaRepresentation, 200);
  });
  routes.openapi(passportExampleRoute, (c) => {
    c.header("Cache-Control", "public, max-age=300, must-revalidate");
    c.header("Content-Type", "application/json; charset=utf-8");
    c.header("ETag", passportExampleEtag);
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Schema-Version", "taxsorted.uk.tax-position-passport/1");
    c.header(
      "Link",
      [
        '</v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax>; rel="canonical"; type="application/json"',
        '</v1/uk/tax-expert/tax-position-passport/schema>; rel="describedby"; type="application/schema+json"',
        '</openapi/tax-expert-uk.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"',
      ].join(", "),
    );
    if (
      ifNoneMatchMatches(
        c.req.header("If-None-Match"),
        passportExampleEtag,
      )
    ) {
      return c.body(null, 304);
    }
    return c.body(passportExampleRepresentation, 200);
  });
  routes.openapi(assessmentRoute, (c) => {
    c.header("Cache-Control", "no-store");
    c.header(
      "Link",
      [
        '</openapi/tax-expert-uk.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"; title="MTD Income Tax task"',
        '</openapi/professional-tools-uk.json>; rel="related"; type="application/vnd.oai.openapi+json;version=3.1"; title="Professional tools"',
      ].join(", "),
    );
    const input: MtdIncomeTaxExpertRequest = c.req.valid("json");
    return c.json(assessMtdIncomeTax(input, {
      evaluatedOn: new Date().toISOString().slice(0, 10),
    }), 200);
  });
  return routes;
}

export const ukTaxExpertRoutes = createUkTaxExpertRoutes();
