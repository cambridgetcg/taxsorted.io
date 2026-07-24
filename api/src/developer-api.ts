import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import type { Context, Next } from "hono";
import { requireApiKey } from "./api-key.js";
import { assertNoDuplicateJsonKeys, StrictJsonError } from "./strict-json.js";
import { ifNoneMatchMatches, representationEtag } from "./open-data.js";
import { sdltRoutes } from "./routes/sdlt.js";
import { createApiWorkspaceRoutes } from "./routes/api-workspace.js";
import { createProfessionalToolsRoutes } from "./routes/professional-tools.js";
import {
  apiWorkspacePath,
  professionalToolsOpenApiPath,
  professionalToolsPath,
} from "./professional-tools-contract.js";
import { ukTaxIndustrySchema } from "./uk-tax-industry.js";
import { ukTaxSystemSchema } from "./uk-tax-system.js";
import {
  charityProcedureActorRoles,
  charityProcedureChallengeModes,
  charityProcedureStages,
  charityProcedureTypes,
  charityTaxpayerClasses,
  charityTaxRuleExplanationScopes,
  charityTaxTypes,
  ukCharitiesSchema,
} from "./uk-charities.js";
import { ukPublicFundingSchema } from "./uk-public-funding.js";
import {
  publicDecisionPathSchema,
  publicDecisionPathwayRightsSchema,
  publicDecisionPathwaysSchema,
} from "./uk-public-decision-pathways.js";
import {
  publicOfficePathSchema,
  publicOfficePathwayRightsSchema,
  publicOfficePathwaysSchema,
} from "./uk-public-office-pathways.js";
import {
  releaseAtomFeedPath,
  releaseCheckpointSchema,
  releaseJsonFeedPath,
  releaseLedgerPath,
} from "./release-discovery-contract.js";
import { ukTaxExpertRoutes } from "./routes/tax-expert.js";
import {
  WhyGraphAdoptersSchema,
  WhyGraphFrameworkSchema,
  WhyGraphJsonSchemaDocumentSchema,
  WhyGraphSchema,
} from "./why-graph.js";
import {
  caseAssessmentTemplateSchema,
  caseCommonsPacketSchema,
  caseCommonsResponseSchema,
  caseCommonsRightsSchema,
} from "./uk-case-commons.js";

const MAX_CALCULATION_BODY_BYTES = 16 * 1024;
const OPENAPI_MEDIA_TYPE = "application/vnd.oai.openapi+json;version=3.1";

type JsonObject = Record<string, unknown>;

interface OpenApiSliceDefinition {
  id: string;
  path: string;
  title: string;
  description: string;
  allowSecuredOperations?: boolean;
  componentReferences?: readonly string[];
  matchesPath: (path: string) => boolean;
}

const openApiTags = [
  {
    name: "Agent discovery",
    description: "Stateless machine orientation and the plain-text doorway.",
  },
  {
    name: "Open-data catalogue",
    description: "Dataset discovery and the mixed-rights reuse boundary.",
  },
  {
    name: "UK tax system",
    description: "The reviewed UK tax-system map and bulk distributions.",
  },
  {
    name: "UK tax industry",
    description: "Roles, qualifications, institutions, gates and pathways.",
  },
  {
    name: "UK charities",
    description:
      "The charity-sector map and the gated accountability framework.",
  },
  {
    name: "UK public funding",
    description:
      "Public-funding records, releases, corrections and bulk distributions.",
  },
  {
    name: "UK politics",
    description:
      "Political-system, public-integrity and screened bulk datasets.",
  },
  {
    name: "UK observer accountability",
    description:
      "Reciprocal investigation accountability, public source doors and the zero-row candidate contract.",
  },
  {
    name: "UK public-power case commons",
    description:
      "Decided public-law case packets, exact remedy and money meanings, local assessment templates and a no-brokerage boundary.",
  },
  {
    name: "OpenAPI descriptions",
    description:
      "Cacheable, task-sized API descriptions for machine callers.",
  },
  {
    name: "UK tax expert",
    description:
      "Evidence-backed tax capability discovery and bounded deterministic assessments.",
  },
  {
    name: "UK professional tools",
    description:
      "Current lawyer and accountant tasks, caller credential inspection, access boundaries, complete examples and practice-record responsibilities.",
  },
  {
    name: "SDLT",
    description:
      "Bounded, deterministic residential Stamp Duty Land Tax calculations.",
  },
  {
    name: "Explanation contracts",
    description:
      "Shared, read-only contracts for tracing conclusions to support, responsibility, effects, challenge routes and explicit gaps.",
  },
] as const;

const publicApiPathPrefixes = [
  "/v1/open-data",
  "/v1/tax-system/uk",
  "/v1/tax-industry/uk",
  "/v1/charities/uk",
  "/v1/public-funding/uk",
  "/v1/politics/uk",
  "/v1/accountability/uk",
  "/v1/case-commons/uk",
  "/v1/why-graph",
] as const;

const publicAgentPaths = new Set([
  "/",
  "/agent.txt",
  "/.well-known/agent.txt",
  "/v1/wake",
  "/v1/health",
  "/v1/uk/tax-expert",
  "/v1/uk/tax-expert/tax-position-passport/schema",
  "/v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax",
  professionalToolsPath,
]);

function hasPathPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

const openApiSliceDefinitions: readonly OpenApiSliceDefinition[] = [
  {
    id: "public",
    path: "/openapi-public.json",
    title: "TaxSorted Public API",
    description:
      "Sessionless public data, health and agent-orientation operations. Cacheable OpenAPI descriptions are linked separately.",
    matchesPath: (path) =>
      publicAgentPaths.has(path) ||
      publicApiPathPrefixes.some((prefix) => hasPathPrefix(path, prefix)),
  },
  {
    id: "tax-system-uk",
    path: "/openapi/tax-system-uk.json",
    title: "TaxSorted UK Tax System API",
    description: "Task-sized contract for the reviewed UK tax-system map.",
    matchesPath: (path) => hasPathPrefix(path, "/v1/tax-system/uk"),
  },
  {
    id: "tax-industry-uk",
    path: "/openapi/tax-industry-uk.json",
    title: "TaxSorted UK Tax Industry API",
    description:
      "Task-sized contract for UK tax roles, qualifications and industry gates.",
    matchesPath: (path) => hasPathPrefix(path, "/v1/tax-industry/uk"),
  },
  {
    id: "charities-uk",
    path: "/openapi/charities-uk.json",
    title: "TaxSorted UK Charities API",
    description:
      "Task-sized contract for the charity-sector map and accountability framework.",
    matchesPath: (path) => hasPathPrefix(path, "/v1/charities/uk"),
  },
  {
    id: "public-funding-uk",
    path: "/openapi/public-funding-uk.json",
    title: "TaxSorted UK Public Funding API",
    description:
      "Task-sized contract for public-funding data and correction history.",
    matchesPath: (path) => hasPathPrefix(path, "/v1/public-funding/uk"),
  },
  {
    id: "politics-uk",
    path: "/openapi/politics-uk.json",
    title: "TaxSorted UK Politics API",
    description:
      "Task-sized contract for political-system and public-integrity data.",
    matchesPath: (path) => hasPathPrefix(path, "/v1/politics/uk"),
  },
  {
    id: "accountability-uk",
    path: "/openapi/accountability-uk.json",
    title: "TaxSorted UK Observer Accountability API",
    description:
      "Task-sized contract for the watching-the-watchers framework and candidate schema.",
    matchesPath: (path) => hasPathPrefix(path, "/v1/accountability/uk"),
  },
  {
    id: "case-commons-uk",
    path: "/openapi/case-commons-uk.json",
    title: "TaxSorted UK Public-Power Case Commons API",
    description:
      "Task-sized read-only contract for decided case packets, source resolution, local professional assessment and publication boundaries.",
    matchesPath: (path) => hasPathPrefix(path, "/v1/case-commons/uk"),
  },
  {
    id: "why-graph",
    path: "/openapi/why-graph.json",
    title: "TaxSorted Why Graph API",
    description:
      "Task-sized contract for the shared explanation graph framework and structural schema.",
    componentReferences: ["#/components/schemas/WhyGraph"],
    matchesPath: (path) => hasPathPrefix(path, "/v1/why-graph"),
  },
  {
    id: "professional-tools-uk",
    path: professionalToolsOpenApiPath,
    title: "TaxSorted UK Professional Tools API",
    description:
      "Task-sized contract for the professional doorway, caller credential inspection, residential SDLT calculation and MTD Income Tax readiness assessment.",
    allowSecuredOperations: true,
    matchesPath: (path) =>
      path === professionalToolsPath ||
      path === apiWorkspacePath ||
      hasPathPrefix(path, "/v1/uk/sdlt") ||
      hasPathPrefix(path, "/v1/uk/tax-expert"),
  },
  {
    id: "tax-expert-uk",
    path: "/openapi/tax-expert-uk.json",
    title: "TaxSorted UK Tax Expert API",
    description:
      "Task-sized contract for tax-expert coverage and bounded deterministic assessments.",
    allowSecuredOperations: true,
    matchesPath: (path) => hasPathPrefix(path, "/v1/uk/tax-expert"),
  },
];

function requestIdFor(c: { get: (key: "requestId") => string }): string {
  return c.get("requestId") ?? "unavailable";
}

async function rejectAmbiguousJson(c: Context, next: Next) {
  if (c.req.method !== "POST") {
    await next();
    return;
  }
  try {
    assertNoDuplicateJsonKeys(await c.req.raw.clone().text());
  } catch (error) {
    const code = error instanceof StrictJsonError ? error.code : "invalid_json";
    return c.json(
      {
        error: code,
        message:
          code === "duplicate_json_key"
            ? "Send every JSON field once. Duplicate tax facts are ambiguous."
            : code === "json_too_deep"
              ? "Use a shallower JSON object."
              : "Send one valid JSON object.",
        requestId: requestIdFor(c),
      },
      400,
    );
  }
  await next();
}

const TaxSystemCollection = z.enum([
  "actors",
  "relationships",
  "frameworks",
  "rules",
  "accounts",
  "systems",
  "permissions",
  "pipeline",
  "cases",
  "sources",
  "gaps",
]);
const TaxSystemQuery = z.object({
  q: z.string().max(100).optional(),
  kind: z.string().optional(),
  sector: z.string().optional(),
  category: z.string().optional(),
  layer: z.string().optional(),
  lane: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  authority: z.string().optional(),
  jurisdiction: z.string().optional(),
  actorId: z.string().optional(),
  stageId: z.string().optional(),
  ruleId: z.string().optional(),
  systemId: z.string().optional(),
  sourceId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});
const PublicJson = z.object({}).passthrough().openapi("UkTaxSystemResponse");

const TaxIndustryCollection = z.enum([
  "sources",
  "institutions",
  "roles",
  "qualifications",
  "gates",
  "pathways",
  "study",
  "compensation",
  "barriers",
  "gaps",
]);
const TaxIndustryQuery = z.object({
  q: z.string().max(100).optional(),
  kind: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  legalStatus: z.string().optional(),
  type: z.string().optional(),
  gateId: z.string().optional(),
  roleId: z.string().optional(),
  qualificationId: z.string().optional(),
  institutionId: z.string().optional(),
  sourceId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});
const TaxIndustryPublicJson = z
  .object({})
  .passthrough()
  .openapi("UkTaxIndustryResponse");

const ProblemNextAction = z.object({}).passthrough();
const problemDetailsShape = {
  type: z.string().url(),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string(),
  instance: z.string(),
  error: z.string(),
  nextActions: z.array(ProblemNextAction),
} as const;
const ProblemDetails = z
  .object(problemDetailsShape)
  .passthrough()
  .openapi("ProblemDetails");
const problemContent = {
  "application/problem+json": { schema: ProblemDetails },
  "application/json": { schema: ProblemDetails },
};

const CharitiesCollection = z.enum([
  "sources",
  "regulators",
  "registers",
  "legal-forms",
  "tax-treatments",
  "tax-rules",
  "obligations",
  "funding",
  "finance",
  "control",
  "help",
  "official-procedures",
  "pipeline",
  "gaps",
]);
const CharityTaxpayerClass = z.enum(charityTaxpayerClasses);
const CharityTaxType = z.enum(charityTaxTypes).openapi({
  description:
    "Direct-tax branch reviewed by an exact tax-rule or official-procedure record: Income Tax, Capital Gains Tax or Corporation Tax.",
});
const CharityQueryTaxType = z
  .enum([
    ...charityTaxTypes,
    "recognition",
    "income-and-gains",
    "trading",
    "gift-aid",
    "vat",
    "business-rates",
    "property-transaction",
    "cross-tax-rationale",
  ])
  .openapi({
    description:
      "Collection-dependent tax classification. The generic collection route accepts both direct-tax branches and the broader tax-treatment classifications in this enum; the dedicated tax-rules and official-procedures routes accept only direct-tax branches. Check the selected collection in the dictionary before filtering.",
  });
const CharityTaxRuleRole = z.enum([
  "gateway",
  "restriction",
  "calculation",
  "attribution",
  "definition",
  "transition",
  "procedure",
]);
const CharityProcedureType = z.enum(charityProcedureTypes);
const CharityProcedureStage = z.enum(charityProcedureStages);
const CharityProcedureActorRole = z.enum(charityProcedureActorRoles);
const CharityProcedureChallengeMode = z.enum(charityProcedureChallengeModes);
const CharityTaxRuleExplanationScope = z.enum(charityTaxRuleExplanationScopes);
const CharityJurisdiction = z.enum([
  "United Kingdom",
  "England",
  "Wales",
  "England and Wales",
  "Scotland",
  "Northern Ireland",
]);
const nonBlankCharityQuery = z.string().min(1).regex(/\S/);
const charityTaxTreatmentIdQuery = z.string().min(1).regex(/\S/).openapi({
  description:
    "Exact tax-treatment record ID. Tax-rule queries match the primary or an explicit related treatment; procedure queries match the primary treatment. Discover valid IDs from /v1/charities/uk/tax-treatments or the dictionary.",
  example: "tax-non-charitable-expenditure",
});
const charityTaxRuleIdQuery = z.string().min(1).regex(/\S/).openapi({
  description:
    "Exact provision-level tax-rule ID. Discover valid IDs from /v1/charities/uk/tax-rules or the dictionary.",
  example: "rule-ita-2007-s542",
});
const CharitiesQuery = z.object({
  q: z.string().min(1).max(100).regex(/\S/).optional(),
  jurisdiction: CharityJurisdiction.optional(),
  kind: nonBlankCharityQuery.optional(),
  type: nonBlankCharityQuery.optional(),
  status: nonBlankCharityQuery.optional(),
  taxType: CharityQueryTaxType.optional(),
  obligationType: nonBlankCharityQuery.optional(),
  fundingType: nonBlankCharityQuery.optional(),
  helpCategory: nonBlankCharityQuery.optional(),
  taxTreatmentId: charityTaxTreatmentIdQuery.optional(),
  taxpayerClass: CharityTaxpayerClass.openapi({
    description: "Taxpayer branch used by a provision or procedure record.",
  }).optional(),
  ruleRole: CharityTaxRuleRole.openapi({
    description: "Function the exact provision performs in the mapped law spine.",
  }).optional(),
  explanationScope: CharityTaxRuleExplanationScope.openapi({
    description: "Compact why-graph spine or separately queryable supplementary law.",
  }).optional(),
  procedureType: CharityProcedureType.openapi({
    description: "Exact procedure profile admitted in this corpus release.",
  }).optional(),
  procedureStage: CharityProcedureStage.openapi({
    description: "Broad procedure state-machine stage.",
  }).optional(),
  performedByRole: CharityProcedureActorRole.openapi({
    description: "Public role that performs a procedure step; never a named-person filter.",
  }).optional(),
  challengeMode: CharityProcedureChallengeMode.openapi({
    description: "Appeal, correction rejection, return supersession or another bounded route.",
  }).optional(),
  taxRuleId: charityTaxRuleIdQuery.optional(),
  regulatorId: nonBlankCharityQuery.optional(),
  sourceId: nonBlankCharityQuery.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});
const CharityTaxRuleQuery = CharitiesQuery.pick({
  q: true,
  jurisdiction: true,
  taxTreatmentId: true,
  taxpayerClass: true,
  taxType: true,
  ruleRole: true,
  explanationScope: true,
  regulatorId: true,
  sourceId: true,
  limit: true,
  offset: true,
}).extend({
  taxType: CharityTaxType.optional(),
});
const CharityOfficialProcedureQuery = CharitiesQuery.pick({
  q: true,
  jurisdiction: true,
  taxTreatmentId: true,
  taxType: true,
  procedureType: true,
  procedureStage: true,
  performedByRole: true,
  challengeMode: true,
  taxRuleId: true,
  regulatorId: true,
  sourceId: true,
  limit: true,
  offset: true,
}).extend({
  taxpayerClass: CharityTaxpayerClass.openapi({
    description: "Trust, company or reviewed cross-tax procedure branch.",
  }).optional(),
  taxType: CharityTaxType.optional(),
});
const CharitiesPublicJson = z
  .object({})
  .passthrough()
  .openapi("UkCharitiesResponse");
const CharityListPage = z.object({
  total: z.number().int().nonnegative(),
  returned: z.number().int().nonnegative(),
  limit: z.number().int().min(1).max(100),
  offset: z.number().int().nonnegative(),
});
const CharityListProvenance = z.object({
  corpusVersion: z.string(),
  reviewedOn: z.string(),
  sourceLedger: z.string(),
  registers: z.string(),
  gaps: z.string(),
});
const CharityTaxRuleRecord = ukCharitiesSchema.shape.taxRules.element;
const CharityOfficialProcedureRecord =
  ukCharitiesSchema.shape.officialProcedures.element;
const CharitySourceRecord = ukCharitiesSchema.shape.sources.element;
const CharityRegulatorRecord = ukCharitiesSchema.shape.regulators.element;
const CharityTaxTreatmentRecord = ukCharitiesSchema.shape.taxTreatments.element;
const CharityTaxRuleList = z.object({
  data: z.array(CharityTaxRuleRecord),
  page: CharityListPage,
  filters: z.record(z.string(), z.string()),
  provenance: CharityListProvenance,
}).openapi("UkCharityTaxRuleList");
const CharityTaxRuleDetail = z.object({
  data: CharityTaxRuleRecord,
  evidence: z.array(CharitySourceRecord),
  related: z.object({
    taxTreatment: CharityTaxTreatmentRecord.nullable(),
    relatedTaxTreatments: z.array(CharityTaxTreatmentRecord),
    authoritySource: CharitySourceRecord.nullable(),
    administrators: z.array(CharityRegulatorRecord),
  }),
}).openapi("UkCharityTaxRuleDetail");
const CharityOfficialProcedureList = z.object({
  data: z.array(CharityOfficialProcedureRecord),
  page: CharityListPage,
  filters: z.record(z.string(), z.string()),
  provenance: CharityListProvenance,
}).openapi("UkCharityOfficialProcedureList");
const CharityOfficialProcedureDetail = z.object({
  data: CharityOfficialProcedureRecord,
  evidence: z.array(CharitySourceRecord),
  related: z.object({
    taxTreatment: CharityTaxTreatmentRecord.nullable(),
    taxRules: z.array(CharityTaxRuleRecord),
    nextProcedures: z.array(CharityOfficialProcedureRecord),
    regulators: z.object({
      administering: z.array(CharityRegulatorRecord),
      handling: z.array(CharityRegulatorRecord),
      deciding: z.array(CharityRegulatorRecord),
    }),
    legalBasis: z.array(CharitySourceRecord),
  }),
}).openapi("UkCharityOfficialProcedureDetail");
const CharityAccountabilityFrameworkJson = z
  .object({
    id: z.literal("uk-charity-accountability"),
    schemaId: z.literal("taxsorted.uk.charity-accountability/1"),
    status: z.literal("schema-only-not-admitted"),
    purpose: z.string(),
    publicationBlockers: z.array(
      z.object({
        id: z.enum([
          "confidential-correction-safety-intake",
          "asset-level-rights-admission-digest",
        ]),
        status: z.literal("blocking"),
        requirement: z.string(),
      })
    ),
    publicationBlockerScope: z.string(),
    admissionConditions: z.array(
      z.object({
        id: z.string(),
        status: z.literal("required-not-satisfied"),
        requirement: z.string(),
      })
    ),
    orientation: z.object({
      startHere: z.array(z.string()),
      readingPath: z.array(z.string()),
      safeNextActions: z.array(z.string()),
    }),
    publicationAdmission: z.object({
      currentSchema: z.literal("candidate-shape-only"),
      datasetStatus: z.literal("candidate-not-admitted"),
      externalEnvelopeRequired: z.literal(true),
      requirement: z.string(),
      digestMeaning: z.string(),
    }),
    hardBoundaries: z.array(z.string()),
    validationLayers: z.object({
      jsonSchema: z.string(),
      runtimeZod: z.string(),
      requirement: z.string(),
    }),
    collectionOrder: z.array(z.string()),
    collectionGuide: z.array(
      z.object({
        collection: z.string(),
        question: z.string(),
        boundary: z.string(),
      })
    ),
    stableSort: z.object({
      rule: z.string(),
      reason: z.string(),
      ties: z.string(),
    }),
    cursor: z.object({
      version: z.string(),
      encoding: z.string(),
      payloadFieldsInOrder: z.array(z.string()),
      stability: z.string(),
      invalidCursor: z.string(),
    }),
    releaseIntegrity: z.object({
      digestAlgorithm: z.string(),
      digestPreimage: z.string(),
      verification: z.string(),
      predecessorRule: z.string(),
    }),
    comparableMoney: z.object({
      storage: z.string(),
      exactContextFields: z.array(z.string()),
      exactBasisFields: z.array(z.string()),
      stageRule: z.string(),
      mismatchRule: z.string(),
      calculationRule: z.string(),
    }),
    comparisonContract: z.object({
      contextAnchor: z.string(),
      dimensions: z.string(),
      exactContextRelations: z.array(z.string()),
      notComparable: z.string(),
      changeOverTime: z.string(),
    }),
    inconsistencyRule: z.object({
      relation: z.literal("inconsistent-with"),
      requirements: z.array(z.string()),
      warning: z.string(),
    }),
  })
  .passthrough()
  .openapi("UkCharityAccountabilityFramework");
