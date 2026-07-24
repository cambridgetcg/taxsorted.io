// A source-resolving public-law case packet. The corpus contains decided
// public records only. It never decides a new person's case, predicts success,
// brokers a professional introduction or stores a private matter file.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { canonicalJson } from "./open-data.js";

const strictObject = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).strict();
const text = z.string().trim().min(1);
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const httpsUrl = z.string().url().refine((value) => value.startsWith("https://"), {
  message: "URL must use HTTPS",
});
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "invalid calendar date");
const nonEmptyStrings = z.array(text).min(1);
const sourceIds = z
  .array(id)
  .min(1)
  .refine(
    (values) => new Set(values).size === values.length,
    "source references must be unique",
  );

export const caseCommonsSourceSchema = strictObject({
  id,
  title: text,
  publisher: text,
  url: httpsUrl,
  kind: z.enum([
    "official-court-case-page",
    "court-judgment",
    "official-court-summary",
    "official-tribunal-decision-page",
    "official-court-procedure",
    "official-professional-register-guidance",
    "official-professional-register",
    "primary-legislation",
    "official-tax-guidance",
    "official-tribunal-guidance",
    "official-professional-guidance",
    "official-regulator-guidance",
    "official-data-protection-guidance",
  ]),
  status: z.enum(["current", "decided", "permission-refused"]),
  retrievedAt: date,
  supports: nonEmptyStrings,
  limitations: nonEmptyStrings,
});

const protocolStepSchema = strictObject({
  id,
  order: z.number().int().positive(),
  question: text,
  stopIf: text,
});

const qualificationCheckSchema = strictObject({
  id,
  role: text,
  check: text,
  sourceIds,
});

export const caseCommonsProtocolSchema = strictObject({
  id: z.literal("claim-to-remedy"),
  title: text,
  steps: z.array(protocolStepSchema).min(1),
  epistemicStates: z
    .array(
      z.enum([
        "party-position",
        "official-record",
        "court-finding",
        "later-procedural-outcome",
        "taxsorted-analysis",
        "unknown",
      ]),
    )
    .min(1),
  financialLanguage: strictObject({
    amountAffected: text,
    grossRecovery: text,
    netRecovery: text,
    expectedValue: text,
    damagesBoundary: text,
    illustrativeRangeRule: text,
  }),
  routeMap: z.array(
    strictObject({
      id,
      title: text,
      mayDo: text,
      moneyBoundary: text,
      firstCheck: text,
      sourceIds,
    }),
  ).min(1),
  decentralisation: strictObject({
    publicPacket: text,
    privateSupplement: text,
    digestMeaning: text,
    signatureMeaning: text,
    forkRule: text,
    noCentralSelection: text,
  }),
  professionalHandoff: strictObject({
    status: z.literal("method-only-no-brokerage"),
    firstContact: text,
    defendantContact: text,
    neverPublish: nonEmptyStrings,
    qualificationChecks: z.array(qualificationCheckSchema).min(1),
    minimumAssessment: nonEmptyStrings,
  }),
  costsAndFunding: strictObject({
    warning: text,
    noRiskClaims: text,
    sourceIds,
  }),
  marketplaceBoundary: strictObject({
    status: z.literal("closed-pending-regulatory-review"),
    notLive: nonEmptyStrings,
    reason: text,
    sourceIds,
  }),
  publicationSafety: strictObject({
    findingLanguage: text,
    activeCaseRule: text,
    personalDataRule: text,
    rightOfReply: text,
    sourceIds,
  }),
  stopConditions: nonEmptyStrings,
});

const caseTimelineSchema = strictObject({
  date,
  datePrecision: z.enum(["day", "month", "year"]),
  state: z.enum([
    "official-record",
    "court-finding",
    "later-procedural-outcome",
  ]),
  event: text,
  sourceIds,
});

const labelledStatementSchema = strictObject({
  id,
  state: z.enum([
    "official-record",
    "court-finding",
    "later-procedural-outcome",
    "taxsorted-analysis",
  ]),
  statement: text,
  sourceIds,
});

const remedySchema = strictObject({
  id,
  kind: z.literal("quashing-order"),
  status: z.literal("granted"),
  effect: text,
  notEffect: text,
  sourceIds,
});

const documentedAmountSchema = strictObject({
  id,
  amountPence: z.number().int().nonnegative(),
  kind: z.enum([
    "upfront-demand-quashed",
    "derived-historical-contingent-exposure",
  ]),
  meaning: text,
  notMeaning: text,
  sourceIds,
});

const professionalContactSchema = strictObject({
  order: z.number().int().positive(),
  party: text,
  when: text,
  why: text,
  publicContactPublished: z.literal(false),
});

