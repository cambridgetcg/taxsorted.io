// Strict public wire contracts and deterministic projections for approved
// tax-dispute case packets. The engine owns legal-reading semantics; this
// module binds them to exact packet digests, source records and JSON Pointers.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "@hono/zod-openapi";
import {
  TAX_DISPUTE_CHALLENGE_KINDS,
  TAX_DISPUTE_CHALLENGE_MATERIALITY,
  TAX_DISPUTE_CHALLENGE_STATES,
  TAX_DISPUTE_DIMENSION_IDS,
  TAX_DISPUTE_DIMENSION_STATES,
  TAX_DISPUTE_FRAMEWORK,
  TAX_DISPUTE_REASON_STATES,
  TAX_DISPUTE_TRAINING_TASK_FAMILIES,
  buildTaxDisputeTrainingExamples,
  buildTaxDisputeWhyGraph,
  buildUkTaxDisputeInterpretation,
} from "@taxsorted/engine/uk/disputes";
import { canonicalJson } from "./open-data.js";
import {
  makeCaseCommonsPacket,
  type CaseCommonsCase,
  type UkCaseCommons,
} from "./uk-case-commons.js";
import { WhyGraphSchema } from "./why-graph.js";

const text = z.string().trim().min(1).max(8_000);
const shortText = z.string().trim().min(1).max(1_000);
const date = z.iso.date();
const sourceId = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9][a-z0-9-]*$/);
const semanticId = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const casePointer = z
  .string()
  .min(1)
  .max(500)
  .regex(/^\/(?:[^~/]|~[01])*(?:\/(?:[^~/]|~[01])*)*$/);
const digest = z.string().regex(/^sha256:[0-9a-f]{64}$/);

const taxDisputeDimensionDefinitionSchema = z
  .object({
    id: z.enum(TAX_DISPUTE_DIMENSION_IDS),
    order: z.number().int().positive().max(100),
    title: shortText,
    question: text,
  })
  .strict();

export const taxDisputeFrameworkSchema = z
  .object({
    schema: z.literal("taxsorted.uk.tax-dispute-framework/1"),
    version: z.string().min(1).max(100),
    interpretationSchema: z.literal(
      "taxsorted.uk.tax-dispute-interpretation/1",
    ),
    title: shortText,
    purpose: text,
    dimensionStates: z
      .array(z.enum(TAX_DISPUTE_DIMENSION_STATES))
      .length(TAX_DISPUTE_DIMENSION_STATES.length),
    dimensions: z
      .array(taxDisputeDimensionDefinitionSchema)
      .length(TAX_DISPUTE_DIMENSION_IDS.length),
    majorChallenges: z
      .object({
        kinds: z
          .array(z.enum(TAX_DISPUTE_CHALLENGE_KINDS))
          .length(TAX_DISPUTE_CHALLENGE_KINDS.length),
        meaning: text,
      })
      .strict(),
    reasoning: z
      .object({
        decisiveness: z
          .array(z.enum(TAX_DISPUTE_REASON_STATES))
          .length(TAX_DISPUTE_REASON_STATES.length),
        hiddenChainOfThought: z.literal(false),
        publicRationaleOnly: z.literal(true),
        meaning: text,
      })
      .strict(),
    training: z
      .object({
        taskFamilies: z
          .array(z.enum(TAX_DISPUTE_TRAINING_TASK_FAMILIES))
          .length(TAX_DISPUTE_TRAINING_TASK_FAMILIES.length),
        sourcePolicy: z.literal(
          "approved-public-case-packets-plus-taxsorted-derived-labels",
        ),
        caseLevelSplit: z.literal(true),
        currentUse: z.literal("format-and-evaluation-seed"),
      })
      .strict(),
    boundaries: z.array(text).min(1).max(30),
  })
  .strict()
  .openapi("UkTaxDisputeFramework");

const taxDisputeDimensionSchema = z
  .object({
    id: z.enum(TAX_DISPUTE_DIMENSION_IDS),
    order: z.number().int().positive().max(100),
    title: shortText,
    state: z.enum(TAX_DISPUTE_DIMENSION_STATES),
    question: text,
    reading: text,
    casePointers: z.array(casePointer).max(100),
    sourceIds: z.array(sourceId).max(100),
    gaps: z.array(text).max(30),
  })
  .strict();

const taxDisputeMajorChallengeSchema = z
  .object({
    id: semanticId,
    kind: z.enum(TAX_DISPUTE_CHALLENGE_KINDS),
    materiality: z.enum(TAX_DISPUTE_CHALLENGE_MATERIALITY),
    state: z.enum(TAX_DISPUTE_CHALLENGE_STATES),
    description: text,
    impact: text,
    evidenceNeeded: z.array(text).min(1).max(30),
    blockers: z.array(text).max(30),
    resolution: text,
    casePointers: z.array(casePointer).min(1).max(100),
    sourceIds: z.array(sourceId).min(1).max(100),
  })
  .strict();

