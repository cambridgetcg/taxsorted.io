import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";
import { afterAll, describe, expect, it } from "vitest";
import {
  professionalOpportunityAssessmentActiveStates,
  professionalOpportunityAssessmentJsonSchema,
  professionalOpportunityAssessmentSchema,
  professionalOpportunityAssessmentTemplate,
  professionalOpportunityAssessmentTemplateSchema,
  professionalOpportunityTerminalDecisions,
} from "../uk-professional-opportunities.js";

const assessedOn = "2026-07-24";
const temporaryDirectories: string[] = [];

afterAll(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function portableValidator() {
  return new Ajv2020({
    allErrors: true,
    strict: true,
    strictSchema: false,
  }).compile(professionalOpportunityAssessmentJsonSchema);
}

function blankAssessment() {
  return structuredClone(
    professionalOpportunityAssessmentTemplate,
  ) as Record<string, any>;
}

function assessedProfessional(prudentSpecialist = false) {
  return {
    professionalVerification: prudentSpecialist
      ? {
          state: "not-applicable-with-reason",
          role: "Prudent tax evidence specialist",
          basis:
            "No protected professional title is relied on for this exact task.",
          notApplicableReason:
            "The role is prudent specialism, not a protected title or reserved activity.",
          assessedOn,
        }
      : {
          state: "verified-professional",
          role: "Chartered Tax Adviser",
          basis:
            "The professional status relied on for this exact task was checked.",
          notApplicableReason: "",
          assessedOn,
        },
    businessOrHmrcRegistration: prudentSpecialist
      ? {
          state: "not-applicable-with-reason",
          basis: "The assessment does not involve paid interaction with HMRC.",
          officialRegisterOrAuthority: "",
          registrationOrMembershipId: "",
          checkedOn: assessedOn,
          notApplicableReason:
            "No business or HMRC registration is required for this bounded task.",
        }
      : {
          state: "verified",
          basis: "The applicable business registration was checked separately.",
          officialRegisterOrAuthority: "HMRC tax adviser registration",
          registrationOrMembershipId: "business-registration-123",
          checkedOn: assessedOn,
          notApplicableReason: "",
        },
    protectedTitleStatus: prudentSpecialist
      ? {
          state: "not-applicable-with-reason",
          basis: "No protected title is used for this bounded task.",
          officialRegisterOrAuthority: "",
          registrationOrMembershipId: "",
          checkedOn: assessedOn,
          notApplicableReason:
            "The assessor does not present this role as a protected title.",
        }
      : {
          state: "verified",
          basis: "The protected title was checked independently.",
          officialRegisterOrAuthority: "CIOT member register",
          registrationOrMembershipId: "member-123",
          checkedOn: assessedOn,
          notApplicableReason: "",
        },
    competence: {
      state: "confirmed",
      basis: "Competence for the exact tax and procedural route was assessed.",
      assessedOn,
    },
    taskAuthority: {
      state: "confirmed",
      basis: "Authority to perform this exact work was assessed separately.",
      assessedOn,
    },
    conflicts: {
      state: "cleared",
      basis: "The matter-scoped conflicts check was completed.",
      assessedOn,
    },
  };
}

function startedAssessment() {
  const assessment = blankAssessment();
  assessment.packetReference = {
    opportunityId: "example-reviewed-opportunity",
    corpusVersion: "2026-07-24.3",
    declaredPacketDigest: `sha256:${"a".repeat(64)}`,
    referenceCheckedOn: assessedOn,
  };
  return assessment;
}

function terminalPrefix(completedStageCount: number) {
  return professionalOpportunityAssessmentActiveStates.map(
    (stageId, index) => ({
      id: stageId,
      order: index + 1,
      state: index < completedStageCount ? "complete" : "not-assessed",
      privateMatterFileNote:
        index < completedStageCount
          ? "Private reasoning retained outside TaxSorted."
          : "",
    }),
  );
}

function completeAssessment(
  decision: (typeof professionalOpportunityTerminalDecisions)[number],
  completedStageCount =
    decision === "declined"
      ? 1
      : decision === "refer-with-consent"
        ? 4
        : decision === "needs-more-evidence"
          ? 5
          : professionalOpportunityAssessmentActiveStates.length,
) {
  const assessment = startedAssessment();
  assessment.status = "local-assessment-private-complete";
  if (completedStageCount >= 3) {
    assessment.assessor = assessedProfessional();
  }
  if (
    completedStageCount >= 5 ||
    decision === "refer-with-consent" ||
    decision === "suitable-for-further-private-review"
  ) {
    assessment.instruction = {
      prospectiveClientConsentConfirmed: true,
      clientIdentityAndAuthorityChecked: true,
      confidentialChannelAgreed: true,
    };
  }
  assessment.workflow = {
    currentState: "terminal",
    stages: terminalPrefix(completedStageCount),
  };
  assessment.decision = {
    state: decision,
    decidedOn: assessedOn,
    reasonsKeptInPrivateMatterFile: true,
    zeroOrNegativeFinancialScenarioConsidered:
      completedStageCount ===
      professionalOpportunityAssessmentActiveStates.length,
  };
  assessment.privacy.containsClientFacts = false;
  return assessment;
}

function expectRuntimeAndPortable(value: unknown, expected: boolean) {
  expect(
    professionalOpportunityAssessmentSchema.safeParse(value).success,
  ).toBe(expected);
  const portable = portableValidator();
  expect(
    portable(value),
    JSON.stringify(portable.errors),
  ).toBe(expected);
}

describe("portable professional-opportunity assessment", () => {
  it("publishes a truly blank local-only template in preserve-first order", () => {
    expect(
      professionalOpportunityAssessmentTemplateSchema.safeParse(
        professionalOpportunityAssessmentTemplate,
      ).success,
    ).toBe(true);
    expectRuntimeAndPortable(
      professionalOpportunityAssessmentTemplate,
      true,
    );
    expect(professionalOpportunityAssessmentTemplate).toMatchObject({
      status: "local-template-not-submitted",
      packetReference: {
        opportunityId: "",
        corpusVersion: "",
        declaredPacketDigest: "",
        referenceCheckedOn: null,
      },
      assessor: {
        professionalVerification: { state: "unverified" },
        businessOrHmrcRegistration: { state: "not-checked" },
        protectedTitleStatus: { state: "not-checked" },
        competence: { state: "not-assessed" },
        taskAuthority: { state: "not-assessed" },
        conflicts: { state: "not-assessed" },
      },
      workflow: { currentState: "unopened" },
      privacy: {
        containsClientFacts: false,
        taxSortedSubmissionEndpoint: null,
        storage: "your-local-or-approved-matter-system",
      },
    });
    expect(
      professionalOpportunityAssessmentTemplate.workflow.stages.map(
        (stage) => stage.id,
      ),
    ).toEqual([
      "scope",
      "route-and-clock",
      "authority-and-competence",
      "conflicts-and-client-authority",
      "facts-and-evidence",
      "merits-and-counterevidence",
      "remedy-money-cost-and-risk",
    ]);
  });

  it.each([
    [
      "packet reference",
      (value: Record<string, any>) => {
        value.packetReference.opportunityId = "hidden-opportunity";
      },
    ],
    [
      "professional verification",
      (value: Record<string, any>) => {
        value.assessor.professionalVerification =
          assessedProfessional().professionalVerification;
      },
    ],
    [
      "business registration",
      (value: Record<string, any>) => {
        value.assessor.businessOrHmrcRegistration =
          assessedProfessional().businessOrHmrcRegistration;
      },
    ],
    [
      "client authority assurance",
      (value: Record<string, any>) => {
        value.instruction.clientIdentityAndAuthorityChecked = true;
      },
    ],
    [
      "private note",
      (value: Record<string, any>) => {
        value.workflow.stages[0].privateMatterFileNote = "hidden note";
      },
    ],
    [
      "financial assurance",
      (value: Record<string, any>) => {
        value.decision.zeroOrNegativeFinancialScenarioConsidered = true;
      },
    ],
    [
      "promotional boundary text",
      (value: Record<string, any>) => {
        value.boundaries[0] = "This opportunity will succeed.";
      },
    ],
  ])("rejects %s hidden behind template status", (_label, mutate) => {
    const value = blankAssessment();
    mutate(value);
    expect(
      professionalOpportunityAssessmentTemplateSchema.safeParse(value)
        .success,
    ).toBe(false);
    expectRuntimeAndPortable(value, false);
  });

  it("keeps an in-progress workflow contiguous and gates later stages", () => {
    const clockTriage = startedAssessment();
    clockTriage.status = "local-assessment-private-in-progress";
    clockTriage.workflow.currentState = "route-and-clock";
    clockTriage.workflow.stages[0].state = "complete";
    clockTriage.workflow.stages[1].state = "in-progress";
    expectRuntimeAndPortable(clockTriage, true);

    const facts = startedAssessment();
    facts.status = "local-assessment-private-in-progress";
    facts.assessor = assessedProfessional();
    facts.instruction = {
      prospectiveClientConsentConfirmed: true,
      clientIdentityAndAuthorityChecked: true,
      confidentialChannelAgreed: true,
    };
    facts.workflow.currentState = "facts-and-evidence";
    facts.workflow.stages = facts.workflow.stages.map(
      (stage: Record<string, unknown>, index: number) => ({
        ...stage,
        state:
          index < 4
            ? "complete"
            : index === 4
              ? "in-progress"
              : "not-assessed",
      }),
    );
    expectRuntimeAndPortable(facts, true);

    const missingTaskAuthority = structuredClone(facts);
    missingTaskAuthority.assessor.taskAuthority =
      blankAssessment().assessor.taskAuthority;
    expectRuntimeAndPortable(missingTaskAuthority, false);

    const nonContiguous = structuredClone(facts);
    nonContiguous.workflow.stages[6].state = "complete";
    expectRuntimeAndPortable(nonContiguous, false);
  });

  it.each([
    ["declined", 1],
    ["needs-more-evidence", 5],
    ["refer-with-consent", 4],
    [
      "suitable-for-further-private-review",
      professionalOpportunityAssessmentActiveStates.length,
    ],
  ] as const)(
    "accepts %s at its honest terminal prefix of %s stages",
    (decision, completedStageCount) => {
      const assessment = completeAssessment(
        decision,
        completedStageCount,
      );
      expectRuntimeAndPortable(assessment, true);
      expect(assessment.privacy.containsClientFacts).toBe(false);
      expect(
        assessment.workflow.stages.filter(
          (stage: Record<string, unknown>) =>
            stage.state === "complete",
        ),
      ).toHaveLength(completedStageCount);
    },
  );

  it("allows an early decline without false professional or client assurances", () => {
    const declined = completeAssessment("declined");
    expect(declined.assessor).toEqual(blankAssessment().assessor);
    expect(declined.instruction).toEqual(blankAssessment().instruction);
    expect(
      declined.decision.zeroOrNegativeFinancialScenarioConsidered,
    ).toBe(false);
    expectRuntimeAndPortable(declined, true);

    declined.workflow.stages[2].state = "complete";
    expectRuntimeAndPortable(declined, false);
  });

  it("requires facts before needs-more-evidence and consent before referral", () => {
    expectRuntimeAndPortable(
      completeAssessment("needs-more-evidence", 4),
      false,
    );
    const referral = completeAssessment("refer-with-consent");
    referral.instruction.prospectiveClientConsentConfirmed = false;
    expectRuntimeAndPortable(referral, false);
  });

  it("reserves full workflow completion for suitability", () => {
    expectRuntimeAndPortable(
      completeAssessment(
        "suitable-for-further-private-review",
        professionalOpportunityAssessmentActiveStates.length - 1,
      ),
      false,
    );
    const suitable = completeAssessment(
      "suitable-for-further-private-review",
    );
    suitable.decision.zeroOrNegativeFinancialScenarioConsidered = false;
    expectRuntimeAndPortable(suitable, false);
  });

  it("supports prudent specialists without inventing a universal licence", () => {
    const suitable = completeAssessment(
      "suitable-for-further-private-review",
    );
    suitable.assessor = assessedProfessional(true);
    expectRuntimeAndPortable(suitable, true);
    expect(suitable.assessor).toMatchObject({
      professionalVerification: {
        state: "not-applicable-with-reason",
      },
      businessOrHmrcRegistration: {
        state: "not-applicable-with-reason",
      },
      protectedTitleStatus: {
        state: "not-applicable-with-reason",
      },
      competence: { state: "confirmed" },
      taskAuthority: { state: "confirmed" },
    });

    suitable.assessor.protectedTitleStatus.notApplicableReason = "";
    expectRuntimeAndPortable(suitable, false);
  });

  it.each([
    [
      "professional verification",
      (value: Record<string, any>) => {
        value.assessor.professionalVerification =
          blankAssessment().assessor.professionalVerification;
      },
    ],
    [
      "business or HMRC registration",
      (value: Record<string, any>) => {
        value.assessor.businessOrHmrcRegistration =
          blankAssessment().assessor.businessOrHmrcRegistration;
      },
    ],
    [
      "protected-title status",
      (value: Record<string, any>) => {
        value.assessor.protectedTitleStatus =
          blankAssessment().assessor.protectedTitleStatus;
      },
    ],
    [
      "competence",
      (value: Record<string, any>) => {
        value.assessor.competence =
          blankAssessment().assessor.competence;
      },
    ],
    [
      "exact task authority",
      (value: Record<string, any>) => {
        value.assessor.taskAuthority =
          blankAssessment().assessor.taskAuthority;
      },
    ],
    [
      "conflicts",
      (value: Record<string, any>) => {
        value.assessor.conflicts =
          blankAssessment().assessor.conflicts;
      },
    ],
    [
      "client authority",
      (value: Record<string, any>) => {
        value.instruction.clientIdentityAndAuthorityChecked = false;
      },
    ],
  ])("keeps the suitable decision's %s check distinct", (_label, mutate) => {
    const suitable = completeAssessment(
      "suitable-for-further-private-review",
    );
    mutate(suitable);
    expectRuntimeAndPortable(suitable, false);
  });

  it("keeps runtime and portable schemas aligned on calendar dates", () => {
    const leapDay = completeAssessment(
      "suitable-for-further-private-review",
    );
    leapDay.packetReference.referenceCheckedOn = "2024-02-29";
    leapDay.assessor.professionalVerification.assessedOn = "2024-02-29";
    leapDay.assessor.businessOrHmrcRegistration.checkedOn =
      "2024-02-29";
    leapDay.decision.decidedOn = "2024-02-29";
    expectRuntimeAndPortable(leapDay, true);

    for (const [label, mutate] of [
      [
        "packet reference",
        (value: Record<string, any>) => {
          value.packetReference.referenceCheckedOn = "2026-99-99";
        },
      ],
      [
        "professional assessment",
        (value: Record<string, any>) => {
          value.assessor.professionalVerification.assessedOn =
            "2025-02-29";
        },
      ],
      [
        "registration check",
        (value: Record<string, any>) => {
          value.assessor.businessOrHmrcRegistration.checkedOn =
            "2026-04-31";
        },
      ],
      [
        "decision",
        (value: Record<string, any>) => {
          value.decision.decidedOn = "2026-04-31";
        },
      ],
    ] as const) {
      const assessment = completeAssessment(
        "suitable-for-further-private-review",
      );
      mutate(assessment);
      const runtime =
        professionalOpportunityAssessmentSchema.safeParse(assessment);
      expect(runtime.success, label).toBe(false);
      const portable = portableValidator();
      expect(
        portable(assessment),
        `${label}: ${JSON.stringify(portable.errors)}`,
      ).toBe(false);
    }
  });

  it("validates a caller-maintained packet reference without claiming identity", () => {
    const first = completeAssessment("declined");
    const second = structuredClone(first);
    second.packetReference.declaredPacketDigest =
      `sha256:${"b".repeat(64)}`;
    expectRuntimeAndPortable(first, true);
    expectRuntimeAndPortable(second, true);
    expect(
      JSON.stringify(professionalOpportunityAssessmentJsonSchema),
    ).toMatch(/does not fetch the packet|not verified packet identity/i);
  });

  it("never gains an intake or submission field", () => {
    const templateText = JSON.stringify(
      professionalOpportunityAssessmentTemplate,
    );
    expect(templateText).not.toMatch(/uploadUrl|intakeUrl|submitUrl/i);
    expect(
      professionalOpportunityAssessmentTemplate.privacy
        .taxSortedSubmissionEndpoint,
    ).toBeNull();

    const withUnexpectedSubmission = {
      ...completeAssessment("declined"),
      submitUrl: "https://taxsorted.io/intake",
    };
    expectRuntimeAndPortable(withUnexpectedSubmission, false);
  });

  it("the local CLI reports shape-only scope without paths or private values", () => {
    const directory = mkdtempSync(
      join(tmpdir(), "taxsorted-private-assessment-"),
    );
    temporaryDirectories.push(directory);
    const validPath = join(directory, "valid-private-assessment.json");
    const invalidPath = join(directory, "invalid-private-assessment.json");
    writeFileSync(
      validPath,
      JSON.stringify(completeAssessment("declined")),
    );
    const invalid = blankAssessment();
    invalid.workflow.stages[0].privateMatterFileNote =
      "PRIVATE-VALUE-MUST-NOT-BE-ECHOED";
    invalid["Client Alice allegedly owes £1m PRIVATE-KEY"] = true;
    writeFileSync(invalidPath, JSON.stringify(invalid));
    const script = join(
      process.cwd(),
      "scripts/validate-professional-opportunity-assessment.ts",
    );

    const validRun = spawnSync(
      process.execPath,
      ["--import", "tsx", script, validPath],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    expect(validRun.status, validRun.stderr).toBe(0);
    expect(JSON.parse(validRun.stdout)).toMatchObject({
      ok: true,
      validationScope: "assessment-shape-and-internal-state-only",
      packetReferenceVerified: false,
      privateFactsEchoed: false,
    });
    expect(`${validRun.stdout}${validRun.stderr}`).not.toContain(validPath);

    const invalidRun = spawnSync(
      process.execPath,
      ["--import", "tsx", script, invalidPath],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    expect(invalidRun.status).toBe(1);
    expect(`${invalidRun.stdout}${invalidRun.stderr}`).not.toContain(
      invalidPath,
    );
    expect(`${invalidRun.stdout}${invalidRun.stderr}`).not.toContain(
      "PRIVATE-VALUE-MUST-NOT-BE-ECHOED",
    );
    expect(`${invalidRun.stdout}${invalidRun.stderr}`).not.toContain(
      "Client Alice allegedly owes £1m PRIVATE-KEY",
    );
    const invalidReport = JSON.parse(invalidRun.stderr);
    expect(invalidReport.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "assessment-schema",
          code: expect.any(String),
        }),
      ]),
    );
    for (const issue of invalidReport.issues) {
      expect(Object.keys(issue).sort()).toEqual(["category", "code"]);
    }
  });
});
