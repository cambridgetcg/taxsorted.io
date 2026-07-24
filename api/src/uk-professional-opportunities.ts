// Reviewed classes of specialist UK tax work, public-body scrutiny and a
// portable local assessment. This module never accepts client facts or
// creates a lead, matter, referral or professional recommendation.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { canonicalJson } from "./open-data.js";
import { assertNoDuplicateJsonKeys } from "./strict-json.js";
import {
  loadProfessionalOpportunityReviewPack,
  professionalOpportunityReviewPackApprovalFacts,
  validateProfessionalOpportunityReviewPackForCorpus,
  type ProfessionalOpportunityReviewPack,
} from "./uk-professional-opportunity-review.js";

const strictObject = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).strict();
const id = z
  .string()
  .max(120)
  .regex(/^[a-z0-9][a-z0-9-]*$/);
const text = z.string().trim().min(1).max(8_000);
const shortText = z.string().trim().min(1).max(1_000);
const optionalPrivateNote = z.string().trim().max(8_000);
const nonEmptyStrings = z.array(shortText).min(1).max(100);
const httpsUrl = z
  .string()
  .url()
  .refine((value) => {
    if (!value.startsWith("https://")) return false;
    const url = new URL(value);
    return url.username === "" && url.password === "";
  }, "URL must use HTTPS without embedded credentials");
