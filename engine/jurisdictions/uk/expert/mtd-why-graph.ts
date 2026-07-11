import {
  assertWhyGraphInvariants,
  canonicaliseWhyGraph,
  type WhyGraph,
  type WhyGraphEdge,
  type WhyGraphNode,
  type WhyGraphNodeState,
  whyGraphEdge,
} from "../../../core/why-graph";
import type {
  EvidenceClaim,
  ReasoningStep,
  TaxAnswerStatus,
  TaxFact,
  TaxNextAction,
  TaxSource,
  UnknownTaxFact,
} from "./contract";

export type MtdWhyReasonCode =
  | "AS_OF_DATE_BEFORE_RULESET"
  | "AS_OF_DATE_IN_FUTURE"
  | "CALENDAR_CESSATION_YEAR_BOUNDARY"
  | "CESSATION_POSITION_UNKNOWN"
  | "CESSATION_UPDATE_PERIOD_UNKNOWN"
  | "COMPLEX_RETURN_EXEMPTION_INDICATOR"
  | "CURRENT_PHASE_THRESHOLD_EXCEEDED"
  | "CURRENT_PHASE_THRESHOLD_NOT_EXCEEDED"
  | "DIGITAL_EXCLUSION_STATUS_UNKNOWN"
  | "ENTRY_CESSATION_FACT_CONFLICT"
  | "EXEMPTION_APPLICATION_PENDING"
  | "HMRC_APPROVED_DIGITAL_EXCLUSION"
  | "HMRC_APPROVED_OTHER_2026_27_EXEMPTION"
  | "MID_YEAR_CESSATION"
  | "NINO_STATUS_UNKNOWN"
  | "NON_RESIDENCE_RETURN_EVIDENCE_CONFLICT"
  | "NO_EXEMPTION_IDENTIFIED"
  | "NO_NINO_AT_TAX_YEAR_START"
  | "NO_RELEVANT_RETURN_ACTIVITY_AT_ENTRY"
  | "OTHER_EXEMPTION_APPLICATION_NOT_CHECKED"
  | "QUALIFYING_INCOME_INCOMPLETE"
  | "RELEVANT_ACTIVITY_AT_ENTRY_UNKNOWN"
  | "RELEVANT_RETURN_DUTY_UNKNOWN"
  | "RELEVANT_RETURN_NOT_REQUIRED"
  | "REQUIRED_RETURN_NOT_SUBMITTED"
  | "RETURN_AMENDMENT_REVIEW"
  | "RETURN_AMENDMENT_STATUS_UNKNOWN"
  | "RETURN_EVIDENCE_TEMPORARY_EXEMPTION"
  | "RETURN_EXEMPTION_EVIDENCE_NOT_CHECKED"
  | "SOURCE_REVIEW_OVERDUE"
  | "SPECIAL_QUALIFYING_INCOME_RULE"
  | "SPECIAL_QUALIFYING_INCOME_RULE_UNKNOWN";

type MtdStepId =
  | "entry-conditions"
  | "qualifying-income"
  | "amendments-and-special-rules"
  | "exemptions"
  | "obligations";

type MtdReturnIndicator =
  | "sa103l-lloyds"
  | "incapable-with-legal-representative"
  | "sa103-averaging-relief"
  | "qualifying-care-relief"
  | "sa107-trusts-or-estates"
  | "sa109-residence"
  | "sa102m-minister-of-religion"
  | "married-couples-allowance"
  | "blind-persons-allowance";

interface MtdWhyObligation {
  id: string;
  title: string;
  conditional: boolean;
  dueDate: string | null;
  sourceIds: string[];
}

interface MtdWhyPenaltyPosition {
  applies: boolean;
  conditional: boolean;
  note: string;
  sourceIds: string[];
}

export interface MtdWhyGraphInput {
  capabilityVersion: string;
  status: TaxAnswerStatus;
  decision: string;
  headline: string;
  reasonCodes: MtdWhyReasonCode[];
  effectiveDate: string;
  evaluatedOn: string;
  knowledgeAsOf: string;
  facts: {
    provided: TaxFact[];
    derived: TaxFact[];
    unknown: UnknownTaxFact[];
  };
  steps: ReasoningStep[];
  claims: EvidenceClaim[];
  sources: TaxSource[];
  obligations: MtdWhyObligation[];
  penaltyPosition: MtdWhyPenaltyPosition;
  nextActions: TaxNextAction[];
  returnIndicators: MtdReturnIndicator[] | "not-checked" | "unknown";
  updatePeriod: "standard" | "calendar" | "unknown";
}

interface MtdRule {
  id: string;
  label: string;
  citation: string;
  href: string;
  sourceId: "uksi-2026-336";
}

const legislationRoot = "https://www.legislation.gov.uk/uksi/2026/336/regulation";

function regulation(number: number, label: string): MtdRule {
  return {
    id: `SI-2026-336-reg-${number}`,
    label,
    citation: `SI 2026/336, regulation ${number}`,
    href: `${legislationRoot}/${number}/made`,
    sourceId: "uksi-2026-336",
  };
}

const rules = new Map<string, MtdRule>([
  regulation(5, "Digital start date"),
  regulation(6, "Digital termination date"),
  regulation(7, "Digital obligation tax years"),
  regulation(8, "Obligation to use compatible software to deliver the return"),
  regulation(9, "Obligation to give HMRC quarterly updates"),
  regulation(12, "Standard quarterly update periods and deadlines"),
  regulation(13, "Calendar quarterly update periods and deadlines"),
  regulation(14, "Final quarterly update period ending on the digital termination date"),
  regulation(15, "Obligation to keep digital records"),
  regulation(18, "Effect of an exclusion notice"),
  regulation(19, "Exclusion notice decided by the Commissioners"),
  regulation(20, "Meaning of excluded"),
  regulation(21, "Qualifying-income exemption where Chapter 2 applies"),
  regulation(22, "2026/27 qualifying-income exemption conditions"),
  regulation(25, "Qualifying income"),
  regulation(26, "Determination of qualifying income"),
  regulation(27, "Qualifying amount for a tax year"),
  regulation(28, "Exemptions for relevant activities of specified description"),
  regulation(29, "Further exemptions for overseas activities in non-residence cases"),
  regulation(30, "Specified-description exemption from the previous filing tax year"),
  regulation(31, "Specified-description exemption beginning after the previous filing tax year"),
  regulation(32, "Powers of attorney, deputies, guardians and controllers"),
  regulation(33, "Ministers of religion"),
  regulation(34, "Lloyd's underwriters"),
  regulation(35, "No National Insurance number"),
  regulation(36, "Exemptions based on a relief, allowance or chargeability condition"),
  regulation(38, "Married Couple's Allowance and Blind Person's Allowance"),
  regulation(39, "Temporary exemptions for 2026/27"),
  regulation(40, "Trust, settlement or estate income"),
  regulation(41, "Visiting performers"),
  regulation(42, "Providers of qualifying care"),
  regulation(43, "Residence and foreign income and gains circumstances"),
  regulation(44, "Averaging profits"),
  regulation(45, "Further exemptions by Commissioners' direction"),
].map((rule) => [rule.id, rule]));

const stepOrder: MtdStepId[] = [
  "entry-conditions",
  "qualifying-income",
  "amendments-and-special-rules",
  "exemptions",
  "obligations",
];

