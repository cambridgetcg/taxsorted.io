import { createHash } from "node:crypto";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  calculateResidentialSdlt,
  SDLT_RULESET,
  type ResidentialSdltInput,
} from "@taxsorted/engine/uk/sdlt";
import { sdltCalculationRequestExample } from "../professional-tools-examples.js";
import {
  professionalAuthenticationResponseHeaders,
  professionalTaskResponseHeaders,
} from "../professional-tools-contract.js";

const Jurisdiction = z.enum([
  "england",
  "northern-ireland",
  "scotland",
  "wales",
  "unknown",
]);
const LandUse = z.enum(["residential", "mixed", "non-residential", "unknown"]);
const Interest = z.enum(["freehold", "existing-lease", "new-lease", "unknown"]);
const BuyerKind = z.enum(["individual", "company", "trust", "partnership", "other", "unknown"]);
const KnownAnswer = z.union([z.boolean(), z.literal("unknown")]);

export const SdltCalculationRequestSchema = z
  .object({
    effectiveDate: z.iso.date().openapi({
      description:
        "The legal SDLT effective date. This is normally completion, but substantial performance can make it earlier.",
      example: "2026-07-10",
    }),
    chargeableConsiderationPence: z
      .number()
      .int()
      .nonnegative()
      .max(SDLT_RULESET.maximumConsiderationPence)
      .openapi({
      description:
        "Total chargeable consideration in integer pence, capped at £10 billion in this scope. Supply the legal consideration, not merely a headline purchase price.",
      example: 29_500_000,
      }),
    land: z
      .object({
        jurisdiction: Jurisdiction.openapi({ example: "england" }),
        use: LandUse.openapi({ example: "residential" }),
        interest: Interest.openapi({ example: "freehold" }),
        dwellingCount: z.union([z.number().int().positive(), z.literal("unknown")]).openapi({
          example: 1,
        }),
      })
      .strict(),
    buyerKind: BuyerKind.openapi({ example: "individual" }),
    treatment: z
      .object({
        firstTimeBuyerRelief: z.enum(["claim", "do-not-claim", "unknown"]).openapi({
          example: "do-not-claim",
        }),
        higherRates: z.enum(["standard", "additional-dwelling", "unknown"]).openapi({
          description:
            "The caller's Schedule 4ZA classification. Do not reduce this to a simple owns-another-property flag.",
          example: "standard",
        }),
        nonResidentSurcharge: z.enum(["apply", "do-not-apply", "unknown"]).openapi({
          description: "The caller's section 75ZA and Schedule 9A classification.",
          example: "do-not-apply",
        }),
      })
      .strict(),
    specialCases: z
      .object({
        linkedTransactions: KnownAnswer.openapi({ example: false }),
        sharedOwnership: KnownAnswer.openapi({ example: false }),
        otherReliefClaimed: KnownAnswer.openapi({ example: false }),
        complexConsideration: KnownAnswer.openapi({
          description:
            "True for contingent, uncertain, non-cash, debt, VAT or disputed-apportionment cases unless a professional has supplied final chargeable consideration.",
          example: false,
        }),
        transitionalContractMayApply: KnownAnswer.openapi({
          description:
            "True or unknown where an older protected contract may retain pre-change treatment.",
          example: false,
        }),
      })
      .strict(),
  })
  .strict()
  .openapi("SdltCalculationRequest");

const SourceSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    authority: z.enum(["UK Parliament", "HM Revenue & Customs"]),
    url: z.url(),
    checkedOn: z.iso.date(),
  })
  .openapi("TaxRuleSource");

const TrustSchema = z
  .object({
    method: z.literal("deterministic"),
    requestHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    evaluatedOn: z.iso.date(),
    ruleset: z.object({
      id: z.string(),
      revision: z.string(),
      effectiveFrom: z.iso.date(),
      effectiveTo: z.iso.date().nullable(),
      reviewedOn: z.iso.date(),
    }),
    sources: z.array(SourceSchema),
    assumptions: z.array(z.object({ code: z.string(), message: z.string() })),
  })
  .openapi("TaxDecisionTrust");

const ReviewReasonSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    sourceIds: z.array(z.string()),
  })
  .openapi("ReviewReason");

const DecisionSchema = z.object({
  code: z.string(),
  message: z.string(),
  sourceIds: z.array(z.string()),
});

const BandSchema = z.object({
  label: z.string(),
  fromPence: z.number().int().nonnegative(),
  upToPence: z.number().int().positive().nullable(),
  amountTaxedPence: z.number().int().nonnegative(),
  baseRateBasisPoints: z.number().int().nonnegative(),
  surchargeBasisPoints: z.number().int().nonnegative(),
  rateBasisPoints: z.number().int().nonnegative(),
  taxPenceBeforeFinalRounding: z.number().nonnegative(),
  sourceIds: z.array(z.string()),
});

const CalculationSchema = z
  .object({
    currency: z.literal("GBP"),
    effectiveDate: z.iso.date(),
    chargeableConsiderationPence: z.number().int().nonnegative(),
    taxBeforeRoundingPence: z.number().nonnegative(),
    taxDuePence: z.number().int().nonnegative().multipleOf(100),
    rounding: z.literal("down-to-whole-pound"),
    roundingAdjustmentPence: z.number().min(0).lt(100),
    regime: z.enum(["standard", "first-time-buyer", "higher-rates"]),
    treatmentsApplied: z.array(
      z.enum([
        "standard-residential",
        "first-time-buyer-relief",
        "higher-rates-transaction",
        "non-resident-surcharge",
      ])
    ),
    bands: z.array(BandSchema),
    decisions: z.array(DecisionSchema),
    explanation: z.array(z.string()),
  })
  .openapi("SdltCalculation");

const CalculatedSchema = z
  .object({
    status: z.literal("calculated"),
    calculation: CalculationSchema,
    reviewReasons: z.array(ReviewReasonSchema).max(0),
    trust: TrustSchema,
  })
  .openapi("SdltCalculatedResponse");

const NeedsReviewSchema = z
  .object({
    status: z.literal("needs_review"),
    calculation: z.null(),
    reviewReasons: z.array(ReviewReasonSchema).min(1),
    trust: TrustSchema,
  })
  .openapi("SdltNeedsReviewResponse");

const ErrorSchema = z
  .object({
    error: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    requiredScope: z.string().optional(),
    access: z
      .object({
        availability: z.literal("credentialed-design-partner"),
        publicSelfServiceKeyProvisioning: z.literal(false),
        confidentialAccessRequestIntake: z.literal(false),
        browserAccountProvidesWorkspaceKey: z.literal(false),
        workspaceKeyIdentifiesCallingWorkspace: z.literal(true),
        requestFactsMayBePersonalData: z.literal(true),
      })
      .optional(),
    nextActions: z
      .array(
        z.object({
          id: z.string(),
          method: z.literal("GET"),
          href: z.string(),
          accepts: z.array(z.string()),
          description: z.string(),
        }),
      )
      .optional(),
    issues: z
      .array(z.object({ path: z.string(), code: z.string(), message: z.string() }))
      .optional(),
  })
  .openapi("ApiError");