function professionalOpportunityTextIsPublicSafe(value: string) {
  return (
    !/@/u.test(value) &&
    !/(?:^|[\s("'`])\/(?!\/)[a-z0-9._~-]+(?:\/[a-z0-9._~-]+)+/iu.test(
      value,
    ) &&
    !/\b[a-z0-9._~-]+\/[a-z0-9._~-]+\/[a-z0-9._~/-]+\b/iu.test(
      value,
    ) &&
    !/(?:^|[\s("'`])~\//u.test(value) &&
    !/(?:^|[\s("'`])[a-z]:[\\/]/iu.test(value) &&
    !/\\\\/u.test(value) &&
    !/\bfile:\/\//iu.test(value)
  );
}
const professionalOpportunityPublicSafeNarrative = shortText.refine(
  professionalOpportunityTextIsPublicSafe,
  "Public review text must not contain @ contact markers or filesystem-shaped paths",
);
const calendarDatePattern =
  "^(?:(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8])))|(?:(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29))$";
const date = z
  .string()
  .regex(new RegExp(calendarDatePattern), "invalid calendar date");
const sha256 = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const professionalOpportunityAssessmentActiveStates = [
  "scope",
  "route-and-clock",
  "authority-and-competence",
  "conflicts-and-client-authority",
  "facts-and-evidence",
  "merits-and-counterevidence",
  "remedy-money-cost-and-risk",
] as const;

export const professionalOpportunityAssessmentStates = [
  "unopened",
  ...professionalOpportunityAssessmentActiveStates,
  "terminal",
] as const;

export const professionalOpportunityTerminalDecisions = [
  "declined",
  "needs-more-evidence",
  "refer-with-consent",
  "suitable-for-further-private-review",
] as const;

export const professionalOpportunityAssessmentPrivacyWarning =
  "Do not add client facts until this file is inside a confidential system approved for the matter. TaxSorted has no upload, intake or pickup endpoint.";

export const professionalOpportunityAssessmentBoundaries = [
  "This template does not create a professional-client relationship.",
  "Verified professional means the status needed for the exact work was checked at an official source; it does not claim that all UK tax work has a universal licence.",
  "A completed file is not a public endorsement, prediction, instruction to litigate or promise of recovery.",
  "Schema validation checks packet-reference shape only; independently compare the declared digest with the actual packet.",
  "Keep every completed assessment and private matter fact outside TaxSorted.",
] as const;

const assessmentStateSchema = z.enum(
  professionalOpportunityAssessmentStates,
);
const activeAssessmentStateSchema = z.enum(
  professionalOpportunityAssessmentActiveStates,
);
const terminalDecisionSchema = z.enum(
  professionalOpportunityTerminalDecisions,
);

const assessmentStageSchema = strictObject({
  id: activeAssessmentStateSchema,
  order: z.number().int().min(1).max(
    professionalOpportunityAssessmentActiveStates.length,
  ),
  state: z.enum(["not-assessed", "in-progress", "complete"]),
  privateMatterFileNote: optionalPrivateNote,
});

const assessmentPacketReferenceSchema = strictObject({
  opportunityId: z.string().max(120),
  corpusVersion: z.string().max(100),
  declaredPacketDigest: z.union([z.literal(""), sha256]),
  referenceCheckedOn: date.nullable(),
});

const assessmentProfessionalVerificationSchema = z.discriminatedUnion(
  "state",
  [
    strictObject({
      state: z.literal("unverified"),
      role: z.literal(""),
      basis: z.literal(""),
      notApplicableReason: z.literal(""),
      assessedOn: z.null(),
    }),
    strictObject({
      state: z.literal("verified-professional"),
      role: shortText,
      basis: shortText,
      notApplicableReason: z.literal(""),
      assessedOn: date,
    }),
    strictObject({
      state: z.literal("not-applicable-with-reason"),
      role: shortText,
      basis: shortText,
      notApplicableReason: shortText,
      assessedOn: date,
    }),
  ],
);

const assessmentRegulatoryStatusSchema = z.discriminatedUnion("state", [
  strictObject({
    state: z.literal("not-checked"),
    basis: z.literal(""),
    officialRegisterOrAuthority: z.literal(""),
    registrationOrMembershipId: z.literal(""),
    checkedOn: z.null(),
    notApplicableReason: z.literal(""),
  }),
  strictObject({
    state: z.literal("verified"),
    basis: shortText,
    officialRegisterOrAuthority: shortText,
    registrationOrMembershipId: shortText,
    checkedOn: date,
    notApplicableReason: z.literal(""),
  }),
  strictObject({
    state: z.literal("not-applicable-with-reason"),
    basis: shortText,
    officialRegisterOrAuthority: z.literal(""),
    registrationOrMembershipId: z.literal(""),
    checkedOn: date,
    notApplicableReason: shortText,
  }),
]);

const assessmentBinaryFindingSchema = z.discriminatedUnion("state", [
  strictObject({
    state: z.literal("not-assessed"),
    basis: z.literal(""),
    assessedOn: z.null(),
  }),
  strictObject({
    state: z.literal("confirmed"),
    basis: shortText,
    assessedOn: date,
  }),
  strictObject({
    state: z.literal("not-confirmed"),
    basis: shortText,
    assessedOn: date,
  }),
]);

const assessmentConflictFindingSchema = z.discriminatedUnion("state", [
  strictObject({
    state: z.literal("not-assessed"),
    basis: z.literal(""),
    assessedOn: z.null(),
  }),
  strictObject({
    state: z.literal("cleared"),
    basis: shortText,
    assessedOn: date,
  }),
  strictObject({
    state: z.literal("conflict-found"),
    basis: shortText,
    assessedOn: date,
  }),
]);

const assessmentAssessorSchema = strictObject({
  professionalVerification: assessmentProfessionalVerificationSchema,
  businessOrHmrcRegistration: assessmentRegulatoryStatusSchema,
  protectedTitleStatus: assessmentRegulatoryStatusSchema,
  competence: assessmentBinaryFindingSchema,
  taskAuthority: assessmentBinaryFindingSchema,
  conflicts: assessmentConflictFindingSchema,
});

const assessmentInstructionSchema = strictObject({
  prospectiveClientConsentConfirmed: z.boolean(),
  clientIdentityAndAuthorityChecked: z.boolean(),
  confidentialChannelAgreed: z.boolean(),
});

const assessmentDecisionSchema = strictObject({
  state: z.union([z.literal("not-assessed"), terminalDecisionSchema]),
  decidedOn: date.nullable(),
  reasonsKeptInPrivateMatterFile: z.literal(true),
  zeroOrNegativeFinancialScenarioConsidered: z.boolean(),
});

const professionalOpportunityAssessmentBaseSchema = strictObject({
  schema: z.literal("taxsorted.uk.professional-opportunity-assessment/1"),
  status: z.enum([
    "local-template-not-submitted",
    "local-assessment-private-in-progress",
    "local-assessment-private-complete",
  ]),
  packetReference: assessmentPacketReferenceSchema,
  assessor: assessmentAssessorSchema,
  instruction: assessmentInstructionSchema,
  workflow: strictObject({
    currentState: assessmentStateSchema,
    stages: z
      .array(assessmentStageSchema)
      .length(professionalOpportunityAssessmentActiveStates.length),
  }),
  decision: assessmentDecisionSchema,
  privacy: strictObject({
    containsClientFacts: z.boolean(),
    taxSortedSubmissionEndpoint: z.null(),
    storage: z.literal("your-local-or-approved-matter-system"),
    warning: z.literal(professionalOpportunityAssessmentPrivacyWarning),
  }),
  boundaries: z
    .array(z.enum(professionalOpportunityAssessmentBoundaries))
    .length(professionalOpportunityAssessmentBoundaries.length)
    .refine(
      (boundaries) =>
        boundaries.every(
          (boundary, index) =>
            boundary === professionalOpportunityAssessmentBoundaries[index],
        ),
      "assessment boundaries must remain complete and in their declared order",
    ),
});

type AssessmentBase = z.infer<
  typeof professionalOpportunityAssessmentBaseSchema
>;

function addAssessmentIssue(
  context: z.RefinementCtx,
  path: PropertyKey[],
  message: string,
) {
  context.addIssue({ code: "custom", path, message });
}

function validateStageOrder(
  assessment: AssessmentBase,
  context: z.RefinementCtx,
) {
  assessment.workflow.stages.forEach((stage, index) => {
    const expectedId = professionalOpportunityAssessmentActiveStates[index];
    if (stage.id !== expectedId) {
      addAssessmentIssue(
        context,
        ["workflow", "stages", index, "id"],
        `stage ${index + 1} must be ${expectedId}`,
      );
    }
    if (stage.order !== index + 1) {
      addAssessmentIssue(
        context,
        ["workflow", "stages", index, "order"],
        `stage order must be ${index + 1}`,
      );
    }
  });
}

function validateTemplateAssessment(
  assessment: AssessmentBase,
  context: z.RefinementCtx,
) {
  const templateChecks: Array<[boolean, PropertyKey[], string]> = [
    [
      assessment.workflow.currentState === "unopened",
      ["workflow", "currentState"],
      "the blank template must be unopened",
    ],
    [
      assessment.packetReference.opportunityId === "",
      ["packetReference", "opportunityId"],
      "the blank template must not identify an opportunity",
    ],
    [
      assessment.packetReference.corpusVersion === "",
      ["packetReference", "corpusVersion"],
      "the blank template must not claim a corpus version",
    ],
    [
      assessment.packetReference.declaredPacketDigest === "",
      ["packetReference", "declaredPacketDigest"],
      "the blank template must not claim a packet digest",
    ],
    [
      assessment.packetReference.referenceCheckedOn === null,
      ["packetReference", "referenceCheckedOn"],
      "the blank template must not claim a packet-reference check",
    ],
    [
      assessment.assessor.professionalVerification.state === "unverified",
      ["assessor", "professionalVerification", "state"],
      "the blank template must not claim verified professional status",
    ],
    [
      assessment.assessor.businessOrHmrcRegistration.state === "not-checked",
      ["assessor", "businessOrHmrcRegistration", "state"],
      "the blank template must not claim business or HMRC registration",
    ],
    [
      assessment.assessor.protectedTitleStatus.state === "not-checked",
      ["assessor", "protectedTitleStatus", "state"],
      "the blank template must not claim protected-title status",
    ],
    [
      assessment.assessor.competence.state === "not-assessed",
      ["assessor", "competence", "state"],
      "the blank template must not claim competence",
    ],
    [
      assessment.assessor.taskAuthority.state === "not-assessed",
      ["assessor", "taskAuthority", "state"],
      "the blank template must not claim authority for the work",
    ],
    [
      assessment.assessor.conflicts.state === "not-assessed",
      ["assessor", "conflicts", "state"],
      "the blank template must not claim a conflicts check",
    ],
    [
      !assessment.instruction.prospectiveClientConsentConfirmed,
      ["instruction", "prospectiveClientConsentConfirmed"],
      "the blank template must not claim client consent",
    ],
    [
      !assessment.instruction.clientIdentityAndAuthorityChecked,
      ["instruction", "clientIdentityAndAuthorityChecked"],
      "the blank template must not claim client identity or authority",
    ],
    [
      !assessment.instruction.confidentialChannelAgreed,
      ["instruction", "confidentialChannelAgreed"],
      "the blank template must not claim a confidential channel",
    ],
    [
      assessment.decision.state === "not-assessed",
      ["decision", "state"],
      "the blank template must not contain a decision",
    ],
    [
      assessment.decision.decidedOn === null,
      ["decision", "decidedOn"],
      "the blank template must not contain a decision date",
    ],
    [
      !assessment.decision.zeroOrNegativeFinancialScenarioConsidered,
      ["decision", "zeroOrNegativeFinancialScenarioConsidered"],
      "the blank template must not claim a financial-risk review",
    ],
    [
      !assessment.privacy.containsClientFacts,
      ["privacy", "containsClientFacts"],
      "the blank template must contain no client facts",
    ],
  ];
  for (const [passes, path, message] of templateChecks) {
    if (!passes) addAssessmentIssue(context, path, message);
  }
  assessment.workflow.stages.forEach((stage, index) => {
    if (stage.state !== "not-assessed") {
      addAssessmentIssue(
        context,
        ["workflow", "stages", index, "state"],
        "every blank-template stage must be not-assessed",
      );
    }
    if (stage.privateMatterFileNote !== "") {
      addAssessmentIssue(
        context,
        ["workflow", "stages", index, "privateMatterFileNote"],
        "the blank template must contain no private note",
      );
    }
  });
}

function validateStartedAssessment(
  assessment: AssessmentBase,
  context: z.RefinementCtx,
) {
  const packetChecks: Array<[boolean, PropertyKey[], string]> = [
    [
      assessment.packetReference.opportunityId.length > 0,
      ["packetReference", "opportunityId"],
      "a started assessment must identify its packet reference",
    ],
    [
      assessment.packetReference.corpusVersion.length > 0,
      ["packetReference", "corpusVersion"],
      "a started assessment must identify the corpus version",
    ],
    [
      assessment.packetReference.declaredPacketDigest !== "",
      ["packetReference", "declaredPacketDigest"],
      "a started assessment must carry the declared packet digest",
    ],
    [
      assessment.packetReference.referenceCheckedOn !== null,
      ["packetReference", "referenceCheckedOn"],
      "a started assessment must record when its packet reference was checked",
    ],
  ];
  for (const [passes, path, message] of packetChecks) {
    if (!passes) addAssessmentIssue(context, path, message);
  }
}

function validateInProgressAssessment(
  assessment: AssessmentBase,
  context: z.RefinementCtx,
) {
  const current = assessment.workflow.currentState;
  if (
    current === "unopened" ||
    current === "terminal"
  ) {
    addAssessmentIssue(
      context,
      ["workflow", "currentState"],
      "an in-progress assessment must name its active stage",
    );
    return;
  }
  const currentIndex =
    professionalOpportunityAssessmentActiveStates.indexOf(current);
  assessment.workflow.stages.forEach((stage, index) => {
    const expectedState =
      index < currentIndex
        ? "complete"
        : index === currentIndex
          ? "in-progress"
          : "not-assessed";
    if (stage.state !== expectedState) {
      addAssessmentIssue(
        context,
        ["workflow", "stages", index, "state"],
        `stage must be ${expectedState} while ${current} is active`,
      );
    }
  });
  if (
    assessment.decision.state !== "not-assessed" ||
    assessment.decision.decidedOn !== null
  ) {
    addAssessmentIssue(
      context,
      ["decision"],
      "an in-progress assessment cannot claim a terminal decision",
    );
  }
  validateProgressionAssurances(assessment, currentIndex, context);
}

function validateProfessionalGateAssessment(
  assessment: AssessmentBase,
  context: z.RefinementCtx,
  requirePositive: boolean,
) {
  const assessedChecks: Array<[boolean, PropertyKey[], string]> = [
    [
      assessment.assessor.professionalVerification.state !== "unverified",
      ["assessor", "professionalVerification", "state"],
      "professional verification must be verified or not applicable with a reason",
    ],
    [
      assessment.assessor.businessOrHmrcRegistration.state !== "not-checked",
      ["assessor", "businessOrHmrcRegistration", "state"],
      "business or HMRC registration must be verified or not applicable with a reason",
    ],
    [
      assessment.assessor.protectedTitleStatus.state !== "not-checked",
      ["assessor", "protectedTitleStatus", "state"],
      "protected-title status must be verified or not applicable with a reason",
    ],
    [
      assessment.assessor.competence.state !== "not-assessed",
      ["assessor", "competence", "state"],
      "competence must be assessed",
    ],
    [
      assessment.assessor.taskAuthority.state !== "not-assessed",
      ["assessor", "taskAuthority", "state"],
      "authority for the exact task must be assessed separately",
    ],
  ];
  for (const [passes, path, message] of assessedChecks) {
    if (!passes) addAssessmentIssue(context, path, message);
  }
  if (!requirePositive) return;
  const positiveChecks: Array<[boolean, PropertyKey[], string]> = [
    [
      assessment.assessor.competence.state === "confirmed",
      ["assessor", "competence", "state"],
      "competence must be confirmed before progressing",
    ],
    [
      assessment.assessor.taskAuthority.state === "confirmed",
      ["assessor", "taskAuthority", "state"],
      "authority for the exact task must be confirmed before progressing",
    ],
  ];
  for (const [passes, path, message] of positiveChecks) {
    if (!passes) addAssessmentIssue(context, path, message);
  }
}

function validateClientAuthorityAssessment(
  assessment: AssessmentBase,
  context: z.RefinementCtx,
  requireClearance: boolean,
) {
  if (assessment.assessor.conflicts.state === "not-assessed") {
    addAssessmentIssue(
      context,
      ["assessor", "conflicts", "state"],
      "conflicts must be assessed",
    );
  }
  if (
    requireClearance &&
    assessment.assessor.conflicts.state !== "cleared"
  ) {
    addAssessmentIssue(
      context,
      ["assessor", "conflicts", "state"],
      "conflicts must be cleared before progressing",
    );
  }
  if (!requireClearance) return;
  const instructionChecks: Array<[boolean, PropertyKey[], string]> = [
    [
      assessment.instruction.prospectiveClientConsentConfirmed,
      ["instruction", "prospectiveClientConsentConfirmed"],
      "prospective-client consent must be confirmed before progressing",
    ],
    [
      assessment.instruction.clientIdentityAndAuthorityChecked,
      ["instruction", "clientIdentityAndAuthorityChecked"],
      "client identity and authority must be checked before progressing",
    ],
    [
      assessment.instruction.confidentialChannelAgreed,
      ["instruction", "confidentialChannelAgreed"],
      "a confidential channel must be agreed before progressing",
    ],
  ];
  for (const [passes, path, message] of instructionChecks) {
    if (!passes) addAssessmentIssue(context, path, message);
  }
}

function validateProgressionAssurances(
  assessment: AssessmentBase,
  completedStageCount: number,
  context: z.RefinementCtx,
) {
  if (completedStageCount >= 3) {
    validateProfessionalGateAssessment(assessment, context, true);
  }
  if (completedStageCount >= 4) {
    validateClientAuthorityAssessment(assessment, context, true);
  }
}

function completedTerminalPrefix(
  assessment: AssessmentBase,
  context: z.RefinementCtx,
) {
  let completed = 0;
  while (
    completed < assessment.workflow.stages.length &&
    assessment.workflow.stages[completed].state === "complete"
  ) {
    completed++;
  }
  assessment.workflow.stages.forEach((stage, index) => {
    const expected = index < completed ? "complete" : "not-assessed";
    if (stage.state !== expected) {
      addAssessmentIssue(
        context,
        ["workflow", "stages", index, "state"],
        `a terminal workflow must be one completed prefix followed by not-assessed stages`,
      );
    }
  });
  return completed;
}

function validateCompleteAssessment(
  assessment: AssessmentBase,
  context: z.RefinementCtx,
) {
  if (assessment.workflow.currentState !== "terminal") {
    addAssessmentIssue(
      context,
      ["workflow", "currentState"],
      "a complete assessment must be terminal",
    );
  }
  const completedStageCount = completedTerminalPrefix(
    assessment,
    context,
  );
  const decision = assessment.decision.state;
  if (decision === "not-assessed") {
    addAssessmentIssue(
      context,
      ["decision", "state"],
      "a complete assessment requires a terminal decision",
    );
    return;
  }
  if (assessment.decision.decidedOn === null) {
    addAssessmentIssue(
      context,
      ["decision", "decidedOn"],
      "a complete assessment requires a decision date",
    );
  }

  const minimumCompletedStages: Record<typeof decision, number> = {
    declined: 1,
    "needs-more-evidence": 5,
    "refer-with-consent": 4,
    "suitable-for-further-private-review":
      professionalOpportunityAssessmentActiveStates.length,
  };
  const minimum = minimumCompletedStages[decision];
  if (completedStageCount < minimum) {
    addAssessmentIssue(
      context,
      ["workflow", "stages"],
      `${decision} requires a completed prefix of at least ${minimum} stages`,
    );
  }

  if (completedStageCount >= 3) {
    const mustBePositive =
      completedStageCount >= 5 ||
      decision === "needs-more-evidence" ||
      decision === "suitable-for-further-private-review";
    validateProfessionalGateAssessment(
      assessment,
      context,
      mustBePositive,
    );
  }
  if (completedStageCount >= 4) {
    const mustBeCleared =
      completedStageCount >= 5 ||
      decision === "needs-more-evidence" ||
      decision === "suitable-for-further-private-review";
    validateClientAuthorityAssessment(
      assessment,
      context,
      mustBeCleared,
    );
  }
  if (decision === "refer-with-consent") {
    const referralChecks: Array<[boolean, PropertyKey[], string]> = [
      [
        assessment.instruction.prospectiveClientConsentConfirmed,
        ["instruction", "prospectiveClientConsentConfirmed"],
        "referral requires prospective-client consent",
      ],
      [
        assessment.instruction.clientIdentityAndAuthorityChecked,
        ["instruction", "clientIdentityAndAuthorityChecked"],
        "referral requires client identity and authority checks",
      ],
      [
        assessment.instruction.confidentialChannelAgreed,
        ["instruction", "confidentialChannelAgreed"],
        "referral requires an agreed confidential channel",
      ],
    ];
    for (const [passes, path, message] of referralChecks) {
      if (!passes) addAssessmentIssue(context, path, message);
    }
  }
  if (
    (completedStageCount ===
      professionalOpportunityAssessmentActiveStates.length ||
      decision === "suitable-for-further-private-review") &&
    !assessment.decision.zeroOrNegativeFinancialScenarioConsidered
  ) {
    addAssessmentIssue(
      context,
      ["decision", "zeroOrNegativeFinancialScenarioConsidered"],
      "a completed money-and-risk stage requires a zero-or-negative scenario",
    );
  }
}

export const professionalOpportunityAssessmentSchema =
  professionalOpportunityAssessmentBaseSchema.superRefine(
    (assessment, context) => {
      validateStageOrder(assessment, context);
      if (assessment.status === "local-template-not-submitted") {
        validateTemplateAssessment(assessment, context);
        return;
      }
      validateStartedAssessment(assessment, context);
      if (assessment.status === "local-assessment-private-in-progress") {
        validateInProgressAssessment(assessment, context);
        return;
      }
      validateCompleteAssessment(assessment, context);
    },
  );

export const professionalOpportunityAssessmentTemplateSchema =
  professionalOpportunityAssessmentBaseSchema.superRefine(
    (assessment, context) => {
      validateStageOrder(assessment, context);
      if (assessment.status !== "local-template-not-submitted") {
        addAssessmentIssue(
          context,
          ["status"],
          "the public template must remain local-template-not-submitted",
        );
      }
      validateTemplateAssessment(assessment, context);
    },
  );

export const professionalOpportunityAssessmentTemplate =
  professionalOpportunityAssessmentTemplateSchema.parse({
    schema: "taxsorted.uk.professional-opportunity-assessment/1",
    status: "local-template-not-submitted",
    packetReference: {
      opportunityId: "",
      corpusVersion: "",
      declaredPacketDigest: "",
      referenceCheckedOn: null,
    },
    assessor: {
      professionalVerification: {
        state: "unverified",
        role: "",
        basis: "",
        notApplicableReason: "",
        assessedOn: null,
      },
      businessOrHmrcRegistration: {
        state: "not-checked",
        basis: "",
        officialRegisterOrAuthority: "",
        registrationOrMembershipId: "",
        checkedOn: null,
        notApplicableReason: "",
      },
      protectedTitleStatus: {
        state: "not-checked",
        basis: "",
        officialRegisterOrAuthority: "",
        registrationOrMembershipId: "",
        checkedOn: null,
        notApplicableReason: "",
      },
      competence: {
        state: "not-assessed",
        basis: "",
        assessedOn: null,
      },
      taskAuthority: {
        state: "not-assessed",
        basis: "",
        assessedOn: null,
      },
      conflicts: {
        state: "not-assessed",
        basis: "",
        assessedOn: null,
      },
    },
    instruction: {
      prospectiveClientConsentConfirmed: false,
      clientIdentityAndAuthorityChecked: false,
      confidentialChannelAgreed: false,
    },
    workflow: {
      currentState: "unopened",
      stages: professionalOpportunityAssessmentActiveStates.map(
        (stageId, index) => ({
          id: stageId,
          order: index + 1,
          state: "not-assessed",
          privateMatterFileNote: "",
        }),
      ),
    },
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
      warning: professionalOpportunityAssessmentPrivacyWarning,
    },
    boundaries: [...professionalOpportunityAssessmentBoundaries],
  });

export type ProfessionalOpportunityAssessment = z.infer<
  typeof professionalOpportunityAssessmentSchema
>;

const professionalOpportunityReviewConfirmationKeys = [
  "currentLawTerritoryDeadlineAndRoute",
  "privacySecurityAndThreatReview",
  "noIntakeMarketplaceOrSubmission",
  "emergencyStopExercised",
  "correctionAndWithdrawalOwnersAssigned",
] as const;

const professionalOpportunityReviewAttestorFields = [
  "reviewerName",
  "reviewerCapacity",
  "completedOn",
  "evidenceReference",
] as const;

const professionalOpportunityStoredShortText = z
  .string()
  .min(1)
  .max(1_000)
  .refine(
    (value) => value === value.trim(),
    "Public approval text must already be trimmed",
  );
const professionalOpportunityPublicApprovalText = z
  .string()
  .min(1)
  .max(8_000)
  .refine(
    (value) => value === value.trim(),
    "Public approval text must already be trimmed",
  )
  .refine(
    professionalOpportunityTextIsPublicSafe,
    "Public approval text must not contain @ contact markers or filesystem-shaped paths",
  );

const professionalOpportunityOfflineEvidenceReference =
  professionalOpportunityStoredShortText
  .regex(
    /^[a-z0-9][a-z0-9.-]{0,159}@sha256:[a-f0-9]{64}(?:#[a-z0-9][a-z0-9-]{0,159})?$/u,
    "Offline evidence references must be content-addressed public artifact references",
  );

const professionalOpportunityPublicPersonLabel =
  professionalOpportunityStoredShortText
  .refine(
    (value) =>
      !/[\\/@]/u.test(value) &&
      !/^~/u.test(value) &&
      !/^[a-z]:/iu.test(value),
    "Public person labels must not contain paths or contact details",
  )
  .describe(
    "Public-safe reviewer or publisher label only; never a private contact detail or private matter fact.",
  );

const professionalOpportunityPublicCapacityLabel =
  professionalOpportunityStoredShortText
    .and(professionalOpportunityPublicSafeNarrative)
    .describe(
      "Public-safe reviewer label only; never a private contact detail or private matter fact.",
    );

const professionalOpportunityPublicReviewBasis =
  professionalOpportunityStoredShortText
    .and(professionalOpportunityPublicSafeNarrative)
    .describe(
      "Public-safe review explanation only; never a private contact detail or private matter fact.",
    );

const professionalOpportunityPublicEvidenceReference = z
  .union([
    httpsUrl,
    professionalOpportunityOfflineEvidenceReference,
  ])
  .describe(
    "Public-safe HTTPS URL or short review-record reference only; never private contact details or matter evidence.",
  );

const professionalOpportunityPublicationApprovalBaseSchema = strictObject({
  schema: z.literal(
    "taxsorted.uk.professional-opportunities-publication-approval/3",
  ),
  status: z.enum([
    "pending-qualified-review",
    "approved-for-hosted-distribution",
  ]),
  decisionRecordedOn: date.nullable(),
  corpusVersion: shortText,
  corpusDigest: sha256,
  opportunityIds: z
    .array(id)
    .min(1)
    .refine(
      (values) => new Set(values).size === values.length,
      "approved opportunity IDs must be unique",
    ),
  hostedDistributionDecision: strictObject({
    status: z.enum(["pending", "approved"]),
    decisionMakerName:
      professionalOpportunityPublicPersonLabel.nullable(),
    decisionMakerCapacity:
      professionalOpportunityPublicCapacityLabel.nullable(),
    decisionEvidenceReference:
      professionalOpportunityPublicEvidenceReference.nullable(),
    reviewPackReference:
      professionalOpportunityPublicEvidenceReference.nullable(),
    exactCorpusAndPackReviewed: z.boolean(),
    activationRemainsSeparate: z.boolean(),
  }),
  qualifiedReview: strictObject({
    status: z.enum(["pending", "complete"]),
    reviewerName: professionalOpportunityPublicPersonLabel.nullable(),
    reviewerCapacity:
      professionalOpportunityPublicCapacityLabel.nullable(),
    completedOn: date.nullable(),
    evidenceReference:
      professionalOpportunityPublicEvidenceReference.nullable(),
    confirmations: strictObject({
      currentLawTerritoryDeadlineAndRoute: z.boolean(),
      privacySecurityAndThreatReview: z.boolean(),
      noIntakeMarketplaceOrSubmission: z.boolean(),
      emergencyStopExercised: z.boolean(),
      correctionAndWithdrawalOwnersAssigned: z.boolean(),
    }),
    institutionalRightOfReply: strictObject({
      status: z.enum([
        "pending",
        "completed",
        "not-applicable-with-reason",
        "official-response-documented",
      ]),
      basis: professionalOpportunityPublicReviewBasis.nullable(),
      evidenceReference:
        professionalOpportunityPublicEvidenceReference.nullable(),
    }),
  }),
  effects: professionalOpportunityPublicApprovalText,
});

export const professionalOpportunityPublicationApprovalSchema =
  professionalOpportunityPublicationApprovalBaseSchema.superRefine(
    (approval, context) => {
      const pending =
        approval.status === "pending-qualified-review";
      const decision = approval.hostedDistributionDecision;
      const requiredReviewStatus = pending ? "pending" : "complete";
      if (approval.qualifiedReview.status !== requiredReviewStatus) {
        context.addIssue({
          code: "custom",
          path: ["qualifiedReview", "status"],
          message: `${approval.status} requires qualifiedReview.status ${requiredReviewStatus}`,
        });
      }

      for (const field of professionalOpportunityReviewAttestorFields) {
        const isNull = approval.qualifiedReview[field] === null;
        if (pending ? !isNull : isNull) {
          context.addIssue({
            code: "custom",
            path: ["qualifiedReview", field],
            message: pending
              ? `${field} must be null while qualified review is pending`
              : `${field} is required when publication is approved`,
          });
        }
      }

      const decisionIdentityFields = [
        "decisionMakerName",
        "decisionMakerCapacity",
        "decisionEvidenceReference",
        "reviewPackReference",
      ] as const;
      if (decision.status !== (pending ? "pending" : "approved")) {
        context.addIssue({
          code: "custom",
          path: ["hostedDistributionDecision", "status"],
          message: pending
            ? "a pending review cannot carry a hosted-distribution decision"
            : "hosted distribution requires an explicit approved decision",
        });
      }
      if (pending ? approval.decisionRecordedOn !== null : approval.decisionRecordedOn === null) {
        context.addIssue({
          code: "custom",
          path: ["decisionRecordedOn"],
          message: pending
            ? "a pending review must not carry a decision date"
            : "an approved hosted-distribution decision needs a date",
        });
      }
      for (const field of decisionIdentityFields) {
        const isNull = decision[field] === null;
        if (pending ? !isNull : isNull) {
          context.addIssue({
            code: "custom",
            path: ["hostedDistributionDecision", field],
            message: pending
              ? `${field} must remain null while the decision is pending`
              : `${field} is required for hosted-distribution approval`,
          });
        }
      }
      for (const field of [
        "exactCorpusAndPackReviewed",
        "activationRemainsSeparate",
      ] as const) {
        if (decision[field] !== !pending) {
          context.addIssue({
            code: "custom",
            path: ["hostedDistributionDecision", field],
            message: pending
              ? `${field} must remain false while the decision is pending`
              : `${field} must be confirmed by the accountable publisher`,
          });
        }
      }
      if (
        !pending &&
        decision.decisionEvidenceReference ===
          decision.reviewPackReference
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "hostedDistributionDecision",
            "decisionEvidenceReference",
          ],
          message:
            "the publisher decision needs evidence separate from the review pack",
        });
      }
      if (
        !pending &&
        decision.decisionMakerName ===
          approval.qualifiedReview.reviewerName
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "hostedDistributionDecision",
            "decisionMakerName",
          ],
          message:
            "the accountable publisher label must be separate from the review lead label",
        });
      }

      for (
        const confirmation of
        professionalOpportunityReviewConfirmationKeys
      ) {
        const expected = !pending;
        if (
          approval.qualifiedReview.confirmations[confirmation] !==
          expected
        ) {
          context.addIssue({
            code: "custom",
            path: [
              "qualifiedReview",
              "confirmations",
              confirmation,
            ],
            message: pending
              ? `${confirmation} must remain false while qualified review is pending`
              : `${confirmation} must be confirmed before publication`,
          });
        }
      }

      const rightOfReply =
        approval.qualifiedReview.institutionalRightOfReply;
      if (pending) {
        if (rightOfReply.status !== "pending") {
          context.addIssue({
            code: "custom",
            path: [
              "qualifiedReview",
              "institutionalRightOfReply",
              "status",
            ],
            message:
              "institutional right of reply must remain pending while qualified review is pending",
          });
        }
        for (const field of ["basis", "evidenceReference"] as const) {
          if (rightOfReply[field] !== null) {
            context.addIssue({
              code: "custom",
              path: [
                "qualifiedReview",
                "institutionalRightOfReply",
                field,
              ],
              message: `${field} must be null while institutional right of reply is pending`,
            });
          }
        }
      } else {
        if (rightOfReply.status === "pending") {
          context.addIssue({
            code: "custom",
            path: [
              "qualifiedReview",
              "institutionalRightOfReply",
              "status",
            ],
            message:
              "publication approval requires a completed, documented or reasoned not-applicable right-of-reply state",
          });
        }
        for (const field of ["basis", "evidenceReference"] as const) {
          if (rightOfReply[field] === null) {
            context.addIssue({
              code: "custom",
              path: [
                "qualifiedReview",
                "institutionalRightOfReply",
                field,
              ],
              message: `${field} is required before publication`,
            });
          }
        }

        const completedOn = approval.qualifiedReview.completedOn;
        if (
          completedOn !== null &&
          approval.decisionRecordedOn !== null &&
          approval.decisionRecordedOn < completedOn
        ) {
          context.addIssue({
            code: "custom",
            path: ["decisionRecordedOn"],
            message:
              "publication decision must be recorded on or after qualified review completion",
          });
        }
      }
    },
  );

export type ProfessionalOpportunityPublicationApproval = z.infer<
  typeof professionalOpportunityPublicationApprovalSchema
>;

export const professionalOpportunityRights = {
  schema: "taxsorted.uk.professional-opportunities-rights/1",
  status: "mixed-rights-read-before-reuse",
  curation: {
    name: "CC BY-SA 4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    attribution: "TaxSorted (taxsorted.io)",
    appliesTo:
      "TaxSorted-written selection, structure, short summaries and method text where TaxSorted has rights to license them.",
  },
  sourceMaterial:
    "Linked legislation, decisions, manuals, consultations, guidance and register material keep their publishers' copyright, database, contractual and attribution terms.",
  reuseRule:
    "Keep source IDs and source-use notes with reused summaries, check the current official source, and never treat this curation licence as a blanket licence over upstream material.",
  software: {
    name: "AGPL-3.0",
    source: "https://github.com/cambridgetcg/taxsorted.io",
  },
} as const;

const defaultDataPath = fileURLToPath(
  new URL(
    "../../research/uk/professional-opportunities/data/uk-professional-opportunities.json",
    import.meta.url,
  ),
);
const defaultPublicationApprovalPath = fileURLToPath(
  new URL(
    "../../research/uk/professional-opportunities/data/publication-approval.json",
    import.meta.url,
  ),
);

export function loadProfessionalOpportunityPublicationApproval(
  path = defaultPublicationApprovalPath,
): ProfessionalOpportunityPublicationApproval | null {
  if (!existsSync(path)) return null;
  const body = readFileSync(path, "utf8");
  assertNoDuplicateJsonKeys(body);
  return professionalOpportunityPublicationApprovalSchema.parse(
    JSON.parse(body),
  );
}

type JsonSchemaObject = Record<string, unknown>;

function objectValue(
  value: unknown,
): JsonSchemaObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonSchemaObject)
    : {};
}