export const caseCommonsCaseSchema = strictObject({
  id,
  slug: id,
  title: text,
  citation: text,
  territory: z.literal("England and Wales"),
  subject: text,
  caseStatus: z.literal("decided"),
  publicationStatus: z.literal("admitted-decided-public-record"),
  publicBody: strictObject({
    name: text,
    role: text,
    findingBoundary: text,
  }),
  publicInterestQuestion: text,
  whyItMatters: text,
  controversyLabel: strictObject({
    state: z.literal("court-determined-public-law-dispute"),
    statement: text,
  }),
  timeline: z.array(caseTimelineSchema).min(1),
  findings: z.array(labelledStatementSchema).min(1),
  counterweights: z.array(labelledStatementSchema).min(1),
  remedies: z.array(remedySchema).min(1),
  financialEffect: strictObject({
    headline: text,
    status: z.literal("documented-amount-affected-not-recovery"),
    currency: z.literal("GBP"),
    documentedAmounts: z.array(documentedAmountSchema).min(1),
    damagesAward: strictObject({
      status: z.literal("none-identified"),
      amountPence: z.null(),
      reason: text,
    }),
    netRecovery: strictObject({
      status: z.literal("not-established"),
      amountPence: z.null(),
      reason: text,
    }),
    professionalValuationQuestions: nonEmptyStrings,
    downside: strictObject({
      status: z.literal("not-quantified"),
      minimumScenario: text,
      reason: text,
      sourceIds,
    }),
    successProbabilityPublished: z.literal(false),
  }),
  applicability: strictObject({
    reasoningPattern: text,
    possibleSignals: nonEmptyStrings,
    notEnough: nonEmptyStrings,
    assessmentRoute: text,
    sourceIds,
  }),
  professionalHandoff: strictObject({
    status: z.literal("historical-example-no-live-claimant-handoff"),
    whoToContact: z.array(professionalContactSchema).min(1),
    pickupPacket: text,
    casePacket: text,
    noIntroducerStatement: text,
  }),
});

export const ukCaseCommonsSchema = strictObject({
  schema: z.literal("taxsorted.uk.case-commons/1"),
  meta: strictObject({
    title: text,
    version: text,
    retrievedAt: date,
    lawAsAt: date,
    jurisdiction: text,
    coverage: nonEmptyStrings,
    exclusions: nonEmptyStrings,
    warning: text,
  }),
  publication: strictObject({
    status: z.literal("decided-public-record-only"),
    writes: z.literal(false),
    publicIntake: z.literal(false),
    professionalMarketplace: z.literal(false),
    emergencyStop: z.literal("UK_CASE_COMMONS_EMERGENCY_STOP"),
    corrections: httpsUrl,
    confidentialCorrectionChannel: z.null(),
    privateEvidencePolicy: text,
    activationGap: text,
  }),
  protocol: caseCommonsProtocolSchema,
  sources: z.array(caseCommonsSourceSchema).min(1),
  cases: z.array(caseCommonsCaseSchema).min(1),
});

export const caseCommonsLinksSchema = strictObject({
  self: text,
  cases: text,
  caseTemplate: text,
  schema: text,
  packetSchema: text,
  assessmentTemplate: text,
  assessmentSchema: text,
  sources: text,
  rights: text,
  humanGuide: httpsUrl,
  corrections: httpsUrl,
  openApi: text,
});

export const caseCommonsResponseSchema = strictObject({
  ...ukCaseCommonsSchema.shape,
  availability: strictObject({
    status: z.enum(["open", "case-level-stops-active"]),
    methods: z.tuple([z.literal("GET"), z.literal("HEAD")]),
    writes: z.literal(false),
    emergencyStop: z.literal("UK_CASE_COMMONS_EMERGENCY_STOP"),
    stoppedCaseCount: z.number().int().nonnegative(),
  }),
  links: caseCommonsLinksSchema,
});

export const caseCommonsPacketSchema = strictObject({
  schema: z.literal("taxsorted.uk.case-packet/1"),
  corpusVersion: text,
  lawAsAt: date,
  jurisdiction: text,
  warning: text,
  protocol: caseCommonsProtocolSchema,
  case: caseCommonsCaseSchema,
  sources: z.array(caseCommonsSourceSchema).min(1),
  integrity: strictObject({
    algorithm: z.literal("sha256"),
    digest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    digestScope: text,
    proves: text,
    doesNotProve: text,
  }),
  links: strictObject({
    self: text,
    collection: text,
    schema: text,
    assessmentTemplate: text,
    rights: text,
    human: httpsUrl,
    corrections: httpsUrl,
  }),
});

const caseAssessmentCheckIds = [
  "jurisdiction",
  "correct-defendant",
  "standing",
  "time-limit",
  "alternative-remedy",
  "arguable-ground",
  "supporting-evidence",
  "counterevidence",
  "remedy",
  "separate-money-basis",
  "loss-and-causation",
  "costs-and-funding",
  "privacy-and-publication",
] as const;
const caseAssessmentCheckIdSchema = z.enum(caseAssessmentCheckIds);