const taxDisputeReasonStepSchema = z
  .object({
    id: semanticId,
    decisiveness: z.enum(TAX_DISPUTE_REASON_STATES),
    issueBranch: semanticId,
    proposition: text,
    casePointers: z.array(casePointer).min(1).max(100),
    sourceIds: z.array(sourceId).min(1).max(100),
    sourcePinpoints: z
      .array(
        z
          .object({
            sourceId,
            locator: shortText,
          })
          .strict(),
      )
      .max(30),
    gaps: z.array(text).max(30),
  })
  .strict();

const taxDisputeOutcomeSchema = z
  .object({
    status: z.string().trim().min(1).max(200),
    summary: text,
    casePointers: z.array(casePointer).min(1).max(100),
    sourceIds: z.array(sourceId).min(1).max(100),
  })
  .strict();

export const taxDisputeInterpretationSchema = z
  .object({
    schema: z.literal("taxsorted.uk.tax-dispute-interpretation/1"),
    frameworkVersion: z.string().min(1).max(100),
    packet: z
      .object({
        schema: z.literal("taxsorted.uk.case-packet/1"),
        digest,
        corpusVersion: z.string().min(1).max(100),
        lawAsAt: date,
      })
      .strict(),
    case: z
      .object({
        id: sourceId,
        slug: sourceId,
        title: shortText,
        citation: shortText,
        territory: shortText,
        subject: shortText,
        status: z.string().min(1).max(100),
      })
      .strict(),
    dimensions: z
      .array(taxDisputeDimensionSchema)
      .length(TAX_DISPUTE_DIMENSION_IDS.length),
    majorChallenges: z
      .array(taxDisputeMajorChallengeSchema)
      .min(1)
      .max(50),
    reasoning: z
      .object({
        hiddenChainOfThought: z.literal(false),
        publicRationaleOnly: z.literal(true),
        holding: text,
        decisiveReasonIds: z.array(semanticId).min(1).max(30),
        steps: z.array(taxDisputeReasonStepSchema).min(1).max(50),
      })
      .strict(),
    outcomes: z
      .object({
        procedural: taxDisputeOutcomeSchema,
        underlyingMerits: taxDisputeOutcomeSchema,
        money: taxDisputeOutcomeSchema,
      })
      .strict(),
    review: z
      .object({
        adapter: z.string().min(1).max(200),
        qualifiedLegalReviewAsserted: z.literal(false),
        sourcePacketDigestSupplied: z.literal(true),
        limits: text,
      })
      .strict(),
    boundaries: z.array(text).min(1).max(30),
  })
  .strict()
  .openapi("UkTaxDisputeInterpretation");

export const taxDisputeWhyGraphSchema = WhyGraphSchema;

const taxDisputeTrainingCaseSchema = z
  .object({
    id: sourceId,
    slug: sourceId,
    citation: shortText,
    packetDigest: digest,
    packetHref: z
      .string()
      .regex(/^\/v1\/case-commons\/uk\/cases\/[a-z0-9-]+$/),
  })
  .strict();

const taxDisputeTrainingDerivedSchema = z
  .object({
    frameworkVersion: z.string().min(1).max(100),
    adapter: z.string().min(1).max(200),
    taxSortedDerivedLabels: z.literal(true),
    qualifiedLegalReviewAsserted: z.literal(false),
  })
  .strict();

const taxDisputeTrainingProvenanceSchema = z
  .object({
    sourceIds: z.array(sourceId).min(1).max(200),
    casePointers: z.array(casePointer).min(1).max(200),
  })
  .strict();

const taxDisputeTrainingSafetySchema = z
  .object({
    sourcePacketApproved: z.literal(true),
    taxSortedDerivedLabels: z.literal(true),
    qualifiedLegalReviewAsserted: z.literal(false),
    containsPrivateMatterFacts: z.literal(false),
    hiddenChainOfThought: z.literal(false),
    outcomePrediction: z.literal(false),
  })
  .strict();

const taxDisputeTrainingCommonShape = {
  schema: z.literal("taxsorted.uk.tax-dispute-training-example/1"),
  id: semanticId,
  split: z.literal("evaluation"),
  derived: taxDisputeTrainingDerivedSchema,
  case: taxDisputeTrainingCaseSchema,
  instruction: text,
  provenance: taxDisputeTrainingProvenanceSchema,
  safety: taxDisputeTrainingSafetySchema,
} as const;

const trainingPacketInputShape = {
  packet: z
    .object({
      href: z
        .string()
        .regex(/^\/v1\/case-commons\/uk\/cases\/[a-z0-9-]+$/),
      digest,
    })
    .strict(),
} as const;