function stageTupleSchema(
  states: readonly (string | readonly string[])[],
  blankNotes = false,
) {
  return {
    type: "array",
    minItems: professionalOpportunityAssessmentActiveStates.length,
    maxItems: professionalOpportunityAssessmentActiveStates.length,
    prefixItems: professionalOpportunityAssessmentActiveStates.map(
      (stageId, index) => ({
        type: "object",
        additionalProperties: false,
        required: ["id", "order", "state", "privateMatterFileNote"],
        properties: {
          id: { const: stageId },
          order: { const: index + 1 },
          state: Array.isArray(states[index])
            ? { enum: states[index] }
            : { const: states[index] },
          privateMatterFileNote: blankNotes
            ? { const: "" }
            : { type: "string", maxLength: 8_000 },
        },
      }),
    ),
    items: false,
  } as const;
}

const assessmentBaseJsonSchema = z.toJSONSchema(
  professionalOpportunityAssessmentBaseSchema,
) as JsonSchemaObject;
const assessmentBaseProperties = objectValue(
  assessmentBaseJsonSchema.properties,
);
const assessmentWorkflowJsonSchema = objectValue(
  assessmentBaseProperties.workflow,
);
const assessmentWorkflowProperties = objectValue(
  assessmentWorkflowJsonSchema.properties,
);