const reachedThrough: Record<MtdWhyReasonCode, MtdStepId | null> = {
  AS_OF_DATE_BEFORE_RULESET: null,
  AS_OF_DATE_IN_FUTURE: null,
  SOURCE_REVIEW_OVERDUE: null,
  RELEVANT_RETURN_DUTY_UNKNOWN: "entry-conditions",
  RELEVANT_RETURN_NOT_REQUIRED: "entry-conditions",
  REQUIRED_RETURN_NOT_SUBMITTED: "entry-conditions",
  RELEVANT_ACTIVITY_AT_ENTRY_UNKNOWN: "entry-conditions",
  ENTRY_CESSATION_FACT_CONFLICT: "entry-conditions",
  NO_RELEVANT_RETURN_ACTIVITY_AT_ENTRY: "entry-conditions",
  QUALIFYING_INCOME_INCOMPLETE: "qualifying-income",
  RETURN_AMENDMENT_STATUS_UNKNOWN: "amendments-and-special-rules",
  RETURN_AMENDMENT_REVIEW: "amendments-and-special-rules",
  SPECIAL_QUALIFYING_INCOME_RULE_UNKNOWN: "amendments-and-special-rules",
  SPECIAL_QUALIFYING_INCOME_RULE: "amendments-and-special-rules",
  CURRENT_PHASE_THRESHOLD_NOT_EXCEEDED: "amendments-and-special-rules",
  CESSATION_POSITION_UNKNOWN: "amendments-and-special-rules",
  HMRC_APPROVED_DIGITAL_EXCLUSION: "exemptions",
  HMRC_APPROVED_OTHER_2026_27_EXEMPTION: "exemptions",
  RETURN_EVIDENCE_TEMPORARY_EXEMPTION: "exemptions",
  NO_NINO_AT_TAX_YEAR_START: "exemptions",
  COMPLEX_RETURN_EXEMPTION_INDICATOR: "exemptions",
  NINO_STATUS_UNKNOWN: "exemptions",
  EXEMPTION_APPLICATION_PENDING: "exemptions",
  RETURN_EXEMPTION_EVIDENCE_NOT_CHECKED: "exemptions",
  DIGITAL_EXCLUSION_STATUS_UNKNOWN: "exemptions",
  OTHER_EXEMPTION_APPLICATION_NOT_CHECKED: "exemptions",
  CESSATION_UPDATE_PERIOD_UNKNOWN: "obligations",
  CALENDAR_CESSATION_YEAR_BOUNDARY: "obligations",
  NON_RESIDENCE_RETURN_EVIDENCE_CONFLICT: "exemptions",
  CURRENT_PHASE_THRESHOLD_EXCEEDED: "obligations",
  NO_EXEMPTION_IDENTIFIED: "obligations",
  MID_YEAR_CESSATION: "obligations",
};

const decisiveStepFor: Record<MtdWhyReasonCode, MtdStepId | null> = {
  ...reachedThrough,
  AS_OF_DATE_BEFORE_RULESET: null,
  AS_OF_DATE_IN_FUTURE: null,
  SOURCE_REVIEW_OVERDUE: null,
  CURRENT_PHASE_THRESHOLD_EXCEEDED: "qualifying-income",
  CURRENT_PHASE_THRESHOLD_NOT_EXCEEDED: "qualifying-income",
  NO_EXEMPTION_IDENTIFIED: "exemptions",
  MID_YEAR_CESSATION: "obligations",
  CESSATION_POSITION_UNKNOWN: "entry-conditions",
};

const baseClaimsByStep: Record<MtdStepId, string[]> = {
  "entry-conditions": ["mtd-entry-law"],
  "qualifying-income": [
    "mtd-thresholds-law",
    "mtd-income-residence",
    "mtd-current-threshold-calculation",
  ],
  "amendments-and-special-rules": ["mtd-amendments"],
  exemptions: ["mtd-exemptions-position"],
  obligations: [],
};

const baseRulesByStep: Record<MtdStepId, string[]> = {
  "entry-conditions": ["SI-2026-336-reg-5"],
  "qualifying-income": [
    "SI-2026-336-reg-21",
    "SI-2026-336-reg-22",
    "SI-2026-336-reg-25",
    "SI-2026-336-reg-26",
    "SI-2026-336-reg-27",
  ],
  "amendments-and-special-rules": [],
  exemptions: [],
  obligations: [],
};

const stepLabels: Record<MtdStepId, string> = {
  "entry-conditions": "Check the entry conditions",
  "qualifying-income": "Determine and compare qualifying income",
  "amendments-and-special-rules": "Check amendments and special income rules",
  exemptions: "Check statutory and HMRC-decided exemptions",
  obligations: "Map resulting obligations and deadlines",
};

const claimLabels: Record<string, string> = {
  "mtd-entry-law": "MTD entry condition",
  "mtd-thresholds-law": "Phased qualifying-income thresholds",
  "mtd-income-residence": "Residence-aware qualifying income",
  "mtd-current-threshold-calculation": "Current qualifying-income calculation",
  "mtd-amendments": "Return-amendment treatment",
  "mtd-exclusion-notice-law": "Effect of an HMRC exclusion notice",
  "mtd-no-nino-exemption-law": "No-NINO statutory exemption",
  "mtd-return-circumstance-exemption-law": "Specified-return-circumstance exemptions",
  "mtd-approved-other-exemption-law": "Other HMRC-recognised exemption route",
  "mtd-exemptions-position": "HMRC exemption position",
  "mtd-cessation-law": "Cessation and final-update treatment",
  "mtd-quarterly-obligations": "Digital records and quarterly updates",
  "mtd-annual-return-obligation": "MTD return using compatible software",
  "mtd-2026-27-penalty-position": "2026/27 quarterly-update penalty position",
  "self-assessment-deadlines": "Self Assessment filing and payment deadlines",
};

const exclusionRules = [
  "SI-2026-336-reg-18",
  "SI-2026-336-reg-19",
  "SI-2026-336-reg-20",
];
const returnCircumstanceRules = [
  "SI-2026-336-reg-28",
  "SI-2026-336-reg-29",
  "SI-2026-336-reg-30",
  "SI-2026-336-reg-31",
  "SI-2026-336-reg-32",
  "SI-2026-336-reg-33",
  "SI-2026-336-reg-34",
  "SI-2026-336-reg-35",
  "SI-2026-336-reg-36",
  "SI-2026-336-reg-38",
  "SI-2026-336-reg-39",
  "SI-2026-336-reg-40",
  "SI-2026-336-reg-41",
  "SI-2026-336-reg-42",
  "SI-2026-336-reg-43",
  "SI-2026-336-reg-44",
  "SI-2026-336-reg-45",
];

function indicatorRules(indicators: MtdWhyGraphInput["returnIndicators"]): string[] {
  if (!Array.isArray(indicators)) return [];
  const values = new Set<string>();
  for (const indicator of indicators) {
    if (indicator === "sa103-averaging-relief") {
      values.add("SI-2026-336-reg-39");
      values.add("SI-2026-336-reg-44");
    }
    if (indicator === "qualifying-care-relief") {
      values.add("SI-2026-336-reg-39");
      values.add("SI-2026-336-reg-42");
    }
    if (indicator === "sa107-trusts-or-estates") {
      values.add("SI-2026-336-reg-39");
      values.add("SI-2026-336-reg-40");
    }
    if (indicator === "sa109-residence") {
      values.add("SI-2026-336-reg-39");
      values.add("SI-2026-336-reg-41");
      values.add("SI-2026-336-reg-43");
    }
    if (indicator === "incapable-with-legal-representative") values.add("SI-2026-336-reg-32");
    if (indicator === "sa102m-minister-of-religion") values.add("SI-2026-336-reg-33");
    if (indicator === "sa103l-lloyds") values.add("SI-2026-336-reg-34");
    if (indicator === "married-couples-allowance" || indicator === "blind-persons-allowance") {
      values.add("SI-2026-336-reg-36");
      values.add("SI-2026-336-reg-38");
    }
  }
  return [...values].sort();
}