const CharityAccountabilitySchemaJson = z
  .object({
    $schema: z.string().optional(),
    $id: z.string(),
    title: z.string(),
    description: z.string(),
  })
  .passthrough()
  .openapi("UkCharityAccountabilityJsonSchema");
const CharityInstructionalError = z
  .object({
    ...problemDetailsShape,
    schema: z.literal("taxsorted.charity-error/1"),
    method: z.string(),
    path: z.string(),
    reason: z.string(),
    walls_intact: z.literal(true),
    walls: z.array(z.string()),
    next_actions: z.array(
      z.object({
        action: z.string(),
        method: z.enum(["GET", "HEAD"]),
        href: z.string(),
        description: z.string(),
      })
    ),
    docs: z.object({
      openapi: z.string(),
      dictionary: z.string(),
      agent_discovery: z.string(),
    }),
  })
  .passthrough()
  .openapi("UkCharityInstructionalError");
const charityErrorContent = {
  "application/problem+json": { schema: CharityInstructionalError },
  "application/json": { schema: CharityInstructionalError },
};

const ObserverAccountabilityFrameworkJson = z
  .object({
    schema: z.literal("taxsorted.uk.observer-accountability-framework/1"),
    id: z.literal("uk-observer-accountability"),
    title: z.literal("Watching the watchers"),
    status: z.literal("schema-only-not-admitted"),
    reviewedOn: z.string(),
    reviewAfter: z.string(),
    purpose: z.string(),
    principle: z.object({
      name: z.literal("the-observer-is-also-observed"),
      operationalMeaning: z.string(),
      notAMetaphysicalClaim: z.string(),
      observerEffectBoundary: z.string(),
    }),
    sourceEpistemicBoundary: z.string(),
    dignityAndIdentity: z.object({
      beings: z.string(),
      identity: z.string(),
      organisationLevelCaveat: z.string(),
      excluded: z.array(z.string()),
    }),
    networkRule: z.object({
      meaning: z.string(),
      notEquivalentTo: z.string(),
    }),
    wordsAndDoings: z.object({
      words: z.string(),
      doings: z.string(),
      actionReferenceRule: z.string(),
      outcomeStates: z.array(z.string()),
      separationRule: z.string(),
      correctionRule: z.string(),
    }),
    reciprocityInvariant: z.object({
      rule: z.string(),
      taxsortedIncluded: z.string(),
      taxsortedRecordStatus: z.literal(
        "principle-declared-no-curation-or-investigation-records-admitted",
      ),
      noRanking: z.string(),
      terminationRule: z.string(),
    }),
    inquiryLoop: z.object({
      informalName: z.string(),
      publicMeaning: z.string(),
      steps: z.array(z.object({ id: z.string(), action: z.string() })),
      stopConditions: z.array(z.string()),
      offSwitch: z.string(),
    }),
    candidateContract: z.object({
      schema: z.string(),
      example: z.string().url(),
      status: z.literal("candidate-shape-only"),
      recordsAvailable: z.literal(false),
      collections: z.array(
        z.object({ name: z.string(), question: z.string() }),
      ),
      counts: z.object({
        institutionalRelations: z.literal(0),
        investigationEngagements: z.literal(0),
        investigationActions: z.literal(0),
        institutionalResponses: z.literal(0),
        coverageGaps: z.literal(0),
      }),
      validation: z.object({
        jsonSchema: z.literal("structural-shape-only"),
        runtimeValidatorRequired: z.literal(true),
        runtimeValidatorSource: z.string().url(),
        command: z.string(),
        runtimeInvariants: z.array(z.string()),
        validationDoesNotProve: z.string(),
      }),
      externalAdmissionChecks: z.array(z.string()),
    }),
    officialDoors: z.array(
      z.object({
        id: z.string(),
        system: z.string(),
        publisher: z.string(),
        title: z.string(),
        url: z.string().url(),
        letsYouInspect: z.string(),
        reviewedOn: z.string(),
        publicationMode: z.literal("link-and-reviewed-summary"),
        copiedSourceBodyStored: z.literal(false),
        mayContainNaturalPersonDataAtSource: z.literal(true),
        reviewMethod: z.literal(
          "agent-assisted-editorial-review-of-linked-official-page",
        ),
        humanApprovalStatus: z.literal("not-recorded"),
        assessmentNature: z.literal(
          "source-link-and-taxsorted-summary-not-independent-proof-of-practice",
        ),
      }),
    ),
    existingTaxSortedDoors: z.array(
      z.object({ href: z.string(), scope: z.string() }),
    ),
    publicationBlockers: z.array(z.string()),
    hardWalls: z.array(z.string()),
    rights: z.object({
      taxsortedCuration: z.object({
        id: z.literal("CC-BY-SA-4.0"),
        url: z.string().url(),
      }),
      linkedSources: z.string(),
    }),
    corrections: z.object({
      publicNonPersonalFacts: z.string().url(),
      accountRequired: z.literal(true),
      confidentialOrSensitiveIntakeAvailable: z.literal(false),
      warning: z.string(),
    }),
  })
  .passthrough()
  .openapi("UkObserverAccountabilityFramework");
const ObserverAccountabilitySchemaJson = z
  .object({
    $schema: z.string().optional(),
    $id: z.literal("https://api.taxsorted.io/v1/accountability/uk/schema"),
    title: z.string(),
    description: z.string(),
    "x-taxsorted-validation-scope": z.object({
      jsonSchema: z.literal("structural-shape-only"),
      runtimeSemanticValidationRequired: z.literal(true),
      runtimeValidatorSource: z.string().url(),
      copyableValidationCommand: z.string(),
      externalChecksStillRequired: z.string(),
    }),
    "x-taxsorted-runtime-invariants": z.array(z.string()),
  })
  .passthrough()
  .openapi("UkObserverAccountabilityJsonSchema");

const PublicFundingCollection = z.enum([
  "sources",
  "institutions",
  "governance",
  "offices",
  "relationships",
  "funds",
  "programmes",
  "mechanisms",
  "allocations",
  "contacts",
  "locations",
  "pipeline",
  "gaps",
]);
const PublicFundingQuery = z.object({
  q: z.string().max(100).optional(),
  kind: z.string().optional(),
  sector: z.string().optional(),
  jurisdiction: z.string().optional(),
  status: z.string().optional(),
  fundingRole: z.string().optional(),
  beneficiaryTag: z.string().optional(),
  type: z.string().optional(),
  institutionId: z.string().optional(),
  governanceUnitId: z.string().optional(),
  officeId: z.string().optional(),
  fundId: z.string().optional(),
  programmeId: z.string().optional(),
  mechanismId: z.string().optional(),
  financialYear: z.string().optional(),
  budgetBoundary: z.string().optional(),
  accountingBasis: z.string().optional(),
  grossOrNet: z.string().optional(),
  priceBasis: z.string().optional(),
  lane: z.string().optional(),
  sourceId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});
const PublicFundingChangeQuery = z.object({
  after: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
const PublicFundingPublicJson = z
  .object({})
  .passthrough()
  .openapi("UkPublicFundingResponse");
const PublicFundingRecord = z
  .object({
    id: z.string().describe("Stable, dataset-wide record identifier."),
  })
  .passthrough()
  .openapi("UkPublicFundingRecord");
const PublicFundingList = z
  .object({
    data: z.array(PublicFundingRecord),
    page: z.object({
      total: z.number().int().nonnegative(),
      returned: z.number().int().nonnegative(),
      limit: z.number().int().min(1).max(100),
      offset: z.number().int().nonnegative(),
      hasMore: z.boolean(),
    }),
    links: z.object({
      self: z.string(),
      next: z.string().nullable(),
      prev: z.string().nullable(),
    }),
    filters: z.record(z.string(), z.string()),
    provenance: z.object({
      corpusVersion: z.string(),
      reviewedOn: z.string(),
      sourceLedger: z.string(),
      gaps: z.string(),
    }),
  })
  .openapi("UkPublicFundingList");
const PublicFundingDetail = z
  .object({
    data: PublicFundingRecord,
    evidence: z.array(PublicFundingRecord).optional(),
  })
  .passthrough()
  .openapi("UkPublicFundingDetail");
const PublicFundingNextAction = z
  .object({
    method: z.literal("GET"),
    href: z.string(),
    description: z.string(),
  })
  .openapi("UkPublicFundingNextAction");
const PublicFundingActionError = z
  .object({
    ...problemDetailsShape,
    message: z.string(),
    nextActions: z.array(PublicFundingNextAction).min(1),
  })
  .passthrough()
  .openapi("UkPublicFundingActionError");
const PublicFundingUnavailable = z
  .object({
    ...problemDetailsShape,
    error: z.enum([
      "publication_review_pending",
      "publication_emergency_stopped",
    ]),
    message: z.string(),
    sources: z.string(),
    gaps: z.string(),
    nextActions: z.array(PublicFundingNextAction).min(1),
  })
  .passthrough()
  .openapi("UkPublicFundingUnavailable");
const PublicFundingChange = z
  .object({
    id: z.string(),
    sequence: z.number().int().positive(),
    cursor: z.string(),
    operation: z.enum(["snapshot-established", "added", "updated", "retired"]),
    dataset: z.literal("uk-public-funding"),
    version: z.string(),
    reviewedOn: z.string(),
    publishedOn: z.string(),
    releaseCommit: z.string().regex(/^[0-9a-f]{40}$/),
    previousEventHash: z.string().nullable(),
    eventHash: z.string(),
    datasetHash: z.string(),
    counts: z.record(z.string(), z.number().int().nonnegative()),
    collection: z.string().optional(),
    recordId: z.string().optional(),
    changedFields: z.array(z.string()).optional(),
    beforeHash: z.string().nullable().optional(),
    afterHash: z.string().nullable().optional(),
    reason: z.string().optional(),
    sourceIds: z.array(z.string()).optional(),
    explanation: z.string(),
    doesNotClaim: z.array(z.string()),
  })
  .openapi("UkPublicFundingChange");
const PublicFundingChangeFeed = z
  .object({
    schema: z.literal("taxsorted.uk.public-funding.changes/1"),
    dataset: z.literal("uk-public-funding"),
    appendOnly: z.literal(true),
    cursorSemantics: z.string(),
    data: z.array(PublicFundingChange),
    page: z.object({
      limit: z.number().int().min(1).max(100),
      returned: z.number().int().nonnegative(),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
    }),
    links: z.object({
      self: z.string(),
      next: z.string().nullable(),
      poll: z.string().nullable(),
    }),
  })
  .openapi("UkPublicFundingChangeFeed");
const PublicFundingResolvedRecord = z
  .object({
    collection: PublicFundingCollection,
    corpusKey: z.string(),
    canonicalUrl: z.string(),
    data: PublicFundingRecord,
    links: z.object({ self: z.string(), canonical: z.string() }),
  })
  .openapi("UkPublicFundingResolvedRecord");

const AgentNextAction = z
  .object({
    id: z.string(),
    method: z.literal("GET"),
    href: z.string(),
    accepts: z.array(z.string()),
    description: z.string(),
  })
  .openapi("AgentNextAction");
const AgentWake = z
  .object({
    schema: z.literal("taxsorted.agent-wake/1"),
    service: z.object({
      name: z.literal("TaxSorted"),
      purpose: z.string(),
      humanDoor: z.string().url(),
      machineDoor: z.string().url(),
      jurisdiction: z.literal("United Kingdom"),
    }),
    access: z.object({
      scope: z.string(),
      appliesTo: z.array(z.string()).optional(),
      linkedTaskAccessDeclaredSeparately: z.literal(true).optional(),
      authentication: z.literal("none"),
      account: z.literal("none"),
      session: z.literal("none"),
      price: z.literal("free"),
      cookies: z.literal("none"),
      writes: z.literal("none"),
      methods: z.array(z.enum(["GET", "HEAD", "OPTIONS"])),
      cors: z.literal("*"),
    }),
    wallScope: z.object({
      appliesTo: z.array(z.string()),
      meaning: z.string(),
      doesNotCertify: z.string(),
    }),
    walls: z.array(z.object({ id: z.string(), statement: z.string() })),
    publicationStates: z.array(
      z.object({
        datasetId: z.string(),
        version: z.string(),
        reviewedOn: z.string().nullable(),
        status: z.string(),
        fullDatasetAvailable: z.boolean(),
        reviewBoundary: z.string(),
        scopeBoundary: z.string().nullable().optional(),
      }),
    ),
    resources: z.object({
      catalog: z.object({
        href: z.string(),
        schema: z.string(),
        etag: z.string(),
      }),
      rights: z.object({ href: z.string() }),
      openApi: z.object({
        publicHref: z.string(),
        fullHref: z.string(),
        datasetSlices: z.object({
          taxSystem: z.string(),
          taxIndustry: z.string(),
          charities: z.string(),
          publicFunding: z.string(),
          politics: z.string(),
        }),
        frameworkSlices: z.object({
          accountability: z.string(),
          caseCommons: z.string(),
          whyGraph: z.string().optional(),
        }),
        taskSlices: z
          .object({
            taxExpert: z.string(),
            professionalTools: z.string().optional(),
          })
          .optional(),
      }),
      releases: z.object({
        ledger: z.string(),
        jsonFeed: z.string(),
        atom: z.string(),
      }),
      health: z.object({ href: z.string() }),
      corrections: z.object({
        href: z.string().url(),
        accountRequired: z.literal(true),
        privateOrSensitiveIntakeAvailable: z.literal(false),
      }),
      manifests: z.object({
        primary: z.string(),
        wellKnownMirror: z.string(),
      }),
      charityAccountability: z.object({
        framework: z.string(),
        schema: z.string(),
        status: z.literal("schema-only-not-admitted"),
        recordsAvailable: z.literal(false),
      }),
      observerAccountability: z.object({
        framework: z.string(),
        schema: z.string(),
        status: z.literal("schema-only-not-admitted"),
        recordsAvailable: z.literal(false),
      }),
      caseCommons: z.object({
        href: z.string(),
        cases: z.string(),
        schema: z.string(),
        packetSchema: z.string(),
        assessmentTemplate: z.string(),
        openApi: z.string(),
        humanGuide: z.string().url(),
        availability: z.enum([
          "open",
          "publication-review",
          "emergency-stopped",
          "case-level-stops-active",
        ]),
        stoppedCaseCount: z.number().int().nonnegative(),
        writes: z.literal(false),
        personalIntake: z.literal(false),
        privateUploads: z.literal(false),
        professionalMarketplace: z.literal(false),
        probabilityOrExpectedValue: z.literal(false),
        optionalAgentToolBridge: z.object({
          required: z.literal(false),
          sdk: z.literal("@agenttool/sdk"),
          version: z.literal("0.16.0"),
          client: z.literal("DataClient"),
          custody: z.literal(
            "caller-operated-loopback-agent-data-node",
          ),
          guide: z.string().url(),
          defaultEffect: z.literal("dry-run-verification-only"),
          writeEffect: z.string(),
          hostedAgentToolWrite: z.literal(false),
          privateCaseFacts: z.literal(false),
        }),
        effects: z.string(),
      }),
      publicOfficePathways: z.object({
        href: z.string(),
        schema: z.string(),
        humanGuide: z.string().url(),
        availability: z.literal("conditional-public"),
        unavailableWhen: z.literal("politics-bulk-data-emergency-stop"),
        rights: z.string(),
        corrections: z.string(),
        effects: z.string(),
      }),
      publicDecisionPathways: z.object({
        href: z.string(),
        decisions: z.string(),
        doors: z.string(),
        schema: z.string(),
        openApi: z.string(),
        humanGuide: z.string().url(),
        availability: z.literal("conditional-public"),
        unavailableWhen: z.literal("politics-bulk-data-emergency-stop"),
        rights: z.string(),
        corrections: z.string(),
        effects: z.string(),
        eventStatus: z.string(),
      }),
      whyGraph: z
        .object({
          framework: z.string(),
          adopters: z.string().optional(),
          schema: z.string(),
          openApi: z.string(),
          graphSchema: z.literal("taxsorted.why-graph/1"),
          status: z.literal("first-adopter"),
          adopterCount: z.number().int().positive().max(100).optional(),
          legacyStatusMeaning: z.string().optional(),
          firstAdopter: z.object({
            endpoint: z.literal(
              "/v1/uk/tax-expert/mtd-income-tax/assessments",
            ),
            responsePath: z.literal("/reasoning/whyGraph"),
            capabilityVersion: z.literal("2026-07-11.5"),
            runtimeEmitted: z.literal(true),
            wireSchemaOptionalForForwardCompatibleV1Readers: z.literal(true),
          }),
          secondAdopter: z.object({
            endpointTemplate: z.literal(
              "/v1/charities/uk/tax-treatments/{id}/why-graph",
            ),
            subjectVersion: z.string(),
            runtimeEmitted: z.literal(true),
            standaloneResource: z.literal(true),
            publicationControlledBy: z.literal("/v1/charities/uk"),
            organisationOrCaseFacts: z.literal(false),
          }).optional(),
          access: z.object({
            appliesTo: z.array(z.string()).optional(),
            methods: z.tuple([
              z.literal("GET"),
              z.literal("HEAD"),
              z.literal("OPTIONS"),
            ]),
            authentication: z.literal("none"),
            account: z.literal("none"),
            session: z.literal("none"),
            cookies: z.literal("none"),
            writes: z.literal("none"),
            cors: z.literal("*"),
          }),
          boundaries: z.object({
            createsGraphRecords: z.literal(false),
            changesExternalState: z.literal(false),
            infersOfficialAppealRights: z.literal(false),
            graphIsDerivedNotCanonical: z.literal(true),
          }),
        })
        .optional(),
      professionalTools: z
        .object({
          publicManifest: z.object({
            method: z.literal("GET"),
            href: z.string(),
            authentication: z.literal("none"),
          }),
          taskContract: z.object({
            method: z.literal("GET"),
            href: z.string(),
            authentication: z.literal("none"),
          }),
          credentialInspection: z.object({
            method: z.literal("GET"),
            href: z.literal("/v1/api-workspace"),
            authentication: z.literal("Bearer TaxSorted workspace key"),
            requiredWorkspaceScopes: z.array(z.string()).max(0),
            intendedClient: z.literal("server-to-server"),
            browserCorsAuthorizationHeaderAllowed: z.literal(false),
            acceptsQueryParameters: z.literal(false),
            acceptsRequestBody: z.literal(false),
            acceptsClientFacts: z.literal(false),
            changesState: z.literal(false),
            returnsOtherKeys: z.literal(false),
          }),
          operatorKeyLifecycle: z.object({
            inspect: z.literal(true),
            issueWithFiniteExpiry: z.literal(true),
            overlappingRotation: z.literal(true),
            explicitRevocation: z.literal(true),
            selfService: z.literal(false),
            securePublicDelivery: z.literal(false),
            authenticatedAdminAuditTrail: z.literal(false),
          }),
          status: z.literal("credentialed-design-partner"),
          audiences: z.tuple([
            z.literal("solicitors-and-conveyancers"),
            z.literal("accountants-and-tax-advisers"),
          ]),
          executableTaskCount: z.literal(2),
          access: z.object({
            availability: z.literal("credentialed-design-partner"),
            publicSelfServiceKeyProvisioning: z.literal(false),
            confidentialAccessRequestIntake: z.literal(false),
            browserAccountProvidesWorkspaceKey: z.literal(false),
            workspaceKeyIdentifiesCallingWorkspace: z.literal(true),
            requestFactsMayBePersonalData: z.literal(true),
            authentication: z.literal("Bearer TaxSorted workspace key"),
            intendedClient: z.literal("server-to-server"),
          }),
          boundaries: z.object({
            clientOrMatterRecords: z.literal(false),
            portfolioOrBatchOperations: z.literal(false),
            filingOrSubmission: z.literal(false),
            immutableEvidenceArchive: z.literal(false),
            workspaceNameReturnedToCaller: z.literal(false),
            productionSla: z.literal(false),
          }),
        })
        .optional(),
      taxExpert: z
        .object({
          humanHref: z.string().url(),
          publicManifest: z.object({
            method: z.literal("GET"),
            href: z.string(),
            authentication: z.literal("none"),
          }),
          taskContract: z.object({
            method: z.literal("GET"),
            href: z.string(),
            authentication: z.literal("none"),
          }),
          assessment: z.object({
            operationId: z.literal("assessMtdIncomeTaxReadiness"),
            method: z.literal("POST"),
            href: z.string(),
            kind: z.literal("stateless-computation"),
            requestContentType: z.literal("application/json"),
            responseContentType: z.literal("application/json"),
            authentication: z.object({
              openApiSecurityScheme: z.literal("WorkspaceKey"),
              type: z.literal("http-bearer"),
              credential: z.literal("TaxSorted workspace key"),
              requiredScope: z.literal("tax-expert:assess"),
            }),
            availability: z.literal("credentialed-design-partner"),
            publicSelfServiceKeyProvisioning: z.literal(false),
            inputSensitivity: z.literal("financial-facts"),
            directIdentifiersRequested: z.literal(false),
            workspaceKeyIdentifiesWorkspace: z.literal(true),
            requestFactsStorage: z.literal(
              "not-written-to-application-storage",
            ),
            generatedAnswerStorage: z.literal(
              "not-written-to-application-storage",
            ),
            usedForTraining: z.literal(false),
            applicationStateWrite: z.literal(false),
            externalSubmission: z.literal(false),
            sessionCreated: z.literal(false),
            setsCookies: z.literal(false),
            cache: z.literal("no-store"),
            intendedClient: z.literal("server-to-server"),
            browserCors: z.literal("not-supported-for-bearer-assessment"),
            browserCorsAuthorizationHeaderAllowed: z.literal(false),
            maxBodyBytes: z.literal(16_384),
            repeatabilityBoundary: z.literal(
              "same-request-facts-trusted-server-evaluation-date-and-admitted-ruleset-source-ledger",
            ),
            idempotency: z.literal("not-declared"),
            idempotencyMeaning: z.literal(
              "no-Idempotency-Key-protocol; duplicate-calls-have-no-state-effect",
            ),
            retry: z.object({
              applicationOrExternalStateChange: z.literal(false),
              duplicateRequestStateEffect: z.literal("none"),
              byteStabilityGuaranteedAcrossTime: z.literal(false),
              compareWhenRepeating: z.tuple([
                z.literal("capability version"),
                z.literal("evaluatedOn and knowledgeAsOf"),
                z.literal("source IDs, retrievedOn and reviewDueOn"),
              ]),
            }),
            errorContract: z.object({
              mediaType: z.literal("application/json"),
              schema: z.literal("TaxExpertApiError"),
              requestFactValuesEchoedInErrors: z.literal(false),
            }),
          }),
        })
        .optional(),
      datasets: z.array(
        z.object({
          datasetId: z.string(),
          title: z.string(),
          handles: z.record(z.string(), z.string()),
        })
      ),
    }),
    evidenceLanes: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        resources: z.array(
          z.object({
            datasetId: z.string().optional(),
            resource: z.string(),
            href: z.string(),
          })
        ),
      })
    ),
    nextActions: z.array(AgentNextAction),
    attribution: z.object({
      name: z.literal("XENIA"),
      creators: z.tuple([z.literal("Yu"), z.literal("Fable")]),
      source: z.string().url(),
      licence: z.object({
        id: z.literal("CC-BY-SA-4.0"),
        url: z.string().url(),
      }),
      appliedPatterns: z.array(z.string()),
      conformanceClaim: z.literal("none"),
      scope: z.string(),
    }),
  })
  .openapi("AgentWake");
