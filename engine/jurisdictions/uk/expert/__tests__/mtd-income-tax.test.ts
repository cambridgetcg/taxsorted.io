import { describe, expect, it } from "vitest";
import {
  assessMtdIncomeTax,
  assertTaxAnswerInvariants,
  type MtdIncomeTaxExpertRequest,
} from "../index";

const EVALUATED_ON = "2026-07-11";

function request(): MtdIncomeTaxExpertRequest {
  return {
    schema: "taxsorted.uk.mtd-income-tax.request/1",
    asOfDate: "2026-07-11",
    person: {
      relevantReturnPosition: "required-and-submitted",
      hadNationalInsuranceNumberAtStartOf2026To27: true,
    },
    income: {
      taxYears: {
        "2024-25": {
          basis: "submitted-return",
          residence: "uk-resident",
          selfEmploymentGrossPence: 5_000_001,
          ukPropertyGrossPence: 0,
          foreignPropertyGrossPence: 0,
        },
        "2025-26": {
          basis: "working-estimate",
          residence: "uk-resident",
          selfEmploymentGrossPence: 0,
          ukPropertyGrossPence: 0,
          foreignPropertyGrossPence: 0,
        },
        "2026-27": {
          basis: "working-estimate",
          residence: "uk-resident",
          selfEmploymentGrossPence: 0,
          ukPropertyGrossPence: 0,
          foreignPropertyGrossPence: 0,
        },
      },
      atLeastOneRelevantReturnActivityContinuedAtEntry: true,
      lastRelevantActivityCessationDate: "at-least-one-continues",
      relevantReturnWasAmended: false,
      annualisationOrOtherSpecialRulesMayApply: false,
    },
    exemption: {
      returnIndicators: [],
      digitalExclusion: "not-approved-or-pending",
      otherExemptionApplication: "none",
    },
    reporting: { updatePeriod: "standard" },
  };
}

function assess(input = request(), evaluatedOn = EVALUATED_ON) {
  return assessMtdIncomeTax(input, { evaluatedOn });
}