function exemptionRuleIds(input: MtdWhyGraphInput): string[] {
  const codes = new Set(input.reasonCodes);
  if (codes.has("HMRC_APPROVED_DIGITAL_EXCLUSION") || codes.has("DIGITAL_EXCLUSION_STATUS_UNKNOWN")) {
    return exclusionRules;
  }
  if (codes.has("NO_NINO_AT_TAX_YEAR_START") || codes.has("NINO_STATUS_UNKNOWN")) {
    return ["SI-2026-336-reg-35"];
  }
  if (codes.has("RETURN_EVIDENCE_TEMPORARY_EXEMPTION") || codes.has("COMPLEX_RETURN_EXEMPTION_INDICATOR")) {
    return indicatorRules(input.returnIndicators);
  }
  if (codes.has("HMRC_APPROVED_OTHER_2026_27_EXEMPTION")) {
    return [
      "SI-2026-336-reg-31",
      "SI-2026-336-reg-36",
      "SI-2026-336-reg-39",
      "SI-2026-336-reg-45",
    ];
  }
  if (codes.has("EXEMPTION_APPLICATION_PENDING")) {
    return [...new Set([
      ...exclusionRules,
      "SI-2026-336-reg-31",
      "SI-2026-336-reg-36",
      "SI-2026-336-reg-39",
      "SI-2026-336-reg-45",
    ])].sort();
  }
  if (codes.has("NO_EXEMPTION_IDENTIFIED")) {
    return [...new Set([...exclusionRules, ...returnCircumstanceRules])].sort();
  }
  return [];
}

function decisiveClaimIds(input: MtdWhyGraphInput): Set<string> {
  const codes = new Set(input.reasonCodes);
  const ids = new Set<string>();
  if ([...codes].some((code) => [
    "RELEVANT_RETURN_DUTY_UNKNOWN",
    "RELEVANT_RETURN_NOT_REQUIRED",
    "REQUIRED_RETURN_NOT_SUBMITTED",
    "RELEVANT_ACTIVITY_AT_ENTRY_UNKNOWN",
    "ENTRY_CESSATION_FACT_CONFLICT",
    "NO_RELEVANT_RETURN_ACTIVITY_AT_ENTRY",
    "CESSATION_POSITION_UNKNOWN",
  ].includes(code))) ids.add("mtd-entry-law");
  if ([...codes].some((code) => [
    "QUALIFYING_INCOME_INCOMPLETE",
    "CURRENT_PHASE_THRESHOLD_EXCEEDED",
    "CURRENT_PHASE_THRESHOLD_NOT_EXCEEDED",
  ].includes(code))) {
    ids.add("mtd-thresholds-law");
    ids.add("mtd-income-residence");
    ids.add("mtd-current-threshold-calculation");
  }
  if ([...codes].some((code) => [
    "RETURN_AMENDMENT_STATUS_UNKNOWN",
    "RETURN_AMENDMENT_REVIEW",
    "SPECIAL_QUALIFYING_INCOME_RULE_UNKNOWN",
    "SPECIAL_QUALIFYING_INCOME_RULE",
  ].includes(code))) ids.add("mtd-amendments");
  if (codes.has("HMRC_APPROVED_DIGITAL_EXCLUSION")) ids.add("mtd-exclusion-notice-law");
  if (codes.has("NO_NINO_AT_TAX_YEAR_START")) ids.add("mtd-no-nino-exemption-law");
  if (codes.has("RETURN_EVIDENCE_TEMPORARY_EXEMPTION")) ids.add("mtd-return-circumstance-exemption-law");
  if (codes.has("HMRC_APPROVED_OTHER_2026_27_EXEMPTION")) ids.add("mtd-approved-other-exemption-law");
  if ([...codes].some((code) => [
    "COMPLEX_RETURN_EXEMPTION_INDICATOR",
    "NINO_STATUS_UNKNOWN",
    "EXEMPTION_APPLICATION_PENDING",
    "RETURN_EXEMPTION_EVIDENCE_NOT_CHECKED",
    "DIGITAL_EXCLUSION_STATUS_UNKNOWN",
    "OTHER_EXEMPTION_APPLICATION_NOT_CHECKED",
    "NO_EXEMPTION_IDENTIFIED",
    "NON_RESIDENCE_RETURN_EVIDENCE_CONFLICT",
  ].includes(code))) ids.add("mtd-exemptions-position");
  if (codes.has("MID_YEAR_CESSATION") || codes.has("CALENDAR_CESSATION_YEAR_BOUNDARY")) {
    ids.add("mtd-cessation-law");
  }
  return ids;
}

function decisiveRuleIds(input: MtdWhyGraphInput): Set<string> {
  const codes = new Set(input.reasonCodes);
  const ids = new Set<string>();
  if ([...codes].some((code) => [
    "RELEVANT_RETURN_DUTY_UNKNOWN",
    "RELEVANT_RETURN_NOT_REQUIRED",
    "REQUIRED_RETURN_NOT_SUBMITTED",
    "RELEVANT_ACTIVITY_AT_ENTRY_UNKNOWN",
    "ENTRY_CESSATION_FACT_CONFLICT",
    "NO_RELEVANT_RETURN_ACTIVITY_AT_ENTRY",
  ].includes(code))) ids.add("SI-2026-336-reg-5");
  if (codes.has("CESSATION_POSITION_UNKNOWN")) ids.add("SI-2026-336-reg-6");
  if ([...codes].some((code) => [
    "QUALIFYING_INCOME_INCOMPLETE",
    "CURRENT_PHASE_THRESHOLD_EXCEEDED",
    "CURRENT_PHASE_THRESHOLD_NOT_EXCEEDED",
  ].includes(code))) {
    ids.add("SI-2026-336-reg-25");
    ids.add("SI-2026-336-reg-26");
    ids.add("SI-2026-336-reg-27");
  }
  if (
    codes.has("CURRENT_PHASE_THRESHOLD_EXCEEDED")
    || codes.has("CURRENT_PHASE_THRESHOLD_NOT_EXCEEDED")
  ) {
    ids.add("SI-2026-336-reg-21");
    ids.add("SI-2026-336-reg-22");
  }
  if ([...codes].some((code) => [
    "RETURN_AMENDMENT_STATUS_UNKNOWN",
    "RETURN_AMENDMENT_REVIEW",
    "SPECIAL_QUALIFYING_INCOME_RULE_UNKNOWN",
    "SPECIAL_QUALIFYING_INCOME_RULE",
  ].includes(code))) ids.add("SI-2026-336-reg-26");
  if (codes.has("HMRC_APPROVED_DIGITAL_EXCLUSION")) {
    for (const id of exclusionRules) ids.add(id);
  }
  if (codes.has("NO_NINO_AT_TAX_YEAR_START")) ids.add("SI-2026-336-reg-35");
  if (codes.has("RETURN_EVIDENCE_TEMPORARY_EXEMPTION")) {
    ids.add("SI-2026-336-reg-39");
    if (Array.isArray(input.returnIndicators)) {
      if (input.returnIndicators.includes("sa103-averaging-relief")) ids.add("SI-2026-336-reg-44");
      if (input.returnIndicators.includes("qualifying-care-relief")) ids.add("SI-2026-336-reg-42");
      if (input.returnIndicators.includes("sa107-trusts-or-estates")) ids.add("SI-2026-336-reg-40");
      // An SA109 page establishes the bounded operational result under HMRC's
      // published position, but does not identify regulation 41 versus 43.
    }
  }
  if (codes.has("MID_YEAR_CESSATION")) {
    ids.add("SI-2026-336-reg-6");
    ids.add("SI-2026-336-reg-14");
  }
  return ids;
}