const AgentDoorError = z
  .object({
    ...problemDetailsShape,
    schema: z.literal("taxsorted.agent-error/1"),
    message: z.string(),
    method: z.string(),
    path: z.string(),
    parameters: z.array(z.string()),
    nextActions: z.array(AgentNextAction),
  })
  .openapi("AgentDoorError");

const ContentLicence = z
  .object({ name: z.string(), url: z.string().url() })
  .openapi("ContentLicence");
const OpenDataRecord = z
  .object({
    id: z.string().describe("Stable, dataset-wide record identifier."),
  })
  .passthrough()
  .openapi("OpenDataRecord");
const StableResolvedRecord = z
  .object({
    collection: z.string(),
    corpusKey: z.string(),
    canonicalUrl: z.string(),
    data: OpenDataRecord,
    links: z.object({
      self: z.string(),
      canonical: z.string(),
    }),
  })
  .openapi("StableResolvedRecord");
const DictionaryField = z
  .object({
    name: z.string(),
    field: z.string(),
    type: z.string(),
    required: z.boolean(),
    requiredWithin: z.string(),
    requiredWhen: z.array(z.object({
      field: z.string(),
      equals: z.unknown(),
    })).optional(),
    nullable: z.boolean(),
    meaning: z.string(),
    allowedValues: z.array(z.unknown()).optional(),
  })
  .openapi("DictionaryField");
const DictionaryCollection = z
  .object({
    pathName: z.string(),
    corpusKey: z.string(),
    description: z.string(),
    count: z.number().int().nonnegative(),
    identityField: z.literal("id"),
    itemUrlTemplate: z.string(),
    whyGraphUrlTemplate: z.string().optional(),
    queryUrl: z.string(),
    queryFilters: z.array(z.string()),
    schemaPointer: z.string().url(),
    references: z.record(
      z.string(),
      z.union([z.string(), z.array(z.string())]),
    ),
    csvColumns: z.array(z.string()),
    fields: z.array(DictionaryField),
  })
  .openapi("DictionaryCollection");
const DataDictionary = z
  .object({
    schema: z.literal("taxsorted.open-data-dictionary/1"),
    dataset: z.string(),
    corpusSchema: z.string(),
    version: z.string(),
    reviewedOn: z.string(),
    structuralSchema: z.string().url(),
    corrections: z.string().url(),
    correctionSafety: z.string().optional(),
    scope: z.object({}).passthrough().optional(),
    validation: z.object({
      structuralSchema: z.string(),
      bootOnlyInvariants: z.array(z.string()),
    }),
    conventions: z.record(z.string(), z.string()),
    formats: z.record(z.string(), z.string()),
    collections: z.array(DictionaryCollection),
  })
  .openapi("DataDictionary");
const ExportFormatLink = z
  .object({
    href: z.string(),
    type: z.string(),
    mediaType: z.string(),
    filename: z.string(),
    bytes: z.number().int().nonnegative(),
    etag: z.string(),
  })
  .openapi("ExportFormatLink");
const ExportCollection = z
  .object({
    pathName: z.string(),
    corpusKey: z.string(),
    count: z.number().int().nonnegative(),
    available: z.boolean(),
    csvColumns: z.array(z.string()),
    formats: z.object({
      json: ExportFormatLink,
      ndjson: ExportFormatLink,
      csv: ExportFormatLink,
    }),
  })
  .openapi("ExportCollection");
const DatasetExportIndex = z
  .object({
    schema: z.literal("taxsorted.open-data-exports/1"),
    dataset: z.string(),
    version: z.string(),
    reviewedOn: z.string(),
    licence: ContentLicence,
    publicationStatus: z.string().optional(),
    attribution: z.string(),
    attributionInstructions: z.string(),
    corrections: z.string().url(),
    correctionSafety: z.string().optional(),
    rules: z.record(z.string(), z.string()),
    collections: z.array(ExportCollection),
  })
  .openapi("DatasetExportIndex");
const OpenDataDataset = z
  .object({
    id: z.string(),
    title: z.string(),
    jurisdiction: z.string(),
    schema: z.string(),
    version: z.string(),
    reviewedOn: z.string().nullable(),
    updatePolicy: z.object({
      cadence: z.string(),
      nextReleaseDate: z.string().nullable(),
    }),
    correctionChannel: z.object({
      publicUrl: z.string().url(),
      accountRequired: z.boolean(),
      privateOrSensitiveIntakeAvailable: z.boolean(),
      privateUrl: z.string().url().optional(),
      warning: z.string(),
    }),
    publication: z.object({
      fullDatasetAvailable: z.boolean(),
      status: z.string().optional(),
      reviewBoundary: z.string(),
      scopeBoundary: z.string().optional(),
      notConfidentiality: z.string(),
      humanApproval: z
        .object({ status: z.string() })
        .passthrough()
        .optional(),
      confidentialIntake: z
        .object({
          status: z.string(),
          url: z.string().url().optional(),
        })
        .passthrough()
        .optional(),
    }),
    licence: z.object({}).passthrough(),
    attribution: z.string(),
    resources: z.record(z.string(), z.union([z.string(), z.null()])),
    screenedOn: z.string().optional(),
    screeningStatus: z.string().optional(),
    humanApproval: z
      .object({ status: z.string() })
      .passthrough()
      .optional(),
    admissionDigest: z.string().optional(),
    admissionDigestScope: z.string().optional(),
    datasetCount: z.number().int().nonnegative().optional(),
  })
  .passthrough()
  .openapi("OpenDataDataset");
const OpenDataCatalog = z
  .object({
    schema: z.literal("taxsorted.open-data-catalog/1"),
    title: z.string(),
    purpose: z.string(),
    access: z.object({
      authentication: z.literal("none"),
      price: z.literal("free"),
      methods: z.array(z.enum(["GET", "HEAD", "OPTIONS"])),
      cors: z.literal("*"),
      formats: z.array(z.enum(["json", "ndjson", "csv"])),
      openApi: z.string(),
      agentDiscovery: z.string(),
      openApiPublic: z.string(),
      openApiSlices: z.object({
        taxSystem: z.string(),
        taxIndustry: z.string(),
        charities: z.string(),
        publicFunding: z.string(),
        politics: z.string(),
      }),
      rateLimits: z.string(),
      availability: z.string(),
    }),
    releaseDiscovery: z.object({
      ledger: z.string(),
      jsonFeed: z.string(),
      atom: z.string(),
      scope: z.string(),
      canonical: z.string(),
    }),
    reuse: z.object({
      taxSortedCurationLicence: ContentLicence,
      rights: z.string(),
      sourceRights: z.string(),
      noKeyRequired: z.literal(true),
      mirroring: z.string(),
      corrections: z.string().url(),
    }),
    datasets: z.array(OpenDataDataset),
  })
  .openapi("OpenDataCatalog");
const OpenDataRights = z
  .object({
    schema: z.literal("taxsorted.open-data-rights/1"),
    status: z.literal("mixed-rights-read-before-reuse"),
    curation: z.object({}).passthrough(),
    curationAppliesTo: z.string(),
    sourceMaterial: z.string(),
    automationRule: z.string(),
    datasetRights: z.record(z.string(), z.string()),
    publicIssueTracker: z.string().url(),
    correctionChannel: z.object({
      publicUrl: z.string().url(),
      accountRequired: z.boolean(),
      privateOrSensitiveIntakeAvailable: z.boolean(),
      warning: z.string(),
    }),
  })
  .openapi("OpenDataRights");
const OpenDataReleaseLedger = z
  .object({
    schema: z.literal("taxsorted.open-data-release-ledger/1"),
    title: z.string(),
    semantics: z.object({}).passthrough(),
    currentPublication: z.array(z.object({}).passthrough()),
    checkpoints: z.array(releaseCheckpointSchema),
    representations: z.object({
      canonicalLedger: z.string(),
      jsonFeed: z.string(),
      atom: z.string(),
    }),
  })
  .openapi("OpenDataReleaseLedger");
const OpenDataReleaseJsonFeed = z
  .object({
    version: z.literal("https://jsonfeed.org/version/1.1"),
    title: z.string(),
    feed_url: z.string().url(),
    items: z.array(z.object({ id: z.string() }).passthrough()),
  })
  .passthrough()
  .openapi("OpenDataReleaseJsonFeed");
const ExportFormat = z.enum(["json", "ndjson", "csv"]);
const ConditionalRequestHeaders = z.object({
  "If-None-Match": z
    .string()
    .optional()
    .describe(
      "Validator from a previous response for this same URL and format.",
    ),
});
const AgentRequestHeaders = ConditionalRequestHeaders.extend({
  Accept: z
    .string()
    .optional()
    .describe(
      "Request JSON at the API root; canonical wake and manifest routes have fixed representations.",
    ),
});

const publicResponseHeaders = {
  ETag: {
    description: "Strong validator for the exact response representation.",
    schema: { type: "string" as const },
  },
  "Cache-Control": {
    description: "Cache policy for this exact response representation.",
    schema: { type: "string" as const },
  },
  Link: {
    description:
      "Canonical, licence, schema and alternate representation links.",
    schema: { type: "string" as const },
  },
  "Content-Location": {
    description:
      "Location of this representation; follow Link rel=canonical when it is an alias.",
    schema: { type: "string" as const },
  },
  "X-Corpus-Version": {
    description:
      "Reviewed tax-corpus version when the response belongs to a tax graph.",
    schema: { type: "string" as const },
  },
  "X-Corpus-Reviewed-On": {
    description:
      "Tax-corpus review date when the response belongs to a tax graph.",
    schema: { type: "string" as const },
  },
};
const taxExportResponseHeaders = {
  ...publicResponseHeaders,
  "Content-Disposition": {
    description: "Versioned download filename.",
    schema: { type: "string" as const },
  },
};
const charityWhyGraphResponseHeaders = {
  ...publicResponseHeaders,
  "X-Schema-Version": {
    description: "Shared why-graph wire schema emitted by this resource.",
    schema: { type: "string" as const, enum: ["taxsorted.why-graph/1"] },
  },
  "X-TaxSorted-Why-Graph-Adopter": {
    description: "Domain adapter that admitted this derived graph.",
    schema: {
      type: "string" as const,
      enum: ["uk.charities.tax-treatment"],
    },
  },
};
const redirectResponseHeaders = {
  ...publicResponseHeaders,
  Location: {
    description: "Canonical route to request instead.",
    schema: { type: "string" as const },
  },
};
const PoliticsPublicJson = z
  .object({})
  .passthrough()
  .openapi("UkPoliticsOpenDataResponse");
const PublicOfficePathwaysResponse = z
  .object({
    ...publicOfficePathwaysSchema.shape,
    availability: z.object({
      status: z.literal("open"),
      normalPublicationGates: z.literal("independent"),
      emergencyStop: z.literal("politics-bulk-data-emergency-stop"),
      methods: z.tuple([z.literal("GET"), z.literal("HEAD")]),
      writes: z.literal(false),
    }).strict(),
    links: z.object({
      self: z.string(),
      offices: z.string(),
      support: z.string(),
      schema: z.string(),
      humanGuide: z.string().url(),
      openApi: z.string(),
      rights: z.string(),
      corrections: z.string(),
    }).strict(),
  })
  .strict()
  .openapi("UkPublicOfficePathways");
const PublicOfficePathwayDetail = z
  .object({
    schema: z.literal("taxsorted.uk.public-office-pathways/1"),
    meta: publicOfficePathwaysSchema.shape.meta,
    office: publicOfficePathSchema,
    sources: publicOfficePathwaysSchema.shape.sources,
  })
  .strict()
  .openapi("UkPublicOfficePathwayDetail");
const PublicOfficePathwayList = z
  .object({
    schema: z.literal("taxsorted.uk.public-office-pathways/1"),
    meta: publicOfficePathwaysSchema.shape.meta,
    comparisonRules: z.array(z.string()),
    offices: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        officeType: z.string(),
        jurisdiction: z.string(),
        contestGeography: z.string(),
        electoralSystem: z.string(),
        coverageStatus: z.literal("deep"),
        summary: z.string(),
        routeKinds: z.array(z.enum(["registered-party", "independent"])),
        currentLawAsAt: z.string(),
        sourceIds: z.array(z.string()),
        detail: z.string(),
      }).strict(),
    ),
    sources: publicOfficePathwaysSchema.shape.sources,
  })
  .strict()
  .openapi("UkPublicOfficePathwayList");
const PublicOfficePathwaySupport = z
  .object({
    schema: z.literal("taxsorted.uk.public-office-pathways/1"),
    meta: publicOfficePathwaysSchema.shape.meta,
    selectionRule: z.string(),
    barriers: publicOfficePathwaysSchema.shape.barriers,
    supportRoutes: publicOfficePathwaysSchema.shape.supportRoutes,
    sources: publicOfficePathwaysSchema.shape.sources,
  })
  .strict()
  .openapi("UkPublicOfficePathwaySupport");
const PublicOfficePathwayRights = z
  .object({ ...publicOfficePathwayRightsSchema.shape })
  .strict()
  .openapi("UkPublicOfficePathwayRights");
const PublicDecisionPathwaysResponse = z
  .object({
    ...publicDecisionPathwaysSchema.shape,
    availability: z.object({
      status: z.literal("open"),
      normalPublicationGates: z.literal("independent"),
      emergencyStop: z.literal("politics-bulk-data-emergency-stop"),
      methods: z.tuple([z.literal("GET"), z.literal("HEAD")]),
      writes: z.literal(false),
    }).strict(),
    links: z.object({
      self: z.string(),
      decisions: z.string(),
      doors: z.string(),
      schema: z.string(),
      humanGuide: z.string().url(),
      openApi: z.string(),
      rights: z.string(),
      corrections: z.string(),
    }).strict(),
  })
  .strict()
  .openapi("UkPublicDecisionPathways");
const PublicDecisionPathwayDetail = z
  .object({
    schema: z.literal("taxsorted.uk.public-decision-pathways/1"),
    meta: publicDecisionPathwaysSchema.shape.meta,
    pathway: publicDecisionPathSchema,
    actors: publicDecisionPathwaysSchema.shape.actors,
    participants: publicDecisionPathwaysSchema.shape.participants,
    publicDoors: publicDecisionPathwaysSchema.shape.publicDoors,
    barriers: publicDecisionPathwaysSchema.shape.barriers,
    eventWindows: publicDecisionPathwaysSchema.shape.eventWindows,
    sources: publicDecisionPathwaysSchema.shape.sources,
  })
  .strict()
  .openapi("UkPublicDecisionPathwayDetail");
const PublicDecisionPathwayList = z
  .object({
    schema: z.literal("taxsorted.uk.public-decision-pathways/1"),
    meta: publicDecisionPathwaysSchema.shape.meta,
    routingRule: z.string(),
    decisionIntents: publicDecisionPathwaysSchema.shape.decisionIntents,
    decisions: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        decisionKind: z.literal(
          "central-government-tax-policy-and-primary-law",
        ),
        jurisdiction: z.string(),
        coverageStatus: z.literal("deep"),
        summary: z.string(),
        currentLawAsAt: z.string(),
        stageCount: z.number().int().positive(),
        publicDoorIds: z.array(z.string()),
        participantIds: z.array(z.string()),
        linkedOfficePaths:
          publicDecisionPathSchema.shape.linkedOfficePaths,
        detail: z.string(),
      }).strict(),
    ),
    personalRoutes: publicDecisionPathwaysSchema.shape.personalRoutes,
    officialHandoffs: publicDecisionPathwaysSchema.shape.officialHandoffs,
    coverageGaps: publicDecisionPathwaysSchema.shape.coverageGaps,
    sources: publicDecisionPathwaysSchema.shape.sources,
  })
  .strict()
  .openapi("UkPublicDecisionPathwayList");
const PublicDecisionPathwayDoors = z
  .object({
    schema: z.literal("taxsorted.uk.public-decision-pathways/1"),
    meta: publicDecisionPathwaysSchema.shape.meta,
    selectionRule: z.string(),
    publicDoors: publicDecisionPathwaysSchema.shape.publicDoors,
    eventWindows: publicDecisionPathwaysSchema.shape.eventWindows,
    sources: publicDecisionPathwaysSchema.shape.sources,
  })
  .strict()
  .openapi("UkPublicDecisionPathwayDoors");
const PublicDecisionPathwayRights = z
  .object({ ...publicDecisionPathwayRightsSchema.shape })
  .strict()
  .openapi("UkPublicDecisionPathwayRights");
const PoliticsDatasetField = z
  .object({
    name: z.string(),
    types: z.array(z.string()),
    nullable: z.boolean(),
    optional: z.boolean(),
    required: z.boolean(),
    csvEncoding: z.enum(["scalar", "canonical-json-in-cell"]),
  })
  .openapi("UkPoliticsDatasetField");
const PoliticsDatasetDescriptor = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    availability: z.enum([
      "open",
      "development-preview",
      "approved-disabled",
      "publication-review",
      "emergency-stopped",
    ]),
    authentication: z.literal("none"),
    containsPersonalRecords: z.literal(false),
    schemaVersion: z.string(),
    datasetVersion: z.string(),
    primaryKey: z.literal("id"),
    recordCount: z.number().int().nonnegative(),
    fields: z.array(PoliticsDatasetField),
    sourceIds: z.array(z.string()),
    links: z.object({}).passthrough(),
    distributions: z.array(z.object({}).passthrough()),
  })
  .passthrough()
  .openapi("UkPoliticsDatasetDescriptor");
const PoliticsDatasetCatalogue = z
  .object({
    schema: z.literal("taxsorted.uk.open-dataset-catalog/1"),
    title: z.string(),
    purpose: z.string(),
    access: z.object({}).passthrough(),
    licence: z.object({}).passthrough(),
    datasets: z.array(PoliticsDatasetDescriptor),
    queryServices: z.array(z.object({}).passthrough()),
    links: z.object({}).passthrough(),
  })
  .passthrough()
  .openapi("UkPoliticsDatasetCatalogue");
const PoliticsDatasetEnvelope = z
  .object({
    schema: z.literal("taxsorted.open-dataset/1"),
    dataset: PoliticsDatasetDescriptor,
    data: z.array(OpenDataRecord),
    links: z.object({}).passthrough(),
  })
  .openapi("UkPoliticsDatasetEnvelope");
const PoliticsDatasetId = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .openapi({ example: "enforcement-institutions" });
const PoliticsDownloadFormat = z.enum(["json", "csv", "ndjson"]);
const OpenApi31Document = z
  .object({
    openapi: z.literal("3.1.0"),
    info: z.object({}).passthrough(),
    paths: z.object({}).passthrough(),
  })
  .passthrough()
  .openapi("OpenApi31Document");

const politicsRepresentationHeaders = {
  ...publicResponseHeaders,
  "Content-Location": {
    description: "Canonical location represented by this response.",
    schema: { type: "string" as const },
  },
  "Last-Modified": {
    description: "Snapshot date used by the static representation.",
    schema: { type: "string" as const },
  },
  "X-Checksum-SHA256": {
    description:
      "Lowercase hexadecimal SHA-256 of the exact selected GET representation bytes.",
    schema: { type: "string" as const },
  },
};
const politicsDatasetHeaders = {
  ...politicsRepresentationHeaders,
  "X-Dataset-Id": {
    description: "Stable dataset or catalogue identifier.",
    schema: { type: "string" as const },
  },
  "X-Dataset-Version": {
    description: "Content-derived version of the current dataset or catalogue.",
    schema: { type: "string" as const },
  },
  "X-Schema-Version": {
    description: "Semantic schema version for this dataset.",
    schema: { type: "string" as const },
  },
  "X-Record-Count": {
    description: "Number of complete records in the representation.",
    schema: { type: "integer" as const, minimum: 0 },
  },
};
const politicsDownloadHeaders = {
  ...politicsDatasetHeaders,
  "Content-Disposition": {
    description: "Safe, version-named attachment filename.",
    schema: { type: "string" as const },
  },
};