const templateStageStates =
  professionalOpportunityAssessmentActiveStates.map(() => "not-assessed");
const anyStageStates = professionalOpportunityAssessmentActiveStates.map(
  () => ["not-assessed", "in-progress", "complete"] as const,
);

function instructionRequirementsJsonSchema() {
  return {
    type: "object",
    properties: {
      prospectiveClientConsentConfirmed: { const: true },
      clientIdentityAndAuthorityChecked: { const: true },
      confidentialChannelAgreed: { const: true },
    },
    required: [
      "prospectiveClientConsentConfirmed",
      "clientIdentityAndAuthorityChecked",
      "confidentialChannelAgreed",
    ],
  } as const;
}

function assessorRequirementsJsonSchema(
  completedStageCount: number,
  decision?: (typeof professionalOpportunityTerminalDecisions)[number],
) {
  if (completedStageCount < 3) return undefined;
  const requiresPositive =
    decision === undefined ||
    completedStageCount >= 5 ||
    decision === "needs-more-evidence" ||
    decision === "suitable-for-further-private-review";
  const includesConflictAssessment = completedStageCount >= 4;
  const requiresConflictClearance =
    decision === undefined ||
    completedStageCount >= 5 ||
    decision === "needs-more-evidence" ||
    decision === "suitable-for-further-private-review";
  const properties: Record<string, unknown> = {
    professionalVerification: {
      type: "object",
      properties: {
        state: {
          enum: [
            "verified-professional",
            "not-applicable-with-reason",
          ],
        },
      },
      required: ["state"],
    },
    businessOrHmrcRegistration: {
      type: "object",
      properties: {
        state: {
          enum: ["verified", "not-applicable-with-reason"],
        },
      },
      required: ["state"],
    },
    protectedTitleStatus: {
      type: "object",
      properties: {
        state: {
          enum: ["verified", "not-applicable-with-reason"],
        },
      },
      required: ["state"],
    },
    competence: {
      type: "object",
      properties: {
        state: requiresPositive
          ? { const: "confirmed" }
          : { enum: ["confirmed", "not-confirmed"] },
      },
      required: ["state"],
    },
    taskAuthority: {
      type: "object",
      properties: {
        state: requiresPositive
          ? { const: "confirmed" }
          : { enum: ["confirmed", "not-confirmed"] },
      },
      required: ["state"],
    },
  };
  const required = [
    "professionalVerification",
    "businessOrHmrcRegistration",
    "protectedTitleStatus",
    "competence",
    "taskAuthority",
  ];
  if (includesConflictAssessment) {
    properties.conflicts = {
      type: "object",
      properties: {
        state: requiresConflictClearance
          ? { const: "cleared" }
          : { enum: ["cleared", "conflict-found"] },
      },
      required: ["state"],
    };
    required.push("conflicts");
  }
  return {
    type: "object",
    properties,
    required,
  };
}

function completeStageStateSchema(completedStageCount: number) {
  return stageTupleSchema(
    professionalOpportunityAssessmentActiveStates.map((_stage, index) =>
      index < completedStageCount ? "complete" : "not-assessed",
    ),
  );
}

const inProgressStateSchemas =
  professionalOpportunityAssessmentActiveStates.map(
    (currentState, currentIndex) => {
      const assessor = assessorRequirementsJsonSchema(currentIndex);
      const requiresClientAuthority = currentIndex >= 4;
      return {
        type: "object",
        properties: {
          workflow: {
            type: "object",
            properties: {
              currentState: { const: currentState },
              stages: stageTupleSchema(
                professionalOpportunityAssessmentActiveStates.map(
                  (_stage, index) =>
                    index < currentIndex
                      ? "complete"
                      : index === currentIndex
                        ? "in-progress"
                        : "not-assessed",
                ),
              ),
            },
            required: ["currentState", "stages"],
          },
          ...(assessor ? { assessor } : {}),
          ...(requiresClientAuthority
            ? { instruction: instructionRequirementsJsonSchema() }
            : {}),
        },
        required: [
          "workflow",
          ...(assessor ? ["assessor"] : []),
          ...(requiresClientAuthority ? ["instruction"] : []),
        ],
      };
    },
  );