function ascii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function semanticPart(value: string): string {
  return value.replace(/[^A-Za-z0-9._:-]/g, "-");
}

function obligationRules(
  obligation: MtdWhyObligation,
  input: MtdWhyGraphInput,
): string[] {
  const ids = new Set<string>();
  if (obligation.id === "keep-digital-records") ids.add("SI-2026-336-reg-15");
  if (obligation.id === "submit-mtd-tax-return") ids.add("SI-2026-336-reg-8");
  if (obligation.id.startsWith("quarterly-update-")) {
    ids.add("SI-2026-336-reg-9");
    if (input.updatePeriod === "standard") ids.add("SI-2026-336-reg-12");
    if (input.updatePeriod === "calendar") ids.add("SI-2026-336-reg-13");
    if (input.updatePeriod === "unknown") {
      ids.add("SI-2026-336-reg-12");
      ids.add("SI-2026-336-reg-13");
    }
    const finalQuarterlyId = input.obligations
      .filter((item) => item.id.startsWith("quarterly-update-"))
      .at(-1)?.id;
    if (input.reasonCodes.includes("MID_YEAR_CESSATION") && obligation.id === finalQuarterlyId) {
      ids.add("SI-2026-336-reg-14");
    }
  }
  if (obligation.id === "calendar-boundary-final-update") {
    ids.add("SI-2026-336-reg-13");
    ids.add("SI-2026-336-reg-14");
  }
  if (obligation.id === "notify-hmrc-of-cessation") ids.add("SI-2026-336-reg-6");
  if (ids.size > 0) ids.add("SI-2026-336-reg-7");
  return [...ids].sort(ascii);
}

function obligationClaims(obligation: MtdWhyObligation): string[] {
  const ids = new Set<string>();
  if (
    obligation.id === "keep-digital-records"
    || obligation.id.startsWith("quarterly-update-")
    || obligation.id === "calendar-boundary-final-update"
  ) ids.add("mtd-quarterly-obligations");
  if (obligation.id === "submit-mtd-tax-return") ids.add("mtd-annual-return-obligation");
  if (
    obligation.id === "calendar-boundary-final-update"
    || obligation.id === "notify-hmrc-of-cessation"
  ) ids.add("mtd-cessation-law");
  if (
    obligation.id === "submit-paper-self-assessment-return"
    || obligation.id === "submit-online-self-assessment-return"
    || obligation.id === "pay-self-assessment-tax"
  ) ids.add("self-assessment-deadlines");
  return [...ids].sort(ascii);
}

function appliedObligationRules(
  obligation: MtdWhyObligation,
  input: MtdWhyGraphInput,
): string[] {
  return obligationRules(obligation, input).filter((ruleId) => !(
    input.updatePeriod === "unknown"
    && ["SI-2026-336-reg-12", "SI-2026-336-reg-13"].includes(ruleId)
  ));
}

function tracedFactPaths(
  stepId: MtdStepId,
  input: MtdWhyGraphInput,
  hasDigitalObligations: boolean,
): string[] {
  const codes = new Set(input.reasonCodes);
  if (stepId === "entry-conditions") {
    const paths = ["person.relevantReturnPosition"];
    if (
      codes.has("RELEVANT_RETURN_DUTY_UNKNOWN")
      || codes.has("RELEVANT_RETURN_NOT_REQUIRED")
      || codes.has("REQUIRED_RETURN_NOT_SUBMITTED")
    ) return paths;
    paths.push("income.atLeastOneRelevantReturnActivityContinuedAtEntry");
    if (!codes.has("RELEVANT_ACTIVITY_AT_ENTRY_UNKNOWN")) {
      paths.push("income.lastRelevantActivityCessationDate");
    }
    return paths;
  }
  if (stepId === "qualifying-income") {
    return [
      "income.taxYears.2024-25.basis",
      "income.taxYears.2024-25.residence",
      "income.taxYears.2024-25.selfEmploymentGrossPence",
      "income.taxYears.2024-25.ukPropertyGrossPence",
      "income.taxYears.2024-25.foreignPropertyGrossPence",
    ];
  }
  if (stepId === "amendments-and-special-rules") {
    const paths = ["income.relevantReturnWasAmended"];
    if (!codes.has("RETURN_AMENDMENT_STATUS_UNKNOWN") && !codes.has("RETURN_AMENDMENT_REVIEW")) {
      paths.push("income.annualisationOrOtherSpecialRulesMayApply");
    }
    return paths;
  }
  if (stepId === "exemptions") {
    const paths = ["exemption.digitalExclusion"];
    if (codes.has("HMRC_APPROVED_DIGITAL_EXCLUSION")) return paths;
    paths.push("exemption.otherExemptionApplication");
    if (codes.has("HMRC_APPROVED_OTHER_2026_27_EXEMPTION")) return paths;
    paths.push("exemption.returnIndicators");
    if (
      codes.has("RETURN_EVIDENCE_TEMPORARY_EXEMPTION")
      || codes.has("COMPLEX_RETURN_EXEMPTION_INDICATOR")
    ) return paths;
    paths.push("person.hadNationalInsuranceNumberAtStartOf2026To27");
    return paths;
  }
  if (codes.has("CESSATION_UPDATE_PERIOD_UNKNOWN")) {
    return ["income.lastRelevantActivityCessationDate", "reporting.updatePeriod"];
  }
  if (input.obligations.length === 0) return [];
  return hasDigitalObligations
    ? ["asOfDate", "reporting.updatePeriod", "income.lastRelevantActivityCessationDate"]
    : ["asOfDate"];
}

function stateRank(state: WhyGraphNodeState): number {
  return [
    "context",
    "not-applicable",
    "not-mapped",
    "checked-not-decisive",
    "supporting",
    "conditional",
    "available",
    "blocking",
    "decisive",
  ].indexOf(state);
}