// This is the portable private-file contract. It accepts a completed
// assessment but TaxSorted deliberately provides no endpoint that accepts one.
export const caseAssessmentSchema = strictObject({
  schema: z.literal("taxsorted.uk.case-assessment/1"),
  status: z.enum([
    "local-template-not-submitted",
    "local-assessment-private-draft",
    "local-assessment-private-complete",
  ]),
  casePacket: strictObject({
    caseId: z.string().max(200),
    corpusVersion: z.string().max(100),
    sha256: z.union([
      z.literal(""),
      z.string().regex(/^sha256:[0-9a-f]{64}$/),
    ]),
    verifiedOn: date.nullable(),
  }),
  assessor: strictObject({
    professionalStatus: z.enum(["unverified", "register-checked"]),
    regulator: z.string().max(200),
    registrationId: z.string().max(200),
    registerCheckedOn: date.nullable(),
    competenceConfirmed: z.boolean(),
    conflictsChecked: z.boolean(),
  }),
  instruction: strictObject({
    prospectiveClientConsentConfirmed: z.boolean(),
    identityAndAuthorityChecked: z.boolean(),
    confidentialChannelAgreed: z.boolean(),
  }),
  checks: z.array(
    strictObject({
      id: caseAssessmentCheckIdSchema,
      state: z.enum([
        "not-assessed",
        "information-needed",
        "supports-further-review",
        "weighs-against-further-review",
        "not-applicable",
      ]),
      privateMatterFileNote: z.string().max(5_000),
    }),
  ),
  decision: strictObject({
    state: z.enum([
      "not-assessed",
      "unsuitable",
      "needs-evidence",
      "suitable-for-further-professional-review",
    ]),
    decidedOn: date.nullable(),
    reasonsKeptInPrivateMatterFile: z.literal(true),
    zeroOrNegativeFinancialScenarioConsidered: z.boolean(),
  }),
  privacy: strictObject({
    containsClientFacts: z.boolean(),
    taxSortedSubmissionEndpoint: z.null(),
    storage: z.literal("your-local-or-approved-matter-system"),
    warning: text,
  }),
  boundaries: nonEmptyStrings,
}).superRefine((value, context) => {
  const checkIds = value.checks.map((check) => check.id);
  if (
    checkIds.length !== caseAssessmentCheckIds.length ||
    new Set(checkIds).size !== caseAssessmentCheckIds.length ||
    caseAssessmentCheckIds.some((checkId) => !checkIds.includes(checkId))
  ) {
    context.addIssue({
      code: "custom",
      path: ["checks"],
      message: "include each required assessment check exactly once",
    });
  }

  if (value.assessor.professionalStatus === "register-checked") {
    if (
      !value.assessor.regulator.trim() ||
      !value.assessor.registrationId.trim() ||
      value.assessor.registerCheckedOn === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["assessor"],
        message:
          "register-checked requires regulator, registrationId and registerCheckedOn",
      });
    }
  }

  if (
    value.decision.state !== "not-assessed" &&
    value.decision.decidedOn === null
  ) {
    context.addIssue({
      code: "custom",
      path: ["decision", "decidedOn"],
      message: "a recorded decision requires decidedOn",
    });
  }

  if (
    value.decision.state === "suitable-for-further-professional-review" &&
    !value.decision.zeroOrNegativeFinancialScenarioConsidered
  ) {
    context.addIssue({
      code: "custom",
      path: ["decision", "zeroOrNegativeFinancialScenarioConsidered"],
      message:
        "further-review suitability requires a zero or negative financial scenario",
    });
  }

  if (
    value.status !== "local-template-not-submitted" &&
    (!value.casePacket.caseId.trim() ||
      !value.casePacket.corpusVersion.trim() ||
      !/^sha256:[0-9a-f]{64}$/.test(value.casePacket.sha256) ||
      value.casePacket.verifiedOn === null)
  ) {
    context.addIssue({
      code: "custom",
      path: ["casePacket"],
      message:
        "a private assessment requires a verified case ID, corpus version, digest and date",
    });
  }

  if (value.status === "local-template-not-submitted") {
    if (
      value.casePacket.caseId !== "" ||
      value.casePacket.corpusVersion !== "" ||
      value.casePacket.sha256 !== "" ||
      value.casePacket.verifiedOn !== null ||
      value.privacy.containsClientFacts ||
      value.assessor.professionalStatus !== "unverified" ||
      value.assessor.regulator !== "" ||
      value.assessor.registrationId !== "" ||
      value.assessor.registerCheckedOn !== null ||
      value.assessor.competenceConfirmed ||
      value.assessor.conflictsChecked ||
      value.instruction.prospectiveClientConsentConfirmed ||
      value.instruction.identityAndAuthorityChecked ||
      value.instruction.confidentialChannelAgreed ||
      value.decision.state !== "not-assessed" ||
      value.decision.decidedOn !== null ||
      value.decision.zeroOrNegativeFinancialScenarioConsidered ||
      value.checks.some(
        (check) =>
          check.state !== "not-assessed" ||
          check.privateMatterFileNote !== "",
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "template status cannot contain client facts, assurances or assessment results",
      });
    }
  }

  if (value.status === "local-assessment-private-complete") {
    const assurancesComplete =
      value.assessor.professionalStatus === "register-checked" &&
      value.assessor.competenceConfirmed &&
      value.assessor.conflictsChecked &&
      value.instruction.prospectiveClientConsentConfirmed &&
      value.instruction.identityAndAuthorityChecked &&
      value.instruction.confidentialChannelAgreed &&
      value.checks.every((check) => check.state !== "not-assessed") &&
      value.decision.state !== "not-assessed" &&
      value.decision.decidedOn !== null &&
      value.decision.zeroOrNegativeFinancialScenarioConsidered;
    if (!assurancesComplete) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "complete status requires register, competence, conflicts, instruction, every check, a dated decision and the zero-or-negative scenario",
      });
    }
  }
});