function registerAgentInterfaceOpenApi(app: OpenAPIHono) {
  for (const path of ["/agent.txt", "/.well-known/agent.txt"] as const) {
    app.openAPIRegistry.registerPath({
      method: "get",
      path,
      operationId:
        path === "/agent.txt"
          ? "getAgentManifest"
          : "getWellKnownAgentManifest",
      summary: "Read the TaxSorted machine doorway manifest",
      description:
        "Flat, ordered orientation for machine callers: public doors, formats, rights, corrections and hard safety walls. It is XENIA-inspired; no conformance claim is made.",
      request: { headers: AgentRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current machine manifest.",
          headers: publicResponseHeaders,
          content: { "text/plain": { schema: z.string() } },
        },
        304: {
          description:
            "The supplied ETag still identifies these exact manifest bytes.",
          headers: publicResponseHeaders,
        },
        400: {
          description:
            "Machine manifest routes do not accept query parameters.",
          content: { "application/json": { schema: AgentDoorError } },
        },
      },
    });
    app.openAPIRegistry.registerPath({
      method: "head",
      path,
      operationId:
        path === "/agent.txt"
          ? "headAgentManifest"
          : "headWellKnownAgentManifest",
      summary: "Check the TaxSorted machine doorway manifest",
      request: { headers: AgentRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current manifest metadata.",
          headers: publicResponseHeaders,
        },
        304: {
          description: "The manifest is unchanged.",
          headers: publicResponseHeaders,
        },
        400: {
          description:
            "Machine manifest routes do not accept query parameters.",
        },
      },
    });
  }

  for (const route of [
    {
      path: "/v1/wake" as const,
      operationId: "wakeTaxSortedAgent",
      headOperationId: "headTaxSortedAgentWake",
      summary: "Arrive oriented at TaxSorted",
      description:
        "Deterministic, stateless projection of the open-data catalogue: publication states, resource handles, evidence lanes, safety walls and typed next actions. The caller keeps its own cursor and TaxSorted creates no identity session.",
      hasDefault404: false,
    },
    {
      path: "/" as const,
      operationId: "negotiateTaxSortedAgentWake",
      headOperationId: "headNegotiatedTaxSortedAgentWake",
      summary: "Negotiate machine orientation at the API root",
      description:
        "Returns the exact /v1/wake JSON when Accept includes application/json with non-zero quality. Other media types retain the default 404.",
      hasDefault404: true,
    },
  ]) {
    app.openAPIRegistry.registerPath({
      method: "get",
      path: route.path,
      operationId: route.operationId,
      summary: route.summary,
      description: route.description,
      request: { headers: AgentRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current stateless machine orientation.",
          headers: publicResponseHeaders,
          content: { "application/json": { schema: AgentWake } },
        },
        304: {
          description:
            "The supplied ETag still identifies these exact wake bytes.",
          headers: publicResponseHeaders,
        },
        400: {
          description: "Wake routes do not accept query parameters.",
          content: { "application/json": { schema: AgentDoorError } },
        },
        ...(route.hasDefault404
          ? {
              404: {
                description:
                  "The API root remains a closed door unless JSON is requested.",
              },
            }
          : {}),
      },
    });
    app.openAPIRegistry.registerPath({
      method: "head",
      path: route.path,
      operationId: route.headOperationId,
      summary: `Check: ${route.summary}`,
      request: { headers: AgentRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current wake metadata.",
          headers: publicResponseHeaders,
        },
        304: {
          description: "The wake representation is unchanged.",
          headers: publicResponseHeaders,
        },
        400: { description: "Wake routes do not accept query parameters." },
        ...(route.hasDefault404
          ? {
              404: {
                description:
                  "The API root remains a closed door unless JSON is requested.",
              },
            }
          : {}),
      },
    });
  }
}

function registerHealthOpenApi(app: OpenAPIHono) {
  for (const method of ["get", "head"] as const) {
    app.openAPIRegistry.registerPath({
      method,
      path: "/v1/health",
      operationId: `${method}TaxSortedHealth`,
      summary: `${method === "get" ? "Read" : "Check"} service health`,
      security: [],
      responses: {
        200: {
          description: "Service process and HMRC configuration status.",
          ...(method === "get"
            ? { content: { "application/json": { schema: PublicJson } } }
            : {}),
        },
      },
    });
  }
}

function registerOpenDataOpenApi(app: OpenAPIHono) {
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/open-data",
    operationId: "listOpenDataDatasets",
    summary: "Discover TaxSorted public datasets",
    description:
      "Public, sessionless catalog of tax-system, tax-industry, charity-sector, public-funding and politics/public-integrity datasets, licences, review dates, schemas, dictionaries and bulk exports. No API key is read or required.",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Open-data catalog and reuse contract.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: OpenDataCatalog } },
      },
      304: {
        description: "This exact catalog representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/open-data/rights",
    operationId: "getOpenDataRights",
    summary: "Read the curation and source-rights boundary",
    description:
      "Machine-readable warning that TaxSorted's curation licence does not replace source-specific rights or personal-data duties.",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description:
          "Mixed-rights statement and dataset-specific rights routes.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: OpenDataRights } },
      },
      304: {
        description: "This exact rights statement is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  for (const route of [
    ["/v1/open-data", "Check the open-data catalogue"],
    ["/v1/open-data/rights", "Check the mixed-rights statement"],
  ] as const) {
    app.openAPIRegistry.registerPath({
      method: "head",
      path: route[0],
      summary: route[1],
      description:
        "Returns the same validators and links as GET without a response body.",
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current representation metadata.",
          headers: publicResponseHeaders,
        },
        304: {
          description:
            "The supplied ETag still identifies this representation.",
          headers: publicResponseHeaders,
        },
        400: { description: "Static routes do not accept query parameters." },
      },
    });
  }
}

function registerReleaseDiscoveryOpenApi(app: OpenAPIHono) {
  const routes = [
    {
      path: releaseLedgerPath,
      stem: "OpenDataReleaseLedger",
      title: "TaxSorted public dataset release ledger",
      mediaType: "application/json",
      schema: OpenDataReleaseLedger,
    },
    {
      path: releaseJsonFeedPath,
      stem: "OpenDataReleaseJsonFeed",
      title: "TaxSorted public dataset release JSON Feed",
      mediaType: "application/feed+json",
      schema: OpenDataReleaseJsonFeed,
    },
    {
      path: releaseAtomFeedPath,
      stem: "OpenDataReleaseAtomFeed",
      title: "TaxSorted public dataset release Atom feed",
      mediaType: "application/atom+xml",
      schema: z.string(),
    },
  ] as const;

  for (const route of routes) {
    app.openAPIRegistry.registerPath({
      method: "get",
      path: route.path,
      operationId: `get${route.stem}`,
      summary: `Read the ${route.title}`,
      description:
        "Baseline and forward dataset-release checkpoints only. No retrospective record events or exact publication times are invented.",
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: route.title,
          headers: publicResponseHeaders,
          content: { [route.mediaType]: { schema: route.schema } },
        },
        304: {
          description: "This exact release representation is unchanged.",
          headers: publicResponseHeaders,
        },
        400: {
          description: "Release representations do not accept query parameters.",
          content: problemContent,
        },
      },
    });
    app.openAPIRegistry.registerPath({
      method: "head",
      path: route.path,
      operationId: `head${route.stem}`,
      summary: `Check the ${route.title}`,
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current release-representation metadata.",
          headers: publicResponseHeaders,
        },
        304: {
          description: "This exact release representation is unchanged.",
          headers: publicResponseHeaders,
        },
        400: {
          description: "Release representations do not accept query parameters.",
        },
      },
    });
  }
}

function registerStableRecordResolversOpenApi(app: OpenAPIHono) {
  const resolvers = [
    {
      path: "/v1/tax-system/uk/records/{id}",
      stem: "UkTaxSystemStableRecord",
      title: "UK tax-system",
    },
    {
      path: "/v1/tax-industry/uk/records/{id}",
      stem: "UkTaxIndustryStableRecord",
      title: "UK tax-industry",
    },
    {
      path: "/v1/charities/uk/records/{id}",
      stem: "UkCharitiesStableRecord",
      title: "UK charity-sector",
    },
  ] as const;

  for (const resolver of resolvers) {
    app.openAPIRegistry.registerPath({
      method: "get",
      path: resolver.path,
      operationId: `resolve${resolver.stem}`,
      summary: `Resolve one stable ${resolver.title} dataset ID`,
      description:
        "Resolves a dataset-wide ID without requiring the caller to know its collection. Content-Location remains the resolver URL; Link rel=canonical identifies the collection item.",
      request: {
        headers: ConditionalRequestHeaders,
        params: z.object({ id: z.string() }),
      },
      security: [],
      responses: {
        200: {
          description: "Resolved record and canonical collection location.",
          headers: publicResponseHeaders,
          content: { "application/json": { schema: StableResolvedRecord } },
        },
        304: {
          description: "This exact resolved representation is unchanged.",
          headers: publicResponseHeaders,
        },
        400: {
          description: "Resolver routes do not accept query parameters.",
          content: problemContent,
        },
        404: {
          description: "No public record has this stable dataset ID.",
          content: problemContent,
        },
        503: {
          description:
            "Publication is closed. Unknown and protected IDs are intentionally indistinguishable.",
          content: problemContent,
        },
      },
    });
    app.openAPIRegistry.registerPath({
      method: "head",
      path: resolver.path,
      operationId: `head${resolver.stem}`,
      summary: `Check one stable ${resolver.title} dataset ID`,
      request: {
        headers: ConditionalRequestHeaders,
        params: z.object({ id: z.string() }),
      },
      security: [],
      responses: {
        200: {
          description: "Current resolved-record metadata.",
          headers: publicResponseHeaders,
        },
        304: {
          description: "This exact resolved representation is unchanged.",
          headers: publicResponseHeaders,
        },
        400: { description: "Resolver routes do not accept query parameters." },
        404: { description: "No public record has this stable dataset ID." },
        503: {
          description:
            "Publication is closed. Unknown and protected IDs are intentionally indistinguishable.",
        },
      },
    });
  }
}

function registerTaxSystemOpenApi(app: OpenAPIHono) {
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk",
    operationId: "getUkTaxSystemOverview",
    summary: "Map the UK tax system",
    description:
      "Public, sessionless overview of actors, authority, accounts, collection lanes, permissions, evidence and known gaps.",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Dataset overview, route map, counts and review boundary.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: PublicJson } },
      },
      304: {
        description: "This exact overview is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/map",
    operationId: "redirectUkTaxSystemMap",
    summary: "Follow the legacy UK tax-system map route",
    description: "Compatibility redirect to the canonical tax-system overview.",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      308: {
        description: "Permanent redirect to /v1/tax-system/uk.",
        headers: redirectResponseHeaders,
      },
      304: {
        description: "The redirect representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/{collection}",
    operationId: "queryUkTaxSystemCollection",
    summary: "Query a UK tax-system collection",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxSystemCollection }),
      query: TaxSystemQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Filtered records with paging and provenance metadata.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: PublicJson } },
      },
      304: {
        description: "This exact query representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Unknown or invalid filter." },
      503: {
        description:
          "Full graph publication remains closed; sources and gaps stay public.",
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/{collection}/{id}",
    operationId: "getUkTaxSystemRecord",
    summary: "Read one evidence-backed UK tax-system record",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxSystemCollection, id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description:
          "The record and its resolved sources; actor records include joined relations.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: PublicJson } },
      },
      404: { description: "No record with that ID in the collection." },
      304: {
        description: "This exact record representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Detail routes do not accept query parameters." },
      503: { description: "Full graph publication remains closed." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/graph",
    operationId: "downloadUkTaxSystemGraph",
    summary: "Download the complete reviewed UK tax-system graph",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description:
          "The complete static corpus, including source limitations and gaps.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: ukTaxSystemSchema } },
      },
      304: {
        description: "The supplied ETag still identifies this exact graph.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
      503: { description: "Full graph publication remains closed." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/manifest",
    operationId: "getUkTaxSystemManifest",
    summary: "Read the UK tax-system release manifest",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description:
          "Version, review date, deterministic graph-byte SHA-256, counts, licence and distribution links.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: PublicJson } },
      },
      304: {
        description: "This exact manifest is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/schema",
    operationId: "getUkTaxSystemSchema",
    summary: "Read the structural UK tax-system JSON Schema",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description:
          "Structural JSON Schema generated from the Zod record shape; the dictionary lists boot-only graph invariants.",
        headers: publicResponseHeaders,
        content: { "application/schema+json": { schema: PublicJson } },
      },
      304: {
        description: "This exact schema is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/dictionary",
    operationId: "getUkTaxSystemDictionary",
    summary: "Read the plain-language UK tax-system data dictionary",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description:
          "Collection aliases, meanings, filters, references, CSV columns and reuse conventions.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: DataDictionary } },
      },
      304: {
        description: "This exact dictionary is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/exports",
    operationId: "listUkTaxSystemExports",
    summary: "List complete UK tax-system collection exports",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description:
          "Format links, filenames, sizes and exact-byte ETags for every collection.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: DatasetExportIndex } },
      },
      304: {
        description: "This exact export index is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-system/uk/exports/{collection}/{format}",
    operationId: "downloadUkTaxSystemCollection",
    summary: "Download one complete UK tax-system collection",
    description:
      "JSON and NDJSON use lossless TaxSorted deterministic JSON (not RFC 8785/JCS). CSV keeps nested values as deterministic JSON and mitigates common spreadsheet-formula prefixes.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({
        collection: TaxSystemCollection,
        format: ExportFormat,
      }),
    },
    security: [],
    responses: {
      200: {
        description: "Complete, unpaginated collection attachment.",
        headers: taxExportResponseHeaders,
        content: {
          "application/json": { schema: z.array(OpenDataRecord) },
          "application/x-ndjson": { schema: z.string() },
          "text/csv": { schema: z.string() },
        },
      },
      304: {
        description: "This exact export format is unchanged.",
        headers: taxExportResponseHeaders,
      },
      400: {
        description: "Static export routes do not accept query parameters.",
      },
      404: { description: "Unknown collection or format." },
      503: {
        description:
          "This collection is still inside the publication review boundary.",
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-system/uk/map",
    operationId: "headUkTaxSystemMapRedirect",
    summary: "Check the legacy UK tax-system map redirect",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      308: {
        description: "Permanent redirect metadata.",
        headers: redirectResponseHeaders,
      },
      304: {
        description: "The redirect representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });

  for (const [path, operationId, summary, mayBeClosed] of [
    [
      "/v1/tax-system/uk",
      "headUkTaxSystemOverview",
      "Check the UK tax-system overview",
      false,
    ],
    [
      "/v1/tax-system/uk/graph",
      "headUkTaxSystemGraph",
      "Check the complete UK tax-system graph",
      true,
    ],
    [
      "/v1/tax-system/uk/manifest",
      "headUkTaxSystemManifest",
      "Check the UK tax-system manifest",
      false,
    ],
    [
      "/v1/tax-system/uk/schema",
      "headUkTaxSystemSchema",
      "Check the UK tax-system structural schema",
      false,
    ],
    [
      "/v1/tax-system/uk/dictionary",
      "headUkTaxSystemDictionary",
      "Check the UK tax-system dictionary",
      false,
    ],
    [
      "/v1/tax-system/uk/exports",
      "headUkTaxSystemExports",
      "Check the UK tax-system export index",
      false,
    ],
  ] as const) {
    app.openAPIRegistry.registerPath({
      method: "head",
      path,
      operationId,
      summary,
      description:
        "Returns the same validators and links as GET without a response body.",
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: mayBeClosed
        ? {
            200: {
              description: "Current representation metadata.",
              headers: publicResponseHeaders,
            },
            304: {
              description:
                "The supplied ETag still identifies this representation.",
              headers: publicResponseHeaders,
            },
            400: {
              description: "Static routes do not accept query parameters.",
            },
            503: { description: "Full graph publication remains closed." },
          }
        : {
            200: {
              description: "Current representation metadata.",
              headers: publicResponseHeaders,
            },
            304: {
              description:
                "The supplied ETag still identifies this representation.",
              headers: publicResponseHeaders,
            },
            400: {
              description: "Static routes do not accept query parameters.",
            },
          },
    });
  }
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-system/uk/{collection}",
    operationId: "headUkTaxSystemCollectionQuery",
    summary: "Check a UK tax-system collection query",
    description:
      "Returns the GET query's validators and links without its response body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxSystemCollection }),
      query: TaxSystemQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Current query metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description:
          "The supplied ETag still identifies this query representation.",
        headers: publicResponseHeaders,
      },
      400: { description: "Unknown or invalid filter." },
      503: {
        description:
          "Full graph publication remains closed; sources and gaps stay public.",
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-system/uk/{collection}/{id}",
    operationId: "headUkTaxSystemRecord",
    summary: "Check one UK tax-system record",
    description:
      "Returns the record's validators and links without its response body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxSystemCollection, id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description: "Current record metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description:
          "The supplied ETag still identifies this record representation.",
        headers: publicResponseHeaders,
      },
      400: { description: "Detail routes do not accept query parameters." },
      404: { description: "No record with that ID in the collection." },
      503: { description: "Full graph publication remains closed." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-system/uk/exports/{collection}/{format}",
    operationId: "headUkTaxSystemCollectionExport",
    summary: "Check one UK tax-system collection export",
    description:
      "Returns download validators, size-independent links and filename without the export body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({
        collection: TaxSystemCollection,
        format: ExportFormat,
      }),
    },
    security: [],
    responses: {
      200: {
        description: "Current export metadata.",
        headers: taxExportResponseHeaders,
      },
      304: {
        description: "The supplied ETag still identifies this export.",
        headers: taxExportResponseHeaders,
      },
      400: {
        description: "Static export routes do not accept query parameters.",
      },
      404: { description: "Unknown collection or format." },
      503: {
        description:
          "This collection is still inside the publication review boundary.",
      },
    },
  });
}

function registerTaxIndustryOpenApi(app: OpenAPIHono) {
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk",
    operationId: "getUkTaxIndustryOverview",
    summary: "Map entry into the UK tax-services industry",
    description:
      "Public, sessionless overview of roles, qualifications, legal and market gates, pathways, pay evidence, barriers and source limitations.",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Dataset overview, route map, counts and review boundary.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: TaxIndustryPublicJson } },
      },
      304: {
        description: "This exact overview is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/map",
    operationId: "redirectUkTaxIndustryMap",
    summary: "Follow the legacy UK tax-industry map route",
    description:
      "Compatibility redirect to the canonical tax-industry overview.",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      308: {
        description: "Permanent redirect to /v1/tax-industry/uk.",
        headers: redirectResponseHeaders,
      },
      304: {
        description: "The redirect representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/{collection}",
    operationId: "queryUkTaxIndustryCollection",
    summary: "Query a UK tax-industry collection",
    description:
      "Filters are collection-specific; unsupported filters return 400. Pathway gateId and qualificationId filters inspect pathway steps.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxIndustryCollection }),
      query: TaxIndustryQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Filtered records with paging and provenance metadata.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: TaxIndustryPublicJson } },
      },
      400: { description: "Unknown or invalid filter." },
      304: {
        description: "This exact query representation is unchanged.",
        headers: publicResponseHeaders,
      },
      503: {
        description:
          "Full map publication remains closed; sources and gaps stay public.",
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/{collection}/{id}",
    operationId: "getUkTaxIndustryRecord",
    summary: "Read one evidence-backed UK tax-industry record",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxIndustryCollection, id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description:
          "The record, resolved sources and relevant joined records.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: TaxIndustryPublicJson } },
      },
      404: { description: "No record with that ID in the collection." },
      304: {
        description: "This exact record representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Detail routes do not accept query parameters." },
      503: { description: "Full map publication remains closed." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/graph",
    operationId: "downloadUkTaxIndustryGraph",
    summary: "Download the complete reviewed UK tax-industry graph",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description:
          "The complete static corpus, including source limitations and gaps.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: ukTaxIndustrySchema } },
      },
      304: {
        description: "The supplied ETag still identifies this exact graph.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
      503: { description: "Full map publication remains closed." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/manifest",
    operationId: "getUkTaxIndustryManifest",
    summary: "Read the UK tax-industry release manifest",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description:
          "Version, review date, deterministic graph-byte SHA-256, counts, licence and distribution links.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: TaxIndustryPublicJson } },
      },
      304: {
        description: "This exact manifest is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/schema",
    operationId: "getUkTaxIndustrySchema",
    summary: "Read the structural UK tax-industry JSON Schema",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description:
          "Structural JSON Schema generated from the Zod record shape; the dictionary lists boot-only graph and cross-field invariants.",
        headers: publicResponseHeaders,
        content: {
          "application/schema+json": { schema: TaxIndustryPublicJson },
        },
      },
      304: {
        description: "This exact schema is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/dictionary",
    operationId: "getUkTaxIndustryDictionary",
    summary: "Read the plain-language UK tax-industry data dictionary",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description:
          "Collection aliases, meanings, filters, references, CSV columns and reuse conventions.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: DataDictionary } },
      },
      304: {
        description: "This exact dictionary is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/exports",
    operationId: "listUkTaxIndustryExports",
    summary: "List complete UK tax-industry collection exports",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description:
          "Format links, filenames, sizes and exact-byte ETags for every collection.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: DatasetExportIndex } },
      },
      304: {
        description: "This exact export index is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/tax-industry/uk/exports/{collection}/{format}",
    operationId: "downloadUkTaxIndustryCollection",
    summary: "Download one complete UK tax-industry collection",
    description:
      "JSON and NDJSON use lossless TaxSorted deterministic JSON (not RFC 8785/JCS). CSV keeps nested values as deterministic JSON and mitigates common spreadsheet-formula prefixes.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({
        collection: TaxIndustryCollection,
        format: ExportFormat,
      }),
    },
    security: [],
    responses: {
      200: {
        description: "Complete, unpaginated collection attachment.",
        headers: taxExportResponseHeaders,
        content: {
          "application/json": { schema: z.array(OpenDataRecord) },
          "application/x-ndjson": { schema: z.string() },
          "text/csv": { schema: z.string() },
        },
      },
      304: {
        description: "This exact export format is unchanged.",
        headers: taxExportResponseHeaders,
      },
      400: {
        description: "Static export routes do not accept query parameters.",
      },
      404: { description: "Unknown collection or format." },
      503: {
        description:
          "This collection is still inside the publication review boundary.",
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-industry/uk/map",
    operationId: "headUkTaxIndustryMapRedirect",
    summary: "Check the legacy UK tax-industry map redirect",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      308: {
        description: "Permanent redirect metadata.",
        headers: redirectResponseHeaders,
      },
      304: {
        description: "The redirect representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });

  for (const [path, operationId, summary, mayBeClosed] of [
    [
      "/v1/tax-industry/uk",
      "headUkTaxIndustryOverview",
      "Check the UK tax-industry overview",
      false,
    ],
    [
      "/v1/tax-industry/uk/graph",
      "headUkTaxIndustryGraph",
      "Check the complete UK tax-industry graph",
      true,
    ],
    [
      "/v1/tax-industry/uk/manifest",
      "headUkTaxIndustryManifest",
      "Check the UK tax-industry manifest",
      false,
    ],
    [
      "/v1/tax-industry/uk/schema",
      "headUkTaxIndustrySchema",
      "Check the UK tax-industry structural schema",
      false,
    ],
    [
      "/v1/tax-industry/uk/dictionary",
      "headUkTaxIndustryDictionary",
      "Check the UK tax-industry dictionary",
      false,
    ],
    [
      "/v1/tax-industry/uk/exports",
      "headUkTaxIndustryExports",
      "Check the UK tax-industry export index",
      false,
    ],
  ] as const) {
    app.openAPIRegistry.registerPath({
      method: "head",
      path,
      operationId,
      summary,
      description:
        "Returns the same validators and links as GET without a response body.",
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: mayBeClosed
        ? {
            200: {
              description: "Current representation metadata.",
              headers: publicResponseHeaders,
            },
            304: {
              description:
                "The supplied ETag still identifies this representation.",
              headers: publicResponseHeaders,
            },
            400: {
              description: "Static routes do not accept query parameters.",
            },
            503: { description: "Full map publication remains closed." },
          }
        : {
            200: {
              description: "Current representation metadata.",
              headers: publicResponseHeaders,
            },
            304: {
              description:
                "The supplied ETag still identifies this representation.",
              headers: publicResponseHeaders,
            },
            400: {
              description: "Static routes do not accept query parameters.",
            },
          },
    });
  }
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-industry/uk/{collection}",
    operationId: "headUkTaxIndustryCollectionQuery",
    summary: "Check a UK tax-industry collection query",
    description:
      "Returns the GET query's validators and links without its response body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxIndustryCollection }),
      query: TaxIndustryQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Current query metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description:
          "The supplied ETag still identifies this query representation.",
        headers: publicResponseHeaders,
      },
      400: { description: "Unknown or invalid filter." },
      503: {
        description:
          "Full map publication remains closed; sources and gaps stay public.",
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-industry/uk/{collection}/{id}",
    operationId: "headUkTaxIndustryRecord",
    summary: "Check one UK tax-industry record",
    description:
      "Returns the record's validators and links without its response body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: TaxIndustryCollection, id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description: "Current record metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description:
          "The supplied ETag still identifies this record representation.",
        headers: publicResponseHeaders,
      },
      400: { description: "Detail routes do not accept query parameters." },
      404: { description: "No record with that ID in the collection." },
      503: { description: "Full map publication remains closed." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/tax-industry/uk/exports/{collection}/{format}",
    operationId: "headUkTaxIndustryCollectionExport",
    summary: "Check one UK tax-industry collection export",
    description:
      "Returns download validators, size-independent links and filename without the export body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({
        collection: TaxIndustryCollection,
        format: ExportFormat,
      }),
    },
    security: [],
    responses: {
      200: {
        description: "Current export metadata.",
        headers: taxExportResponseHeaders,
      },
      304: {
        description: "The supplied ETag still identifies this export.",
        headers: taxExportResponseHeaders,
      },
      400: {
        description: "Static export routes do not accept query parameters.",
      },
      404: { description: "Unknown collection or format." },
      503: {
        description:
          "This collection is still inside the publication review boundary.",
      },
    },
  });
}