describe("MTD Income Tax expert", () => {
  it("treats exactly £50,000 as not over the April 2026 threshold", () => {
    const input = request();
    input.income.taxYears["2024-25"].selfEmploymentGrossPence = 5_000_000;
    const result = assess(input);
    expect(result.status).toBe("determined");
    expect(result.answer?.decision).toBe("out_of_scope");
    expect(result.answer?.currentPhase.assessment).toBe("at-or-below-threshold");
    expect(result.answer?.obligations).toEqual([]);
    expect(result.answer?.penaltyPosition).toMatchObject({ applies: false, quarterlyUpdatesStillRequired: false });
  });

  it("treats one penny over £50,000 as in scope", () => {
    const result = assess();
    expect(result.status).toBe("determined");
    expect(result.answer?.decision).toBe("in_scope");
    expect(result.answer?.currentPhase.qualifyingIncomePence).toBe(5_000_001);
    expect(result.answer?.obligations.map((item) => item.dueDate)).toContain("2026-08-07");
  });

  it("includes foreign property for a UK resident", () => {
    const input = request();
    input.income.taxYears["2024-25"] = {
      basis: "submitted-return",
      residence: "uk-resident",
      selfEmploymentGrossPence: 3_000_000,
      ukPropertyGrossPence: 500_000,
      foreignPropertyGrossPence: 1_600_001,
    };
    const result = assess(input);
    expect(result.answer?.currentPhase.qualifyingIncomePence).toBe(5_100_001);
    expect(result.answer?.decision).toBe("in_scope");
  });

  it("generally excludes foreign property for a non-UK resident", () => {
    const input = request();
    input.income.taxYears["2024-25"] = {
      basis: "submitted-return",
      residence: "non-uk-resident",
      selfEmploymentGrossPence: 3_000_000,
      ukPropertyGrossPence: 1_000_000,
      foreignPropertyGrossPence: 9_000_000,
    };
    input.exemption.returnIndicators = ["sa109-residence"];
    const result = assess(input);
    expect(result.answer?.currentPhase.qualifyingIncomePence).toBe(4_000_000);
    expect(result.answer?.decision).toBe("out_of_scope");
  });

  it("does not guess residence or turn an unknown amount into zero", () => {
    const input = request();
    input.income.taxYears["2024-25"].residence = "unknown";
    input.income.taxYears["2024-25"].foreignPropertyGrossPence = "unknown";
    const result = assess(input);
    expect(result.status).toBe("needs_facts");
    expect(result.answer?.currentPhase.qualifyingIncomePence).toBeNull();
    expect(result.escalation.factsNeeded).toContain("income.taxYears.2024-25.residence");
  });

  it("does not turn a working estimate into a final current-phase decision", () => {
    const input = request();
    input.income.taxYears["2024-25"].basis = "working-estimate";
    const result = assess(input);
    expect(result.status).toBe("needs_facts");
    expect(result.answer?.currentPhase.assessment).toBe("forecast-above-threshold");
    expect(result.escalation.factsNeeded).toContain("income.taxYears.2024-25.basis");
  });

  it("never treats a required but unsubmitted return as an escape", () => {
    const input = request();
    input.person.relevantReturnPosition = "required-not-submitted";
    input.income.taxYears["2024-25"].basis = "working-estimate";
    const result = assess(input);
    expect(result.status).toBe("needs_professional_review");
    expect(result.answer?.decision).toBe("professional_review_needed");
    expect(result.answer?.reasonCodes).toContain("REQUIRED_RETURN_NOT_SUBMITTED");
    expect(result.escalation.nextActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "resolve-unsubmitted-return" }),
    ]));
  });

  it("can determine that the relevant return was not required", () => {
    const input = request();
    input.person.relevantReturnPosition = "not-required";
    const result = assess(input);
    expect(result.status).toBe("determined");
    expect(result.answer?.decision).toBe("out_of_scope");
  });

  it("requires the relevant-return activity continuation fact", () => {
    const input = request();
    input.income.atLeastOneRelevantReturnActivityContinuedAtEntry = "unknown";
    const result = assess(input);
    expect(result.status).toBe("needs_facts");
    expect(result.escalation.factsNeeded).toContain("income.atLeastOneRelevantReturnActivityContinuedAtEntry");
  });

  it("rejects contradictory entry and cessation lifecycle facts", () => {
    const input = request();
    input.income.atLeastOneRelevantReturnActivityContinuedAtEntry = false;
    input.income.lastRelevantActivityCessationDate = "at-least-one-continues";
    const result = assess(input);
    expect(result.status).toBe("needs_professional_review");
    expect(result.answer?.reasonCodes).toContain("ENTRY_CESSATION_FACT_CONFLICT");
  });

  it("stops for a return amendment before declaring either side of the threshold", () => {
    const input = request();
    input.income.taxYears["2024-25"].selfEmploymentGrossPence = 4_000_000;
    input.income.relevantReturnWasAmended = true;
    const result = assess(input);
    expect(result.status).toBe("needs_professional_review");
    expect(result.answer?.reasonCodes).toContain("RETURN_AMENDMENT_REVIEW");
  });

  it("stops for annualisation or another special rule before a below-threshold conclusion", () => {
    const input = request();
    input.income.taxYears["2024-25"].selfEmploymentGrossPence = 4_000_000;
    input.income.annualisationOrOtherSpecialRulesMayApply = true;
    const result = assess(input);
    expect(result.status).toBe("needs_professional_review");
    expect(result.applicability.covered).toBe(false);
  });

  it("makes unchecked return indicators a named gap and keeps obligations conditional", () => {
    const input = request();
    input.exemption.returnIndicators = "not-checked";
    const result = assess(input);
    expect(result.status).toBe("needs_facts");
    expect(result.answer?.decision).toBe("exemption_possible");
    expect(result.escalation.factsNeeded).toContain("exemption.returnIndicators");
    expect(result.answer?.obligations.filter((item) => item.appliesPerBusiness).every((item) => item.conditional)).toBe(true);
    expect(result.answer?.obligations.find((item) => item.id === "pay-self-assessment-tax")?.conditional).toBe(false);
    expect(result.answer?.penaltyPosition).toMatchObject({ applies: true, conditional: true });
  });

  it("lets a definitive no-NINO exemption win over a pending application", () => {
    const input = request();
    input.person.hadNationalInsuranceNumberAtStartOf2026To27 = false;
    input.exemption.digitalExclusion = "application-pending";
    const result = assess(input);
    expect(result.status).toBe("determined");
    expect(result.answer?.decision).toBe("exempt");
    expect(result.answer?.reasonCodes).toContain("NO_NINO_AT_TAX_YEAR_START");
    expect(result.answer?.obligations.map((item) => item.id)).toEqual([
      "submit-paper-self-assessment-return",
      "submit-online-self-assessment-return",
      "pay-self-assessment-tax",
    ]);
    expect(result.answer?.obligations.find((item) => item.id === "submit-paper-self-assessment-return")?.dueDate).toBe("2027-10-31");
    expect(result.answer?.penaltyPosition.applies).toBe(false);
  });

  it("derives the 2026/27 automatic exemption from concrete return evidence", () => {
    const input = request();
    input.person.hadNationalInsuranceNumberAtStartOf2026To27 = "unknown";
    input.exemption.returnIndicators = ["sa107-trusts-or-estates"];
    const result = assess(input);
    expect(result.status).toBe("determined");
    expect(result.answer?.decision).toBe("exempt");
    expect(result.answer?.reasonCodes).toContain("RETURN_EVIDENCE_TEMPORARY_EXEMPTION");
    expect(result.escalation.factsNeeded).not.toContain("person.hadNationalInsuranceNumberAtStartOf2026To27");
  });

  it("fails closed for a complex return indicator", () => {
    const input = request();
    input.exemption.returnIndicators = ["sa103l-lloyds"];
    const result = assess(input);
    expect(result.status).toBe("needs_professional_review");
    expect(result.answer?.reasonCodes).toContain("COMPLEX_RETURN_EXEMPTION_INDICATOR");
  });

  it("leaves a digital-exclusion application decision with HMRC", () => {
    const input = request();
    input.exemption.digitalExclusion = "application-pending";
    const result = assess(input);
    expect(result.answer?.decision).toBe("hmrc_decision_needed");
    expect(result.escalation.nextActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ responsibleParty: "HMRC" }),
    ]));
  });

  it("does not overlook another exemption application based on a future return indicator", () => {
    const unchecked = request();
    unchecked.exemption.otherExemptionApplication = "not-checked";
    const gap = assess(unchecked);
    expect(gap.answer?.decision).toBe("exemption_possible");
    expect(gap.facts.unknown).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "exemption.otherExemptionApplication", material: true }),
    ]));
    expect(gap.escalation.factsNeeded).toContain("exemption.otherExemptionApplication");

    const approved = request();
    approved.exemption.otherExemptionApplication = "hmrc-approved-for-2026-27";
    const exempt = assess(approved);
    expect(exempt.status).toBe("determined");
    expect(exempt.answer?.decision).toBe("exempt");
    expect(exempt.facts.provided).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "exemption.otherExemptionApplication", value: "hmrc-approved-for-2026-27" }),
    ]));
  });

  it("does not let a different new source replace the relevant-return activity at entry", () => {
    const input = request();
    input.income.atLeastOneRelevantReturnActivityContinuedAtEntry = false;
    input.income.lastRelevantActivityCessationDate = "2026-03-31";
    const result = assess(input);
    expect(result.status).toBe("determined");
    expect(result.answer?.decision).toBe("out_of_scope");
    expect(result.answer?.obligations).toEqual([]);
  });

  it("retains the final update, cessation notice and annual return after mid-year cessation", () => {
    const input = request();
    input.income.lastRelevantActivityCessationDate = "2026-05-12";
    const result = assess(input);
    const obligationIds = result.answer?.obligations.map((item) => item.id);
    expect(result.answer?.decision).toBe("in_scope");
    expect(obligationIds).toContain("quarterly-update-1");
    expect(obligationIds).not.toContain("quarterly-update-2");
    expect(obligationIds).toContain("notify-hmrc-of-cessation");
    expect(obligationIds).toContain("submit-mtd-tax-return");
    expect(obligationIds).toContain("pay-self-assessment-tax");
    expect(result.answer?.obligations.find((item) => item.id === "quarterly-update-1")?.periodEnd).toBe("2026-05-12");
  });

  it("uses the chosen period to map a cessation near a quarter boundary", () => {
    const standardInput = request();
    standardInput.income.lastRelevantActivityCessationDate = "2026-07-02";
    const calendarInput = structuredClone(standardInput);
    calendarInput.reporting.updatePeriod = "calendar";
    const standard = assess(standardInput);
    const calendar = assess(calendarInput);
    expect(standard.answer?.obligations.find((item) => item.id === "notify-hmrc-of-cessation")?.dueDate).toBe("2026-08-07");
    expect(calendar.answer?.obligations.find((item) => item.id === "notify-hmrc-of-cessation")?.dueDate).toBe("2026-11-07");
  });

  it("asks for the period choice when it changes a cessation deadline", () => {
    const input = request();
    input.income.lastRelevantActivityCessationDate = "2026-07-02";
    input.reporting.updatePeriod = "unknown";
    const result = assess(input);
    expect(result.status).toBe("needs_facts");
    expect(result.escalation.factsNeeded).toContain("reporting.updatePeriod");
  });

  it("does not invent an exact per-source workload from a simple business count", () => {
    const result = assess();
    const quarters = result.answer?.obligations.filter((item) => item.id.startsWith("quarterly-update"));
    expect(quarters).toHaveLength(4);
    expect(quarters?.every((item) => item.expectedSubmissions === null)).toBe(true);
    expect(result.answer?.boundaries).toEqual(expect.arrayContaining([
      expect.stringMatching(/per-source workload/i),
    ]));
  });

  it("keeps later phase forecasts visible in fixed tax-year order", () => {
    const input = request();
    input.income.taxYears["2025-26"].selfEmploymentGrossPence = 3_000_001;
    const rows = input.income.taxYears;
    input.income.taxYears = {
      "2026-27": rows["2026-27"],
      "2024-25": rows["2024-25"],
      "2025-26": rows["2025-26"],
    };
    const result = assess(input);
    expect(result.answer?.phases.map((phase) => phase.incomeTaxYear)).toEqual(["2024-25", "2025-26", "2026-27"]);
    expect(result.answer?.phases[1].assessment).toBe("forecast-above-threshold");
  });

  it("checks source freshness on a trusted evaluation date, not caller asOfDate", () => {
    const input = request();
    input.asOfDate = "2026-07-01";
    const result = assess(input, "2026-08-12");
    expect(result.status).toBe("needs_professional_review");
    expect(result.answer?.decision).toBe("source_review_required");
  });

  it("does not use the current ruleset for a caller-selected future date", () => {
    const input = request();
    input.asOfDate = "2030-07-11";
    const result = assess(input);
    expect(result.status).toBe("unsupported");
    expect(result.answer?.decision).toBe("outside_supported_date");
    expect(result.answer?.reasonCodes).toContain("AS_OF_DATE_IN_FUTURE");
  });

  it("rejects invalid engine-boundary values", () => {
    const negative = request();
    negative.income.taxYears["2024-25"].selfEmploymentGrossPence = -1;
    expect(() => assess(negative)).toThrow(/non-negative integer pence/i);

    const impossible = request();
    impossible.asOfDate = "2026-02-30";
    expect(() => assess(impossible)).toThrow(/real ISO date/i);

    const futureCessation = request();
    futureCessation.income.lastRelevantActivityCessationDate = "2026-07-12";
    expect(() => assess(futureCessation)).toThrow(/cannot be after asOfDate/i);

    const duplicateIndicator = request();
    duplicateIndicator.exemption.returnIndicators = ["sa109-residence", "sa109-residence"];
    expect(() => assess(duplicateIndicator)).toThrow(/must not contain duplicates/i);
  });

  it("prevents guidance from being relabelled as binding law", () => {
    const result = assess();
    const unsafe = structuredClone(result);
    const lawClaim = unsafe.evidence.claims.find((claim) => claim.kind === "law");
    expect(lawClaim).toBeDefined();
    lawClaim!.sourceIds = ["hmrc-mtd-before-you-start"];
    expect(() => assertTaxAnswerInvariants(unsafe)).toThrow(/non-binding source as law/i);
  });

  it("rejects determined envelopes without coverage, evidence or reasoning", () => {
    const unsafe = structuredClone(assess());
    unsafe.applicability.covered = false;
    expect(() => assertTaxAnswerInvariants(unsafe)).toThrow(/declared coverage/i);

    const noEvidence = structuredClone(assess());
    noEvidence.evidence.claims = noEvidence.evidence.claims.map((claim) => ({
      ...claim,
      kind: "calculation" as const,
      sourceIds: [],
    }));
    noEvidence.evidence.sources = [];
    expect(() => assertTaxAnswerInvariants(noEvidence)).toThrow(/authoritative evidence/i);

    const noReasoning = structuredClone(assess());
    noReasoning.reasoning.steps = [];
    expect(() => assertTaxAnswerInvariants(noReasoning)).toThrow(/show its reasoning/i);
  });

  it("requires reasoning fact paths and unknown sentinels to reconcile", () => {
    const missingFact = structuredClone(assess());
    missingFact.reasoning.steps[0].factPaths.push("facts.not.present");
    expect(() => assertTaxAnswerInvariants(missingFact)).toThrow(/missing fact/i);

    const unreconciled = structuredClone(assess());
    unreconciled.facts.provided[0].value = "unknown";
    expect(() => assertTaxAnswerInvariants(unreconciled)).toThrow(/reconciled/i);
  });
});