const calculateRoute = createRoute({
  method: "post",
  path: "/calculations",
  "x-taxsorted-required-workspace-scopes": ["sdlt:calculate"],
  "x-taxsorted-retry": {
    applicationOrExternalStateChange: false,
    duplicateRequestStateEffect: "none",
    byteStabilityGuaranteedAcrossTime: false,
    compareWhenRepeating: [
      "request hash",
      "server evaluation date",
      "ruleset revision",
      "source review dates",
    ],
  },
  operationId: "calculateResidentialSdlt",
  summary: "Calculate one ordinary residential SDLT transaction",
  description:
    "Deterministic, source-backed SDLT calculation for one residential dwelling in England or Northern Ireland. Recognised cases outside the bounded scope return needs_review without a tax figure.",
  tags: ["SDLT"],
  security: [{ WorkspaceKey: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: SdltCalculationRequestSchema,
          example: sdltCalculationRequestExample,
        },
      },
    },
  },
  responses: {
    400: {
      description: "The request body is not valid JSON.",
      headers: professionalTaskResponseHeaders,
      content: { "application/json": { schema: ErrorSchema } },
    },
    200: {
      description: "A calculated result, or an explicit needs-review outcome.",
      headers: professionalTaskResponseHeaders,
      content: {
        "application/json": {
          schema: z.discriminatedUnion("status", [CalculatedSchema, NeedsReviewSchema]),
        },
      },
    },
    401: {
      description: "The workspace key is missing, malformed, expired or revoked.",
      headers: professionalAuthenticationResponseHeaders,
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "The workspace key lacks the sdlt:calculate scope.",
      headers: professionalAuthenticationResponseHeaders,
      content: { "application/json": { schema: ErrorSchema } },
    },
    413: {
      description: "The request body is larger than 16 KiB.",
      headers: professionalTaskResponseHeaders,
      content: { "application/json": { schema: ErrorSchema } },
    },
    415: {
      description: "The request body is not application/json.",
      headers: professionalTaskResponseHeaders,
      content: { "application/json": { schema: ErrorSchema } },
    },
    422: {
      description: "The JSON shape is invalid.",
      headers: professionalTaskResponseHeaders,
      content: { "application/json": { schema: ErrorSchema } },
    },
    500: {
      description: "An unexpected server error. Request facts are never echoed.",
      headers: professionalTaskResponseHeaders,
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function requestHash(input: ResidentialSdltInput, revision: string): string {
  const body = canonicalJson({ input, rulesetRevision: revision });
  return `sha256:${createHash("sha256").update(body, "utf8").digest("hex")}`;
}

function requestIdFor(c: { get: (key: "requestId") => string }): string {
  return c.get("requestId") ?? "unavailable";
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface SdltRouteOptions {
  /** Injected in tests; production uses the server's current UTC date. */
  today?: () => string;
}

export function createSdltRoutes(options: SdltRouteOptions = {}) {
  const today = options.today ?? utcToday;
  const routes = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: "invalid_request",
            message: "Some facts need fixing before we can calculate.",
            requestId: requestIdFor(c),
            issues: result.error.issues.map((issue) => ({
              path: issue.path.join("."),
              code: issue.code,
              message: issue.message,
            })),
          },
          422
        );
      }
    },
  });

  routes.openapi(calculateRoute, (c) => {
    const input = c.req.valid("json") as ResidentialSdltInput;
    const result = calculateResidentialSdlt(input);
    if (result.status === "invalid_input") {
      return c.json(
        {
          error: "invalid_request",
          message: "Some facts need fixing before we can calculate.",
          requestId: requestIdFor(c),
          issues: result.errors.map((error) => ({
            path: error.path,
            code: error.code,
            message: error.message,
          })),
        },
        422
      );
    }

    const evaluatedOn = today();
    const boundedResult =
      input.effectiveDate > evaluatedOn
        ? {
            status: "needs_review" as const,
            calculation: null,
            reviewReasons: [
              {
                code: "future-effective-date",
                message:
                  "The hosted API does not project current SDLT rules onto a future legal effective date.",
                sourceIds: ["hmrc-residential-rates"],
              },
              ...(result.status === "needs_review" ? result.reviewReasons : []),
            ],
            trust: result.trust,
          }
        : result;
    const hash = requestHash(input, boundedResult.trust.ruleset.revision);
    return c.json(
      {
        ...boundedResult,
        trust: {
          ...boundedResult.trust,
          requestHash: hash,
          evaluatedOn,
        },
      },
      200
    );
  });

  return routes;
}

export const sdltRoutes = createSdltRoutes();