function registerCharitiesOpenApi(app: OpenAPIHono) {
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/charities/uk/map",
    operationId: "redirectUkCharitiesMap",
    summary: "Follow the UK charity-sector map alias",
    description:
      "Compatibility redirect to the canonical charity-sector overview.",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      308: {
        description: "Permanent redirect to /v1/charities/uk.",
        headers: redirectResponseHeaders,
      },
      304: {
        description: "The redirect representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: {
        description: "Static routes do not accept query parameters.",
        content: charityErrorContent,
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/charities/uk/map",
    operationId: "headUkCharitiesMapRedirect",
    summary: "Check the UK charity-sector map redirect",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      308: {
        description: "Permanent redirect metadata.",
        headers: redirectResponseHeaders,
      },
      304: {
        description: "The redirect representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Static routes do not accept query parameters." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/charities/uk/tax-treatments/{id}/why-graph",
    operationId: "getUkCharityTaxTreatmentWhyGraph",
    summary: "Trace one UK charity tax-treatment record",
    description:
      "Returns a raw taxsorted.why-graph/1 derived from one canonical sector tax-treatment record. Field-level evidence links resolve to the reviewed source ledger. Guidance remains guidance. The non-charitable-expenditure treatment includes a selected exact primary-law spine as checked-not-decisive rule nodes; other binding law, case applicability, and case enforcement or challenge routes end in explicit gaps.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description:
          "Deterministic explanation graph for the exact tax-treatment ID; no organisation or case facts are created.",
        headers: charityWhyGraphResponseHeaders,
        content: { "application/json": { schema: WhyGraphSchema } },
      },
      304: {
        description: "This exact graph representation is unchanged.",
        headers: charityWhyGraphResponseHeaders,
      },
      400: {
        description: "Why-graph subresources do not accept query parameters.",
        content: charityErrorContent,
      },
      404: {
        description: "No tax-treatment record has this exact ID.",
        content: charityErrorContent,
      },
      503: {
        description:
          "The charity tax-treatment collection is disabled or emergency-stopped; known and unknown IDs are intentionally indistinguishable.",
        content: charityErrorContent,
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/charities/uk/tax-treatments/{id}/why-graph",
    operationId: "headUkCharityTaxTreatmentWhyGraph",
    summary: "Check one UK charity tax-treatment why graph",
    description:
      "Returns the GET representation's validators and graph-adopter headers without a response body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description: "Current why-graph representation metadata.",
        headers: charityWhyGraphResponseHeaders,
      },
      304: {
        description: "This exact graph representation is unchanged.",
        headers: charityWhyGraphResponseHeaders,
      },
      400: { description: "Why-graph subresources do not accept query parameters." },
      404: { description: "No tax-treatment record has this exact ID." },
      503: {
        description:
          "The collection is disabled or emergency-stopped; known and unknown IDs are intentionally indistinguishable.",
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/charities/uk/tax-rules",
    operationId: "queryUkCharityTaxRules",
    summary: "Query exact UK charity tax-law provisions",
    description:
      "Returns provision-level records with exact primary-law selectors, taxpayer branches, treatment-field mappings, conditions, dates and explicit non-proofs. A rule record is not a case finding.",
    request: {
      headers: ConditionalRequestHeaders,
      query: CharityTaxRuleQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Filtered provision-level tax rules with paging and provenance.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: CharityTaxRuleList } },
      },
      304: {
        description: "This exact query representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: {
        description: "Unknown, repeated, empty or invalid tax-rule filter.",
        content: charityErrorContent,
      },
      503: {
        description: "The tax-rule collection is disabled or emergency-stopped.",
        content: charityErrorContent,
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/charities/uk/tax-rules",
    operationId: "headUkCharityTaxRules",
    summary: "Check a UK charity tax-rule query",
    description:
      "Returns the same validators as GET for this exact filtered query without a response body.",
    request: {
      headers: ConditionalRequestHeaders,
      query: CharityTaxRuleQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Current filtered tax-rule representation metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description: "This exact query representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Unknown, repeated, empty or invalid tax-rule filter." },
      503: { description: "The tax-rule collection is disabled or emergency-stopped." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/charities/uk/tax-rules/{id}",
    operationId: "getUkCharityTaxRule",
    summary: "Read one exact UK charity tax-law provision record",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({
        id: z.string().openapi({ example: "rule-ita-2007-s542" }),
      }),
    },
    security: [],
    responses: {
      200: {
        description:
          "One rule with its treatment, exact authority source and administering institutions resolved.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: CharityTaxRuleDetail } },
      },
      304: {
        description: "This exact record representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: {
        description: "Detail routes do not accept query parameters.",
        content: charityErrorContent,
      },
      404: {
        description: "No tax-rule record has that exact ID.",
        content: charityErrorContent,
      },
      503: {
        description: "The tax-rule collection is disabled or emergency-stopped.",
        content: charityErrorContent,
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/charities/uk/tax-rules/{id}",
    operationId: "headUkCharityTaxRule",
    summary: "Check one exact UK charity tax-law provision record",
    description:
      "Returns the same validators as GET for this exact record without a response body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({
        id: z.string().openapi({ example: "rule-ita-2007-s542" }),
      }),
    },
    security: [],
    responses: {
      200: {
        description: "Current tax-rule record metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description: "This exact record representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Detail routes do not accept query parameters." },
      404: { description: "No tax-rule record has that exact ID." },
      503: { description: "The tax-rule collection is disabled or emergency-stopped." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/charities/uk/official-procedures",
    operationId: "queryUkCharityOfficialProcedures",
    summary: "Query admitted UK charity tax procedures",
    description:
      "Returns the 35 admitted conditional procedure doors across attribution, return, enquiry, assessment, payment, challenge and the narrow territorial recovery slice. Each record requires case selectors; absence never proves that another procedure or remedy does not exist.",
    request: {
      headers: ConditionalRequestHeaders,
      query: CharityOfficialProcedureQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Filtered official procedures with paging and provenance.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: CharityOfficialProcedureList } },
      },
      304: {
        description: "This exact query representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: {
        description: "Unknown, repeated, empty or invalid procedure filter.",
        content: charityErrorContent,
      },
      503: {
        description: "The official-procedure collection is disabled or emergency-stopped.",
        content: charityErrorContent,
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/charities/uk/official-procedures",
    operationId: "headUkCharityOfficialProcedures",
    summary: "Check a UK charity tax-procedure query",
    description:
      "Returns the same validators as GET for this exact filtered query without a response body.",
    request: {
      headers: ConditionalRequestHeaders,
      query: CharityOfficialProcedureQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Current filtered official-procedure representation metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description: "This exact query representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Unknown, repeated, empty or invalid procedure filter." },
      503: {
        description: "The official-procedure collection is disabled or emergency-stopped.",
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/charities/uk/official-procedures/{id}",
    operationId: "getUkCharityOfficialProcedure",
    summary: "Read one admitted UK charity tax procedure",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({
        id: z.string().openapi({
          example: "procedure-ita-2007-s542-attribution-specification",
        }),
      }),
    },
    security: [],
    responses: {
      200: {
        description:
          "One conditional procedure with linked rule, legal basis, institution roles and next procedures resolved.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: CharityOfficialProcedureDetail } },
      },
      304: {
        description: "This exact record representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: {
        description: "Detail routes do not accept query parameters.",
        content: charityErrorContent,
      },
      404: {
        description: "No official-procedure record has that exact ID.",
        content: charityErrorContent,
      },
      503: {
        description: "The official-procedure collection is disabled or emergency-stopped.",
        content: charityErrorContent,
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/charities/uk/official-procedures/{id}",
    operationId: "headUkCharityOfficialProcedure",
    summary: "Check one admitted UK charity tax procedure",
    description:
      "Returns the same validators as GET for this exact record without a response body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({
        id: z.string().openapi({
          example: "procedure-ita-2007-s542-attribution-specification",
        }),
      }),
    },
    security: [],
    responses: {
      200: {
        description: "Current official-procedure record metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description: "This exact record representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Detail routes do not accept query parameters." },
      404: { description: "No official-procedure record has that exact ID." },
      503: {
        description: "The official-procedure collection is disabled or emergency-stopped.",
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/charities/uk/{collection}",
    operationId: "queryUkCharitiesCollection",
    summary: "Query the bounded UK charity-sector map",
    description:
      "Queries regulators, official register doors, legal forms, conditional tax treatments, provision-level tax rules, obligations, funding mechanisms, finance disclosures, control models, generic help routes, narrowly admitted official procedures, pipeline stages and gaps. Filters are collection-specific; the dictionary is authoritative and unsupported collection/filter pairs return 400. There are no charity-by-charity or people records and no religion or name filter.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: CharitiesCollection }),
      query: CharitiesQuery,
    },
    security: [],
    responses: {
      200: {
        description:
          "Filtered sector records with paging and provenance metadata.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: CharitiesPublicJson } },
      },
      304: {
        description: "This exact query representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: {
        description: "Unknown, repeated, irrelevant or invalid filter, with recovery actions.",
        content: charityErrorContent,
      },
      503: {
        description:
          "The full sector release is disabled or emergency-stopped; sources, register doors and gaps remain readable.",
        content: charityErrorContent,
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/charities/uk/{collection}/{id}",
    operationId: "getUkCharitiesRecord",
    summary: "Read one evidence-backed UK charity-sector record",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: CharitiesCollection, id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description: "One sector record with its resolved official sources.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: CharitiesPublicJson } },
      },
      304: {
        description: "This exact record representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: {
        description: "Detail routes do not accept query parameters.",
        content: charityErrorContent,
      },
      404: {
        description: "No record with that ID in the collection.",
        content: charityErrorContent,
      },
      503: {
        description: "The collection is disabled or emergency-stopped.",
        content: charityErrorContent,
      },
    },
  });

  const staticRoutes = [
    {
      path: "/v1/charities/uk",
      operationId: "getUkCharitiesOverview",
      summary: "Understand the bounded UK charity-sector API",
      description:
        "Public, sessionless route map for conditional relief, regulation, money, control, obligations and safe help discovery. This release contains no charity mirror, named people, personal contacts or inferred beliefs.",
      schema: CharitiesPublicJson,
      mediaType: "application/json",
      mayBeClosed: false,
    },
    {
      path: "/v1/charities/uk/accountability",
      operationId: "getUkCharityAccountabilityFramework",
      summary: "Read the UK charity words-and-actions admission contract",
      description:
        "Schema-only, organisation-level evidence model for exact identifiers, source voices, claims, recorded actions, funding, finance, outcomes, evaluations and human-reviewed comparisons. It publishes no organisation rows, people records or rankings. The two named blockers are immediate and non-exhaustive; all nine admission conditions remain unsatisfied.",
      schema: CharityAccountabilityFrameworkJson,
      mediaType: "application/json",
      mayBeClosed: false,
    },
    {
      path: "/v1/charities/uk/accountability/schema",
      operationId: "getUkCharityAccountabilitySchema",
      summary: "Read the future UK charity accountability dataset schema",
      description:
        "Strict JSON Schema for candidate organisation-level accountability releases. A schema is not publication approval; confidential correction intake and asset-level rights admission are two immediate blockers, not the complete test, and all nine framework admission conditions remain unsatisfied.",
      schema: CharityAccountabilitySchemaJson,
      mediaType: "application/schema+json",
      mayBeClosed: false,
    },
    {
      path: "/v1/charities/uk/graph",
      operationId: "downloadUkCharitiesGraph",
      summary: "Download the complete reviewed UK charity-sector graph",
      description:
        "Complete sector corpus with reviewed public regulator and institution records, source limitations and known transparency gaps, but no charity-by-charity subject rows.",
      schema: ukCharitiesSchema,
      mediaType: "application/json",
      mayBeClosed: true,
    },
    {
      path: "/v1/charities/uk/manifest",
      operationId: "getUkCharitiesManifest",
      summary: "Read the UK charity-sector release manifest",
      description:
        "Version, review date, exact graph hash, counts, licence and distribution links.",
      schema: CharitiesPublicJson,
      mediaType: "application/json",
      mayBeClosed: false,
    },
    {
      path: "/v1/charities/uk/schema",
      operationId: "getUkCharitiesSchema",
      summary: "Read the structural UK charity-sector JSON Schema",
      description:
        "Strict record shapes; the dictionary lists boot-only reference and safety invariants.",
      schema: CharitiesPublicJson,
      mediaType: "application/schema+json",
      mayBeClosed: false,
    },
    {
      path: "/v1/charities/uk/dictionary",
      operationId: "getUkCharitiesDictionary",
      summary: "Read the plain-language UK charity-sector data dictionary",
      description:
        "Collection aliases, field meanings, filters, references, formats and missing-value rules.",
      schema: DataDictionary,
      mediaType: "application/json",
      mayBeClosed: false,
    },
    {
      path: "/v1/charities/uk/exports",
      operationId: "listUkCharitiesExports",
      summary: "List complete UK charity-sector collection exports",
      description:
        "Format links, filenames, byte sizes and exact-representation ETags.",
      schema: DatasetExportIndex,
      mediaType: "application/json",
      mayBeClosed: false,
    },
  ] as const;

  for (const route of staticRoutes) {
    app.openAPIRegistry.registerPath({
      method: "get",
      path: route.path,
      operationId: route.operationId,
      summary: route.summary,
      description: route.description,
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current reviewed static representation.",
          headers: publicResponseHeaders,
          content: { [route.mediaType]: { schema: route.schema } },
        },
        304: {
          description:
            "The supplied ETag still identifies this representation.",
          headers: publicResponseHeaders,
        },
        400: {
          description: "Static routes do not accept query parameters.",
          content: charityErrorContent,
        },
        ...(route.mayBeClosed
          ? {
              503: {
                description:
                  "The full sector release is disabled or emergency-stopped.",
                content: charityErrorContent,
              },
            }
          : {}),
      },
    });

    app.openAPIRegistry.registerPath({
      method: "head",
      path: route.path,
      operationId: route.operationId.replace(/^get|^download|^list/, "head"),
      summary: `Check: ${route.summary}`,
      description:
        "Returns the same validators and links as GET without a response body.",
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current representation metadata.",
          headers: publicResponseHeaders,
        },
        304: {
          description:
            "The supplied ETag still identifies this representation.",
          headers: publicResponseHeaders,
        },
        400: { description: "Static routes do not accept query parameters." },
        ...(route.mayBeClosed
          ? {
              503: {
                description:
                  "The full sector release is disabled or emergency-stopped.",
              },
            }
          : {}),
      },
    });
  }

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/charities/uk/exports/{collection}/{format}",
    operationId: "downloadUkCharitiesCollection",
    summary: "Download one complete UK charity-sector collection",
    description:
      "JSON and NDJSON are lossless deterministic TaxSorted encodings. CSV is a spreadsheet convenience copy and keeps nested values as deterministic JSON.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({
        collection: CharitiesCollection,
        format: ExportFormat,
      }),
    },
    security: [],
    responses: {
      200: {
        description: "Complete, unpaginated collection attachment.",
        headers: taxExportResponseHeaders,
        content: {
          "application/json": { schema: z.array(OpenDataRecord) },
          "application/x-ndjson": { schema: z.string() },
          "text/csv": { schema: z.string() },
        },
      },
      304: {
        description: "This exact export is unchanged.",
        headers: taxExportResponseHeaders,
      },
      400: {
        description: "Static export routes do not accept query parameters.",
        content: charityErrorContent,
      },
      404: {
        description: "Unknown collection or format.",
        content: charityErrorContent,
      },
      503: {
        description: "This collection is disabled or emergency-stopped.",
        content: charityErrorContent,
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/charities/uk/{collection}",
    operationId: "headUkCharitiesCollectionQuery",
    summary: "Check a UK charity-sector collection query",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: CharitiesCollection }),
      query: CharitiesQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Current query metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description: "This exact query is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Unknown, repeated, irrelevant or invalid filter." },
      503: { description: "The collection is disabled or emergency-stopped." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/charities/uk/{collection}/{id}",
    operationId: "headUkCharitiesRecord",
    summary: "Check one UK charity-sector record",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: CharitiesCollection, id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description: "Current record metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description: "This exact record is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Detail routes do not accept query parameters." },
      404: { description: "No record with that ID in the collection." },
      503: { description: "The collection is disabled or emergency-stopped." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/charities/uk/exports/{collection}/{format}",
    operationId: "headUkCharitiesCollectionExport",
    summary: "Check one UK charity-sector collection export",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({
        collection: CharitiesCollection,
        format: ExportFormat,
      }),
    },
    security: [],
    responses: {
      200: {
        description: "Current export metadata.",
        headers: taxExportResponseHeaders,
      },
      304: {
        description: "This exact export is unchanged.",
        headers: taxExportResponseHeaders,
      },
      400: {
        description: "Static export routes do not accept query parameters.",
      },
      404: { description: "Unknown collection or format." },
      503: { description: "This collection is disabled or emergency-stopped." },
    },
  });
}