const completeDecisionStateSchemas =
  professionalOpportunityTerminalDecisions.flatMap((decision) => {
    const minimum =
      decision === "declined"
        ? 1
        : decision === "refer-with-consent"
          ? 4
          : decision === "needs-more-evidence"
            ? 5
            : professionalOpportunityAssessmentActiveStates.length;
    return Array.from(
      {
        length:
          professionalOpportunityAssessmentActiveStates.length -
          minimum +
          1,
      },
      (_unused, index) => {
        const completedStageCount = minimum + index;
        const assessor = assessorRequirementsJsonSchema(
          completedStageCount,
          decision,
        );
        const requiresClientAuthority =
          completedStageCount >= 5 ||
          decision === "needs-more-evidence" ||
          decision === "refer-with-consent" ||
          decision === "suitable-for-further-private-review";
        return {
          type: "object",
          properties: {
            workflow: {
              type: "object",
              properties: {
                currentState: { const: "terminal" },
                stages: completeStageStateSchema(completedStageCount),
              },
              required: ["currentState", "stages"],
            },
            decision: {
              type: "object",
              properties: {
                state: { const: decision },
                decidedOn: {
                  type: "string",
                  pattern: calendarDatePattern,
                },
                ...(completedStageCount ===
                  professionalOpportunityAssessmentActiveStates.length ||
                decision === "suitable-for-further-private-review"
                  ? {
                      zeroOrNegativeFinancialScenarioConsidered: {
                        const: true,
                      },
                    }
                  : {}),
              },
              required: [
                "state",
                "decidedOn",
                ...(completedStageCount ===
                  professionalOpportunityAssessmentActiveStates.length ||
                decision === "suitable-for-further-private-review"
                  ? ["zeroOrNegativeFinancialScenarioConsidered"]
                  : []),
              ],
            },
            ...(assessor ? { assessor } : {}),
            ...(requiresClientAuthority
              ? { instruction: instructionRequirementsJsonSchema() }
              : {}),
          },
          required: [
            "workflow",
            "decision",
            ...(assessor ? ["assessor"] : []),
            ...(requiresClientAuthority ? ["instruction"] : []),
          ],
        };
      },
    );
  });

export const professionalOpportunityAssessmentJsonSchema = {
  ...assessmentBaseJsonSchema,
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://api.taxsorted.io/v1/professional-opportunities/uk/assessment-schema",
  title: "TaxSorted local professional-opportunity assessment",
  description:
    "A portable, local-only professional assessment. Packet fields are a caller-maintained reference, not verified packet identity. Client facts are optional and have no TaxSorted submission endpoint.",
  properties: {
    ...assessmentBaseProperties,
    workflow: {
      ...assessmentWorkflowJsonSchema,
      properties: {
        ...assessmentWorkflowProperties,
        stages: stageTupleSchema(anyStageStates),
      },
    },
    boundaries: {
      type: "array",
      minItems: professionalOpportunityAssessmentBoundaries.length,
      maxItems: professionalOpportunityAssessmentBoundaries.length,
      prefixItems: professionalOpportunityAssessmentBoundaries.map(
        (boundary) => ({ const: boundary }),
      ),
      items: false,
    },
  },
  allOf: [
    {
      if: {
        type: "object",
        properties: {
          status: { const: "local-template-not-submitted" },
        },
        required: ["status"],
      },
      then: {
        type: "object",
        properties: {
          packetReference: {
            type: "object",
            properties: {
              opportunityId: { const: "" },
              corpusVersion: { const: "" },
              declaredPacketDigest: { const: "" },
              referenceCheckedOn: { type: "null" },
            },
            required: [
              "opportunityId",
              "corpusVersion",
              "declaredPacketDigest",
              "referenceCheckedOn",
            ],
          },
          assessor: {
            type: "object",
            properties: {
              professionalVerification: {
                type: "object",
                properties: { state: { const: "unverified" } },
                required: ["state"],
              },
              businessOrHmrcRegistration: {
                type: "object",
                properties: { state: { const: "not-checked" } },
                required: ["state"],
              },
              protectedTitleStatus: {
                type: "object",
                properties: { state: { const: "not-checked" } },
                required: ["state"],
              },
              competence: {
                type: "object",
                properties: { state: { const: "not-assessed" } },
                required: ["state"],
              },
              taskAuthority: {
                type: "object",
                properties: { state: { const: "not-assessed" } },
                required: ["state"],
              },
              conflicts: {
                type: "object",
                properties: { state: { const: "not-assessed" } },
                required: ["state"],
              },
            },
            required: [
              "professionalVerification",
              "businessOrHmrcRegistration",
              "protectedTitleStatus",
              "competence",
              "taskAuthority",
              "conflicts",
            ],
          },
          instruction: {
            type: "object",
            properties: {
              prospectiveClientConsentConfirmed: { const: false },
              clientIdentityAndAuthorityChecked: { const: false },
              confidentialChannelAgreed: { const: false },
            },
            required: [
              "prospectiveClientConsentConfirmed",
              "clientIdentityAndAuthorityChecked",
              "confidentialChannelAgreed",
            ],
          },
          workflow: {
            type: "object",
            properties: {
              currentState: { const: "unopened" },
              stages: stageTupleSchema(templateStageStates, true),
            },
            required: ["currentState", "stages"],
          },
          decision: {
            type: "object",
            properties: {
              state: { const: "not-assessed" },
              decidedOn: { type: "null" },
              reasonsKeptInPrivateMatterFile: { const: true },
              zeroOrNegativeFinancialScenarioConsidered: { const: false },
            },
            required: [
              "state",
              "decidedOn",
              "reasonsKeptInPrivateMatterFile",
              "zeroOrNegativeFinancialScenarioConsidered",
            ],
          },
          privacy: {
            type: "object",
            properties: {
              containsClientFacts: { const: false },
              taxSortedSubmissionEndpoint: { type: "null" },
            },
            required: [
              "containsClientFacts",
              "taxSortedSubmissionEndpoint",
            ],
          },
        },
      },
    },
    {
      if: {
        type: "object",
        properties: {
          status: { const: "local-assessment-private-in-progress" },
        },
        required: ["status"],
      },
      then: {
        type: "object",
        properties: {
          packetReference: {
            type: "object",
            properties: {
              opportunityId: { type: "string", minLength: 1, maxLength: 120 },
              corpusVersion: { type: "string", minLength: 1, maxLength: 100 },
              declaredPacketDigest: {
                type: "string",
                pattern: "^sha256:[a-f0-9]{64}$",
              },
              referenceCheckedOn: {
                type: "string",
                pattern: calendarDatePattern,
              },
            },
            required: [
              "opportunityId",
              "corpusVersion",
              "declaredPacketDigest",
              "referenceCheckedOn",
            ],
          },
          decision: {
            type: "object",
            properties: {
              state: { const: "not-assessed" },
              decidedOn: { type: "null" },
            },
            required: [
              "state",
              "decidedOn",
            ],
          },
        },
        oneOf: inProgressStateSchemas,
      },
    },
    {
      if: {
        type: "object",
        properties: {
          status: { const: "local-assessment-private-complete" },
        },
        required: ["status"],
      },
      then: {
        type: "object",
        properties: {
          packetReference: {
            type: "object",
            properties: {
              opportunityId: { type: "string", minLength: 1, maxLength: 120 },
              corpusVersion: { type: "string", minLength: 1, maxLength: 100 },
              declaredPacketDigest: {
                type: "string",
                pattern: "^sha256:[a-f0-9]{64}$",
              },
              referenceCheckedOn: {
                type: "string",
                pattern: calendarDatePattern,
              },
            },
            required: [
              "opportunityId",
              "corpusVersion",
              "declaredPacketDigest",
              "referenceCheckedOn",
            ],
          },
        },
        oneOf: completeDecisionStateSchemas,
      },
    },
  ],
  "x-taxsorted-effects":
    "Local file only; no upload, intake, matching, referral, recommendation, filing or external state change.",
  "x-taxsorted-runtime-invariants": [
    "Stages occur once in preserve-first order, with route and clock triage before private fact development.",
    "Only the active in-progress stage can be in progress; earlier stages are complete and later stages are not assessed.",
    "A terminal decision has one contiguous completed prefix: decline can stop after scope, referral after consent and gate assessment, evidence insufficiency after facts, and suitability only after every stage.",
    "Business or HMRC registration, protected-title status, competence, exact task authority and conflicts remain separate checks; a prudent specialist can record not-applicable-with-reason instead of claiming a universal licence.",
    "Client facts are never required. A completed money-and-risk stage confirms that a zero-or-negative financial scenario was considered.",
    "Schema validation checks packet-reference shape and internal state only; it does not fetch the packet or prove that the declared digest belongs to it.",
  ],
} as const;

const sourceIdsSchema = z.array(id).min(1).max(100);
const scrutinyIdsSchema = z.array(id).max(100);

const evidenceStateSchema = z.enum([
  "court-finding",
  "oversight-finding",
  "official-statistic",
  "stakeholder-assessment",
  "taxsorted-fairness-question",
  "unknown",
]);

const territorySchema = z.enum([
  "England",
  "Great Britain",
  "Northern Ireland",
  "Scotland",
  "United Kingdom",
  "Wales",
]);
const territoriesSchema = z
  .array(territorySchema)
  .min(1)
  .max(6)
  .refine(
    (territories) => new Set(territories).size === territories.length,
    "territories must be unique",
  );

const professionalOpportunitySourceTypeSchema = z.enum([
  "independent-public-audit-report",
  "official-corporate-report",
  "official-guidance",
  "official-operational-manual",
  "official-oversight-report",
  "official-procedure",
  "official-profession-record",
  "official-standard",
  "officially-hosted-stakeholder-assessment",
  "primary-legislation",
  "professional-register",
  "regulatory-register",
  "secondary-legislation",
  "supreme-court-judgment",
]);

const professionalOpportunitySourceSchema = strictObject({
  id,
  title: shortText,
  publisher: shortText,
  url: httpsUrl,
  sourceType: professionalOpportunitySourceTypeSchema,
  territories: territoriesSchema,
  retrievedAt: date,
  notes: text,
});

const professionalOpportunityScrutinySchema = strictObject({
  id,
  title: shortText,
  evidenceState: evidenceStateSchema,
  statement: text,
  doesNotProve: text,
  counterweightOrResponse: text,
  correctionOrReviewRoute: text,
  affectedInstitutions: nonEmptyStrings,
  sourceIds: sourceIdsSchema,
});