const trainingDimensionStateRecordSchema = z.record(
  z.enum(TAX_DISPUTE_DIMENSION_IDS),
  z.enum(TAX_DISPUTE_DIMENSION_STATES),
);

export const taxDisputeTrainingExampleSchema = z
  .discriminatedUnion("taskFamily", [
    z
      .object({
        ...taxDisputeTrainingCommonShape,
        taskFamily: z.literal("map-dimensions"),
        input: z
          .object({
            ...trainingPacketInputShape,
            caseId: sourceId,
            frameworkVersion: z.string().min(1).max(100),
          })
          .strict(),
        expectedOutput: z
          .object({
            dimensions: z
              .array(
                z
                  .object({
                    id: z.enum(TAX_DISPUTE_DIMENSION_IDS),
                    state: z.enum(TAX_DISPUTE_DIMENSION_STATES),
                    reading: text,
                    gaps: z.array(text).max(30),
                  })
                  .strict(),
              )
              .length(TAX_DISPUTE_DIMENSION_IDS.length),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...taxDisputeTrainingCommonShape,
        taskFamily: z.literal("identify-decisive-reasons"),
        input: z
          .object({
            ...trainingPacketInputShape,
            caseId: sourceId,
            holding: text,
          })
          .strict(),
        expectedOutput: z
          .object({
            holding: text,
            decisiveReasonIds: z.array(semanticId).min(1).max(30),
            steps: z
              .array(
                z
                  .object({
                    id: semanticId,
                    decisiveness: z.enum(TAX_DISPUTE_REASON_STATES),
                    issueBranch: semanticId,
                    proposition: text,
                    gaps: z.array(text).max(30),
                  })
                  .strict(),
              )
              .min(1)
              .max(50),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...taxDisputeTrainingCommonShape,
        taskFamily: z.literal("separate-outcomes"),
        input: z
          .object({
            ...trainingPacketInputShape,
            caseId: sourceId,
            holding: text,
          })
          .strict(),
        expectedOutput: z
          .object({
            outcomes: z
              .object({
                procedural: taxDisputeOutcomeSchema,
                underlyingMerits: taxDisputeOutcomeSchema,
                money: taxDisputeOutcomeSchema,
              })
              .strict(),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...taxDisputeTrainingCommonShape,
        taskFamily: z.literal("identify-major-challenges"),
        input: z
          .object({
            ...trainingPacketInputShape,
            caseId: sourceId,
            dimensionStates: trainingDimensionStateRecordSchema,
          })
          .strict(),
        expectedOutput: z
          .object({
            majorChallenges: z
              .array(taxDisputeMajorChallengeSchema)
              .min(1)
              .max(50),
          })
          .strict(),
      })
      .strict(),
  ])
  .openapi("UkTaxDisputeTrainingExample");

const taxDisputeDerivedReleaseCaseSchema = z
  .object({
    caseId: sourceId,
    packetDigest: digest,
    adapter: z.string().min(1).max(200),
    interpretationDigest: digest,
    whyGraphDigest: digest,
    trainingExampleDigests: z
      .array(digest)
      .length(TAX_DISPUTE_TRAINING_TASK_FAMILIES.length),
  })
  .strict();

export const taxDisputeDerivedReleaseSchema = z
  .object({
    schema: z.literal("taxsorted.uk.tax-dispute-derived-release/1"),
    frameworkVersion: z.string().min(1).max(100),
    corpusVersion: z.string().min(1).max(100),
    lawAsAt: date,
    cases: z.array(taxDisputeDerivedReleaseCaseSchema).min(1).max(10_000),
    digest,
  })
  .strict()
  .openapi("UkTaxDisputeDerivedRelease");

const pendingTaxDisputePublicationApprovalSchema = z
  .object({
    schema: z.literal(
      "taxsorted.uk.tax-dispute-interpretation-publication-approval/1",
    ),
    status: z.literal("pending-review"),
    decisionRecordedOn: z.null(),
    frameworkVersion: z.string().min(1).max(100),
    corpusVersion: z.string().min(1).max(100),
    releaseDigest: z.null(),
    caseIds: z.array(sourceId).max(10_000),
    effects: text,
  })
  .strict();

const approvedTaxDisputePublicationApprovalSchema = z
  .object({
    schema: z.literal(
      "taxsorted.uk.tax-dispute-interpretation-publication-approval/1",
    ),
    status: z.literal("approved-for-publication"),
    decisionRecordedOn: date,
    frameworkVersion: z.string().min(1).max(100),
    corpusVersion: z.string().min(1).max(100),
    releaseDigest: digest,
    caseIds: z.array(sourceId).min(1).max(10_000),
    effects: text,
  })
  .strict();

export const taxDisputeInterpretationPublicationApprovalSchema =
  z.discriminatedUnion("status", [
    pendingTaxDisputePublicationApprovalSchema,
    approvedTaxDisputePublicationApprovalSchema,
  ]);

export type TaxDisputeInterpretationPublicationApproval = z.infer<
  typeof taxDisputeInterpretationPublicationApprovalSchema
>;

const taxDisputeTaskFamilySchema = z
  .object({
    id: z.enum(TAX_DISPUTE_TRAINING_TASK_FAMILIES),
    description: text,
  })
  .strict();

export const taxDisputeTrainingManifestSchema = z
  .object({
    schema: z.literal("taxsorted.uk.tax-dispute-training/1"),
    frameworkVersion: z.string().min(1).max(100),
    corpusVersion: z.string().min(1).max(100),
    lawAsAt: date,
    derivedRelease: taxDisputeDerivedReleaseSchema,
    labelReview: z
      .object({
        taxSortedDerivedLabels: z.literal(true),
        qualifiedLegalReviewAsserted: z.literal(false),
        exactDerivedReleaseApprovalRequired: z.literal(true),
      })
      .strict(),
    currentUse: z.literal("format-and-evaluation-seed"),
    outcomePrediction: z.literal(false),
    sourcePolicy: z.literal(
      "approved-public-case-packets-plus-taxsorted-derived-labels",
    ),
    caseCount: z.number().int().positive(),
    exampleCount: z.number().int().positive(),
    caseLevelSplit: z.literal(true),
    taskFamilies: z
      .array(taxDisputeTaskFamilySchema)
      .length(TAX_DISPUTE_TRAINING_TASK_FAMILIES.length),
    sufficiency: z
      .object({
        claimed: z.literal(false),
        reason: text,
      })
      .strict(),
    dataUse: z
      .object({
        runtimeRequestsUsedForTraining: z.literal(false),
        privateAssessmentsUsedForTraining: z.literal(false),
        userDataUsedForTraining: z.literal(false),
      })
      .strict(),
    routes: z
      .object({
        examples: z.literal(
          "/v1/case-commons/uk/training/examples",
        ),
        ndjson: z.literal(
          "/v1/case-commons/uk/training/examples.ndjson",
        ),
        schema: z.literal("/v1/case-commons/uk/training/schema"),
        rights: z.literal("/v1/case-commons/uk/rights"),
      })
      .strict(),
    boundaries: z.array(text).min(1).max(30),
  })
  .strict()
  .openapi("UkTaxDisputeTrainingManifest");

export const taxDisputeTrainingBundleSchema = z
  .object({
    schema: z.literal("taxsorted.uk.tax-dispute-training-bundle/1"),
    frameworkVersion: z.string().min(1).max(100),
    corpusVersion: z.string().min(1).max(100),
    lawAsAt: date,
    derivedReleaseDigest: digest,
    manifest: taxDisputeTrainingManifestSchema,
    examples: z.array(taxDisputeTrainingExampleSchema).min(1).max(10_000),
  })
  .strict()
  .openapi("UkTaxDisputeTrainingBundle");

export const taxDisputeAgentSchema = z
  .object({
    schema: z.literal("taxsorted.uk.tax-dispute-agent/1"),
    frameworkVersion: z.string().min(1).max(100),
    purpose: text,
    access: z
      .object({
        authentication: z.literal("none"),
        methods: z.tuple([z.literal("GET"), z.literal("HEAD")]),
        writes: z.literal(false),
        acceptsPrivateFacts: z.literal(false),
      })
      .strict(),
    dataUse: z
      .object({
        sourcePolicy: z.literal(
          "approved-public-case-packets-plus-taxsorted-derived-labels",
        ),
        runtimeRequestsUsedForTraining: z.literal(false),
        privateAssessmentsUsedForTraining: z.literal(false),
        userDataUsedForTraining: z.literal(false),
      })
      .strict(),
    steps: z
      .array(
        z
          .object({
            id: z.enum([
              "read-framework",
              "list-cases",
              "read-packet",
              "read-interpretation",
              "walk-why-graph",
              "verify-sources",
            ]),
            order: z.number().int().positive(),
            method: z.literal("GET"),
            href: z.string().min(1).max(500),
            instruction: text,
          })
          .strict(),
      )
      .length(6),
    boundaries: z.array(text).min(1).max(30),
  })
  .strict()
  .openapi("UkTaxDisputeAgent");

export const taxDisputeFramework =
  taxDisputeFrameworkSchema.parse(TAX_DISPUTE_FRAMEWORK);

export const taxDisputeAgent = taxDisputeAgentSchema.parse({
  schema: "taxsorted.uk.tax-dispute-agent/1",
  frameworkVersion: TAX_DISPUTE_FRAMEWORK.version,
  purpose:
    "Give agents a stable read order from framework to approved packet, interpretation, why-graph and official sources without accepting a private matter or predicting its outcome.",
  access: {
    authentication: "none",
    methods: ["GET", "HEAD"],
    writes: false,
    acceptsPrivateFacts: false,
  },
  dataUse: {
    sourcePolicy:
      "approved-public-case-packets-plus-taxsorted-derived-labels",
    runtimeRequestsUsedForTraining: false,
    privateAssessmentsUsedForTraining: false,
    userDataUsedForTraining: false,
  },
  steps: [
    {
      id: "read-framework",
      order: 1,
      method: "GET",
      href: "/v1/case-commons/uk/interpretation",
      instruction:
        "Read the dimensions, challenge meanings, reasoning labels and boundaries before interpreting a case.",
    },
    {
      id: "list-cases",
      order: 2,
      method: "GET",
      href: "/v1/case-commons/uk/cases",
      instruction:
        "List currently admitted public case IDs. Do not guess an unpublished or stopped case.",
    },
    {
      id: "read-packet",
      order: 3,
      method: "GET",
      href: "/v1/case-commons/uk/cases/{caseId}",
      instruction:
        "Fetch the complete source-resolving packet and retain its digest, warning and money meanings.",
    },
    {
      id: "read-interpretation",
      order: 4,
      method: "GET",
      href: "/v1/case-commons/uk/cases/{caseId}/interpretation",
      instruction:
        "Read mapped, partial and not-mapped dimensions, major challenges, public reasons and separate outcomes.",
    },
    {
      id: "walk-why-graph",
      order: 5,
      method: "GET",
      href: "/v1/case-commons/uk/cases/{caseId}/why-graph",
      instruction:
        "Start at rootNodeId and traverse decisive or supporting reasons to claims, sources, consequences and explicit gaps.",
    },
    {
      id: "verify-sources",
      order: 6,
      method: "GET",
      href: "/v1/case-commons/uk/sources",
      instruction:
        "Resolve every source ID and check the current official document, its support and its limitations before relying on a claim.",
    },
  ],
  boundaries: [
    ...TAX_DISPUTE_FRAMEWORK.boundaries,
    "Case-specific interpretations, WhyGraphs and training examples require a separate approval for the exact derived-release digest.",
    "TaxSorted-derived labels do not inherit approval from the source packet.",
    "Keep a new person's facts in their local or approved confidential matter system.",
    "Do not infer that similarity to a decided case creates the same route, result or money outcome.",
  ],
});

const defaultTaxDisputeInterpretationPublicationApprovalPath =
  fileURLToPath(
    new URL(
      "../../research/uk/case-commons/data/interpretation-publication-approval.json",
      import.meta.url,
    ),
  );

export function loadTaxDisputeInterpretationPublicationApproval(
  path = defaultTaxDisputeInterpretationPublicationApprovalPath,
) {
  return taxDisputeInterpretationPublicationApprovalSchema.parse(
    JSON.parse(readFileSync(path, "utf8")),
  );
}

export const ukTaxDisputeInterpretationPublicationApproval =
  loadTaxDisputeInterpretationPublicationApproval();

function canonicalDigest(value: unknown): `sha256:${string}` {
  return `sha256:${createHash("sha256")
    .update(canonicalJson(value), "utf8")
    .digest("hex")}`;
}

function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function decodePointerPart(value: string): string {
  return value.replace(/~1/gu, "/").replace(/~0/gu, "~");
}

function resolvesCasePointer(
  caseRecord: CaseCommonsCase,
  pointer: string,
): boolean {
  let current: unknown = caseRecord;
  for (const rawPart of pointer.slice(1).split("/")) {
    const part = decodePointerPart(rawPart);
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9]\d*)$/u.test(part)) return false;
      const index = Number(part);
      if (index >= current.length) return false;
      current = current[index];
      continue;
    }
    if (
      !current ||
      typeof current !== "object" ||
      !Object.prototype.hasOwnProperty.call(current, part)
    ) {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return true;
}

function collectNamedStringArrays(
  value: unknown,
  keyName: "sourceIds" | "casePointers",
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      collectNamedStringArrays(item, keyName),
    );
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => [
    ...(key === keyName && Array.isArray(nested)
      ? nested.map(String)
      : []),
    ...collectNamedStringArrays(nested, keyName),
  ]);
}

function validateInterpretationBindings(
  interpretation: z.infer<typeof taxDisputeInterpretationSchema>,
  caseRecord: CaseCommonsCase,
  packet: NonNullable<ReturnType<typeof makeCaseCommonsPacket>>,
) {
  const issues: string[] = [];
  if (
    interpretation.packet.schema !== packet.schema ||
    interpretation.packet.digest !== packet.integrity.digest ||
    interpretation.packet.corpusVersion !== packet.corpusVersion ||
    interpretation.packet.lawAsAt !== packet.lawAsAt
  ) {
    issues.push("interpretation packet binding does not match source packet");
  }
  if (
    interpretation.case.id !== caseRecord.id ||
    interpretation.case.slug !== caseRecord.slug
  ) {
    issues.push("interpretation case identity does not match source packet");
  }
  interpretation.dimensions.forEach((dimension, index) => {
    if (
      dimension.id !== TAX_DISPUTE_DIMENSION_IDS[index] ||
      dimension.order !== index + 1
    ) {
      issues.push("dimensions must follow the complete framework order");
    }
  });
  const stepById = new Map(
    interpretation.reasoning.steps.map((step) => [step.id, step]),
  );
  for (const reasonId of interpretation.reasoning.decisiveReasonIds) {
    if (stepById.get(reasonId)?.decisiveness !== "decisive") {
      issues.push(`decisive reason ${reasonId} does not resolve as decisive`);
    }
  }
  if (
    new Set(interpretation.reasoning.steps.map((step) => step.id)).size !==
      interpretation.reasoning.steps.length ||
    new Set(
      interpretation.majorChallenges.map((challenge) => challenge.id),
    ).size !== interpretation.majorChallenges.length
  ) {
    issues.push("reason and challenge IDs must be unique");
  }
  const knownSourceIds = new Set(packet.sources.map((source) => source.id));
  const referencedSourceIds = [
    ...collectNamedStringArrays(interpretation, "sourceIds"),
    ...interpretation.reasoning.steps.flatMap((step) =>
      step.sourcePinpoints.map((pinpoint) => pinpoint.sourceId),
    ),
  ];
  for (const referencedSourceId of referencedSourceIds) {
    if (!knownSourceIds.has(referencedSourceId)) {
      issues.push(`unknown source ID ${referencedSourceId}`);
    }
  }
  for (const pointer of collectNamedStringArrays(
    interpretation,
    "casePointers",
  )) {
    if (!resolvesCasePointer(caseRecord, pointer)) {
      issues.push(`case pointer does not resolve: ${pointer}`);
    }
  }
  if (issues.length) {
    throw new Error(
      `Tax-dispute interpretation binding invalid:\n- ${[
        ...new Set(issues),
      ].join("\n- ")}`,
    );
  }
  return interpretation;
}

export function makeTaxDisputeInterpretation(
  caseRecord: CaseCommonsCase,
  corpus: UkCaseCommons,
) {
  const packet = makeCaseCommonsPacket(caseRecord.id, corpus);
  if (!packet) {
    throw new Error(`Cannot build packet for case ${caseRecord.id}`);
  }
  const interpretation = taxDisputeInterpretationSchema.parse(
    buildUkTaxDisputeInterpretation({
      caseRecord,
      corpusVersion: corpus.meta.version,
      lawAsAt: corpus.meta.lawAsAt,
      sourcePacket: {
        schema: packet.schema,
        digest: packet.integrity.digest,
      },
    }),
  );
  return validateInterpretationBindings(
    interpretation,
    caseRecord,
    packet,
  );
}

export function makeTaxDisputeWhyGraph(
  interpretation: z.infer<typeof taxDisputeInterpretationSchema>,
) {
  return taxDisputeWhyGraphSchema.parse(
    buildTaxDisputeWhyGraph(interpretation),
  );
}

const taskFamilyDescriptions: Record<
  (typeof TAX_DISPUTE_TRAINING_TASK_FAMILIES)[number],
  string
> = {
  "map-dimensions":
    "Map all twelve dimensions while preserving partial and not-mapped states.",
  "identify-decisive-reasons":
    "Separate concise decisive public reasons, supporting reasons and boundaries.",
  "separate-outcomes":
    "Keep procedural disposition, underlying merits and money meaning separate.",
  "identify-major-challenges":
    "Name material interpretation challenges, their impact, evidence needs, blockers and resolution.",
};

export function makeTaxDisputeDerivedRelease(
  caseRecords: readonly CaseCommonsCase[],
  corpus: UkCaseCommons,
) {
  if (caseRecords.length === 0) {
    throw new Error("A tax-dispute derived release needs at least one case");
  }
  const orderedCaseRecords = [...caseRecords].sort((left, right) =>
    compareAscii(left.id, right.id),
  );
  const resources = orderedCaseRecords.map((caseRecord) => {
    const interpretation = makeTaxDisputeInterpretation(
      caseRecord,
      corpus,
    );
    const whyGraph = makeTaxDisputeWhyGraph(interpretation);
    const examples = buildTaxDisputeTrainingExamples(
      interpretation,
    ).map((example) =>
      taxDisputeTrainingExampleSchema.parse(example),
    );
    return {
      caseRecord,
      interpretation,
      whyGraph,
      examples,
    };
  });
  const releasePreimage = {
    schema: "taxsorted.uk.tax-dispute-derived-release/1" as const,
    frameworkVersion: TAX_DISPUTE_FRAMEWORK.version,
    corpusVersion: corpus.meta.version,
    lawAsAt: corpus.meta.lawAsAt,
    cases: resources.map(
      ({ caseRecord, interpretation, whyGraph, examples }) => ({
        caseId: caseRecord.id,
        packetDigest: interpretation.packet.digest,
        adapter: interpretation.review.adapter,
        interpretationDigest: canonicalDigest(interpretation),
        whyGraphDigest: canonicalDigest(whyGraph),
        trainingExampleDigests: examples.map(canonicalDigest),
      }),
    ),
  };
  const release = taxDisputeDerivedReleaseSchema.parse({
    ...releasePreimage,
    digest: canonicalDigest(releasePreimage),
  });
  return {
    release,
    resources,
    interpretations: resources.map(
      ({ interpretation }) => interpretation,
    ),
    whyGraphs: resources.map(({ whyGraph }) => whyGraph),
    examples: resources.flatMap(({ examples }) => examples),
  };
}

function sameAsciiSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const leftSorted = [...new Set(left)].sort(compareAscii);
  const rightSorted = [...new Set(right)].sort(compareAscii);
  return (
    leftSorted.length === left.length &&
    rightSorted.length === right.length &&
    leftSorted.length === rightSorted.length &&
    leftSorted.every((value, index) => value === rightSorted[index])
  );
}

export function taxDisputePublicationApprovalCanOpen(
  approval: TaxDisputeInterpretationPublicationApproval,
  corpus: UkCaseCommons,
  caseIds: readonly string[],
) {
  return (
    approval.status === "approved-for-publication" &&
    approval.frameworkVersion === TAX_DISPUTE_FRAMEWORK.version &&
    approval.corpusVersion === corpus.meta.version &&
    sameAsciiSet(approval.caseIds, caseIds)
  );
}

export function evaluateTaxDisputeInterpretationPublicationApproval(
  release: z.infer<typeof taxDisputeDerivedReleaseSchema>,
  approval: TaxDisputeInterpretationPublicationApproval,
) {
  const releaseCaseIds = release.cases.map(({ caseId }) => caseId);
  const approved =
    approval.status === "approved-for-publication" &&
    approval.frameworkVersion === release.frameworkVersion &&
    approval.corpusVersion === release.corpusVersion &&
    approval.releaseDigest === release.digest &&
    sameAsciiSet(approval.caseIds, releaseCaseIds);
  return {
    approved,
    approvedCaseIds: approved ? releaseCaseIds : [],
    reason: approved
      ? "exact-derived-release-approved"
      : approval.status === "pending-review"
        ? "derived-release-review-pending"
        : "derived-release-approval-does-not-match",
  } as const;
}

export function isTaxDisputeInterpretationPublicationCurrent(
  caseRecords: readonly CaseCommonsCase[],
  corpus: UkCaseCommons,
  approval: TaxDisputeInterpretationPublicationApproval,
) {
  if (
    !taxDisputePublicationApprovalCanOpen(
      approval,
      corpus,
      caseRecords.map(({ id }) => id),
    )
  ) {
    return false;
  }
  try {
    const prepared = makeTaxDisputeDerivedRelease(
      caseRecords,
      corpus,
    );
    return evaluateTaxDisputeInterpretationPublicationApproval(
      prepared.release,
      approval,
    ).approved;
  } catch {
    return false;
  }
}

export function makeTaxDisputeTrainingResources(
  caseRecords: readonly CaseCommonsCase[],
  corpus: UkCaseCommons,
  preparedRelease = makeTaxDisputeDerivedRelease(
    caseRecords,
    corpus,
  ),
) {
  const expectedCaseIds = caseRecords.map(({ id }) => id);
  const releaseCaseIds = preparedRelease.release.cases.map(
    ({ caseId }) => caseId,
  );
  if (!sameAsciiSet(expectedCaseIds, releaseCaseIds)) {
    throw new Error(
      "Tax-dispute training cases do not match the derived release",
    );
  }
  const { examples } = preparedRelease;
  const manifest = taxDisputeTrainingManifestSchema.parse({
    schema: "taxsorted.uk.tax-dispute-training/1",
    frameworkVersion: TAX_DISPUTE_FRAMEWORK.version,
    corpusVersion: corpus.meta.version,
    lawAsAt: corpus.meta.lawAsAt,
    derivedRelease: preparedRelease.release,
    labelReview: {
      taxSortedDerivedLabels: true,
      qualifiedLegalReviewAsserted: false,
      exactDerivedReleaseApprovalRequired: true,
    },
    currentUse: "format-and-evaluation-seed",
    outcomePrediction: false,
    sourcePolicy:
      "approved-public-case-packets-plus-taxsorted-derived-labels",
    caseCount: caseRecords.length,
    exampleCount: examples.length,
    caseLevelSplit: true,
    taskFamilies: TAX_DISPUTE_TRAINING_TASK_FAMILIES.map((taskFamily) => ({
      id: taskFamily,
      description: taskFamilyDescriptions[taskFamily],
    })),
    sufficiency: {
      claimed: false,
      reason:
        "One current deep case cannot represent UK tax disputes or support a general training-sufficiency claim.",
    },
    dataUse: {
      runtimeRequestsUsedForTraining: false,
      privateAssessmentsUsedForTraining: false,
      userDataUsedForTraining: false,
    },
    routes: {
      examples: "/v1/case-commons/uk/training/examples",
      ndjson: "/v1/case-commons/uk/training/examples.ndjson",
      schema: "/v1/case-commons/uk/training/schema",
      rights: "/v1/case-commons/uk/rights",
    },
    boundaries: [
      "Format examples and evaluation seeds, not a sufficient or representative training corpus.",
      "No outcome prediction, win scoring or automated legal advice.",
      "Keep examples from the same case in one split.",
      "Linked source material keeps its upstream rights and reuse conditions.",
      "The case packet remains canonical.",
      "Interpretive labels are TaxSorted-derived and publish only under an exact derived-release approval.",
      "Qualified legal review is not asserted.",
    ],
  });
  const bundle = taxDisputeTrainingBundleSchema.parse({
    schema: "taxsorted.uk.tax-dispute-training-bundle/1",
    frameworkVersion: TAX_DISPUTE_FRAMEWORK.version,
    corpusVersion: corpus.meta.version,
    lawAsAt: corpus.meta.lawAsAt,
    derivedReleaseDigest: preparedRelease.release.digest,
    manifest,
    examples,
  });
  const filenameVersion = corpus.meta.version
    .replace(/[^A-Za-z0-9._-]/gu, "-")
    .slice(0, 100);
  const filenameFrameworkVersion = TAX_DISPUTE_FRAMEWORK.version
    .replace(/[^A-Za-z0-9._-]/gu, "-")
    .slice(0, 100);
  const releaseDigestPrefix = preparedRelease.release.digest
    .slice("sha256:".length, "sha256:".length + 12);
  return {
    release: preparedRelease.release,
    interpretations: preparedRelease.interpretations,
    whyGraphs: preparedRelease.whyGraphs,
    manifest,
    bundle,
    examples,
    ndjson: `${examples.map((example) => canonicalJson(example)).join("\n")}\n`,
    filename:
      `taxsorted-uk-tax-dispute-examples-${filenameVersion}-${filenameFrameworkVersion}-${releaseDigestPrefix}.ndjson`,
  };
}

export const taxDisputeInterpretationJsonSchema = {
  ...z.toJSONSchema(taxDisputeInterpretationSchema),
  $id:
    "https://api.taxsorted.io/v1/case-commons/uk/interpretation/schema",
  title: "TaxSorted UK tax-dispute interpretation",
  description:
    "Strict derived view of one approved public case packet across twelve dimensions, major challenges, concise public reasons and separate outcomes.",
  "x-taxsorted-runtime-invariants": [
    "All twelve dimensions appear once and in framework order.",
    "Every source ID resolves inside the exact digest-bearing case packet.",
    "Every case pointer resolves inside the packet's canonical case record.",
    "Every decisive reason ID resolves to a step labelled decisive.",
    "Reason and challenge IDs are unique.",
    "No private facts, hidden chain-of-thought or outcome prediction is admitted.",
  ],
  "x-taxsorted-effects":
    "Read-only public research; no intake, assessment, prediction, filing, outreach or external state change.",
} as const;

export const taxDisputeTrainingJsonSchema = {
  ...z.toJSONSchema(taxDisputeTrainingExampleSchema),
  $id: "https://api.taxsorted.io/v1/case-commons/uk/training/schema",
  title: "TaxSorted UK tax-dispute training example",
  description:
    "Strict task-shaped projection of an approved public case packet with case-level split, provenance and safety fields.",
  "x-taxsorted-source-policy":
    "approved-public-case-packets-plus-taxsorted-derived-labels",
  "x-taxsorted-current-use": "format-and-evaluation-seed",
  "x-taxsorted-training-exclusions": [
    "runtime requests",
    "private assessments",
    "user data",
    "hidden chain-of-thought",
    "outcome prediction",
  ],
} as const;