// The served starter document is narrower than the private-file contract:
// every assurance begins unset and there are no client facts.
export const caseAssessmentTemplateSchema = strictObject({
  schema: z.literal("taxsorted.uk.case-assessment/1"),
  status: z.literal("local-template-not-submitted"),
  casePacket: strictObject({
    caseId: z.string(),
    corpusVersion: z.string(),
    sha256: z.string(),
    verifiedOn: z.null(),
  }),
  assessor: strictObject({
    professionalStatus: z.literal("unverified"),
    regulator: z.string(),
    registrationId: z.string(),
    registerCheckedOn: z.null(),
    competenceConfirmed: z.literal(false),
    conflictsChecked: z.literal(false),
  }),
  instruction: strictObject({
    prospectiveClientConsentConfirmed: z.literal(false),
    identityAndAuthorityChecked: z.literal(false),
    confidentialChannelAgreed: z.literal(false),
  }),
  checks: z.array(
    strictObject({
      id: caseAssessmentCheckIdSchema,
      state: z.literal("not-assessed"),
      privateMatterFileNote: z.string(),
    }),
  ),
  decision: strictObject({
    state: z.literal("not-assessed"),
    decidedOn: z.null(),
    reasonsKeptInPrivateMatterFile: z.literal(true),
    zeroOrNegativeFinancialScenarioConsidered: z.literal(false),
  }),
  privacy: strictObject({
    containsClientFacts: z.literal(false),
    taxSortedSubmissionEndpoint: z.null(),
    storage: z.literal("your-local-or-approved-matter-system"),
    warning: text,
  }),
  boundaries: nonEmptyStrings,
});

export const caseCommonsRightsSchema = strictObject({
  schema: z.literal("taxsorted.uk.case-commons-rights/1"),
  status: z.literal("mixed-rights-read-before-reuse"),
  curation: strictObject({
    name: z.literal("CC BY-SA 4.0"),
    url: httpsUrl,
    attribution: text,
    appliesTo: text,
  }),
  sourceMaterial: text,
  reuseRule: text,
  software: strictObject({
    name: z.literal("AGPL-3.0"),
    source: httpsUrl,
  }),
});

export const caseCommonsPublicationApprovalSchema = strictObject({
  schema: z.literal("taxsorted.uk.case-commons-publication-approval/1"),
  status: z.literal("approved-for-publication"),
  decisionRecordedOn: date,
  corpusVersion: text,
  corpusDigest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  caseIds: z
    .array(id)
    .min(1)
    .refine(
      (values) => new Set(values).size === values.length,
      "approved case IDs must be unique",
    ),
  effects: text,
});

export const caseCommonsRights = caseCommonsRightsSchema.parse({
  schema: "taxsorted.uk.case-commons-rights/1",
  status: "mixed-rights-read-before-reuse",
  curation: {
    name: "CC BY-SA 4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    attribution: "TaxSorted (taxsorted.io)",
    appliesTo:
      "TaxSorted-written selection, structure, short summaries and method text where TaxSorted has rights to license them.",
  },
  sourceMaterial:
    "Linked judgments, legislation, procedure, register data and guidance keep their publishers' copyright, database, contractual and attribution terms.",
  reuseRule:
    "Keep source IDs and limitations with reused summaries, check the current official source, and never treat this curation licence as a blanket licence over upstream material.",
  software: {
    name: "AGPL-3.0",
    source: "https://github.com/cambridgetcg/taxsorted.io",
  },
});