const professionalStatusBoundarySchema = strictObject({
  generalRule: text,
  registrationRule: text,
  phasedWindows: z
    .array(
      strictObject({
        group: shortText,
        opens: date,
        applyBy: shortText,
        sourceIds: sourceIdsSchema,
      }),
    )
    .min(1)
    .max(20),
  exceptions: nonEmptyStrings,
  verificationChecklist: nonEmptyStrings,
  sourceIds: sourceIdsSchema,
});

const professionalOpportunityMethodSchema = strictObject({
  purpose: text,
  opportunityDefinition: text,
  sourceRule: text,
  evidenceStates: strictObject({
    "court-finding": text,
    "oversight-finding": text,
    "official-statistic": text,
    "stakeholder-assessment": text,
    "taxsorted-fairness-question": text,
    unknown: text,
  }),
  claimRule: text,
  fairnessRule: text,
  updateRule: text,
  sourceResolutionRule: text,
  professionalStatusBoundary: professionalStatusBoundarySchema,
});

const sharedWorkflowStageSchema = strictObject({
  stage: shortText,
  action: text,
  output: text,
  stopCondition: text,
});

const sharedChallengeRouteGuideSchema = strictObject({
  id,
  title: shortText,
  useWhen: text,
  clock: text,
  next: text,
  sourceIds: sourceIdsSchema,
});

const professionalOpportunitySharedWorkflowSchema = strictObject({
  id,
  title: shortText,
  localCustody: text,
  noSubmissionEndpoint: z.literal(true),
  terminalDecisions: z
    .array(terminalDecisionSchema)
    .length(professionalOpportunityTerminalDecisions.length),
  stages: z.array(sharedWorkflowStageSchema).min(1).max(30),
  deadlineControl: strictObject({
    rule: text,
    immediateActions: nonEmptyStrings,
    sourceIds: sourceIdsSchema,
  }),
  challengeSeparation: strictObject({
    rule: text,
    routes: z.array(sharedChallengeRouteGuideSchema).length(3),
  }),
  moneyStateOrder: z
    .array(
      z.enum([
        "amountAffected",
        "qualifyingBase",
        "amountClaimed",
        "amountAccepted",
        "amountReceivedOrCredited",
        "amountPaidByClient",
        "redress",
        "costs",
        "interestReceived",
        "interestPaid",
        "professionalFees",
        "netClientPosition",
      ]),
    )
    .length(12),
  evidenceHandlingRules: nonEmptyStrings,
  professionalGateRule: text,
  publicationGateRule: text,
});

const professionalGateSchema = strictObject({
  kind: z.enum([
    "legal-requirement",
    "regulator-or-platform-condition",
    "professional-body-rule",
    "prudent-specialism",
  ]),
  verification: text,
  appliesWhen: text,
  sourceIds: sourceIdsSchema,
});

const professionalRoleSchema = strictObject({
  role: shortText,
  purpose: text,
  gates: z.array(professionalGateSchema).min(1).max(10),
  sourceIds: sourceIdsSchema,
});

const professionalOpportunitySchema = strictObject({
  id,
  slug: id,
  title: shortText,
  taxArea: shortText,
  territories: territoriesSchema,
  publicationStatus: z.literal("read-only-research"),
  issuePatterns: nonEmptyStrings,
  whySpecialistJudgmentMatters: nonEmptyStrings,
  professionalRoles: z.array(professionalRoleSchema).min(1).max(30),
  authorityAndProcedure: strictObject({
    legalBasis: text,
    procedure: text,
    scopeLimits: text,
    sourceIds: sourceIdsSchema,
  }),
  deadlineWarnings: z
    .array(
      strictObject({
        warning: text,
        immediateCheck: text,
        sourceIds: sourceIdsSchema,
      }),
    )
    .min(1)
    .max(30),
  lawfulValueMechanisms: z
    .array(
      strictObject({
        mechanism: shortText,
        valuePath: text,
        limit: text,
        sourceIds: sourceIdsSchema,
      }),
    )
    .min(1)
    .max(30),
  moneyModel: strictObject({
    amountAffected: text,
    qualifyingBase: text,
    amountClaimed: text,
    amountAccepted: text,
    amountReceivedOrCredited: text,
    amountPaidByClient: text,
    redress: text,
    costs: text,
    interestReceived: text,
    interestPaid: text,
    professionalFees: text,
    netClientPosition: text,
    calculationMethod: text,
    notMeaning: text,
    zeroOrNegativeScenario: text,
  }),
  evidenceChecklist: z
    .array(
      strictObject({
        item: shortText,
        purpose: text,
        minimumProof: text,
        sourceIds: sourceIdsSchema,
      }),
    )
    .min(1)
    .max(50),
  workflow: z
    .array(
      strictObject({
        stage: shortText,
        action: text,
        output: text,
        stopCondition: text,
        sourceIds: sourceIdsSchema,
      }),
    )
    .min(1)
    .max(50),
  challengeRoutes: z
    .array(
      strictObject({
        route: shortText,
        purpose: text,
        deadlineOrTrigger: text,
        doesNotReplace: text,
        sourceIds: sourceIdsSchema,
      }),
    )
    .min(1)
    .max(30),
  counterweights: z
    .array(
      strictObject({
        statement: text,
        whyItMatters: text,
        sourceIds: sourceIdsSchema,
      }),
    )
    .min(1)
    .max(30),
  scrutinyIds: scrutinyIdsSchema,
  sourceIds: sourceIdsSchema,
});

const ukProfessionalOpportunitiesShape = {
  schema: z.literal("taxsorted.uk.professional-opportunities.v1"),
  meta: strictObject({
    title: shortText,
    version: shortText,
    lawAsAt: date,
    jurisdiction: shortText,
    scope: text,
    coverage: nonEmptyStrings,
    exclusions: nonEmptyStrings,
    warning: text,
    recordCounts: strictObject({
      opportunities: z.number().int().nonnegative(),
      scrutiny: z.number().int().nonnegative(),
      sources: z.number().int().nonnegative(),
    }),
    preparedAt: date,
    retrievedAt: date,
    ordering: text,
    disclaimer: text,
  }),
  publication: strictObject({
    status: z.literal("professional-opportunity-research"),
    writes: z.literal(false),
    publicIntake: z.literal(false),
    professionalMarketplace: z.literal(false),
    emergencyStop: z.literal(
      "UK_PROFESSIONAL_OPPORTUNITIES_EMERGENCY_STOP",
    ),
    corrections: httpsUrl,
    confidentialCorrectionChannel: z.null(),
    privateEvidencePolicy: text,
    activationGap: text,
    publicationRequiresMatchingApproval: z.literal(true),
    releaseConditions: nonEmptyStrings,
    prohibitedUses: nonEmptyStrings,
  }),
  method: professionalOpportunityMethodSchema,
  sharedWorkflow: professionalOpportunitySharedWorkflowSchema,
  sources: z.array(professionalOpportunitySourceSchema).min(1).max(500),
  scrutiny: z.array(professionalOpportunityScrutinySchema).min(1).max(500),
  opportunities: z.array(professionalOpportunitySchema).min(1).max(500),
} satisfies z.ZodRawShape;

const ukProfessionalOpportunitiesBaseSchema = strictObject(
  ukProfessionalOpportunitiesShape,
);

type UkProfessionalOpportunitiesBase = z.infer<
  typeof ukProfessionalOpportunitiesBaseSchema
>;

const expectedMoneyStateOrder = [
  "amountAffected",
  "qualifyingBase",
  "amountClaimed",
  "amountAccepted",
  "amountReceivedOrCredited",
  "amountPaidByClient",
  "redress",
  "costs",
  "interestReceived",
  "interestPaid",
  "professionalFees",
  "netClientPosition",
] as const;

const expectedSharedChallengeRouteIds = [
  "appeal-review",
  "complaint",
  "judicial-review",
] as const;

const forbiddenFieldNames = new Set([
  "contact",
  "contactdetails",
  "email",
  "expectedvalue",
  "lead",
  "leads",
  "lawfirmcontact",
  "payout",
  "phone",
  "probability",
  "professionalrevenue",
  "rank",
  "ranking",
  "recommendation",
  "recommended",
  "referral",
  "revenueestimate",
  "successscore",
  "winrate",
]);

function addCorpusIssue(
  context: z.RefinementCtx,
  path: PropertyKey[],
  message: string,
) {
  context.addIssue({ code: "custom", path, message });
}

function normaliseFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function checkForbiddenFields(
  value: unknown,
  context: z.RefinementCtx,
  path: PropertyKey[] = [],
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      checkForbiddenFields(item, context, [...path, index]),
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenFieldNames.has(normaliseFieldName(key))) {
      addCorpusIssue(
        context,
        [...path, key],
        `${key} is forbidden in the public research corpus`,
      );
    }
    checkForbiddenFields(child, context, [...path, key]);
  }
}

function collectIdsForKey(
  value: unknown,
  keyToCollect: "sourceIds" | "scrutinyIds",
  output: string[] = [],
): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectIdsForKey(item, keyToCollect, output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) {
    if (key === keyToCollect && Array.isArray(child)) {
      for (const referencedId of child) {
        if (typeof referencedId === "string") output.push(referencedId);
      }
      continue;
    }
    collectIdsForKey(child, keyToCollect, output);
  }
  return output;
}

function checkSortedUniqueIds(
  values: readonly string[],
  context: z.RefinementCtx,
  path: PropertyKey[],
  label: string,
) {
  if (new Set(values).size !== values.length) {
    addCorpusIssue(context, path, `${label} must be unique`);
  }
  const sorted = [...values].sort();
  if (values.some((value, index) => value !== sorted[index])) {
    addCorpusIssue(
      context,
      path,
      `${label} must be ordered deterministically`,
    );
  }
}

function checkUniqueStrings(
  values: readonly string[],
  context: z.RefinementCtx,
  path: PropertyKey[],
  label: string,
) {
  if (new Set(values).size !== values.length) {
    addCorpusIssue(context, path, `${label} must be unique`);
  }
}

function walkSourceIdArrays(
  value: unknown,
  context: z.RefinementCtx,
  path: PropertyKey[] = [],
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walkSourceIdArrays(item, context, [...path, index]),
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "sourceIds" && Array.isArray(child)) {
      checkSortedUniqueIds(
        child.filter((item): item is string => typeof item === "string"),
        context,
        [...path, key],
        "sourceIds",
      );
    }
    walkSourceIdArrays(child, context, [...path, key]);
  }
}