function registerObserverAccountabilityOpenApi(app: OpenAPIHono) {
  const routes = [
    {
      path: "/v1/accountability/uk",
      operationId: "getUkObserverAccountabilityFramework",
      summary: "Read the UK watching-the-watchers protocol",
      description:
        "Sessionless, institution-only framework for reciprocal investigation accountability. It defines identity, network, words, actions, outcome states, challenge routes, a bounded inquiry loop and official source doors. It publishes no investigation or people records.",
      schema: ObserverAccountabilityFrameworkJson,
      mediaType: "application/json",
    },
    {
      path: "/v1/accountability/uk/schema",
      operationId: "getUkObserverAccountabilityCandidateSchema",
      summary: "Read the UK observer-accountability candidate schema",
      description:
        "Structural JSON Schema for institution-level relations, investigation engagements, procedural actions, institutional responses and coverage gaps. The document declares the additional runtime invariants and external checks it cannot express. Neither validation layer admits records for publication.",
      schema: ObserverAccountabilitySchemaJson,
      mediaType: "application/schema+json",
    },
  ] as const;

  for (const route of routes) {
    app.openAPIRegistry.registerPath({
      method: "get",
      path: route.path,
      operationId: route.operationId,
      summary: route.summary,
      description: route.description,
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current reviewed static representation.",
          headers: publicResponseHeaders,
          content: { [route.mediaType]: { schema: route.schema } },
        },
        304: {
          description: "The supplied ETag still identifies this representation.",
          headers: publicResponseHeaders,
        },
        400: {
          description: "Static resources do not accept query parameters.",
          content: problemContent,
        },
        405: {
          description: "The doorway is read-only.",
          content: problemContent,
        },
      },
    });
    app.openAPIRegistry.registerPath({
      method: "head",
      path: route.path,
      operationId: `head${route.operationId.slice(3)}`,
      summary: `Check ${route.summary.slice(5).toLowerCase()}`,
      description: "Returns the GET representation's validators and links without its body.",
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current representation metadata.",
          headers: publicResponseHeaders,
        },
        304: {
          description: "The supplied ETag still identifies this representation.",
          headers: publicResponseHeaders,
        },
        400: { description: "Static resources do not accept query parameters." },
      },
    });
  }
}

function registerCaseCommonsOpenApi(app: OpenAPIHono) {
  const caseCommonsResponseHeaders = {
    ...publicResponseHeaders,
    "X-Checksum-SHA256": {
      description:
        "Lowercase hexadecimal SHA-256 of the exact selected GET representation bytes.",
      schema: { type: "string" as const },
    },
  };
  const CaseCommonsMethodJson = z
    .object({
      schema: z.literal("taxsorted.uk.case-commons/1"),
      meta: z.object({}).passthrough(),
      publication: z.object({}).passthrough(),
      protocol: z.object({}).passthrough(),
      routes: z.record(z.string(), z.string()),
    })
    .openapi("UkCaseCommonsMethod");
  const CaseCommonsListJson = z
    .object({
      schema: z.literal("taxsorted.uk.case-commons/1"),
      version: z.string(),
      warning: z.string(),
      availability: z.enum(["open", "case-level-stops-active"]),
      stoppedCaseCount: z.number().int().nonnegative(),
      cases: z.array(z.object({}).passthrough()),
    })
    .openapi("UkCaseCommonsList");
  const CaseCommonsSourcesJson = z
    .object({
      schema: z.literal("taxsorted.uk.case-commons/1"),
      version: z.string(),
      scope: z.enum([
        "complete-reviewed-ledger",
        "method-only-during-emergency-stop",
        "method-only-during-publication-review",
        "method-only-during-case-level-stop",
        "visible-case-and-method-ledger",
      ]),
      availability: z.enum([
        "open",
        "publication-review",
        "emergency-stopped",
        "case-level-stops-active",
      ]),
      stoppedCaseCount: z.number().int().nonnegative(),
      sources: z.array(z.object({}).passthrough()),
      sourceUseBoundary: z.string(),
    })
    .openapi("UkCaseCommonsSources");
  const JsonSchemaDocument = z
    .object({
      $id: z.string().url(),
      title: z.string(),
      description: z.string(),
    })
    .passthrough()
    .openapi("UkCaseCommonsJsonSchema");

  const routes = [
    {
      path: "/v1/case-commons/uk",
      operationId: "getUkCaseCommons",
      summary: "Read the UK public-power case commons",
      description:
        "One reviewed decided case, the claim-to-remedy method, exact money meanings and public/private custody boundary. No intake, scoring, matching, outreach or representation.",
      schema: caseCommonsResponseSchema,
      mediaType: "application/json",
      protected: true,
    },
    {
      path: "/v1/case-commons/uk/method",
      operationId: "getUkCaseCommonsMethod",
      summary: "Read the case-admission and assessment method",
      description:
        "Read the lawful-route map, financial language, costs, publication safety, local-first custody and closed marketplace boundary without opening a case packet.",
      schema: CaseCommonsMethodJson,
      mediaType: "application/json",
      protected: false,
    },
    {
      path: "/v1/case-commons/uk/cases",
      operationId: "listUkCaseCommonsCases",
      summary: "List admitted decided cases",
      description:
        "Compact list with procedural status, financial status and explicit absence of a platform probability.",
      schema: CaseCommonsListJson,
      mediaType: "application/json",
      protected: true,
    },
    {
      path: "/v1/case-commons/uk/sources",
      operationId: "listUkCaseCommonsSources",
      summary: "Read the official case-commons source ledger",
      description:
        "Every source states the narrow claims it supports and its limitations.",
      schema: CaseCommonsSourcesJson,
      mediaType: "application/json",
      protected: false,
    },
    {
      path: "/v1/case-commons/uk/assessment-template",
      operationId: "getUkCaseAssessmentTemplate",
      summary: "Download the blank local case-assessment template",
      description:
        "Contains no client facts and has no submission endpoint. A professional fills and stores it only in a local or approved confidential matter system.",
      schema: caseAssessmentTemplateSchema,
      mediaType: "application/json",
      protected: false,
    },
    {
      path: "/v1/case-commons/uk/rights",
      operationId: "getUkCaseCommonsRights",
      summary: "Read the case-commons reuse boundary",
      description:
        "Separates the TaxSorted curation licence from linked judgments, legislation, guidance and register material.",
      schema: caseCommonsRightsSchema,
      mediaType: "application/json",
      protected: false,
    },
    {
      path: "/v1/case-commons/uk/schema",
      operationId: "getUkCaseCommonsSchema",
      summary: "Read the case-commons JSON Schema",
      description:
        "Structural contract plus runtime invariants excluding private contacts, rankings, probabilities and expected-value fields.",
      schema: JsonSchemaDocument,
      mediaType: "application/schema+json",
      protected: false,
    },
    {
      path: "/v1/case-commons/uk/packet-schema",
      operationId: "getUkCaseCommonsPacketSchema",
      summary: "Read the complete case-packet JSON Schema",
      description:
        "Exact structural contract for one resolved public case packet, including the digest scope and proof limits.",
      schema: JsonSchemaDocument,
      mediaType: "application/schema+json",
      protected: false,
    },
    {
      path: "/v1/case-commons/uk/assessment-schema",
      operationId: "getUkCaseAssessmentSchema",
      summary: "Read the local assessment JSON Schema",
      description:
        "Portable fillable contract with machine-enforced template, register, check-set and completion rules; TaxSorted has no assessment upload or pickup route.",
      schema: JsonSchemaDocument,
      mediaType: "application/schema+json",
      protected: false,
    },
  ] as const;

  for (const route of routes) {
    app.openAPIRegistry.registerPath({
      method: "get",
      path: route.path,
      operationId: route.operationId,
      summary: route.summary,
      description: route.description,
      tags: ["UK public-power case commons"],
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current reviewed static representation.",
          headers: caseCommonsResponseHeaders,
          content: { [route.mediaType]: { schema: route.schema } },
        },
        304: {
          description: "The supplied ETag still identifies this representation.",
          headers: caseCommonsResponseHeaders,
        },
        400: {
          description: "Static resources do not accept query parameters.",
          content: problemContent,
        },
        ...(route.protected
          ? {
              503: {
                description:
                  "Production publication is awaiting approval or the independent case stop is active.",
                content: problemContent,
              },
            }
          : {}),
      },
    });
    app.openAPIRegistry.registerPath({
      method: "head",
      path: route.path,
      operationId: `head${route.operationId.slice(3)}`,
      summary: `Check ${route.summary.slice(5).toLowerCase()}`,
      tags: ["UK public-power case commons"],
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current representation metadata.",
          headers: caseCommonsResponseHeaders,
        },
        304: {
          description: "The supplied ETag still identifies this representation.",
          headers: caseCommonsResponseHeaders,
        },
        400: {
          description: "Static resources do not accept query parameters.",
        },
        ...(route.protected
          ? {
              503: {
                description:
                  "Production publication is awaiting approval or the independent case stop is active.",
              },
            }
          : {}),
      },
    });
  }

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/case-commons/uk/cases/{caseId}",
    operationId: "getUkCaseCommonsCase",
    summary: "Read one complete digest-bearing case packet",
    description:
      "Resolves every source used by the case and method. Its embedded SHA-256 identifies canonical substantive fields; the response checksum identifies exact selected GET representation bytes. Neither proves truth, qualification or legal viability.",
    tags: ["UK public-power case commons"],
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ caseId: z.string().min(1).max(200) }),
    },
    security: [],
    responses: {
      200: {
        description: "Complete source-resolving case packet.",
        headers: caseCommonsResponseHeaders,
        content: { "application/json": { schema: caseCommonsPacketSchema } },
      },
      304: {
        description: "The supplied ETag still identifies this case packet.",
        headers: caseCommonsResponseHeaders,
      },
      400: {
        description: "Case packets do not accept query parameters.",
        content: problemContent,
      },
      404: {
        description: "No admitted decided case has that ID or slug.",
        content: problemContent,
      },
      503: {
        description:
          "Production publication is awaiting approval or the independent case stop is active.",
        content: problemContent,
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/case-commons/uk/cases/{caseId}",
    operationId: "headUkCaseCommonsCase",
    summary: "Check one case packet",
    tags: ["UK public-power case commons"],
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ caseId: z.string().min(1).max(200) }),
    },
    security: [],
    responses: {
      200: {
        description: "Current case-packet metadata.",
        headers: caseCommonsResponseHeaders,
      },
      304: {
        description: "The supplied ETag still identifies this case packet.",
        headers: caseCommonsResponseHeaders,
      },
      404: { description: "No admitted case has that ID or slug." },
      503: { description: "Case publication is closed." },
    },
  });
}

function registerWhyGraphOpenApi(app: OpenAPIHono) {
  const routes = [
    {
      path: "/v1/why-graph",
      operationId: "getWhyGraphFramework",
      summary: "Read the shared why-graph framework",
      description:
        "Sessionless framework for traversing a conclusion toward reached reasoning, exact fact selectors, rules, claims, sources, institutions, consequences, challenge routes and explicit gaps. It creates no graph records and changes no external state.",
      schema: WhyGraphFrameworkSchema,
      mediaType: "application/json",
    },
    {
      path: "/v1/why-graph/adopters",
      operationId: "getWhyGraphAdopters",
      summary: "List live why-graph adopters",
      description:
        "Additive index of graph-producing endpoints, representations, access boundaries, native subject versions and adopter-owned semantic admission. The strict v1 framework document remains unchanged.",
      schema: WhyGraphAdoptersSchema,
      mediaType: "application/json",
    },
    {
      path: "/v1/why-graph/schema",
      operationId: "getWhyGraphSchema",
      summary: "Read the structural why-graph JSON Schema",
      description:
        "Strict structural JSON Schema for taxsorted.why-graph/1. Runtime graph, domain and source-admission invariants remain separate checks; schema validity is not proof of authority or correctness.",
      schema: WhyGraphJsonSchemaDocumentSchema,
      mediaType: "application/schema+json",
    },
  ] as const;

  for (const route of routes) {
    app.openAPIRegistry.registerPath({
      method: "get",
      path: route.path,
      operationId: route.operationId,
      summary: route.summary,
      description: route.description,
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current static representation.",
          headers: publicResponseHeaders,
          content: { [route.mediaType]: { schema: route.schema } },
        },
        304: {
          description: "The supplied ETag still identifies this representation.",
          headers: publicResponseHeaders,
        },
        400: {
          description: "Static resources do not accept query parameters.",
          content: problemContent,
        },
        405: {
          description: "The framework is read-only and has no ingestion route.",
          content: problemContent,
        },
      },
    });
    app.openAPIRegistry.registerPath({
      method: "head",
      path: route.path,
      operationId: `head${route.operationId.slice(3)}`,
      summary: `Check ${route.summary.slice(5).toLowerCase()}`,
      description: "Returns the GET representation's validators and links without its body.",
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current representation metadata.",
          headers: publicResponseHeaders,
        },
        304: {
          description: "The supplied ETag still identifies this representation.",
          headers: publicResponseHeaders,
        },
        400: { description: "Static resources do not accept query parameters." },
      },
    });
  }
}