export const caseAssessmentTemplate =
  caseAssessmentTemplateSchema.parse({
    schema: "taxsorted.uk.case-assessment/1",
    status: "local-template-not-submitted",
    casePacket: {
      caseId: "",
      corpusVersion: "",
      sha256: "",
      verifiedOn: null,
    },
    assessor: {
      professionalStatus: "unverified",
      regulator: "",
      registrationId: "",
      registerCheckedOn: null,
      competenceConfirmed: false,
      conflictsChecked: false,
    },
    instruction: {
      prospectiveClientConsentConfirmed: false,
      identityAndAuthorityChecked: false,
      confidentialChannelAgreed: false,
    },
    checks: [
      "jurisdiction",
      "correct-defendant",
      "standing",
      "time-limit",
      "alternative-remedy",
      "arguable-ground",
      "supporting-evidence",
      "counterevidence",
      "remedy",
      "separate-money-basis",
      "loss-and-causation",
      "costs-and-funding",
      "privacy-and-publication",
    ].map((checkId) => ({
      id: checkId,
      state: "not-assessed",
      privateMatterFileNote: "",
    })),
    decision: {
      state: "not-assessed",
      decidedOn: null,
      reasonsKeptInPrivateMatterFile: true,
      zeroOrNegativeFinancialScenarioConsidered: false,
    },
    privacy: {
      containsClientFacts: false,
      taxSortedSubmissionEndpoint: null,
      storage: "your-local-or-approved-matter-system",
      warning:
        "Do not add client facts until this file is inside a confidential system approved for the matter. TaxSorted has no upload or pickup endpoint.",
    },
    boundaries: [
      "This template does not create a solicitor-client relationship.",
      "A completed file is not a public endorsement, prediction or instruction to sue.",
      "Register status, competence, conflicts, authority and consent need independent checks.",
      "Do not publish a completed assessment or private matter material.",
    ],
  });

export type UkCaseCommons = z.infer<typeof ukCaseCommonsSchema>;
export type CaseCommonsCase = z.infer<typeof caseCommonsCaseSchema>;
export type CaseCommonsSource = z.infer<typeof caseCommonsSourceSchema>;
export type CaseCommonsPublicationApproval = z.infer<
  typeof caseCommonsPublicationApprovalSchema
>;

const defaultDataPath = fileURLToPath(
  new URL(
    "../../research/uk/case-commons/data/uk-case-commons.json",
    import.meta.url,
  ),
);
const defaultPublicationApprovalPath = fileURLToPath(
  new URL(
    "../../research/uk/case-commons/data/publication-approval.json",
    import.meta.url,
  ),
);

function allSourceReferences(
  value: unknown,
  path = "$",
): Array<{ sourceId: string; path: string }> {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      allSourceReferences(item, `${path}[${index}]`),
    );
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => {
    const nestedPath = `${path}.${key}`;
    if (key === "sourceIds" && Array.isArray(nested)) {
      return nested.map((sourceId) => ({
        sourceId: String(sourceId),
        path: nestedPath,
      }));
    }
    return allSourceReferences(nested, nestedPath);
  });
}

function duplicateIds(items: Array<{ id: string }>): string[] {
  const seen = new Set<string>();
  return items
    .map((item) => item.id)
    .filter((itemId) => {
      if (seen.has(itemId)) return true;
      seen.add(itemId);
      return false;
    });
}

function forbiddenPublicKeys(
  value: unknown,
  path = "$",
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      forbiddenPublicKeys(item, `${path}[${index}]`),
    );
  }
  if (!value || typeof value !== "object") return [];
  const forbidden = new Set([
    "email",
    "phone",
    "address",
    "winScore",
    "rank",
    "rating",
    "recommendedFirm",
    "successProbability",
    "expectedValuePence",
  ]);
  return Object.entries(value).flatMap(([key, nested]) => [
    ...(forbidden.has(key) ? [`${path}.${key}`] : []),
    ...forbiddenPublicKeys(nested, `${path}.${key}`),
  ]);
}