function validateCorpusInvariants(
  corpus: UkProfessionalOpportunitiesBase,
  context: z.RefinementCtx,
) {
  checkForbiddenFields(corpus, context);
  walkSourceIdArrays(corpus, context);

  const collections = [
    ["sources", corpus.sources],
    ["scrutiny", corpus.scrutiny],
    ["opportunities", corpus.opportunities],
  ] as const;
  for (const [name, records] of collections) {
    checkSortedUniqueIds(
      records.map((record) => record.id),
      context,
      [name],
      `${name} IDs`,
    );
  }
  const opportunitySlugs = corpus.opportunities.map(
    (opportunity) => opportunity.slug,
  );
  if (new Set(opportunitySlugs).size !== opportunitySlugs.length) {
    addCorpusIssue(
      context,
      ["opportunities"],
      "opportunity slugs must be unique",
    );
  }

  const expectedCounts = {
    opportunities: corpus.opportunities.length,
    scrutiny: corpus.scrutiny.length,
    sources: corpus.sources.length,
  };
  for (const [name, count] of Object.entries(expectedCounts)) {
    if (
      corpus.meta.recordCounts[
        name as keyof typeof corpus.meta.recordCounts
      ] !== count
    ) {
      addCorpusIssue(
        context,
        ["meta", "recordCounts", name],
        `${name} count must match the record array`,
      );
    }
  }

  if (corpus.meta.preparedAt > corpus.meta.retrievedAt) {
    addCorpusIssue(
      context,
      ["meta", "preparedAt"],
      "preparedAt cannot be later than retrievedAt",
    );
  }
  if (corpus.meta.lawAsAt > corpus.meta.retrievedAt) {
    addCorpusIssue(
      context,
      ["meta", "lawAsAt"],
      "lawAsAt cannot be later than the corpus retrieval date",
    );
  }
  corpus.sources.forEach((source, index) => {
    if (source.retrievedAt > corpus.meta.retrievedAt) {
      addCorpusIssue(
        context,
        ["sources", index, "retrievedAt"],
        "a source retrieval date cannot be later than the corpus retrieval date",
      );
    }
  });

  checkUniqueStrings(
    corpus.sharedWorkflow.stages.map((stage) => stage.stage),
    context,
    ["sharedWorkflow", "stages"],
    "shared workflow stage names",
  );
  corpus.opportunities.forEach((opportunity, index) => {
    checkUniqueStrings(
      opportunity.scrutinyIds,
      context,
      ["opportunities", index, "scrutinyIds"],
      "scrutinyIds",
    );
    checkUniqueStrings(
      opportunity.workflow.map((stage) => stage.stage),
      context,
      ["opportunities", index, "workflow"],
      "opportunity workflow stage names",
    );
    opportunity.professionalRoles.forEach((role, roleIndex) => {
      checkUniqueStrings(
        role.gates.map((gate) => gate.kind),
        context,
        ["opportunities", index, "professionalRoles", roleIndex, "gates"],
        "professional gate kinds",
      );
      const gateSourceIds = [
        ...new Set(role.gates.flatMap((gate) => gate.sourceIds)),
      ].sort();
      if (
        role.sourceIds.length !== gateSourceIds.length ||
        role.sourceIds.some(
          (sourceId, sourceIndex) =>
            sourceId !== gateSourceIds[sourceIndex],
        )
      ) {
        addCorpusIssue(
          context,
          [
            "opportunities",
            index,
            "professionalRoles",
            roleIndex,
            "sourceIds",
          ],
          "role sourceIds must equal the ordered union of its gate sourceIds",
        );
      }
    });
  });

  if (
    corpus.sharedWorkflow.terminalDecisions.some(
      (decision, index) =>
        decision !== professionalOpportunityTerminalDecisions[index],
    )
  ) {
    addCorpusIssue(
      context,
      ["sharedWorkflow", "terminalDecisions"],
      "terminal decisions must retain the portable assessment order",
    );
  }
  if (
    corpus.sharedWorkflow.moneyStateOrder.some(
      (state, index) => state !== expectedMoneyStateOrder[index],
    )
  ) {
    addCorpusIssue(
      context,
      ["sharedWorkflow", "moneyStateOrder"],
      "money states must remain separate and retain their declared order",
    );
  }
  if (
    corpus.sharedWorkflow.challengeSeparation.routes.some(
      (route, index) =>
        route.id !== expectedSharedChallengeRouteIds[index],
    )
  ) {
    addCorpusIssue(
      context,
      ["sharedWorkflow", "challengeSeparation", "routes"],
      "shared challenge routes must retain the appeal, complaint and judicial-review order",
    );
  }

  const sourceIds = new Set(corpus.sources.map((source) => source.id));
  const sourceReferences = collectIdsForKey(
    {
      method: corpus.method,
      sharedWorkflow: corpus.sharedWorkflow,
      scrutiny: corpus.scrutiny,
      opportunities: corpus.opportunities,
    },
    "sourceIds",
  );
  for (const sourceId of sourceReferences) {
    if (!sourceIds.has(sourceId)) {
      addCorpusIssue(
        context,
        ["sources"],
        `source reference ${sourceId} does not resolve`,
      );
    }
  }
  const usedSourceIds = new Set(sourceReferences);
  for (const source of corpus.sources) {
    if (!usedSourceIds.has(source.id)) {
      addCorpusIssue(
        context,
        ["sources"],
        `source ${source.id} is not used by any published claim or method`,
      );
    }
  }

  const scrutinyIds = new Set(
    corpus.scrutiny.map((scrutiny) => scrutiny.id),
  );
  const scrutinyReferences = corpus.opportunities.flatMap(
    (opportunity) => opportunity.scrutinyIds,
  );
  for (const scrutinyId of scrutinyReferences) {
    if (!scrutinyIds.has(scrutinyId)) {
      addCorpusIssue(
        context,
        ["opportunities"],
        `scrutiny reference ${scrutinyId} does not resolve`,
      );
    }
  }
  const usedScrutinyIds = new Set(scrutinyReferences);
  for (const scrutiny of corpus.scrutiny) {
    if (!usedScrutinyIds.has(scrutiny.id)) {
      addCorpusIssue(
        context,
        ["scrutiny"],
        `scrutiny record ${scrutiny.id} is not used by an opportunity`,
      );
    }
  }
}

export const ukProfessionalOpportunitiesSchema =
  ukProfessionalOpportunitiesBaseSchema.superRefine(
    validateCorpusInvariants,
  );

export type UkProfessionalOpportunities = z.infer<
  typeof ukProfessionalOpportunitiesSchema
>;

export function validateUkProfessionalOpportunities(
  value: unknown,
): UkProfessionalOpportunities {
  return ukProfessionalOpportunitiesSchema.parse(value);
}

export function loadUkProfessionalOpportunities(
  path = defaultDataPath,
): UkProfessionalOpportunities {
  const body = readFileSync(path, "utf8");
  assertNoDuplicateJsonKeys(body);
  return validateUkProfessionalOpportunities(JSON.parse(body));
}

export function professionalOpportunityCorpusDigest(
  corpus: UkProfessionalOpportunities,
) {
  const reviewed = validateUkProfessionalOpportunities(corpus);
  return `sha256:${createHash("sha256")
    .update(canonicalJson(reviewed))
    .digest("hex")}` as const;
}

export type ProfessionalOpportunityPublicationDecision = {
  approved: boolean;
  corpusDigest: `sha256:${string}`;
  approvedOpportunityIds: string[];
  reason:
    | "approved"
    | "pending-qualified-review"
    | "approval-missing"
    | "approval-invalid"
    | "corpus-version-mismatch"
    | "corpus-digest-mismatch"
    | "opportunity-ids-mismatch"
    | "review-pack-missing"
    | "review-pack-invalid"
    | "review-pack-mismatch";
};

export function evaluateProfessionalOpportunityPublicationApproval(
  corpus: UkProfessionalOpportunities,
  approval: ProfessionalOpportunityPublicationApproval | null,
  reviewPack: ProfessionalOpportunityReviewPack | null =
    loadProfessionalOpportunityReviewPack(),
  asOf = new Date().toISOString().slice(0, 10),
): ProfessionalOpportunityPublicationDecision {
  const reviewed = validateUkProfessionalOpportunities(corpus);
  const corpusDigest = professionalOpportunityCorpusDigest(reviewed);
  if (approval === null) {
    return {
      approved: false,
      corpusDigest,
      approvedOpportunityIds: [],
      reason: "approval-missing",
    };
  }
  const parsed = professionalOpportunityPublicationApprovalSchema.safeParse(
    approval,
  );
  if (!parsed.success) {
    return {
      approved: false,
      corpusDigest,
      approvedOpportunityIds: [],
      reason: "approval-invalid",
    };
  }
  if (parsed.data.status === "pending-qualified-review") {
    return {
      approved: false,
      corpusDigest,
      approvedOpportunityIds: [],
      reason: "pending-qualified-review",
    };
  }
  const completedOn = parsed.data.qualifiedReview.completedOn;
  const decisionRecordedOn = parsed.data.decisionRecordedOn;
  if (
    completedOn === null ||
    decisionRecordedOn === null ||
    completedOn < reviewed.meta.retrievedAt ||
    completedOn > asOf ||
    decisionRecordedOn > asOf
  ) {
    return {
      approved: false,
      corpusDigest,
      approvedOpportunityIds: [],
      reason: "approval-invalid",
    };
  }
  if (parsed.data.corpusVersion !== reviewed.meta.version) {
    return {
      approved: false,
      corpusDigest,
      approvedOpportunityIds: [],
      reason: "corpus-version-mismatch",
    };
  }
  if (parsed.data.corpusDigest !== corpusDigest) {
    return {
      approved: false,
      corpusDigest,
      approvedOpportunityIds: [],
      reason: "corpus-digest-mismatch",
    };
  }
  const opportunityIds = reviewed.opportunities.map(
    (opportunity) => opportunity.id,
  );
  if (
    parsed.data.opportunityIds.length !== opportunityIds.length ||
    parsed.data.opportunityIds.some(
      (opportunityId, index) => opportunityId !== opportunityIds[index],
    )
  ) {
    return {
      approved: false,
      corpusDigest,
      approvedOpportunityIds: [],
      reason: "opportunity-ids-mismatch",
    };
  }
  if (reviewPack === null) {
    return {
      approved: false,
      corpusDigest,
      approvedOpportunityIds: [],
      reason: "review-pack-missing",
    };
  }
  let exactReviewPack: ProfessionalOpportunityReviewPack;
  try {
    exactReviewPack =
      validateProfessionalOpportunityReviewPackForCorpus(
        reviewPack,
        reviewed,
        corpusDigest,
        asOf,
      );
  } catch {
    return {
      approved: false,
      corpusDigest,
      approvedOpportunityIds: [],
      reason: "review-pack-invalid",
    };
  }
  const reviewFacts =
    professionalOpportunityReviewPackApprovalFacts(exactReviewPack);
  const rightOfReply =
    parsed.data.qualifiedReview.institutionalRightOfReply;
  if (
    reviewFacts === null ||
    parsed.data.qualifiedReview.reviewerName !==
      reviewFacts.reviewerName ||
    parsed.data.qualifiedReview.reviewerCapacity !==
      reviewFacts.reviewerCapacity ||
    parsed.data.qualifiedReview.completedOn !==
      reviewFacts.completedOn ||
    parsed.data.qualifiedReview.evidenceReference !==
      reviewFacts.reference ||
    parsed.data.hostedDistributionDecision.reviewPackReference !==
      reviewFacts.reference ||
    rightOfReply.status !== "completed" ||
    rightOfReply.evidenceReference !==
      reviewFacts.rightOfReplyReference
  ) {
    return {
      approved: false,
      corpusDigest,
      approvedOpportunityIds: [],
      reason: "review-pack-mismatch",
    };
  }
  return {
    approved: true,
    corpusDigest,
    approvedOpportunityIds: opportunityIds,
    reason: "approved",
  };
}