export function buildMtdWhyGraph(input: MtdWhyGraphInput): {
  graph: WhyGraph;
  ruleIds: string[];
  steps: ReasoningStep[];
} {
  const nodes = new Map<string, WhyGraphNode>();
  const edges = new Map<string, WhyGraphEdge>();
  const gapNodeIds = new Set<string>();
  const decisiveSteps = new Set(
    input.reasonCodes
      .map((code) => decisiveStepFor[code])
      .filter((step): step is MtdStepId => step !== null),
  );
  const decisiveClaims = decisiveClaimIds(input);
  const decisiveRules = decisiveRuleIds(input);
  const digitalObligations = input.obligations.filter(
    (obligation) => obligationRules(obligation, input).length > 0,
  );
  const hasDigitalObligations = digitalObligations.length > 0;
  for (const obligation of digitalObligations) {
    if (obligation.conditional) continue;
    for (const ruleId of appliedObligationRules(obligation, input)) decisiveRules.add(ruleId);
  }
  if (digitalObligations.some((obligation) => !obligation.conditional)) {
    decisiveSteps.add("obligations");
  }

  const reachedIndex = Math.max(
    -1,
    ...input.reasonCodes.map((code) => {
      const step = reachedThrough[code];
      return step === null ? -1 : stepOrder.indexOf(step);
    }),
    input.obligations.length > 0 ? stepOrder.indexOf("obligations") : -1,
  );
  const reachedSteps = stepOrder.slice(0, reachedIndex + 1);
  if (reachedIndex >= stepOrder.indexOf("qualifying-income")) {
    decisiveSteps.add("entry-conditions");
    decisiveClaims.add("mtd-entry-law");
    decisiveRules.add("SI-2026-336-reg-5");
  }
  if (reachedIndex >= stepOrder.indexOf("amendments-and-special-rules")) {
    decisiveSteps.add("qualifying-income");
    decisiveClaims.add("mtd-thresholds-law");
    decisiveClaims.add("mtd-income-residence");
    decisiveClaims.add("mtd-current-threshold-calculation");
    decisiveRules.add("SI-2026-336-reg-25");
    decisiveRules.add("SI-2026-336-reg-26");
    decisiveRules.add("SI-2026-336-reg-27");
  }
  if (
    reachedIndex >= stepOrder.indexOf("exemptions")
    || input.reasonCodes.includes("CESSATION_POSITION_UNKNOWN")
  ) {
    decisiveRules.add("SI-2026-336-reg-21");
    decisiveRules.add("SI-2026-336-reg-22");
  }
  if (input.reasonCodes.includes("CESSATION_UPDATE_PERIOD_UNKNOWN")) {
    decisiveSteps.add("obligations");
    decisiveClaims.add("mtd-cessation-law");
    decisiveClaims.add("mtd-quarterly-obligations");
    decisiveClaims.add("mtd-annual-return-obligation");
    for (const ruleId of [
      "SI-2026-336-reg-6",
      "SI-2026-336-reg-7",
      "SI-2026-336-reg-8",
      "SI-2026-336-reg-9",
      "SI-2026-336-reg-14",
      "SI-2026-336-reg-15",
    ]) decisiveRules.add(ruleId);
  }

  const addNode = (node: WhyGraphNode): void => {
    const existing = nodes.get(node.id);
    if (!existing) {
      nodes.set(node.id, node);
      return;
    }
    if (existing.kind !== node.kind) throw new Error(`WhyGraph node ${node.id} changes kind`);
    if (stateRank(node.state) > stateRank(existing.state)) {
      nodes.set(node.id, { ...existing, state: node.state });
    }
  };
  const addEdge = (
    from: string,
    relation: Parameters<typeof whyGraphEdge>[1],
    to: string,
    explanation: string,
  ): void => {
    const edge = whyGraphEdge(from, relation, to, explanation);
    edges.set(edge.id, edge);
  };

  const institution = (
    id: "hmrc" | "kings-printer" | "taxsorted",
  ): string => {
    const definitions = {
      hmrc: {
        label: "HM Revenue & Customs",
        description: "The tax authority that administers MTD Income Tax and makes application-based exemption decisions.",
        record: {
          kind: "dataset-record" as const,
          dataset: "uk-tax-system",
          collection: "actors",
          recordId: "actor-hmrc",
          href: "/v1/tax-system/uk/actors/actor-hmrc",
        },
      },
      "kings-printer": {
        label: "King's Printer of Acts of Parliament",
        description: "The publisher named in the official legislation.gov.uk metadata for this statutory instrument; the Commissioners for HMRC made the instrument.",
        record: {
          kind: "external-resource" as const,
          href: "https://www.legislation.gov.uk/",
        },
      },
      taxsorted: {
        label: "TaxSorted",
        description: "The software service that performs this advisory classification; it is not HMRC or a tribunal.",
        record: {
          kind: "external-resource" as const,
          href: "/v1/uk/tax-expert",
        },
      },
    }[id];
    const nodeId = `institution:${id}`;
    addNode({
      id: nodeId,
      kind: "institution",
      label: definitions.label,
      description: definitions.description,
      state: "context",
      record: definitions.record,
    });
    return nodeId;
  };

  const party = (
    id: "caller" | "qualified-adviser" | "relevant-person",
  ): string => {
    const nodeId = `party-role:${id}`;
    const definition = {
      caller: {
        label: "Calling workspace or caller",
        description: "The workspace or person supplying facts and following a next action; this does not establish taxpayer identity or authority to act.",
      },
      "qualified-adviser": {
        label: "Qualified adviser",
        description: "A suitably qualified professional who can review facts outside this bounded path; they do not become HMRC's decision-maker.",
      },
      "relevant-person": {
        label: "Relevant person",
        description: "The person on whom the mapped legal or filing duty rests. This request does not identify them or prove that the caller or another person may act for them.",
      },
    }[id];
    addNode({
      id: nodeId,
      kind: "party-role",
      label: definition.label,
      description: definition.description,
      state: "context",
      record: null,
    });
    return nodeId;
  };

  const sources = new Map(input.sources.map((source) => [source.id, source]));
  const addSource = (sourceId: string): string => {
    const source = sources.get(sourceId);
    if (!source) throw new Error(`WhyGraph references missing source ${sourceId}`);
    const nodeId = `source:${semanticPart(source.id)}`;
    addNode({
      id: nodeId,
      kind: "source",
      label: source.title,
      description: `${source.publisher}; ${source.legalForce}; ${source.status}.`,
      state: "supporting",
      record: {
        kind: "response-record",
        collection: "evidence.sources",
        key: "id",
        value: source.id,
      },
    });
    const publisher = source.publisher === "King's Printer of Acts of Parliament"
      ? institution("kings-printer")
      : source.publisher === "HM Revenue & Customs"
        ? institution("hmrc")
        : null;
    if (publisher) {
      addEdge(nodeId, "published-by", publisher, "This institution published the cited source.");
    }
    return nodeId;
  };

  const claims = new Map(input.claims.map((claim) => [claim.id, claim]));
  const ensureClaim = (claimId: string): string => {
    const claim = claims.get(claimId);
    if (!claim) throw new Error(`WhyGraph references missing claim ${claimId}`);
    const nodeId = `claim:${semanticPart(claim.id)}`;
    addNode({
      id: nodeId,
      kind: "claim",
      label: claimLabels[claim.id] ?? claim.id,
      description: `${claim.kind}; ${claim.support} support. Read the referenced claim record for its full statement.`,
      state: decisiveClaims.has(claim.id) ? "decisive" : "supporting",
      record: {
        kind: "response-record",
        collection: "evidence.claims",
        key: "id",
        value: claim.id,
      },
    });
    for (const sourceId of claim.sourceIds) {
      addEdge(nodeId, "supported-by", addSource(sourceId), "The source supports the claim at the declared level.");
    }
    return nodeId;
  };
  const addClaim = (claimId: string, stepNodeId: string): void => {
    const nodeId = ensureClaim(claimId);
    addEdge(stepNodeId, "uses-claim", nodeId, "The reached reasoning step uses this claim.");
  };

  const includedRuleIds = new Set<string>();
  const ruleNodeId = (ruleId: string): string => `rule:${ruleId.toLowerCase()}`;
  const addRule = (ruleId: string, stepNodeId: string): void => {
    const rule = rules.get(ruleId);
    if (!rule) throw new Error(`WhyGraph references missing MTD rule ${ruleId}`);
    includedRuleIds.add(rule.id);
    const nodeId = ruleNodeId(rule.id);
    const decisive = decisiveRules.has(rule.id);
    addNode({
      id: nodeId,
      kind: "rule",
      label: rule.label,
      description: rule.citation,
      state: decisive ? "decisive" : "checked-not-decisive",
      record: {
        kind: "dataset-record",
        dataset: "legislation.gov.uk",
        collection: "uksi-2026-336.regulations",
        recordId: rule.id,
        href: rule.href,
      },
    });
    addEdge(
      stepNodeId,
      decisive ? "applies-rule" : "considers-rule",
      nodeId,
      decisive
        ? "This binding provision is on the decisive path."
        : "This provision was checked but is not labelled decisive for the result.",
    );
    addEdge(
      nodeId,
      "legal-authority-from",
      addSource(rule.sourceId),
      "The statutory instrument supplies this provision's legal authority.",
    );
    addEdge(nodeId, "administered-by", institution("hmrc"), "HMRC administers the MTD Income Tax regime.");
  };

  const rootNodeId = "conclusion:mtd-income-tax-readiness";
  addNode({
    id: rootNodeId,
    kind: "conclusion",
    label: input.headline,
    description: `TaxSorted classification: ${input.decision}; answer status: ${input.status}. This is not an HMRC decision.`,
    state: input.status === "determined" ? "decisive" : "blocking",
    record: {
      kind: "response-record",
      collection: "answer",
      key: "json-pointer",
      value: "/answer/decision",
    },
  });

  const steps = new Map(input.steps.map((step) => [step.id, step]));
  const materialUnknowns = new Map(
    input.facts.unknown.filter((fact) => fact.material).map((fact) => [fact.path, fact]),
  );
  const unknowns = new Map(input.facts.unknown.map((fact) => [fact.path, fact]));
  const provided = new Map(input.facts.provided.map((fact) => [fact.path, fact]));
  const derived = new Map(input.facts.derived.map((fact) => [fact.path, fact]));
  const exemptionRules = exemptionRuleIds(input);
  const selectedSteps: ReasoningStep[] = [];
  const ensureFact = (factPath: string): string | null => {
    const fact = provided.get(factPath) ?? derived.get(factPath);
    if (!fact) return null;
    const factSet = provided.has(factPath) ? "provided" : "derived";
    const factNodeId = `fact:${factSet}:${semanticPart(factPath)}`;
    addNode({
      id: factNodeId,
      kind: "fact",
      label: fact.label,
      description: unknowns.get(factPath)?.whyItMatters
        ?? "The graph references this fact by path and does not copy its value.",
      state: materialUnknowns.has(factPath)
        ? "blocking"
        : unknowns.has(factPath) ? "not-mapped" : "supporting",
      record: {
        kind: "response-record",
        collection: `facts.${factSet}`,
        key: "path",
        value: factPath,
      },
    });
    return factNodeId;
  };

  for (const stepId of reachedSteps) {
    const step = steps.get(stepId);
    if (!step) throw new Error(`WhyGraph references missing reasoning step ${stepId}`);
    const factPaths = tracedFactPaths(stepId, input, hasDigitalObligations);
    const claimIds = new Set(baseClaimsByStep[stepId]);
    if (stepId === "entry-conditions" && input.reasonCodes.includes("CESSATION_POSITION_UNKNOWN")) {
      claimIds.add("mtd-cessation-law");
    }
    if (stepId === "exemptions") {
      if (input.reasonCodes.includes("HMRC_APPROVED_DIGITAL_EXCLUSION")) claimIds.add("mtd-exclusion-notice-law");
      if (input.reasonCodes.includes("NO_NINO_AT_TAX_YEAR_START")) claimIds.add("mtd-no-nino-exemption-law");
      if (input.reasonCodes.includes("RETURN_EVIDENCE_TEMPORARY_EXEMPTION")) claimIds.add("mtd-return-circumstance-exemption-law");
      if (input.reasonCodes.includes("HMRC_APPROVED_OTHER_2026_27_EXEMPTION")) claimIds.add("mtd-approved-other-exemption-law");
    }
    if (stepId === "obligations") {
      for (const obligation of input.obligations) {
        for (const claimId of obligationClaims(obligation)) claimIds.add(claimId);
      }
      if (input.reasonCodes.includes("CESSATION_UPDATE_PERIOD_UNKNOWN")) {
        claimIds.add("mtd-cessation-law");
        claimIds.add("mtd-quarterly-obligations");
        claimIds.add("mtd-annual-return-obligation");
      }
      if (input.penaltyPosition.sourceIds.length > 0) claimIds.add("mtd-2026-27-penalty-position");
    }
    const selectedStep: ReasoningStep = {
      ...step,
      factPaths,
      claimIds: [...claimIds],
    };
    selectedSteps.push(selectedStep);
    const stepNodeId = `reasoning:${step.id}`;
    addNode({
      id: stepNodeId,
      kind: "reasoning-step",
      label: stepLabels[stepId],
      description: decisiveSteps.has(stepId)
        ? "This reached step is decisive for at least one result reason."
        : "This step was reached and supports the result without being labelled decisive.",
      state: decisiveSteps.has(stepId) ? "decisive" : "supporting",
      record: {
        kind: "response-record",
        collection: "reasoning.steps",
        key: "id",
        value: step.id,
      },
    });
    addEdge(rootNodeId, "reasoned-by", stepNodeId, "This reached step forms part of the result trace.");

    for (const factPath of selectedStep.factPaths) {
      const factNodeId = ensureFact(factPath);
      if (!factNodeId) continue;
      addEdge(stepNodeId, "uses-fact", factNodeId, "The reasoning step reads this exact fact path.");
    }

    for (const claimId of selectedStep.claimIds) addClaim(claimId, stepNodeId);

    const ruleIds = new Set(baseRulesByStep[stepId]);
    if (stepId === "entry-conditions" && input.reasonCodes.includes("CESSATION_POSITION_UNKNOWN")) {
      ruleIds.add("SI-2026-336-reg-6");
    }
    if (stepId === "amendments-and-special-rules" && input.reasonCodes.some((code) => [
      "RETURN_AMENDMENT_STATUS_UNKNOWN",
      "RETURN_AMENDMENT_REVIEW",
      "SPECIAL_QUALIFYING_INCOME_RULE_UNKNOWN",
      "SPECIAL_QUALIFYING_INCOME_RULE",
    ].includes(code))) {
      ruleIds.add("SI-2026-336-reg-26");
    }
    if (stepId === "exemptions") for (const id of exemptionRules) ruleIds.add(id);
    if (stepId === "obligations") {
      for (const obligation of input.obligations) {
        for (const id of obligationRules(obligation, input)) ruleIds.add(id);
      }
      if (input.reasonCodes.includes("CESSATION_UPDATE_PERIOD_UNKNOWN")) {
        for (const id of [
          "SI-2026-336-reg-6",
          "SI-2026-336-reg-7",
          "SI-2026-336-reg-8",
          "SI-2026-336-reg-9",
          "SI-2026-336-reg-12",
          "SI-2026-336-reg-13",
          "SI-2026-336-reg-14",
          "SI-2026-336-reg-15",
        ]) ruleIds.add(id);
      }
    }
    for (const ruleId of ruleIds) addRule(ruleId, stepNodeId);
  }

  const actualPerformerGapId = input.obligations.length > 0
    ? "gap:actual-performer-and-agent-authority"
    : null;
  if (actualPerformerGapId) {
    gapNodeIds.add(actualPerformerGapId);
    addNode({
      id: actualPerformerGapId,
      kind: "gap",
      label: "Actual performer and any agent authority not established",
      description: "The mapped duty holder is known as a legal role. This request does not identify who will perform each action or prove that any caller, adviser or agent has authority to act for that person.",
      state: "not-mapped",
      record: null,
    });
  }

  for (const obligation of input.obligations) {
    const nodeId = `consequence:obligation:${semanticPart(obligation.id)}`;
    addNode({
      id: nodeId,
      kind: "consequence",
      label: obligation.title,
      description: obligation.dueDate === null
        ? "The exact date is unresolved in this path."
        : `Mapped date: ${obligation.dueDate}.`,
      state: obligation.conditional ? "conditional" : "available",
      record: {
        kind: "response-record",
        collection: "answer.obligations",
        key: "id",
        value: obligation.id,
      },
    });
    addEdge(rootNodeId, "leads-to", nodeId, "The result carries this obligation as an explicit consequence.");
    addEdge(
      nodeId,
      "responsibility-held-by",
      party("relevant-person"),
      "The mapped duty rests with the relevant person; this does not identify the actual performer.",
    );
    if (actualPerformerGapId) {
      addEdge(
        nodeId,
        "limited-by",
        actualPerformerGapId,
        "The graph does not infer an actual performer or authority to act from the duty-holder role.",
      );
    }
    addEdge(nodeId, "administered-by", institution("hmrc"), "HMRC administers the obligation.");
    for (const sourceId of obligation.sourceIds) {
      addEdge(nodeId, "supported-by", addSource(sourceId), "The source supports this mapped obligation.");
    }
    for (const claimId of obligationClaims(obligation)) {
      addEdge(nodeId, "grounded-in", ensureClaim(claimId), "This claim explains the mapped obligation.");
    }
    for (const ruleId of obligationRules(obligation, input)) {
      const target = ruleNodeId(ruleId);
      if (!nodes.has(target)) throw new Error(`WhyGraph obligation ${obligation.id} has no reached rule ${ruleId}`);
      addEdge(nodeId, "grounded-in", target, "This provision creates or times the mapped digital obligation.");
    }
  }

  const penaltyNodeId = "consequence:penalty-position:2026-27";
  addNode({
    id: penaltyNodeId,
    kind: "consequence",
    label: "2026/27 quarterly-update penalty position",
    description: input.penaltyPosition.note,
    state: input.penaltyPosition.applies
      ? input.penaltyPosition.conditional ? "conditional" : "available"
      : "not-applicable",
    record: {
      kind: "response-record",
      collection: "answer.penaltyPosition",
      key: "json-pointer",
      value: "/answer/penaltyPosition",
    },
  });
  addEdge(rootNodeId, "leads-to", penaltyNodeId, "The answer keeps the penalty position separate from the underlying obligation.");
  for (const sourceId of input.penaltyPosition.sourceIds) {
    addEdge(penaltyNodeId, "supported-by", addSource(sourceId), "The source supports this limited penalty position.");
  }
  if (input.penaltyPosition.sourceIds.length > 0) {
    addEdge(
      penaltyNodeId,
      "grounded-in",
      ensureClaim("mtd-2026-27-penalty-position"),
      "The HMRC-position claim supports this limited penalty statement.",
    );
  }
  if (input.penaltyPosition.applies) {
    addEdge(penaltyNodeId, "administered-by", institution("hmrc"), "HMRC administers the penalty regime.");
  }

  const actionRouteIds = new Map<string, string>();
  for (const action of input.nextActions) {
    const nodeId = `route:${semanticPart(action.id)}`;
    actionRouteIds.set(action.id, nodeId);
    addNode({
      id: nodeId,
      kind: "route",
      label: action.label,
      description: "A bounded next action from this assessment; it is not proof of an appeal right.",
      state: "available",
      record: {
        kind: "response-record",
        collection: "escalation.nextActions",
        key: "id",
        value: action.id,
      },
    });
    addEdge(rootNodeId, "leads-to", nodeId, "The assessment offers this next action.");
    if (action.responsibleParty === "caller") {
      addEdge(nodeId, "performed-by", party("caller"), "The caller owns this action.");
    } else if (action.responsibleParty === "qualified-adviser") {
      addEdge(nodeId, "performed-by", party("qualified-adviser"), "A qualified adviser performs this review.");
    } else if (action.responsibleParty === "TaxSorted") {
      addEdge(nodeId, "handled-by", institution("taxsorted"), "TaxSorted owns this source-maintenance action.");
    } else {
      addEdge(nodeId, "decision-made-by", institution("hmrc"), "HMRC, not TaxSorted, makes the official decision.");
      if (action.id === "check-exemptions") {
        addEdge(nodeId, "performed-by", party("caller"), "The caller supplies or follows up the application facts.");
      }
    }
    if (
      action.id === "check-exemptions"
      && input.reasonCodes.includes("EXEMPTION_APPLICATION_PENDING")
    ) {
      addEdge(nodeId, "decision-made-by", institution("hmrc"), "HMRC, not the caller or TaxSorted, makes the pending exemption decision.");
      addEdge(
        nodeId,
        "uses-claim",
        ensureClaim("mtd-exemptions-position"),
        "The admitted HMRC-position claim supports the stated decision role.",
      );
    }
  }

  const selectedFactPaths = new Set(selectedSteps.flatMap((step) => step.factPaths));
  for (const unknown of input.facts.unknown.filter((fact) => (
    fact.material || selectedFactPaths.has(fact.path)
  ))) {
    const nodeId = `gap:missing-fact:${semanticPart(unknown.path)}`;
    gapNodeIds.add(nodeId);
    addNode({
      id: nodeId,
      kind: "gap",
      label: `${unknown.material ? "Missing material fact" : "Missing detail"}: ${unknown.label}`,
      description: unknown.whyItMatters,
      state: unknown.material ? "blocking" : "not-mapped",
      record: {
        kind: "response-record",
        collection: "facts.unknown",
        key: "path",
        value: unknown.path,
      },
    });
    addEdge(
      rootNodeId,
      unknown.material ? "blocked-by" : "limited-by",
      nodeId,
      unknown.material
        ? "This missing fact prevents a determined answer."
        : "This missing fact limits detail without changing the bounded determination.",
    );
    const step = selectedSteps
      .find((candidate) => candidate?.factPaths.includes(unknown.path));
    if (step) {
      addEdge(
        `reasoning:${step.id}`,
        unknown.material ? "blocked-by" : "limited-by",
        nodeId,
        unknown.material
          ? "The missing fact blocks this reasoning step."
          : "The missing fact limits the detail available from this step.",
      );
    }
    const supplyFacts = actionRouteIds.get("supply-facts");
    if (unknown.material && supplyFacts) {
      addEdge(nodeId, "addressed-by", supplyFacts, "Supplying the named fact addresses this gap.");
    }
  }

  const blockingReasonCodes = input.reasonCodes.filter((code) => ![
    "CURRENT_PHASE_THRESHOLD_EXCEEDED",
    "CURRENT_PHASE_THRESHOLD_NOT_EXCEEDED",
    "NO_EXEMPTION_IDENTIFIED",
    "NO_NINO_AT_TAX_YEAR_START",
    "RETURN_EVIDENCE_TEMPORARY_EXEMPTION",
    "HMRC_APPROVED_DIGITAL_EXCLUSION",
    "HMRC_APPROVED_OTHER_2026_27_EXEMPTION",
    "MID_YEAR_CESSATION",
    "RELEVANT_RETURN_NOT_REQUIRED",
    "NO_RELEVANT_RETURN_ACTIVITY_AT_ENTRY",
  ].includes(code));
  if (input.status !== "determined" && materialUnknowns.size === 0) {
    const addressingActions: Partial<Record<MtdWhyReasonCode, string[]>> = {
      SOURCE_REVIEW_OVERDUE: ["refresh-sources"],
      REQUIRED_RETURN_NOT_SUBMITTED: ["resolve-unsubmitted-return"],
      ENTRY_CESSATION_FACT_CONFLICT: ["review-qualifying-income"],
      RETURN_AMENDMENT_REVIEW: ["review-qualifying-income"],
      SPECIAL_QUALIFYING_INCOME_RULE: ["review-qualifying-income"],
      COMPLEX_RETURN_EXEMPTION_INDICATOR: ["check-exemptions"],
      EXEMPTION_APPLICATION_PENDING: ["check-exemptions"],
      CALENDAR_CESSATION_YEAR_BOUNDARY: ["review-calendar-boundary-cessation"],
      NON_RESIDENCE_RETURN_EVIDENCE_CONFLICT: ["review-qualifying-income"],
    };
    for (const code of blockingReasonCodes) {
      const nodeId = `gap:${code.toLowerCase()}`;
      gapNodeIds.add(nodeId);
      addNode({
        id: nodeId,
        kind: "gap",
        label: code.toLowerCase().replaceAll("_", " "),
        description: input.headline,
        state: "blocking",
        record: {
          kind: "response-record",
          collection: "answer.reasonCodes",
          key: "value",
          value: code,
        },
      });
      addEdge(rootNodeId, "blocked-by", nodeId, "This named boundary prevents reliance on a determined result.");
      if (code === "AS_OF_DATE_BEFORE_RULESET" || code === "AS_OF_DATE_IN_FUTURE") {
        const asOfFactNodeId = ensureFact("asOfDate");
        if (asOfFactNodeId) {
          addEdge(nodeId, "uses-fact", asOfFactNodeId, "The selected as-of date creates this support boundary.");
        }
      }
      if (code === "SOURCE_REVIEW_OVERDUE") {
        for (const source of input.sources.filter((item) => item.reviewDueOn < input.evaluatedOn)) {
          addEdge(nodeId, "supported-by", addSource(source.id), "This source was past its declared review date when evaluated.");
        }
      }
      for (const actionId of addressingActions[code] ?? []) {
        const actionNodeId = actionRouteIds.get(actionId);
        if (actionNodeId) {
          addEdge(nodeId, "addressed-by", actionNodeId, "This named next action addresses the specific boundary.");
        }
      }
    }
  }

  if (
    input.reasonCodes.includes("HMRC_APPROVED_OTHER_2026_27_EXEMPTION")
    || (input.reasonCodes.includes("RETURN_EVIDENCE_TEMPORARY_EXEMPTION")
      && Array.isArray(input.returnIndicators)
      && input.returnIndicators.includes("sa109-residence"))
  ) {
    const nodeId = "gap:exact-exemption-provision";
    gapNodeIds.add(nodeId);
    addNode({
      id: nodeId,
      kind: "gap",
      label: "Exact exemption provision not selected",
      description: "The supplied approval or return-page indicator supports the operational result, but this bounded request does not contain enough detail to select one narrower statutory condition.",
      state: "not-mapped",
      record: null,
    });
    addEdge(rootNodeId, "limited-by", nodeId, "The result does not pretend a narrower statutory basis than the supplied facts prove.");
  }

  const correctionRouteId = "route:taxsorted-correction";
  addNode({
    id: correctionRouteId,
    kind: "route",
    label: "Challenge or correct TaxSorted's explanation",
    description: "This public GitHub tracker corrects TaxSorted's analysis; it is not a statutory review, tax appeal or private intake. A GitHub account is required. Never paste financial, identity, safety-sensitive or confidential client material there.",
    state: "available",
    record: {
      kind: "external-resource",
      href: "https://github.com/cambridgetcg/taxsorted.io/issues",
    },
  });
  addEdge(rootNodeId, "reviewable-through", correctionRouteId, "TaxSorted's own explanation can be challenged through its public correction route.");
  addEdge(correctionRouteId, "handled-by", institution("taxsorted"), "TaxSorted handles corrections to its own analysis.");

  const officialRouteGapId = "gap:official-enforcement-and-review-route";
  gapNodeIds.add(officialRouteGapId);
  addNode({
    id: officialRouteGapId,
    kind: "gap",
    label: "Exact enforcement and official challenge route not mapped",
    description: "Use the actual notice, decision type, date and jurisdiction before relying on any review, appeal, collection or enforcement route. A TaxSorted classification itself is not appealable to HMRC or a tribunal.",
    state: "not-mapped",
    record: {
      kind: "dataset-record",
      dataset: "uk-tax-system",
      collection: "pipelineStages",
      recordId: "stage-review-and-appeal",
      href: "/v1/tax-system/uk/pipeline/stage-review-and-appeal",
    },
  });
  addEdge(rootNodeId, "limited-by", officialRouteGapId, "No official review or appeal edge is asserted without an actual reviewable decision.");

  const graph = canonicaliseWhyGraph({
    schema: "taxsorted.why-graph/1",
    rootNodeId,
    context: {
      subject: {
        id: "uk.mtd-income-tax.readiness",
        type: "assessment",
        version: input.capabilityVersion,
      },
      jurisdiction: "United Kingdom",
      effectiveDate: input.effectiveDate,
      evaluatedOn: input.evaluatedOn,
      knowledgeAsOf: input.knowledgeAsOf,
      authority: "taxsorted-analysis",
      effect: "advisory",
      externalStateChange: false,
    },
    valueHandling: {
      factValues: "case-financial-and-identity-fact-values-not-copied-into-graph",
      nodeIds: "semantic-identifiers-without-fact-values-or-array-positions",
    },
    ordering: {
      nodes: "id-ascii-ascending",
      edges: "id-ascii-ascending",
      setValues: "unique-ascii-ascending",
    },
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    coverage: {
      scope: "The reached decision trace for this MTD Income Tax readiness assessment; not a complete map of tax law, enforcement, review or appeal.",
      completeWithinDeclaredScope: gapNodeIds.size === 0,
      gapNodeIds: [...gapNodeIds].sort(ascii),
      boundaries: [
        "Cross-dataset institution links point to the current reviewed tax-system graph, not an immutable historical snapshot.",
        "Fact nodes reference response records by stable selector; supplied case financial and identity fact values are not copied into graph text or IDs.",
        "HMRC guidance remains an official position or explanation; only mapped statutory provisions are labelled legal authority.",
        "Missing evidence or route coverage is a gap, not proof that a right, duty or event does not exist.",
        "The relevant person holds mapped duties; the calling workspace is not presumed to be that person or an authorised agent, and the actual performer and authority to act remain unestablished.",
        "The public GitHub correction tracker requires an account and is not suitable for financial, identity, safety-sensitive or confidential client material.",
        "TaxSorted performs an advisory classification and creates no filing, payment, exemption, review or appeal state.",
      ],
    },
  });

  assertWhyGraphInvariants(graph);
  return {
    graph,
    ruleIds: [...includedRuleIds]
      .filter((ruleId) => decisiveRules.has(ruleId))
      .sort(ascii),
    steps: selectedSteps,
  };
}