export function validateUkCaseCommons(
  corpus: UkCaseCommons,
): UkCaseCommons {
  const issues: string[] = [];
  if (corpus.meta.lawAsAt > corpus.meta.retrievedAt) {
    issues.push("lawAsAt cannot be after retrievedAt");
  }
  const duplicateSourceIds = duplicateIds(corpus.sources);
  const duplicateCaseIds = duplicateIds(corpus.cases);
  if (duplicateSourceIds.length) {
    issues.push(`duplicate source IDs: ${duplicateSourceIds.join(", ")}`);
  }
  if (duplicateCaseIds.length) {
    issues.push(`duplicate case IDs: ${duplicateCaseIds.join(", ")}`);
  }
  const duplicateSlugs = duplicateIds(
    corpus.cases.map((caseRecord) => ({ id: caseRecord.slug })),
  );
  if (duplicateSlugs.length) {
    issues.push(`duplicate case slugs: ${duplicateSlugs.join(", ")}`);
  }
  const ownerByIdentifier = new Map<string, string>();
  for (const caseRecord of corpus.cases) {
    for (const identifier of [caseRecord.id, caseRecord.slug]) {
      const existingOwner = ownerByIdentifier.get(identifier);
      if (existingOwner && existingOwner !== caseRecord.id) {
        issues.push(
          `case identifier ${identifier} is ambiguous between ${existingOwner} and ${caseRecord.id}`,
        );
      } else {
        ownerByIdentifier.set(identifier, caseRecord.id);
      }
    }
  }
  const sourceIdSet = new Set(corpus.sources.map((source) => source.id));
  const references = allSourceReferences({
    protocol: corpus.protocol,
    cases: corpus.cases,
  });
  for (const reference of references) {
    if (!sourceIdSet.has(reference.sourceId)) {
      issues.push(`${reference.path} refers to unknown source ${reference.sourceId}`);
    }
  }
  const usedSourceIds = new Set(references.map((reference) => reference.sourceId));
  for (const source of corpus.sources) {
    if (source.retrievedAt !== corpus.meta.retrievedAt) {
      issues.push(`${source.id} retrievedAt differs from corpus retrievedAt`);
    }
    if (!usedSourceIds.has(source.id)) {
      issues.push(`unreferenced source ${source.id}`);
    }
  }
  const stepOrders = corpus.protocol.steps.map((step) => step.order);
  if (
    stepOrders.some((order, index) => order !== index + 1)
  ) {
    issues.push("protocol step order must be contiguous from one");
  }
  for (const caseRecord of corpus.cases) {
    const timeline = caseRecord.timeline.map((event) => event.date);
    if (timeline.some((eventDate, index) =>
      index > 0 && eventDate < timeline[index - 1]!
    )) {
      issues.push(`${caseRecord.id} timeline must be chronological`);
    }
    if (
      caseRecord.timeline.some(
        (event) => event.date > corpus.meta.retrievedAt,
      )
    ) {
      issues.push(`${caseRecord.id} has a future timeline event`);
    }
    const contactOrders = caseRecord.professionalHandoff.whoToContact.map(
      (contact) => contact.order,
    );
    if (
      contactOrders.some((order, index) => order !== index + 1)
    ) {
      issues.push(`${caseRecord.id} contact order must be contiguous from one`);
    }
    const amountIds = duplicateIds(
      caseRecord.financialEffect.documentedAmounts,
    );
    if (amountIds.length) {
      issues.push(`${caseRecord.id} has duplicate amount IDs`);
    }
    const demand = caseRecord.financialEffect.documentedAmounts.find(
      (amount) => amount.id === "accelerated-demand",
    );
    const low = caseRecord.financialEffect.documentedAmounts.find(
      (amount) => amount.id === "then-potential-penalty-low",
    );
    const high = caseRecord.financialEffect.documentedAmounts.find(
      (amount) => amount.id === "then-potential-penalty-high",
    );
    if (
      demand &&
      (low?.amountPence !== Math.round(demand.amountPence * 0.1) ||
        high?.amountPence !== Math.round(demand.amountPence * 0.5))
    ) {
      issues.push(`${caseRecord.id} historical penalty arithmetic is inconsistent`);
    }
  }
  const forbiddenKeys = forbiddenPublicKeys(corpus);
  if (forbiddenKeys.length) {
    issues.push(`forbidden public fields: ${forbiddenKeys.join(", ")}`);
  }
  if (issues.length) {
    throw new Error(`UK case commons invalid:\n- ${issues.join("\n- ")}`);
  }
  return corpus;
}

export function loadUkCaseCommons(path = defaultDataPath): UkCaseCommons {
  const parsed = ukCaseCommonsSchema.parse(
    JSON.parse(readFileSync(path, "utf8")),
  );
  return validateUkCaseCommons(parsed);
}

export function caseCommonsCorpusDigest(corpus: UkCaseCommons) {
  return `sha256:${createHash("sha256")
    .update(canonicalJson(corpus), "utf8")
    .digest("hex")}`;
}

export function loadCaseCommonsPublicationApproval(
  path = defaultPublicationApprovalPath,
) {
  return caseCommonsPublicationApprovalSchema.parse(
    JSON.parse(readFileSync(path, "utf8")),
  );
}

export function evaluateCaseCommonsPublicationApproval(
  corpus: UkCaseCommons,
  approval: CaseCommonsPublicationApproval,
) {
  const corpusDigest = caseCommonsCorpusDigest(corpus);
  const knownCaseIds = new Set(corpus.cases.map((caseRecord) => caseRecord.id));
  const approved =
    approval.corpusVersion === corpus.meta.version &&
    approval.corpusDigest === corpusDigest &&
    approval.caseIds.every((caseId) => knownCaseIds.has(caseId));
  return {
    approved,
    corpusDigest,
    approvedCaseIds: approved ? approval.caseIds : [],
    reason: approved
      ? "exact-corpus-and-case-list-approved"
      : "publication-approval-does-not-match-corpus",
  } as const;
}

export const ukCaseCommons = loadUkCaseCommons();
export const ukCaseCommonsPublicationApproval =
  loadCaseCommonsPublicationApproval();
export const ukCaseCommonsPublicationDecision =
  evaluateCaseCommonsPublicationApproval(
    ukCaseCommons,
    ukCaseCommonsPublicationApproval,
  );