function registerPublicFundingOpenApi(app: OpenAPIHono) {
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/public-funding/uk/{collection}",
    operationId: "queryUkPublicFundingCollection",
    summary: "Query a UK public-funding collection",
    description:
      "Queries the reviewed public-funding map. Filters are collection-specific; unsupported, repeated or invalid filters return 400. Sources and gaps remain readable while the full release is closed.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: PublicFundingCollection }),
      query: PublicFundingQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Filtered records with paging and provenance metadata.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: PublicFundingList } },
      },
      304: {
        description: "This exact query representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Unknown, repeated, irrelevant or invalid filter." },
      503: {
        description:
          "The full release is pending review or emergency-stopped; sources and gaps remain readable.",
        content: { "application/json": { schema: PublicFundingUnavailable } },
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/public-funding/uk/{collection}/{id}",
    operationId: "getUkPublicFundingRecord",
    summary: "Read one evidence-backed UK public-funding record",
    description:
      "Returns the record. Non-source records also include resolved source evidence and any relevant joined graph records.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: PublicFundingCollection, id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description:
          "One public-funding record with provenance and relevant joins.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: PublicFundingDetail } },
      },
      304: {
        description: "This exact record representation is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Detail routes do not accept query parameters." },
      404: { description: "No record with that ID in the collection." },
      503: {
        description: "The collection is pending review or emergency-stopped.",
        content: { "application/json": { schema: PublicFundingUnavailable } },
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/public-funding/uk/changes",
    operationId: "listUkPublicFundingChanges",
    summary: "Resume an append-only UK public-funding release feed",
    description:
      "Caller-held cursor feed for dataset publication history. The first event honestly establishes the current snapshot; it does not fabricate retrospective per-record changes or government-domain events.",
    request: {
      headers: ConditionalRequestHeaders,
      query: PublicFundingChangeQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Release checkpoints after the supplied opaque cursor.",
        headers: publicResponseHeaders,
        content: { "application/json": { schema: PublicFundingChangeFeed } },
      },
      304: {
        description: "This exact cursor page is unchanged.",
        headers: publicResponseHeaders,
      },
      400: {
        description: "Unknown, repeated or invalid cursor/page parameter.",
        content: { "application/json": { schema: PublicFundingActionError } },
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/public-funding/uk/changes",
    operationId: "headUkPublicFundingChanges",
    summary: "Check a UK public-funding release-feed page",
    request: {
      headers: ConditionalRequestHeaders,
      query: PublicFundingChangeQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Current release-feed page metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description: "This exact cursor page is unchanged.",
        headers: publicResponseHeaders,
      },
      400: {
        description: "Unknown, repeated or invalid cursor/page parameter.",
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/public-funding/uk/records/{id}",
    operationId: "resolveUkPublicFundingRecord",
    summary: "Resolve a stable UK public-funding ID",
    description:
      "Returns the record, its collection and canonical collection URL so callers do not need to guess a record's type. Publication controls follow the resolved collection.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description: "Resolved collection and canonical record.",
        headers: publicResponseHeaders,
        content: {
          "application/json": { schema: PublicFundingResolvedRecord },
        },
      },
      304: {
        description: "This exact resolved record is unchanged.",
        headers: publicResponseHeaders,
      },
      400: {
        description: "The resolver does not accept query parameters.",
        content: { "application/json": { schema: PublicFundingActionError } },
      },
      404: {
        description: "No record has this stable dataset ID.",
        content: { "application/json": { schema: PublicFundingActionError } },
      },
      503: {
        description:
          "The resolved collection is pending review or emergency-stopped.",
        content: { "application/json": { schema: PublicFundingUnavailable } },
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/public-funding/uk/records/{id}",
    operationId: "headResolvedUkPublicFundingRecord",
    summary: "Check one resolved UK public-funding ID",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description: "Current resolved-record metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description: "This exact resolved record is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "The resolver does not accept query parameters." },
      404: { description: "No record has this stable dataset ID." },
      503: {
        description:
          "The resolved collection is pending review or emergency-stopped.",
      },
    },
  });

  const staticRoutes = [
    {
      path: "/v1/public-funding/uk",
      operationId: "getUkPublicFundingOverview",
      summary: "Understand how UK public funding moves",
      description:
        "Public, sessionless coverage-first map of tax pooling, Parliamentary authority, departmental controls, devolved funding, allocation, commissioning, payment, delivery, accounts and audit. It contains aggregate public records, formal offices and functional contacts, never personal beneficiary records.",
      schema: PublicFundingPublicJson,
      mediaType: "application/json",
      mayBeClosed: false,
    },
    {
      path: "/v1/public-funding/uk/graph",
      operationId: "downloadUkPublicFundingGraph",
      summary: "Download the complete reviewed UK public-funding graph",
      description:
        "Complete provenance-first corpus, including funding dimensions, negative inference boundaries, source limitations and known transparency gaps.",
      schema: ukPublicFundingSchema,
      mediaType: "application/json",
      mayBeClosed: true,
    },
    {
      path: "/v1/public-funding/uk/manifest",
      operationId: "getUkPublicFundingManifest",
      summary: "Read the UK public-funding release manifest",
      description:
        "Version, review date, exact graph hash, collection counts, publication state, licence and distribution links.",
      schema: PublicFundingPublicJson,
      mediaType: "application/json",
      mayBeClosed: false,
    },
    {
      path: "/v1/public-funding/uk/schema",
      operationId: "getUkPublicFundingSchema",
      summary: "Read the structural UK public-funding JSON Schema",
      description:
        "Strict record shapes; the dictionary adds graph, evidence, money-comparison and safety invariants checked at boot.",
      schema: PublicFundingPublicJson,
      mediaType: "application/schema+json",
      mayBeClosed: false,
    },
    {
      path: "/v1/public-funding/uk/dictionary",
      operationId: "getUkPublicFundingDictionary",
      summary: "Read the plain-language UK public-funding data dictionary",
      description:
        "Collection aliases, field meanings, filters, references, money conventions, formats and missing-value rules.",
      schema: DataDictionary,
      mediaType: "application/json",
      mayBeClosed: false,
    },
    {
      path: "/v1/public-funding/uk/exports",
      operationId: "listUkPublicFundingExports",
      summary: "List complete UK public-funding collection exports",
      description:
        "Format links, filenames, byte sizes, availability and exact-representation ETags.",
      schema: DatasetExportIndex,
      mediaType: "application/json",
      mayBeClosed: false,
    },
  ] as const;

  for (const route of staticRoutes) {
    app.openAPIRegistry.registerPath({
      method: "get",
      path: route.path,
      operationId: route.operationId,
      summary: route.summary,
      description: route.description,
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current reviewed static representation.",
          headers: publicResponseHeaders,
          content: { [route.mediaType]: { schema: route.schema } },
        },
        304: {
          description:
            "The supplied ETag still identifies this representation.",
          headers: publicResponseHeaders,
        },
        400: { description: "Static routes do not accept query parameters." },
        ...(route.mayBeClosed
          ? {
              503: {
                description:
                  "The graph is pending review or emergency-stopped.",
                content: {
                  "application/json": { schema: PublicFundingUnavailable },
                },
              },
            }
          : {}),
      },
    });

    app.openAPIRegistry.registerPath({
      method: "head",
      path: route.path,
      operationId: route.operationId.replace(/^get|^download|^list/, "head"),
      summary: `Check: ${route.summary}`,
      description:
        "Returns the same validators and links as GET without a response body.",
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current representation metadata.",
          headers: publicResponseHeaders,
        },
        304: {
          description:
            "The supplied ETag still identifies this representation.",
          headers: publicResponseHeaders,
        },
        400: { description: "Static routes do not accept query parameters." },
        ...(route.mayBeClosed
          ? {
              503: {
                description:
                  "The graph is pending review or emergency-stopped.",
              },
            }
          : {}),
      },
    });
  }

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/public-funding/uk/exports/{collection}/{format}",
    operationId: "downloadUkPublicFundingCollection",
    summary: "Download one complete UK public-funding collection",
    description:
      "JSON and NDJSON are lossless deterministic TaxSorted encodings. CSV is a spreadsheet convenience copy and keeps nested values as deterministic JSON.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({
        collection: PublicFundingCollection,
        format: ExportFormat,
      }),
    },
    security: [],
    responses: {
      200: {
        description: "Complete, unpaginated collection attachment.",
        headers: taxExportResponseHeaders,
        content: {
          "application/json": { schema: z.array(OpenDataRecord) },
          "application/x-ndjson": { schema: z.string() },
          "text/csv": { schema: z.string() },
        },
      },
      304: {
        description: "This exact export is unchanged.",
        headers: taxExportResponseHeaders,
      },
      400: {
        description: "Static export routes do not accept query parameters.",
      },
      404: { description: "Unknown collection or format." },
      503: {
        description: "This collection is pending review or emergency-stopped.",
        content: { "application/json": { schema: PublicFundingUnavailable } },
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/public-funding/uk/{collection}",
    operationId: "headUkPublicFundingCollectionQuery",
    summary: "Check a UK public-funding collection query",
    description:
      "Returns the GET query's validators and links without its response body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: PublicFundingCollection }),
      query: PublicFundingQuery,
    },
    security: [],
    responses: {
      200: {
        description: "Current query metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description: "This exact query is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Unknown, repeated, irrelevant or invalid filter." },
      503: {
        description:
          "The full public-funding release is pending review or emergency-stopped; sources and gaps remain readable.",
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/public-funding/uk/{collection}/{id}",
    operationId: "headUkPublicFundingRecord",
    summary: "Check one UK public-funding record",
    description:
      "Returns the record's validators and links without its response body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({ collection: PublicFundingCollection, id: z.string() }),
    },
    security: [],
    responses: {
      200: {
        description: "Current record metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description: "This exact record is unchanged.",
        headers: publicResponseHeaders,
      },
      400: { description: "Detail routes do not accept query parameters." },
      404: { description: "No record with that ID in the collection." },
      503: {
        description: "The collection is pending review or emergency-stopped.",
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/public-funding/uk/exports/{collection}/{format}",
    operationId: "headUkPublicFundingCollectionExport",
    summary: "Check one UK public-funding collection export",
    description:
      "Returns download validators, links and filename without the export body.",
    request: {
      headers: ConditionalRequestHeaders,
      params: z.object({
        collection: PublicFundingCollection,
        format: ExportFormat,
      }),
    },
    security: [],
    responses: {
      200: {
        description: "Current export metadata.",
        headers: taxExportResponseHeaders,
      },
      304: {
        description: "This exact export is unchanged.",
        headers: taxExportResponseHeaders,
      },
      400: {
        description: "Static export routes do not accept query parameters.",
      },
      404: { description: "Unknown collection or format." },
      503: {
        description: "This collection is pending review or emergency-stopped.",
      },
    },
  });
}

function registerPoliticsOpenApi(app: OpenAPIHono) {
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk",
    summary: "Discover the open UK politics API",
    description:
      "Public, sessionless entry point for political-system, public-integrity and reusable bulk datasets. No API key is required.",
    security: [],
    responses: {
      200: {
        description:
          "Access policy and links to the dataset catalogue, manifest, sources and OpenAPI document.",
        headers: politicsRepresentationHeaders,
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      304: {
        description:
          "The supplied ETag still identifies the current representation.",
        headers: politicsRepresentationHeaders,
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets",
    summary: "List reusable UK politics datasets",
    description:
      "Stable dataset IDs, fields, record counts, source IDs, reuse notes, update cadence and JSON/CSV/NDJSON download links.",
    security: [],
    responses: {
      200: {
        description: "The deterministic open dataset catalogue.",
        headers: politicsDatasetHeaders,
        content: { "application/json": { schema: PoliticsDatasetCatalogue } },
      },
      304: {
        description:
          "The supplied ETag still identifies the current catalogue.",
        headers: politicsDatasetHeaders,
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/manifest",
    summary: "Read the UK politics dataset manifest",
    description:
      "Compatibility alias for the canonical /v1/politics/uk/datasets catalogue.",
    security: [],
    responses: {
      200: {
        description: "The deterministic open dataset catalogue.",
        headers: politicsDatasetHeaders,
        content: { "application/json": { schema: PoliticsDatasetCatalogue } },
      },
      304: {
        description:
          "The supplied ETag still identifies the current catalogue.",
        headers: politicsDatasetHeaders,
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets/schema",
    summary: "Read the shared catalogue and dataset-envelope JSON Schema",
    security: [],
    responses: {
      200: {
        description:
          "JSON Schema for the catalogue and TaxSorted open-dataset envelope.",
        headers: politicsRepresentationHeaders,
        content: { "application/schema+json": { schema: PoliticsPublicJson } },
      },
      304: {
        description: "The supplied ETag still identifies the schema.",
        headers: politicsRepresentationHeaders,
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets/rights",
    summary: "Read the mixed-rights and reuse boundary",
    description:
      "Explains which TaxSorted-written layers use CC BY-SA 4.0 and why linked source material keeps source-specific terms.",
    security: [],
    responses: {
      200: {
        description: "Machine-readable curation and source-rights boundary.",
        headers: politicsRepresentationHeaders,
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      304: {
        description: "The supplied ETag still identifies the rights statement.",
        headers: politicsRepresentationHeaders,
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets/admissions",
    summary: "Read every dataset admission record and pending human decision",
    description:
      "Publishes the purpose, coverage limit, field contract, rights decision, foreseeable risks and mitigations recorded for each bulk dataset.",
    security: [],
    responses: {
      200: {
        description:
          "Machine-readable admission ledger; human approval remains pending.",
        headers: politicsDatasetHeaders,
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      304: {
        description: "The supplied ETag still identifies the admission ledger.",
        headers: politicsDatasetHeaders,
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets/{datasetId}",
    summary: "Read one complete dataset screened for public distribution",
    security: [],
    request: { params: z.object({ datasetId: PoliticsDatasetId }) },
    responses: {
      200: {
        description:
          "Dataset descriptor, stable records and distribution links.",
        headers: politicsDatasetHeaders,
        content: { "application/json": { schema: PoliticsDatasetEnvelope } },
      },
      304: {
        description: "The supplied ETag still identifies this representation.",
        headers: politicsDatasetHeaders,
      },
      404: { description: "No screened static dataset has that ID." },
      503: {
        description:
          "Bulk publication is awaiting approval or has been emergency-stopped.",
      },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets/{datasetId}/schema",
    summary: "Read a dataset's record JSON Schema",
    security: [],
    request: { params: z.object({ datasetId: PoliticsDatasetId }) },
    responses: {
      200: {
        description:
          "JSON Schema and the stable field contract for one record.",
        headers: politicsDatasetHeaders,
        content: { "application/schema+json": { schema: PoliticsPublicJson } },
      },
      304: {
        description: "The supplied ETag still identifies the schema.",
        headers: politicsDatasetHeaders,
      },
      404: { description: "No screened static dataset has that ID." },
    },
  });
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/datasets/{datasetId}/download",
    summary: "Download a complete UK politics dataset",
    description:
      "JSON is a self-describing envelope; CSV uses the catalogue field order and canonical JSON for nested cells; NDJSON contains one canonical record per line.",
    security: [],
    request: {
      params: z.object({ datasetId: PoliticsDatasetId }),
      query: z.object({ format: PoliticsDownloadFormat }),
    },
    responses: {
      200: {
        description:
          "A deterministic attachment with representation-specific ETag and checksum headers.",
        headers: politicsDownloadHeaders,
        content: {
          "application/json": { schema: PoliticsDatasetEnvelope },
          "text/csv": { schema: z.string() },
          "application/x-ndjson": { schema: z.string() },
        },
      },
      304: {
        description: "The supplied ETag still identifies the requested format.",
        headers: politicsDownloadHeaders,
      },
      400: { description: "Choose exactly one supported format." },
      404: { description: "No screened static dataset has that ID." },
      503: {
        description:
          "Bulk publication is awaiting approval or has been emergency-stopped.",
      },
    },
  });

  for (const route of [
    {
      path: "/v1/politics/uk",
      summary: "Check UK politics API discovery metadata",
    },
    {
      path: "/v1/politics/uk/datasets/schema",
      summary: "Check the shared open-data schema",
    },
    {
      path: "/v1/politics/uk/datasets/rights",
      summary: "Check the mixed-rights statement",
    },
  ] as const) {
    app.openAPIRegistry.registerPath({
      method: "head",
      path: route.path,
      summary: route.summary,
      description:
        "Returns the same validators and metadata as GET, without a response body.",
      security: [],
      responses: {
        200: {
          description: "Current representation metadata.",
          headers: politicsRepresentationHeaders,
        },
        304: {
          description:
            "The supplied ETag still identifies this representation.",
          headers: politicsRepresentationHeaders,
        },
      },
    });
  }

  for (const route of [
    {
      path: "/v1/politics/uk/datasets",
      summary: "Check the UK politics dataset catalogue",
    },
    {
      path: "/v1/politics/uk/manifest",
      summary: "Check the UK politics dataset manifest",
    },
    {
      path: "/v1/politics/uk/datasets/admissions",
      summary: "Check the dataset admission ledger",
    },
  ] as const) {
    app.openAPIRegistry.registerPath({
      method: "head",
      path: route.path,
      summary: route.summary,
      description:
        "Returns the same validators and metadata as GET, without a response body.",
      security: [],
      responses: {
        200: {
          description: "Current representation metadata.",
          headers: politicsDatasetHeaders,
        },
        304: {
          description:
            "The supplied ETag still identifies this representation.",
          headers: politicsDatasetHeaders,
        },
      },
    });
  }

  for (const route of [
    {
      path: "/v1/politics/uk/datasets/{datasetId}",
      summary: "Check one UK politics dataset",
    },
    {
      path: "/v1/politics/uk/datasets/{datasetId}/schema",
      summary: "Check one dataset record schema",
    },
  ] as const) {
    app.openAPIRegistry.registerPath({
      method: "head",
      path: route.path,
      summary: route.summary,
      description:
        "Returns the same validators and metadata as GET, without a response body.",
      security: [],
      request: { params: z.object({ datasetId: PoliticsDatasetId }) },
      responses: {
        200: {
          description: "Current representation metadata.",
          headers: politicsDatasetHeaders,
        },
        304: {
          description:
            "The supplied ETag still identifies this representation.",
          headers: politicsDatasetHeaders,
        },
        404: { description: "No screened static dataset has that ID." },
      },
    });
  }

  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/politics/uk/datasets/{datasetId}/download",
    summary: "Check one downloadable UK politics representation",
    description:
      "Returns the attachment metadata and exact-format validator without a response body.",
    security: [],
    request: {
      params: z.object({ datasetId: PoliticsDatasetId }),
      query: z.object({ format: PoliticsDownloadFormat }),
    },
    responses: {
      200: {
        description: "Current attachment metadata.",
        headers: politicsDownloadHeaders,
      },
      304: {
        description: "The supplied ETag still identifies this format.",
        headers: politicsDownloadHeaders,
      },
      400: { description: "Choose exactly one supported format." },
      404: { description: "No screened static dataset has that ID." },
      503: {
        description:
          "Bulk publication is awaiting approval or has been emergency-stopped.",
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/relationships/contracts",
    summary: "Query public contract awards with verified supplier disclosure",
    description:
      "Queries a bounded Contracts Finder award window. Direct contacts and addresses are removed, and supplier names require a verified public organisation identifier.",
    security: [],
    request: {
      query: z.object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        take: z.coerce.number().int().min(1).max(20).optional(),
        cursor: z.string().min(1).max(2_000).optional(),
      }),
    },
    responses: {
      200: {
        description:
          "A page of source-linked awards; supplier names require a verified public organisation identifier.",
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      422: { description: "Invalid dates, span, page size or cursor." },
      502: {
        description: "The named official source failed or changed shape.",
      },
      504: { description: "The named official source timed out." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/enforcement/forces",
    summary: "List police-force institutions from data.police.uk",
    description:
      "Returns institutional force IDs and names, not an officer roster.",
    security: [],
    responses: {
      200: {
        description:
          "The current institution directory and its stated territorial gaps.",
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      502: {
        description: "The named official source failed or changed shape.",
      },
      504: { description: "The named official source timed out." },
    },
  });

  const staticPoliticsRoutes = [
    ["/v1/politics/uk/system", "Read the non-personal UK political-system map"],
    [
      "/v1/politics/uk/elections/process",
      "Read the UK Parliamentary election process",
    ],
    [
      "/v1/politics/uk/funding/rules",
      "Read effective-dated campaign-finance rules",
    ],
    ["/v1/politics/uk/funding/public", "Read public political-funding schemes"],
    ["/v1/politics/uk/power/method", "Read the political office-power method"],
    ["/v1/politics/uk/power/offices", "List political office-power cards"],
    [
      "/v1/politics/uk/budgets/accountability",
      "Read public-money accountability lanes",
    ],
    [
      "/v1/politics/uk/relationships/method",
      "Read the relationship-evidence method",
    ],
    ["/v1/politics/uk/relationships/schema", "Read the evidence-event schema"],
    [
      "/v1/politics/uk/relationships/datasets",
      "Read finance-source publication states",
    ],
    [
      "/v1/politics/uk/enforcement/method",
      "Read the enforcement evidence method",
    ],
    [
      "/v1/politics/uk/enforcement/institutions",
      "List enforcement and oversight institutions",
    ],
    [
      "/v1/politics/uk/enforcement/governance",
      "Read enforcement governance relationships",
    ],
    ["/v1/politics/uk/enforcement/ranks", "Read generic police rank families"],
    [
      "/v1/politics/uk/enforcement/pay-benefits",
      "Read police pay and benefit evidence",
    ],
    [
      "/v1/politics/uk/enforcement/workforce",
      "Read aggregate workforce source coverage",
    ],
    [
      "/v1/politics/uk/enforcement/funding",
      "Read enforcement funding source coverage",
    ],
    [
      "/v1/politics/uk/enforcement/vacancies",
      "Read official enforcement recruitment routes",
    ],
    [
      "/v1/politics/uk/enforcement/activities",
      "Read safe institutional activity coverage",
    ],
    [
      "/v1/politics/uk/enforcement/private-security",
      "Read the private-security boundary",
    ],
    [
      "/v1/politics/uk/enforcement/power/method",
      "Read the enforcement office-power method",
    ],
    [
      "/v1/politics/uk/enforcement/power/offices",
      "List enforcement office-power cards",
    ],
    [
      "/v1/politics/uk/enforcement/communication-method",
      "Read the official-language analysis method",
    ],
    [
      "/v1/politics/uk/integrity",
      "Read the public-integrity scope and publication state",
    ],
    [
      "/v1/politics/uk/integrity/sources",
      "Read the public-integrity source registry",
    ],
    [
      "/v1/politics/uk/integrity/corrections",
      "Read the correction and restriction method",
    ],
    [
      "/v1/politics/uk/history/method",
      "Read the effective-dated political-history method",
    ],
    ["/v1/politics/uk/law/watch", "Read proposed political-system legislation"],
    [
      "/v1/politics/uk/public-office-pathways",
      "Read the non-partisan public-office pathway map",
    ],
    [
      "/v1/politics/uk/public-office-pathways/offices",
      "Compare the deeply mapped elected-office routes",
    ],
    [
      "/v1/politics/uk/public-office-pathways/support",
      "Read support routes and documented barriers to standing",
    ],
    [
      "/v1/politics/uk/public-office-pathways/rights",
      "Read the curation and upstream-source rights boundary",
    ],
    [
      "/v1/politics/uk/public-decision-pathways",
      "Read the public-decision authority and participation map",
    ],
    [
      "/v1/politics/uk/public-decision-pathways/decisions",
      "List deeply mapped decisions and bounded hand-offs",
    ],
    [
      "/v1/politics/uk/public-decision-pathways/doors",
      "Read public doors and their formal procedural effects",
    ],
    [
      "/v1/politics/uk/public-decision-pathways/rights",
      "Read the public-decision curation and source-rights boundary",
    ],
    [
      "/v1/politics/uk/sources",
      "Read politics coverage, sources, licences and gaps",
    ],
  ] as const;

  for (const [path, summary] of staticPoliticsRoutes) {
    const isPublicOfficePathwayRoute = path.startsWith(
      "/v1/politics/uk/public-office-pathways",
    );
    const isPublicDecisionPathwayRoute = path.startsWith(
      "/v1/politics/uk/public-decision-pathways",
    );
    const isConditionalReferenceRoute =
      isPublicOfficePathwayRoute || isPublicDecisionPathwayRoute;
    const responseSchema =
      path === "/v1/politics/uk/public-office-pathways"
        ? PublicOfficePathwaysResponse
        : path === "/v1/politics/uk/public-office-pathways/offices"
          ? PublicOfficePathwayList
          : path === "/v1/politics/uk/public-office-pathways/support"
            ? PublicOfficePathwaySupport
            : path === "/v1/politics/uk/public-office-pathways/rights"
              ? PublicOfficePathwayRights
              : path === "/v1/politics/uk/public-decision-pathways"
                ? PublicDecisionPathwaysResponse
                : path === "/v1/politics/uk/public-decision-pathways/decisions"
                  ? PublicDecisionPathwayList
                  : path === "/v1/politics/uk/public-decision-pathways/doors"
                    ? PublicDecisionPathwayDoors
                    : path === "/v1/politics/uk/public-decision-pathways/rights"
                      ? PublicDecisionPathwayRights
            : PoliticsPublicJson;
    app.openAPIRegistry.registerPath({
      method: "get",
      path,
      summary,
      ...(isConditionalReferenceRoute
        ? { request: { headers: ConditionalRequestHeaders } }
        : {}),
      security: [],
      responses: {
        200: {
          description: "Source-linked public reference data.",
          ...(isConditionalReferenceRoute
            ? { headers: publicResponseHeaders }
            : {}),
          content: {
            "application/json": {
              schema: responseSchema,
            },
          },
        },
        ...(isConditionalReferenceRoute
          ? {
              304: {
                description: "The supplied ETag still identifies this representation.",
                headers: publicResponseHeaders,
              },
            }
          : {}),
        503: {
          description: isConditionalReferenceRoute
            ? "The politics bulk emergency stop is active. Pending bulk-record and named-person approval alone do not close this read-only rules route."
            : "Bulk publication is awaiting approval or has been emergency-stopped.",
          ...(isConditionalReferenceRoute ? { content: problemContent } : {}),
        },
      },
    });
  }

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/public-office-pathways/schema",
    summary: "Read the public-office pathway JSON Schema",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description: "Strict structural schema and runtime invariant notes.",
        headers: publicResponseHeaders,
        content: {
          "application/schema+json": { schema: PoliticsPublicJson },
        },
      },
      304: {
        description: "The supplied ETag still identifies this schema.",
        headers: publicResponseHeaders,
      },
      503: {
        description: "The politics bulk emergency stop is active.",
        content: problemContent,
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/public-decision-pathways/schema",
    summary: "Read the public-decision pathway JSON Schema",
    request: { headers: ConditionalRequestHeaders },
    security: [],
    responses: {
      200: {
        description:
          "Strict structural schema for authority, stages, public doors, bounded hand-offs and source integrity.",
        headers: publicResponseHeaders,
        content: {
          "application/schema+json": { schema: PoliticsPublicJson },
        },
      },
      304: {
        description: "The supplied ETag still identifies this schema.",
        headers: publicResponseHeaders,
      },
      503: {
        description: "The politics bulk emergency stop is active.",
        content: problemContent,
      },
    },
  });

  const dynamicPoliticsRoutes = [
    [
      "/v1/politics/uk/public-decision-pathways/decisions/{decisionId}",
      "decisionId",
      "Read one public-decision pathway",
    ],
    [
      "/v1/politics/uk/public-office-pathways/offices/{officeId}",
      "officeId",
      "Read one elected-office pathway",
    ],
    [
      "/v1/politics/uk/power/offices/{officeId}",
      "officeId",
      "Read one political office-power card",
    ],
    [
      "/v1/politics/uk/enforcement/institutions/{institutionId}",
      "institutionId",
      "Read one enforcement institution",
    ],
    [
      "/v1/politics/uk/enforcement/power/offices/{officeId}",
      "officeId",
      "Read one enforcement office-power card",
    ],
    [
      "/v1/politics/uk/enforcement/forces/{forceId}",
      "forceId",
      "Read one police-force institution",
    ],
    [
      "/v1/politics/uk/enforcement/forces/{forceId}/leaders",
      "forceId",
      "Read separately gated force-published senior officers",
    ],
  ] as const;

  for (const [path, parameter, summary] of dynamicPoliticsRoutes) {
    const isPublicOfficeDetail =
      path === "/v1/politics/uk/public-office-pathways/offices/{officeId}";
    const isPublicDecisionDetail =
      path ===
      "/v1/politics/uk/public-decision-pathways/decisions/{decisionId}";
    const isConditionalReferenceDetail =
      isPublicOfficeDetail || isPublicDecisionDetail;
    app.openAPIRegistry.registerPath({
      method: "get",
      path,
      summary,
      security: [],
      request: {
        params: z.object({ [parameter]: z.string().min(1).max(200) }),
        ...(isConditionalReferenceDetail
          ? { headers: ConditionalRequestHeaders }
          : {}),
      },
      responses: {
        200: {
          description: "Source-linked public response.",
          ...(isConditionalReferenceDetail
            ? { headers: publicResponseHeaders }
            : {}),
          content: {
            "application/json": {
              schema:
                isPublicOfficeDetail
                  ? PublicOfficePathwayDetail
                  : isPublicDecisionDetail
                    ? PublicDecisionPathwayDetail
                  : PoliticsPublicJson,
            },
          },
        },
        ...(isConditionalReferenceDetail
          ? {
              304: {
                description:
                  "The supplied ETag still identifies this reference representation.",
                headers: publicResponseHeaders,
              },
            }
          : {}),
        404: { description: "No matching public record." },
        503: {
          description:
            isConditionalReferenceDetail
              ? "The politics bulk emergency stop is active."
              : "A named-data or bulk-data safety gate is closed.",
          ...(isConditionalReferenceDetail
            ? { content: problemContent }
            : {}),
        },
      },
    });
  }

  for (const [path, summary] of [
    ...staticPoliticsRoutes.filter(([path]) =>
      path.startsWith("/v1/politics/uk/public-office-pathways") ||
      path.startsWith("/v1/politics/uk/public-decision-pathways"),
    ),
    [
      "/v1/politics/uk/public-office-pathways/schema",
      "Check the public-office pathway JSON Schema",
    ] as const,
    [
      "/v1/politics/uk/public-decision-pathways/schema",
      "Check the public-decision pathway JSON Schema",
    ] as const,
  ]) {
    app.openAPIRegistry.registerPath({
      method: "head",
      path,
      summary: summary.replace(/^Read /, "Check "),
      request: { headers: ConditionalRequestHeaders },
      security: [],
      responses: {
        200: {
          description: "Current public reference representation metadata.",
          headers: publicResponseHeaders,
        },
        304: {
          description: "The supplied ETag still identifies this representation.",
          headers: publicResponseHeaders,
        },
        503: {
          description: "The politics bulk emergency stop is active.",
        },
      },
    });
  }

  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/politics/uk/public-office-pathways/offices/{officeId}",
    summary: "Check one elected-office pathway",
    request: {
      params: z.object({ officeId: z.string().min(1).max(200) }),
      headers: ConditionalRequestHeaders,
    },
    security: [],
    responses: {
      200: {
        description: "Current office-pathway representation metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description: "The supplied ETag still identifies this office representation.",
        headers: publicResponseHeaders,
      },
      404: { description: "No matching public-office pathway." },
      503: { description: "The politics bulk emergency stop is active." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "head",
    path: "/v1/politics/uk/public-decision-pathways/decisions/{decisionId}",
    summary: "Check one public-decision pathway",
    request: {
      params: z.object({ decisionId: z.string().min(1).max(200) }),
      headers: ConditionalRequestHeaders,
    },
    security: [],
    responses: {
      200: {
        description: "Current decision-pathway representation metadata.",
        headers: publicResponseHeaders,
      },
      304: {
        description:
          "The supplied ETag still identifies this decision representation.",
        headers: publicResponseHeaders,
      },
      404: { description: "No matching public-decision pathway." },
      503: { description: "The politics bulk emergency stop is active." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/people",
    summary:
      "Search current Parliament people when the publication gate is open",
    security: [],
    request: {
      query: z.object({
        q: z.string().max(100).optional(),
        house: z.enum(["all", "commons", "lords"]).optional(),
        partyId: z.coerce.number().int().positive().optional(),
        skip: z.coerce.number().int().min(0).max(10_000).optional(),
        take: z.coerce.number().int().min(1).max(20).optional(),
      }),
    },
    responses: {
      200: {
        description: "A bounded page of current members.",
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      422: { description: "Invalid query." },
      503: { description: "The current-person publication gate is closed." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/people/{id}",
    summary:
      "Read one current Parliament person when the publication gate is open",
    security: [],
    request: {
      params: z.object({ id: z.coerce.number().int().positive().max(100_000) }),
    },
    responses: {
      200: {
        description: "One current member and purpose-bound public records.",
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      404: { description: "The person was not found or is not current." },
      503: { description: "The current-person publication gate is closed." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/parties",
    summary: "List active Parliamentary parties",
    security: [],
    request: {
      query: z.object({
        house: z.enum(["all", "commons", "lords"]).optional(),
      }),
    },
    responses: {
      200: {
        description: "Active parties by selected House.",
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      422: { description: "Invalid House." },
      503: { description: "The current politics publication gate is closed." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/roles",
    summary: "List current government or opposition posts",
    security: [],
    request: {
      query: z.object({ kind: z.enum(["government", "opposition"]) }),
    },
    responses: {
      200: {
        description: "Current posts and holders.",
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      422: { description: "Invalid role kind." },
      503: { description: "The current-person publication gate is closed." },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/funding/donations",
    summary:
      "Query verified-company political donations when both gates are open",
    security: [],
    request: {
      query: z.object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        recipient: z.string().max(100).optional(),
        skip: z.coerce.number().int().min(0).max(100_000).optional(),
        take: z.coerce.number().int().min(1).max(100).optional(),
      }),
    },
    responses: {
      200: {
        description: "A bounded company-only donation page.",
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      422: { description: "Invalid dates or pagination." },
      503: {
        description: "Reuse confirmation or privacy review is not complete.",
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/v1/politics/uk/relationships/ministerial-benefits",
    summary:
      "Query monthly ministerial gifts and hospitality when its gate is open",
    security: [],
    request: {
      query: z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        department: z.string().min(1).max(100),
        type: z.enum(["all", "gift", "hospitality"]).optional(),
      }),
    },
    responses: {
      200: {
        description:
          "Source-reported monthly records without name-based joining.",
        content: { "application/json": { schema: PoliticsPublicJson } },
      },
      404: { description: "No matching published attachment." },
      422: { description: "Invalid month, department or record type." },
      503: {
        description: "The ministerial-benefits publication gate is closed.",
      },
    },
  });
}

const openApiOperationMethods = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function openApiTagForPath(path: string): string {
  if (path === professionalToolsPath || path === apiWorkspacePath) {
    return "UK professional tools";
  }
  if (publicAgentPaths.has(path)) return "Agent discovery";
  if (hasPathPrefix(path, "/v1/open-data")) return "Open-data catalogue";
  if (hasPathPrefix(path, "/v1/tax-system/uk")) return "UK tax system";
  if (hasPathPrefix(path, "/v1/tax-industry/uk")) return "UK tax industry";
  if (hasPathPrefix(path, "/v1/charities/uk")) return "UK charities";
  if (hasPathPrefix(path, "/v1/public-funding/uk")) {
    return "UK public funding";
  }
  if (hasPathPrefix(path, "/v1/politics/uk")) return "UK politics";
  if (hasPathPrefix(path, "/v1/accountability/uk")) {
    return "UK observer accountability";
  }
  if (hasPathPrefix(path, "/v1/case-commons/uk")) {
    return "UK public-power case commons";
  }
  if (hasPathPrefix(path, "/v1/why-graph")) {
    return "Explanation contracts";
  }
  if (hasPathPrefix(path, "/v1/uk/sdlt")) return "SDLT";
  if (hasPathPrefix(path, "/v1/uk/tax-expert")) return "UK tax expert";
  throw new Error(`No OpenAPI slice tag is defined for ${path}.`);
}

function upperCamelCase(value: string): string {
  return value
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join("");
}

function inferredOperationId(method: string, path: string): string {
  const segments =
    path === "/" ? ["api", "root"] : path.split("/").filter(Boolean);
  const pathName = segments
    .map((segment) => {
      const parameter = /^\{([^}]+)\}$/u.exec(segment);
      return parameter
        ? `By${upperCamelCase(parameter[1] ?? "parameter")}`
        : upperCamelCase(segment);
    })
    .join("");
  return `${method.toLowerCase()}${pathName}`;
}

function collectComponentReferences(value: unknown, found: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectComponentReferences(item, found);
    return;
  }
  if (!isJsonObject(value)) return;
  const reference = value.$ref;
  if (
    typeof reference === "string" &&
    reference.startsWith("#/components/")
  ) {
    found.add(reference);
  }
  for (const child of Object.values(value)) {
    collectComponentReferences(child, found);
  }
}

function decodeJsonPointerToken(value: string): string {
  return value.replaceAll("~1", "/").replaceAll("~0", "~");
}

function retainReferencedComponents(
  sourceComponents: unknown,
  selectedPaths: JsonObject,
  additionalReferences: readonly string[] = [],
): JsonObject | undefined {
  if (!isJsonObject(sourceComponents)) return undefined;

  const pending = new Set<string>();
  const visited = new Set<string>();
  const retained: JsonObject = {};
  collectComponentReferences(selectedPaths, pending);
  for (const reference of additionalReferences) pending.add(reference);

  while (pending.size > 0) {
    const reference = pending.values().next().value as string;
    pending.delete(reference);
    if (visited.has(reference)) continue;
    visited.add(reference);

    const parts = reference.split("/");
    if (parts.length !== 4 || parts[0] !== "#" || parts[1] !== "components") {
      continue;
    }
    const groupName = decodeJsonPointerToken(parts[2] ?? "");
    const componentName = decodeJsonPointerToken(parts[3] ?? "");
    const sourceGroup = sourceComponents[groupName];
    if (!isJsonObject(sourceGroup) || !(componentName in sourceGroup)) {
      throw new Error(`OpenAPI slice cannot resolve ${reference}.`);
    }

    const component = structuredClone(sourceGroup[componentName]);
    const retainedGroup = isJsonObject(retained[groupName])
      ? retained[groupName]
      : {};
    retainedGroup[componentName] = component;
    retained[groupName] = retainedGroup;
    collectComponentReferences(component, pending);
  }

  // OpenAPI security requirements name schemes directly instead of using a
  // $ref, so retain those components explicitly for a secured task slice.
  const securitySchemeNames = new Set<string>();
  for (const pathItem of Object.values(selectedPaths)) {
    if (!isJsonObject(pathItem)) continue;
    for (const method of openApiOperationMethods) {
      const operation = pathItem[method];
      if (!isJsonObject(operation) || !Array.isArray(operation.security)) continue;
      for (const requirement of operation.security) {
        if (!isJsonObject(requirement)) continue;
        for (const name of Object.keys(requirement)) securitySchemeNames.add(name);
      }
    }
  }
  const sourceSecuritySchemes = sourceComponents.securitySchemes;
  if (securitySchemeNames.size > 0) {
    if (!isJsonObject(sourceSecuritySchemes)) {
      throw new Error("OpenAPI slice references security schemes but the source document has none.");
    }
    const retainedSecuritySchemes = isJsonObject(retained.securitySchemes)
      ? retained.securitySchemes
      : {};
    for (const name of securitySchemeNames) {
      if (!(name in sourceSecuritySchemes)) {
        throw new Error(`OpenAPI slice cannot resolve security scheme ${name}.`);
      }
      retainedSecuritySchemes[name] = structuredClone(sourceSecuritySchemes[name]);
    }
    retained.securitySchemes = retainedSecuritySchemes;
  }

  return Object.keys(retained).length > 0 ? retained : undefined;
}

function createOpenApiSlice(
  sourceDocument: JsonObject,
  definition: OpenApiSliceDefinition,
): JsonObject {
  const sourcePaths = sourceDocument.paths;
  if (!isJsonObject(sourcePaths)) {
    throw new Error("The generated OpenAPI document has no paths object.");
  }

  const selectedPaths: JsonObject = {};
  const operationIds = new Map<string, string>();
  const usedTags = new Set<string>();

  for (const [path, sourcePathItem] of Object.entries(sourcePaths)) {
    if (!definition.matchesPath(path) || !isJsonObject(sourcePathItem)) {
      continue;
    }
    const pathItem = structuredClone(sourcePathItem);
    const tag = openApiTagForPath(path);
    usedTags.add(tag);

    for (const method of openApiOperationMethods) {
      const candidate = pathItem[method];
      if (!isJsonObject(candidate)) continue;
      if (!Array.isArray(candidate.security)) {
        throw new Error(
          `OpenAPI slice ${definition.id} refuses ${method.toUpperCase()} ${path} because security is not explicit.`,
        );
      }
      if (candidate.security.length !== 0 && !definition.allowSecuredOperations) {
        throw new Error(
          `OpenAPI slice ${definition.id} refuses ${method.toUpperCase()} ${path} because it is not explicitly sessionless (security: []).`,
        );
      }
      const operationId =
        typeof candidate.operationId === "string" && candidate.operationId
          ? candidate.operationId
          : inferredOperationId(method, path);
      const previous = operationIds.get(operationId);
      if (previous) {
        throw new Error(
          `OpenAPI slice ${definition.id} has duplicate operationId ${operationId} at ${previous} and ${method.toUpperCase()} ${path}.`,
        );
      }
      operationIds.set(operationId, `${method.toUpperCase()} ${path}`);
      candidate.operationId = operationId;
      candidate.tags = [tag];
    }
    selectedPaths[path] = pathItem;
  }

  if (Object.keys(selectedPaths).length === 0) {
    throw new Error(`OpenAPI slice ${definition.id} selected no paths.`);
  }

  const sourceInfo = isJsonObject(sourceDocument.info)
    ? structuredClone(sourceDocument.info)
    : {};
  const sourceDescription =
    typeof sourceInfo.description === "string" ? sourceInfo.description : "";
  const retainedComponents = retainReferencedComponents(
    sourceDocument.components,
    selectedPaths,
    definition.componentReferences,
  );
  const slice: JsonObject = {
    openapi: sourceDocument.openapi,
    info: {
      ...sourceInfo,
      title: definition.title,
      description: `${definition.description} ${sourceDescription}`.trim(),
    },
    servers: structuredClone(sourceDocument.servers),
    paths: selectedPaths,
    tags: openApiTags
      .filter((tag) => usedTags.has(tag.name))
      .map((tag) => ({ ...tag })),
    "x-taxsorted-slice": {
      id: definition.id,
      canonical: definition.path,
      fullSpecification: "/openapi.json",
      operationCount: operationIds.size,
      pathCount: Object.keys(selectedPaths).length,
      availableSlices: openApiSliceDefinitions.map((sliceDefinition) => ({
        id: sliceDefinition.id,
        href: sliceDefinition.path,
        title: sliceDefinition.title,
      })),
    },
  };
  if (retainedComponents) slice.components = retainedComponents;
  if (definition.componentReferences?.length) {
    slice["x-taxsorted-shared-components"] = [...definition.componentReferences];
  }
  return slice;
}

function addPublicProblemRepresentations(sourceDocument: JsonObject): void {
  const paths = sourceDocument.paths;
  if (!isJsonObject(paths)) return;
  const publicDefinition = openApiSliceDefinitions.find(
    (definition) => definition.id === "public",
  );
  if (!publicDefinition) throw new Error("The public OpenAPI slice is missing.");

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!publicDefinition.matchesPath(path) || !isJsonObject(pathItem)) continue;
    for (const method of openApiOperationMethods) {
      const operation = pathItem[method];
      if (!isJsonObject(operation) || !isJsonObject(operation.responses)) {
        continue;
      }
      if (method === "head") {
        if (!("500" in operation.responses)) {
          operation.responses["500"] = {
            description: "Unexpected public-service failure.",
          };
        }
        continue;
      }
      if (!("500" in operation.responses)) {
        operation.responses["500"] = {
          description:
            "Unexpected public-service failure with a non-sensitive request ID and recovery action.",
          content: {
            "application/problem+json": {
              schema: { $ref: "#/components/schemas/ProblemDetails" },
            },
            "application/json": {
              schema: { $ref: "#/components/schemas/ProblemDetails" },
            },
          },
        };
      }
      for (const [status, response] of Object.entries(operation.responses)) {
        if (!/^[45][0-9]{2}$/u.test(status) || !isJsonObject(response)) {
          continue;
        }
        const existingContent = isJsonObject(response.content)
          ? response.content
          : {};
        const existingProblem = isJsonObject(
          existingContent["application/problem+json"],
        )
          ? existingContent["application/problem+json"]
          : undefined;
        const existingJson = isJsonObject(existingContent["application/json"])
          ? existingContent["application/json"]
          : undefined;
        const schema =
          existingProblem?.schema ??
          existingJson?.schema ??
          ({ $ref: "#/components/schemas/ProblemDetails" } as const);
        response.content = {
          ...existingContent,
          "application/problem+json": existingProblem ?? { schema },
          "application/json": existingJson ?? { schema },
        };
      }
    }
  }
}

function openApiSliceOperationStem(id: string): string {
  return id === "public" ? "Public" : upperCamelCase(id);
}

function registerOpenApiSliceDescriptions(app: OpenAPIHono): void {
  for (const definition of openApiSliceDefinitions) {
    const stem = openApiSliceOperationStem(definition.id);
    for (const method of ["get", "head"] as const) {
      app.openAPIRegistry.registerPath({
        method,
        path: definition.path,
        operationId: `${method}${stem}OpenApiDescription`,
        tags: ["OpenAPI descriptions"],
        summary: `${method === "get" ? "Read" : "Check"} the ${definition.title} description`,
        description:
          method === "get"
            ? `${definition.description} Every operation has a stable operationId and tag.`
            : "Returns validators and links without a response body.",
        request: { headers: ConditionalRequestHeaders },
        security: [],
        responses: {
          200: {
            description:
              method === "get"
                ? "A self-contained OpenAPI 3.1 description."
                : "Current description metadata.",
            headers: publicResponseHeaders,
            ...(method === "get"
              ? {
                  content: {
                    [OPENAPI_MEDIA_TYPE]: { schema: OpenApi31Document },
                  },
                }
              : {}),
          },
          304: {
            description:
              "The supplied ETag still identifies these exact description bytes.",
            headers: publicResponseHeaders,
          },
        },
      });
    }
  }
}

function applyOpenApiSliceHeaders(
  c: Context,
  definition: OpenApiSliceDefinition,
  etag: string,
): void {
  c.header("Cache-Control", "public, max-age=300, must-revalidate");
  c.header("Content-Location", definition.path);
  c.header("Content-Type", OPENAPI_MEDIA_TYPE);
  c.header("ETag", etag);
  c.header(
    "Link",
    `<${definition.path}>; rel="canonical"; type="${OPENAPI_MEDIA_TYPE}", </openapi.json>; rel="alternate"; type="${OPENAPI_MEDIA_TYPE}"`,
  );
}

function registerOpenApiSliceRoutes(
  app: OpenAPIHono,
  sourceDocument: JsonObject,
): void {
  for (const definition of openApiSliceDefinitions) {
    const representation = JSON.stringify(
      createOpenApiSlice(sourceDocument, definition),
    );
    const etag = representationEtag(representation);

    app.get(definition.path, (c) => {
      applyOpenApiSliceHeaders(c, definition, etag);
      if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
        return c.body(null, 304);
      }
      return c.body(representation, 200);
    });
    app.on("HEAD", definition.path, (c) => {
      applyOpenApiSliceHeaders(c, definition, etag);
      return c.body(
        null,
        ifNoneMatchMatches(c.req.header("If-None-Match"), etag) ? 304 : 200,
      );
    });
  }
}

function registerFullOpenApiRoute(
  app: OpenAPIHono,
  sourceDocument: JsonObject,
): void {
  const representation = JSON.stringify(sourceDocument);
  app.get("/openapi.json", (c) =>
    c.body(representation, 200, {
      "Content-Type": "application/json; charset=utf-8",
    }),
  );
}

function openApiDocumentConfig(apiOrigin: string) {
  return {
    openapi: "3.1.0" as const,
    info: {
      title: "TaxSorted API",
      version: "0.1.0",
      description:
        "Deterministic, effective-dated tax decisions and reviewed public maps, with primary sources and explicit review boundaries. TaxSorted-authored documentation, summaries and curation use CC BY-SA 4.0; linked sources retain their own terms; the server source code uses AGPL-3.0.",
      license: {
        name: "CC BY-SA 4.0 (API documentation and TaxSorted-authored curation)",
        url: "https://creativecommons.org/licenses/by-sa/4.0/",
      },
    },
    servers: [{ url: apiOrigin }],
  };
}

/** Register the machine API before any browser-session middleware is added. */
export function registerDeveloperApi(app: OpenAPIHono, apiOrigin: string) {
  app.openAPIRegistry.registerComponent("securitySchemes", "WorkspaceKey", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "ts_(test|live)_<32-byte-secret>",
    description:
      "A TaxSorted workspace key. Tax calculations and assessments declare their required scope, such as sdlt:calculate or tax-expert:assess.",
  });
  registerAgentInterfaceOpenApi(app);
  registerHealthOpenApi(app);
  registerOpenDataOpenApi(app);
  registerReleaseDiscoveryOpenApi(app);
  registerTaxSystemOpenApi(app);
  registerTaxIndustryOpenApi(app);
  registerCharitiesOpenApi(app);
  registerObserverAccountabilityOpenApi(app);
  registerCaseCommonsOpenApi(app);
  registerWhyGraphOpenApi(app);
  registerPublicFundingOpenApi(app);
  registerPoliticsOpenApi(app);
  registerStableRecordResolversOpenApi(app);
  registerOpenApiSliceDescriptions(app);
  app.route(apiWorkspacePath, createApiWorkspaceRoutes());
  app.route(
    professionalToolsPath,
    createProfessionalToolsRoutes(apiOrigin),
  );

  app.use("/v1/uk/sdlt/*", async (c, next) => {
    // SDLT requests and results contain transaction values. Apply the private
    // cache policy before size, media, JSON, auth and schema checks so every
    // early response inherits it too.
    c.header("Cache-Control", "no-store");
    c.header(
      "Link",
      `<${professionalToolsOpenApiPath}>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
    );
    await next();
  });
  app.use(
    "/v1/uk/sdlt/*",
    bodyLimit({
      maxSize: MAX_CALCULATION_BODY_BYTES,
      onError: (c) =>
        c.json(
          {
            error: "request_too_large",
            message: "Keep calculation requests at or below 16 KiB.",
            requestId: requestIdFor(c),
          },
          413,
        ),
    }),
  );
  app.use("/v1/uk/sdlt/*", async (c, next) => {
    if (c.req.method === "POST") {
      const mediaType = c.req
        .header("Content-Type")
        ?.split(";", 1)[0]
        ?.trim()
        .toLowerCase();
      if (mediaType !== "application/json") {
        return c.json(
          {
            error: "unsupported_media_type",
            message: "Send calculation facts as application/json.",
            requestId: requestIdFor(c),
          },
          415,
        );
      }
    }
    await next();
  });
  app.use("/v1/uk/sdlt/*", rejectAmbiguousJson);
  app.use("/v1/uk/sdlt/*", requireApiKey("sdlt:calculate"));
  app.route("/v1/uk/sdlt", sdltRoutes);

  const expertAssessmentPath =
    "/v1/uk/tax-expert/mtd-income-tax/assessments";
  app.use(expertAssessmentPath, async (c, next) => {
    // Financial request facts and every success/error derived from them are
    // private to this call. Set the policy before size, media, JSON and auth
    // checks so an early response cannot become cacheable by omission.
    c.header("Cache-Control", "no-store");
    c.header(
      "Link",
      `<${professionalToolsOpenApiPath}>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
    );
    await next();
  });
  app.use(
    expertAssessmentPath,
    bodyLimit({
      maxSize: MAX_CALCULATION_BODY_BYTES,
      onError: (c) =>
        c.json(
          {
            error: "request_too_large",
            message: "Keep assessment requests at or below 16 KiB.",
            requestId: requestIdFor(c),
          },
          413,
        ),
    }),
  );
  app.use(expertAssessmentPath, async (c, next) => {
    if (c.req.method === "POST") {
      const mediaType = c.req
        .header("Content-Type")
        ?.split(";", 1)[0]
        ?.trim()
        .toLowerCase();
      if (mediaType !== "application/json") {
        return c.json(
          {
            error: "unsupported_media_type",
            message: "Send assessment facts as application/json.",
            requestId: requestIdFor(c),
          },
          415,
        );
      }
    }
    await next();
  });
  app.use(expertAssessmentPath, rejectAmbiguousJson);
  app.use(expertAssessmentPath, requireApiKey("tax-expert:assess"));
  app.route("/v1/uk/tax-expert", ukTaxExpertRoutes);

  const documentConfig = openApiDocumentConfig(apiOrigin);
  const sourceDocument = app.getOpenAPI31Document(
    documentConfig,
  ) as unknown as JsonObject;
  addPublicProblemRepresentations(sourceDocument);
  registerOpenApiSliceRoutes(app, sourceDocument);
  registerFullOpenApiRoute(app, sourceDocument);
}