export function sourcesForProfessionalOpportunityValue(
  value: unknown,
  corpus: UkProfessionalOpportunities,
) {
  const requestedIds = new Set(
    collectIdsForKey(value, "sourceIds"),
  );
  return corpus.sources.filter((source) => requestedIds.has(source.id));
}

export function scrutinyForProfessionalOpportunityValue(
  value: unknown,
  corpus: UkProfessionalOpportunities,
) {
  const requestedIds = new Set(
    collectIdsForKey(value, "scrutinyIds"),
  );
  return corpus.scrutiny.filter((scrutiny) =>
    requestedIds.has(scrutiny.id),
  );
}

const professionalOpportunityPacketPreimageSchema = strictObject({
  schema: z.literal("taxsorted.uk.professional-opportunity-packet/1"),
  corpusVersion: shortText,
  lawAsAt: date,
  jurisdiction: shortText,
  warning: text,
  method: professionalOpportunityMethodSchema,
  sharedWorkflow: professionalOpportunitySharedWorkflowSchema,
  opportunity: professionalOpportunitySchema,
  scrutiny: z.array(professionalOpportunityScrutinySchema).max(500),
  sources: z.array(professionalOpportunitySourceSchema).min(1).max(500),
});

const professionalOpportunityPacketBaseSchema = strictObject({
  ...professionalOpportunityPacketPreimageSchema.shape,
  integrity: strictObject({
    algorithm: z.literal("sha256"),
    digest: sha256,
    digestScope: text,
    proves: nonEmptyStrings,
    doesNotProve: nonEmptyStrings,
  }),
  links: strictObject({
    self: shortText,
    collection: shortText,
    scrutiny: shortText,
    schema: shortText,
    assessmentTemplate: shortText,
    rights: shortText,
    human: httpsUrl,
    corrections: httpsUrl,
  }),
});

export const professionalOpportunityPacketSchema =
  professionalOpportunityPacketBaseSchema.superRefine(
    (packet, context) => {
      const {
        integrity,
        links: _links,
        ...preimage
      } = packet;
      const expectedDigest = `sha256:${createHash("sha256")
        .update(canonicalJson(preimage))
        .digest("hex")}`;
      if (integrity.digest !== expectedDigest) {
        addCorpusIssue(
          context,
          ["integrity", "digest"],
          "packet digest does not match its canonical content",
        );
      }

      const includedSourceIds = packet.sources.map((source) => source.id);
      checkSortedUniqueIds(
        includedSourceIds,
        context,
        ["sources"],
        "packet source IDs",
      );
      const referencedSourceIds = new Set(
        collectIdsForKey(
          {
            method: packet.method,
            sharedWorkflow: packet.sharedWorkflow,
            opportunity: packet.opportunity,
            scrutiny: packet.scrutiny,
          },
          "sourceIds",
        ),
      );
      if (
        includedSourceIds.length !== referencedSourceIds.size ||
        includedSourceIds.some(
          (sourceId) => !referencedSourceIds.has(sourceId),
        )
      ) {
        addCorpusIssue(
          context,
          ["sources"],
          "packet sources must be the complete and only referenced source ledger",
        );
      }

      const includedScrutinyIds = packet.scrutiny.map(
        (scrutiny) => scrutiny.id,
      );
      if (
        includedScrutinyIds.length !==
          packet.opportunity.scrutinyIds.length ||
        includedScrutinyIds.some(
          (scrutinyId, index) =>
            scrutinyId !== packet.opportunity.scrutinyIds[index],
        )
      ) {
        addCorpusIssue(
          context,
          ["scrutiny"],
          "packet scrutiny must exactly resolve the opportunity scrutiny IDs",
        );
      }
    },
  );

export type ProfessionalOpportunityPacket = z.infer<
  typeof professionalOpportunityPacketSchema
>;

export function makeProfessionalOpportunityPacket(
  opportunityId: string,
  corpus: UkProfessionalOpportunities,
): ProfessionalOpportunityPacket | null {
  const reviewed = validateUkProfessionalOpportunities(corpus);
  const opportunity = reviewed.opportunities.find(
    (candidate) =>
      candidate.id === opportunityId || candidate.slug === opportunityId,
  );
  if (!opportunity) return null;
  const scrutiny = scrutinyForProfessionalOpportunityValue(
    opportunity,
    reviewed,
  );
  const sources = sourcesForProfessionalOpportunityValue(
    {
      method: reviewed.method,
      sharedWorkflow: reviewed.sharedWorkflow,
      opportunity,
      scrutiny,
    },
    reviewed,
  );
  const preimage = professionalOpportunityPacketPreimageSchema.parse({
    schema: "taxsorted.uk.professional-opportunity-packet/1",
    corpusVersion: reviewed.meta.version,
    lawAsAt: reviewed.meta.lawAsAt,
    jurisdiction: reviewed.meta.jurisdiction,
    warning: reviewed.meta.warning,
    method: reviewed.method,
    sharedWorkflow: reviewed.sharedWorkflow,
    opportunity,
    scrutiny,
    sources,
  });
  const digest = `sha256:${createHash("sha256")
    .update(canonicalJson(preimage))
    .digest("hex")}`;
  return professionalOpportunityPacketSchema.parse({
    ...preimage,
    integrity: {
      algorithm: "sha256",
      digest,
      digestScope:
        "Canonical JSON of this packet from schema through sources, excluding integrity and links.",
      proves: [
        "The packet content covered by digestScope has not changed since this digest was made.",
        "Every included source ID resolves to the included source ledger.",
      ],
      doesNotProve: [
        "That a source remains current, complete or applicable to a private matter.",
        "That a person is qualified, competent, conflict-free or authorised for the exact work.",
        "That a claim, complaint, appeal or lawsuit is viable or will succeed.",
        "Any probability, expected value, fee, payout, recovery or net client gain.",
      ],
    },
    links: {
      self: `/v1/professional-opportunities/uk/opportunities/${opportunity.id}`,
      collection: "/v1/professional-opportunities/uk/opportunities",
      scrutiny: "/v1/professional-opportunities/uk/scrutiny",
      schema: "/v1/professional-opportunities/uk/packet-schema",
      assessmentTemplate:
        "/v1/professional-opportunities/uk/assessment-template",
      rights: "/v1/professional-opportunities/uk/rights",
      human: `https://taxsorted.io/uk/opportunities/${opportunity.slug}/`,
      corrections: reviewed.publication.corrections,
    },
  });
}

const professionalOpportunityAvailabilitySchema = strictObject({
  status: z.enum(["open", "record-level-stops-active"]),
  methods: z.array(z.enum(["GET", "HEAD"])).length(2),
  writes: z.literal(false),
  emergencyStop: z.literal(
    "UK_PROFESSIONAL_OPPORTUNITIES_EMERGENCY_STOP",
  ),
  stoppedOpportunityCount: z.number().int().nonnegative(),
});

const professionalOpportunityLinksSchema = strictObject({
  self: shortText,
  opportunities: shortText,
  opportunityTemplate: shortText,
  scrutiny: shortText,
  sources: shortText,
  assessmentTemplate: shortText,
  schema: shortText,
  packetSchema: shortText,
  assessmentSchema: shortText,
  rights: shortText,
  humanGuide: httpsUrl,
  corrections: httpsUrl,
  openApi: shortText,
});

export const professionalOpportunityResponseSchema = strictObject({
  ...ukProfessionalOpportunitiesShape,
  availability: professionalOpportunityAvailabilitySchema,
  links: professionalOpportunityLinksSchema,
});

function publicJsonSchema<T extends z.ZodType>(
  schema: T,
  metadata: {
    id: string;
    title: string;
    description: string;
    invariants: readonly string[];
  },
) {
  return {
    ...(z.toJSONSchema(schema) as JsonSchemaObject),
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: metadata.id,
    title: metadata.title,
    description: metadata.description,
    "x-taxsorted-effects":
      "Read-only research; no intake, matching, recommendation, filing, payment, private upload or external state change.",
    "x-taxsorted-runtime-invariants": metadata.invariants,
  } as const;
}

export const professionalOpportunityCorpusJsonSchema = publicJsonSchema(
  professionalOpportunityResponseSchema,
  {
    id: "https://api.taxsorted.io/v1/professional-opportunities/uk/schema",
    title: "TaxSorted UK professional-opportunity atlas response",
    description:
      "Strict public response schema for source-linked specialist-work research, tax-administration and public-body scrutiny, and source resolution.",
    invariants: [
      "The production publication approval must match the exact canonical corpus digest, version and ordered opportunity IDs.",
      "Every source and scrutiny reference resolves; every source and scrutiny record is used.",
      "Shared challenge-route guides remain in the declared appeal, complaint and judicial-review order, with exact source references.",
      "Stopped opportunity facts, related scrutiny and sources are removed together.",
      "Money states remain separate; the corpus carries no probability, expected-value, ranking, referral or professional-revenue field.",
    ],
  },
);

export const professionalOpportunityPacketJsonSchema = publicJsonSchema(
  professionalOpportunityPacketBaseSchema,
  {
    id: "https://api.taxsorted.io/v1/professional-opportunities/uk/packet-schema",
    title: "TaxSorted UK professional-opportunity packet",
    description:
      "A complete, source-resolved, integrity-labelled packet for one published area of specialist work.",
    invariants: [
      "The SHA-256 digest covers canonical packet content through sources and excludes mutable links and the integrity explanation.",
      "The digest proves content identity only; it does not prove current law, professional status, viability, probability or value.",
    ],
  },
);

export const ukProfessionalOpportunities =
  loadUkProfessionalOpportunities();
export const ukProfessionalOpportunityPublicationApproval =
  loadProfessionalOpportunityPublicationApproval();
export const ukProfessionalOpportunityReviewPack =
  loadProfessionalOpportunityReviewPack();
export const ukProfessionalOpportunityPublicationDecision =
  evaluateProfessionalOpportunityPublicationApproval(
    ukProfessionalOpportunities,
    ukProfessionalOpportunityPublicationApproval,
    ukProfessionalOpportunityReviewPack,
  );
