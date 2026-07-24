import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import {
  caseAssessmentJsonSchema,
  caseAssessmentSchema,
  caseAssessmentTemplate,
  makeCaseCommonsPacket,
  ukCaseCommons,
} from "../uk-case-commons.js";

function portableValidator() {
  return new Ajv2020({
    allErrors: true,
    strict: true,
    // JSON Schema permits extension annotations. TaxSorted's x-* fields are
    // documentation only and deliberately have no validation effect.
    strictSchema: false,
  }).compile(caseAssessmentJsonSchema);
}

function completeAssessment(): Record<string, any> {
  const assessment = structuredClone(caseAssessmentTemplate) as Record<
    string,
    any
  >;
  assessment.status = "local-assessment-private-complete";
  assessment.casePacket = {
    caseId: "haworth-v-hmrc-2021",
    corpusVersion: ukCaseCommons.meta.version,
    sha256: makeCaseCommonsPacket("haworth-v-hmrc-2021")!.integrity.digest,
    verifiedOn: "2026-07-24",
  };
  assessment.assessor = {
    professionalStatus: "register-checked",
    regulator: "Regulator checked independently",
    registrationId: "example-id",
    registerCheckedOn: "2026-07-24",
    competenceConfirmed: true,
    conflictsChecked: true,
  };
  assessment.instruction = {
    prospectiveClientConsentConfirmed: true,
    identityAndAuthorityChecked: true,
    confidentialChannelAgreed: true,
  };
  assessment.checks = assessment.checks.map(
    (check: Record<string, unknown>) => ({
      ...check,
      state: "supports-further-review",
      privateMatterFileNote: "Private note retained outside TaxSorted.",
    }),
  );
  assessment.decision = {
    state: "needs-evidence",
    decidedOn: "2026-07-24",
    reasonsKeptInPrivateMatterFile: true,
    zeroOrNegativeFinancialScenarioConsidered: true,
  };
  assessment.privacy.containsClientFacts = true;
  return assessment;
}

describe("portable case-assessment contract", () => {
  it("accepts the blank template in both runtime and published validators", () => {
    const validate = portableValidator();
    expect(caseAssessmentSchema.safeParse(caseAssessmentTemplate).success).toBe(
      true,
    );
    expect(validate(caseAssessmentTemplate)).toBe(true);
  });

  it.each([
    [
      "packet identity",
      (value: Record<string, any>) => {
        value.casePacket.caseId = "hidden-case";
      },
    ],
    [
      "professional assurance",
      (value: Record<string, any>) => {
        value.assessor.competenceConfirmed = true;
      },
    ],
    [
      "client instruction assurance",
      (value: Record<string, any>) => {
        value.instruction.prospectiveClientConsentConfirmed = true;
      },
    ],
    [
      "private note",
      (value: Record<string, any>) => {
        value.checks[0].privateMatterFileNote = "not blank";
      },
    ],
    [
      "decision assurance",
      (value: Record<string, any>) => {
        value.decision.zeroOrNegativeFinancialScenarioConsidered = true;
      },
    ],
  ])("rejects %s hidden behind template status", (_label, mutate) => {
    const value = structuredClone(caseAssessmentTemplate) as Record<string, any>;
    mutate(value);

    expect(caseAssessmentSchema.safeParse(value).success).toBe(false);
    expect(portableValidator()(value)).toBe(false);
  });

  it("requires each of the 13 checks exactly once", () => {
    const empty = structuredClone(caseAssessmentTemplate) as Record<string, any>;
    empty.checks = [];
    expect(portableValidator()(empty)).toBe(false);

    const duplicate = structuredClone(caseAssessmentTemplate) as Record<
      string,
      any
    >;
    duplicate.checks[12].id = duplicate.checks[0].id;
    expect(portableValidator()(duplicate)).toBe(false);
  });

  it("accepts a complete private file and rejects incomplete assurances", () => {
    const complete = completeAssessment();
    expect(caseAssessmentSchema.safeParse(complete).success).toBe(true);
    expect(portableValidator()(complete)).toBe(true);

    const incomplete = structuredClone(complete);
    incomplete.assessor.conflictsChecked = false;
    incomplete.checks[0].state = "not-assessed";
    incomplete.decision.zeroOrNegativeFinancialScenarioConsidered = false;
    expect(caseAssessmentSchema.safeParse(incomplete).success).toBe(false);
    expect(portableValidator()(incomplete)).toBe(false);
  });
});