export function findCaseCommonsCase(
  caseIdOrSlug: string,
  corpus = ukCaseCommons,
): CaseCommonsCase | undefined {
  return corpus.cases.find(
    (caseRecord) =>
      caseRecord.id === caseIdOrSlug || caseRecord.slug === caseIdOrSlug,
  );
}

export function sourcesForCaseCommonsValue(
  value: unknown,
  corpus = ukCaseCommons,
): CaseCommonsSource[] {
  const wanted = new Set(
    allSourceReferences(value).map((reference) => reference.sourceId),
  );
  return corpus.sources.filter((source) => wanted.has(source.id));
}

export function makeCaseCommonsPacket(
  caseIdOrSlug: string,
  corpus = ukCaseCommons,
) {
  const caseRecord = findCaseCommonsCase(caseIdOrSlug, corpus);
  if (!caseRecord) return undefined;
  const sources = sourcesForCaseCommonsValue(
    {
      protocol: corpus.protocol,
      case: caseRecord,
    },
    corpus,
  );
  const preimage = {
    schema: "taxsorted.uk.case-packet/1" as const,
    corpusVersion: corpus.meta.version,
    lawAsAt: corpus.meta.lawAsAt,
    jurisdiction: corpus.meta.jurisdiction,
    warning: corpus.meta.warning,
    protocol: corpus.protocol,
    case: caseRecord,
    sources,
  };
  const canonicalPreimage = canonicalJson(preimage);
  const sha256 = createHash("sha256")
    .update(canonicalPreimage)
    .digest("hex");
  return caseCommonsPacketSchema.parse({
    ...preimage,
    integrity: {
      algorithm: "sha256" as const,
      digest: `sha256:${sha256}`,
      digestScope:
        "UTF-8 TaxSorted canonical JSON of this response without integrity and links",
      proves:
        "The same canonical packet fields produce the same content identifier.",
      doesNotProve:
        "Truth, source freshness, identity, professional status, authorship time or legal viability.",
    },
    links: {
      self: `/v1/case-commons/uk/cases/${caseRecord.id}`,
      collection: "/v1/case-commons/uk/cases",
      schema: "/v1/case-commons/uk/packet-schema",
      assessmentTemplate: "/v1/case-commons/uk/assessment-template",
      rights: "/v1/case-commons/uk/rights",
      human: `https://taxsorted.io/uk/cases/${caseRecord.slug}/`,
      corrections: corpus.publication.corrections,
    },
  });
}

export const caseCommonsJsonSchema = {
  ...z.toJSONSchema(caseCommonsResponseSchema),
  $id: "https://api.taxsorted.io/v1/case-commons/uk/schema",
  title: "TaxSorted UK public-power case commons",
  description:
    "Strict source-resolving schema for decided public-law cases, remedies, financial meanings and a no-brokerage professional handoff.",
  "x-taxsorted-runtime-invariants": [
    "Every source reference resolves and every source is used.",
    "Every source carries the corpus retrieval date.",
    "Case timelines and handoff steps are ordered.",
    "Every public case is decided and admitted from public records.",
    "No private contact, score, rank, probability, expected value or recommended firm field is admitted.",
    "Every money value says what it means and what it does not mean.",
  ],
  "x-taxsorted-effects":
    "Read-only research; no intake, matching, recommendation, representation, filing, outreach or external state change.",
} as const;

export const caseCommonsPacketJsonSchema = {
  ...z.toJSONSchema(caseCommonsPacketSchema),
  $id: "https://api.taxsorted.io/v1/case-commons/uk/packet-schema",
  title: "TaxSorted UK public-power case packet",
  description:
    "Strict complete-case packet with its applicable method, resolved sources, substantive content identifier and explicit proof limits.",
  "x-taxsorted-effects":
    "Read-only research; no intake, matching, recommendation, representation, filing, outreach or external state change.",
} as const;

const generatedCaseAssessmentJsonSchema = z.toJSONSchema(
  caseAssessmentSchema,
) as Record<string, unknown> & {
  properties: Record<string, Record<string, unknown>>;
  allOf?: unknown[];
};

const nonBlankJsonString = {
  type: "string",
  minLength: 1,
  pattern: ".*\\S.*",
} as const;

