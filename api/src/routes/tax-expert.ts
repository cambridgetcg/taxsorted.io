import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  UK_TAX_EXPERT_MANIFEST,
  assessMtdIncomeTax,
  type MtdIncomeTaxExpertRequest,
} from "@taxsorted/engine/uk/expert";

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
  asOfDate: z.iso.date(),
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
  reasoning: z.object({ steps: z.array(ReasoningStep) }),
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

const ApiError = z.object({
  error: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
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

const assessmentRoute = createRoute({
  method: "post",
  path: "/mtd-income-tax/assessments",
  "x-taxsorted-required-workspace-scopes": ["tax-expert:assess"],
  operationId: "assessMtdIncomeTaxReadiness",
  summary: "Assess MTD Income Tax readiness and 2026/27 deadlines",
  description: "Stateless classification from explicit Self Assessment, gross-income and exemption facts, the trusted server evaluation date and the admitted ruleset and source ledger. Unknown is never read as zero. The route does not sign up, file or persist case facts.",
  tags: ["UK tax expert"],
  security: [{ WorkspaceKey: [] }],
  request: {
    body: { required: true, content: { "application/json": { schema: MtdIncomeTaxAssessmentRequestSchema } } },
  },
  responses: {
    200: {
      description: "A determined result or an explicit missing-fact, HMRC-decision, source-review or professional-review path.",
      content: { "application/json": { schema: MtdIncomeTaxAssessmentResponse } },
    },
    400: { description: "Malformed JSON or duplicate object fields.", content: { "application/json": { schema: ApiError } } },
    401: { description: "Missing, malformed, expired or revoked workspace key.", content: { "application/json": { schema: ApiError } } },
    403: { description: "The workspace key lacks tax-expert:assess.", content: { "application/json": { schema: ApiError } } },
    413: { description: "The body is larger than 16 KiB.", content: { "application/json": { schema: ApiError } } },
    415: { description: "The body is not application/json.", content: { "application/json": { schema: ApiError } } },
    422: { description: "The JSON facts do not match the strict request schema.", content: { "application/json": { schema: ApiError } } },
    500: { description: "Unexpected server error; request facts are not echoed.", content: { "application/json": { schema: ApiError } } },
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
    c.header("Link", '</openapi/tax-expert-uk.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"');
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
  routes.openapi(assessmentRoute, (c) => {
    c.header("Cache-Control", "no-store");
    c.header("Link", '</openapi/tax-expert-uk.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"');
    const input: MtdIncomeTaxExpertRequest = c.req.valid("json");
    return c.json(assessMtdIncomeTax(input, {
      evaluatedOn: new Date().toISOString().slice(0, 10),
    }), 200);
  });
  return routes;
}

export const ukTaxExpertRoutes = createUkTaxExpertRoutes();