export const caseAssessmentJsonSchema = {
  ...generatedCaseAssessmentJsonSchema,
  $id: "https://api.taxsorted.io/v1/case-commons/uk/assessment-schema",
  title: "TaxSorted private professional case-assessment file",
  description:
    "A fillable local-first professional assessment contract. Completed files can contain client facts, must remain in the approved private matter system, and have no TaxSorted submission endpoint.",
  properties: {
    ...generatedCaseAssessmentJsonSchema.properties,
    checks: {
      ...generatedCaseAssessmentJsonSchema.properties.checks,
      minItems: caseAssessmentCheckIds.length,
      maxItems: caseAssessmentCheckIds.length,
      allOf: caseAssessmentCheckIds.map((checkId) => ({
        contains: {
          type: "object",
          required: ["id"],
          properties: { id: { const: checkId } },
        },
        minContains: 1,
        maxContains: 1,
      })),
    },
  },
  allOf: [
    ...(generatedCaseAssessmentJsonSchema.allOf ?? []),
    {
      if: {
        type: "object",
        required: ["assessor"],
        properties: {
          assessor: {
            type: "object",
            required: ["professionalStatus"],
            properties: {
              professionalStatus: { const: "register-checked" },
            },
          },
        },
      },
      then: {
        type: "object",
        properties: {
          assessor: {
            type: "object",
            properties: {
              regulator: nonBlankJsonString,
              registrationId: nonBlankJsonString,
              registerCheckedOn: { type: "string" },
            },
          },
        },
      },
    },
    {
      if: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            enum: [
              "local-assessment-private-draft",
              "local-assessment-private-complete",
            ],
          },
        },
      },
      then: {
        type: "object",
        properties: {
          casePacket: {
            type: "object",
            properties: {
              caseId: nonBlankJsonString,
              corpusVersion: nonBlankJsonString,
              sha256: {
                type: "string",
                pattern: "^sha256:[0-9a-f]{64}$",
              },
              verifiedOn: { type: "string" },
            },
          },
        },
      },
    },
    {
      if: {
        type: "object",
        required: ["decision"],
        properties: {
          decision: {
            type: "object",
            required: ["state"],
            properties: {
              state: {
                enum: [
                  "unsuitable",
                  "needs-evidence",
                  "suitable-for-further-professional-review",
                ],
              },
            },
          },
        },
      },
      then: {
        type: "object",
        properties: {
          decision: {
            type: "object",
            properties: {
              decidedOn: { type: "string" },
            },
          },
        },
      },
    },
    {
      if: {
        type: "object",
        required: ["decision"],
        properties: {
          decision: {
            type: "object",
            required: ["state"],
            properties: {
              state: {
                const: "suitable-for-further-professional-review",
              },
            },
          },
        },
      },
      then: {
        type: "object",
        properties: {
          decision: {
            type: "object",
            properties: {
              zeroOrNegativeFinancialScenarioConsidered: { const: true },
            },
          },
        },
      },
    },
    {
      if: {
        type: "object",
        required: ["status"],
        properties: {
          status: { const: "local-template-not-submitted" },
        },
      },
      then: {
        type: "object",
        properties: {
          casePacket: {
            type: "object",
            properties: {
              caseId: { const: "" },
              corpusVersion: { const: "" },
              sha256: { const: "" },
              verifiedOn: { type: "null" },
            },
          },
          assessor: {
            type: "object",
            properties: {
              professionalStatus: { const: "unverified" },
              regulator: { const: "" },
              registrationId: { const: "" },
              registerCheckedOn: { type: "null" },
              competenceConfirmed: { const: false },
              conflictsChecked: { const: false },
            },
          },
          instruction: {
            type: "object",
            properties: {
              prospectiveClientConsentConfirmed: { const: false },
              identityAndAuthorityChecked: { const: false },
              confidentialChannelAgreed: { const: false },
            },
          },
          checks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                state: { const: "not-assessed" },
                privateMatterFileNote: { const: "" },
              },
            },
          },
          decision: {
            type: "object",
            properties: {
              state: { const: "not-assessed" },
              decidedOn: { type: "null" },
              zeroOrNegativeFinancialScenarioConsidered: { const: false },
            },
          },
          privacy: {
            type: "object",
            properties: {
              containsClientFacts: { const: false },
            },
          },
        },
      },
    },
    {
      if: {
        type: "object",
        required: ["status"],
        properties: {
          status: { const: "local-assessment-private-complete" },
        },
      },
      then: {
        type: "object",
        properties: {
          assessor: {
            type: "object",
            properties: {
              professionalStatus: { const: "register-checked" },
              competenceConfirmed: { const: true },
              conflictsChecked: { const: true },
            },
          },
          instruction: {
            type: "object",
            properties: {
              prospectiveClientConsentConfirmed: { const: true },
              identityAndAuthorityChecked: { const: true },
              confidentialChannelAgreed: { const: true },
            },
          },
          checks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                state: { not: { const: "not-assessed" } },
              },
            },
          },
          decision: {
            type: "object",
            properties: {
              state: { not: { const: "not-assessed" } },
              decidedOn: { type: "string" },
              zeroOrNegativeFinancialScenarioConsidered: { const: true },
            },
          },
        },
      },
    },
  ],
  "x-taxsorted-storage": "none",
  "x-taxsorted-submission-endpoint": null,
  "x-taxsorted-runtime-invariants": [
    "Each of the 13 assessment checks appears exactly once.",
    "Register-checked status requires the regulator, registration ID and check date.",
    "A private assessment identifies and verifies the case packet's substantive content digest.",
    "Complete status requires competence, conflicts, consent, authority, a confidential channel, every check, a dated decision and a zero-or-negative financial scenario.",
    "Template status contains no client facts, professional assurance or assessment result.",
  ],
} as const;
