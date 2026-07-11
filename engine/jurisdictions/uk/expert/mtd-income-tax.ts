import { configFor, penaltyPosition, quartersFor, type Pence } from "../itsa";
import {
  assertTaxAnswerInvariants,
  type EvidenceClaim,
  type ReasoningStep,
  type TaxAnswer,
  type TaxAnswerStatus,
  type TaxFact,
  type TaxNextAction,
  type TaxSource,
  type UnknownTaxFact,
} from "./contract";

export type KnownAnswer = boolean | "unknown";
export type KnownPence = Pence | "unknown";
export type MtdIncomeBasis = "submitted-return" | "working-estimate" | "unknown";
export type MtdUpdatePeriod = "standard" | "calendar" | "unknown";
export type MtdResidence = "uk-resident" | "non-uk-resident" | "unknown";
export type MtdRelevantReturnPosition =
  | "required-and-submitted"
  | "required-not-submitted"
  | "not-required"
  | "unknown";
export type MtdDigitalExclusionStatus =
  | "hmrc-approved"
  | "application-pending"
  | "not-approved-or-pending"
  | "unknown";
export type MtdOtherExemptionApplicationStatus =
  | "hmrc-approved-for-2026-27"
  | "application-pending"
  | "none"
  | "not-checked"
  | "unknown";
export type MtdReturnIndicator =
  | "sa103l-lloyds"
  | "incapable-with-legal-representative"
  | "sa103-averaging-relief"
  | "qualifying-care-relief"
  | "sa107-trusts-or-estates"
  | "sa109-residence"
  | "sa102m-minister-of-religion"
  | "married-couples-allowance"
  | "blind-persons-allowance";

export interface MtdIncomeRow {
  basis: MtdIncomeBasis;
  residence: MtdResidence;
  /** Gross self-employment income included, or required to be included, in the UK return. */
  selfEmploymentGrossPence: KnownPence;
  ukPropertyGrossPence: KnownPence;
  foreignPropertyGrossPence: KnownPence;
}

export interface MtdIncomeTaxExpertRequest {
  schema: "taxsorted.uk.mtd-income-tax.request/1";
  /** The date whose MTD position is being assessed. Source freshness is checked separately. */
  asOfDate: string;
  person: {
    /** Regulation 5 tests the duty to deliver, not whether a required return was actually filed. */
    relevantReturnPosition: MtdRelevantReturnPosition;
    hadNationalInsuranceNumberAtStartOf2026To27: KnownAnswer;
  };
  income: {
    taxYears: {
      "2024-25": MtdIncomeRow;
      "2025-26": MtdIncomeRow;
      "2026-27": MtdIncomeRow;
    };
    /** Regulation 5 entry fact for an activity represented on the required 2024/25 return. */
    atLeastOneRelevantReturnActivityContinuedAtEntry: KnownAnswer;
    /** Exact final cessation date for those entry activities, or that at least one still continues. */
    lastRelevantActivityCessationDate: string | "at-least-one-continues" | "unknown";
    relevantReturnWasAmended: KnownAnswer;
    annualisationOrOtherSpecialRulesMayApply: KnownAnswer;
  };
  exemption: {
    /** Concrete pages, claims or circumstances shown on the relevant return; [] means checked, none. */
    returnIndicators: MtdReturnIndicator[] | "not-checked" | "unknown";
    digitalExclusion: MtdDigitalExclusionStatus;
    /** Other HMRC application covering 2026/27, including expected future-return indicators. */
    otherExemptionApplication: MtdOtherExemptionApplicationStatus;
  };
  reporting: { updatePeriod: MtdUpdatePeriod };
}

export interface MtdAssessmentOptions {
  /** Trusted evaluation date. API callers cannot set this through request JSON. */
  evaluatedOn?: string;
}

export type MtdPhaseAssessment =
  | "above-threshold"
  | "at-or-below-threshold"
  | "forecast-above-threshold"
  | "forecast-at-or-below-threshold"
  | "unknown";

export interface MtdThresholdPhase {
  incomeTaxYear: "2024-25" | "2025-26" | "2026-27";
  mandatedFrom: string;
  thresholdPence: Pence;
  qualifyingIncomePence: Pence | null;
  basis: MtdIncomeBasis;
  residence: MtdResidence;
  assessment: MtdPhaseAssessment;
}

export type MtdExpertDecision =
  | "in_scope"
  | "out_of_scope"
  | "exempt"
  | "exemption_possible"
  | "hmrc_decision_needed"
  | "insufficient_facts"
  | "professional_review_needed"
  | "source_review_required"
  | "outside_supported_date";

export interface MtdObligation {
  id: string;
  title: string;
  dueDate: string | null;
  timing: "active" | "upcoming" | "due-today" | "passed";
  conditional: boolean;
  condition: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  appliesPerBusiness: boolean;
  expectedSubmissions: number | null;
  sourceIds: string[];
}

export interface MtdIncomeTaxDecision {
  decision: MtdExpertDecision;
  headline: string;
  reasonCodes: string[];
  currentPhase: MtdThresholdPhase;
  phases: MtdThresholdPhase[];
  obligations: MtdObligation[];
  penaltyPosition: {
    applies: boolean;
    conditional: boolean;
    quarterlyPenaltyPoints2026To27: false;
    quarterlyUpdatesStillRequired: boolean;
    note: string;
    sourceIds: string[];
  };
  excludedIncomeTypes: string[];
  boundaries: string[];
}

const retrievedOn = "2026-07-11";
const reviewDueOn = "2026-08-11";

export const MTD_INCOME_TAX_SOURCES: readonly TaxSource[] = [
  {
    id: "uksi-2026-336",
    title: "The Income Tax (Digital Obligations) Regulations 2026",
    publisher: "UK Parliament",
    url: "https://www.legislation.gov.uk/uksi/2026/336/pdfs/uksi_20260336_en.pdf",
    kind: "secondary-legislation",
    legalForce: "binding-law",
    status: "in-force",
    citation: "SI 2026/336, regulations 5, 6, 9, 14 and 25 to 27",
    territorialExtent: ["United Kingdom"],
    effectiveFrom: "2026-04-06",
    effectiveTo: null,
    retrievedOn,
    reviewDueOn,
    supports: [
      "Entry depends on being required to deliver the relevant return, not actual filing.",
      "Cessation notice and final quarterly-update rules.",
      "Qualifying-income determination, amendment timing and phased thresholds.",
    ],
    doesNotProve: ["That a person's return facts, residence, exemption evidence or cessation dates are complete."],
  },
  {
    id: "hmrc-mtd-before-you-start",
    title: "Use Making Tax Digital for Income Tax — before you use this guide",
    publisher: "HM Revenue & Customs",
    url: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/before-you-use-this-guide",
    kind: "hmrc-guidance",
    legalForce: "official-explanation",
    status: "in-force",
    territorialExtent: ["United Kingdom"],
    updatedOn: "2026-06-02",
    versionAsAt: "2026-06-02",
    retrievedOn,
    reviewDueOn,
    supports: ["Who needs to use MTD Income Tax, first-year tasks and deadlines."],
    doesNotProve: ["That every exemption or unusual qualifying-income adjustment has been resolved."],
  },
  {
    id: "hmrc-mtd-qualifying-income",
    title: "Work out your qualifying income for Making Tax Digital for Income Tax",
    publisher: "HM Revenue & Customs",
    url: "https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax",
    kind: "hmrc-guidance",
    legalForce: "official-explanation",
    status: "in-force",
    territorialExtent: ["United Kingdom"],
    updatedOn: "2026-01-29",
    versionAsAt: "2026-01-29",
    retrievedOn,
    reviewDueOn,
    supports: [
      "UK residents include UK and foreign property income; non-UK residents generally include UK property and UK-return self-employment income.",
      "Gross-income inclusions, exclusions, annualisation and return-amendment treatment.",
    ],
    doesNotProve: ["The correct residence, annualised amount or special-source treatment in a particular case."],
  },
  {
    id: "hmrc-mtd-exemptions",
    title: "Find out if you can get an exemption from Making Tax Digital for Income Tax",
    publisher: "HM Revenue & Customs",
    url: "https://www.gov.uk/guidance/find-out-if-you-can-get-an-exemption-from-making-tax-digital-for-income-tax",
    kind: "hmrc-guidance",
    legalForce: "official-explanation",
    status: "in-force",
    territorialExtent: ["United Kingdom"],
    updatedOn: "2026-05-28",
    versionAsAt: "2026-05-28",
    retrievedOn,
    reviewDueOn,
    supports: ["Automatic exemptions tied to return evidence and HMRC-decided applications, including expected future-return indicators."],
    doesNotProve: ["That HMRC will approve an application or that a caller classified a return page correctly."],
  },
  {
    id: "hmrc-mtd-quarterly-updates",
    title: "Use Making Tax Digital for Income Tax — send quarterly updates",
    publisher: "HM Revenue & Customs",
    url: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates",
    kind: "hmrc-guidance",
    legalForce: "official-explanation",
    status: "in-force",
    territorialExtent: ["United Kingdom"],
    updatedOn: "2026-06-02",
    versionAsAt: "2026-06-02",
    retrievedOn,
    reviewDueOn,
    supports: ["Cumulative standard and calendar update periods and common deadlines."],
    doesNotProve: ["Which newly started or separately ceased source needs an update without source-level history."],
  },
  {
    id: "hmrc-mtd-circumstances-change",
    title: "Use Making Tax Digital for Income Tax — if your circumstances change",
    publisher: "HM Revenue & Customs",
    url: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/if-your-circumstances-change",
    kind: "hmrc-guidance",
    legalForce: "official-explanation",
    status: "in-force",
    territorialExtent: ["United Kingdom"],
    updatedOn: "2026-06-02",
    versionAsAt: "2026-06-02",
    retrievedOn,
    reviewDueOn,
    supports: ["A ceased source must be notified and receive its final update for the period containing cessation."],
    doesNotProve: ["The cessation date or source inventory supplied by a caller."],
  },
  {
    id: "hmrc-mtd-penalties",
    title: "Penalties for Making Tax Digital for Income Tax",
    publisher: "HM Revenue & Customs",
    url: "https://www.gov.uk/guidance/penalties-for-making-tax-digital-for-income-tax",
    kind: "hmrc-guidance",
    legalForce: "official-explanation",
    status: "in-force",
    territorialExtent: ["United Kingdom"],
    updatedOn: "2026-03-30",
    versionAsAt: "2026-03-30",
    retrievedOn,
    reviewDueOn,
    supports: ["No quarterly-update penalty points in 2026/27, while required updates must still be sent before the return."],
    doesNotProve: ["That a late return, payment or later tax year carries no penalty."],
  },
  {
    id: "hmrc-self-assessment-deadlines",
    title: "Self Assessment tax returns — deadlines",
    publisher: "HM Revenue & Customs",
    url: "https://www.gov.uk/self-assessment-tax-returns/deadlines",
    kind: "hmrc-guidance",
    legalForce: "official-explanation",
    status: "in-force",
    territorialExtent: ["United Kingdom"],
    retrievedOn,
    reviewDueOn,
    supports: ["Normal Self Assessment paper, online and payment deadlines."],
    doesNotProve: ["Which filing channel a particular exempt person will use or whether HMRC issued a different deadline."],
  },
];

const PHASES = configFor("2026-27").mtdThresholds.value;
const MAX_MONEY_PENCE = 1_000_000_000_000;
const TEMPORARY_2026_TO_27_INDICATORS = new Set<MtdReturnIndicator>([
  "sa103-averaging-relief",
  "qualifying-care-relief",
  "sa107-trusts-or-estates",
  "sa109-residence",
]);
const COMPLEX_RETURN_INDICATORS = new Set<MtdReturnIndicator>([
  "sa103l-lloyds",
  "incapable-with-legal-representative",
  "sa102m-minister-of-religion",
  "married-couples-allowance",
  "blind-persons-allowance",
]);

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function assertIsoDate(value: string, path: string): void {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || Number.isNaN(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new RangeError(`${path} must be a real ISO date`);
  }
}

function assertKnownMoney(value: KnownPence, path: string): void {
  if (value === "unknown") return;
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_MONEY_PENCE) {
    throw new RangeError(`${path} must be non-negative integer pence at or below the service limit`);
  }
}

function validateRequest(input: MtdIncomeTaxExpertRequest, evaluatedOn: string): void {
  assertIsoDate(input.asOfDate, "asOfDate");
  assertIsoDate(evaluatedOn, "evaluatedOn");
  for (const [taxYear, row] of Object.entries(input.income.taxYears)) {
    assertKnownMoney(row.selfEmploymentGrossPence, `income.taxYears.${taxYear}.selfEmploymentGrossPence`);
    assertKnownMoney(row.ukPropertyGrossPence, `income.taxYears.${taxYear}.ukPropertyGrossPence`);
    assertKnownMoney(row.foreignPropertyGrossPence, `income.taxYears.${taxYear}.foreignPropertyGrossPence`);
  }
  const cessation = input.income.lastRelevantActivityCessationDate;
  if (cessation !== "unknown" && cessation !== "at-least-one-continues") {
    assertIsoDate(cessation, "income.lastRelevantActivityCessationDate");
    if (cessation > input.asOfDate) {
      throw new RangeError("income.lastRelevantActivityCessationDate cannot be after asOfDate");
    }
  }
  if (Array.isArray(input.exemption.returnIndicators)) {
    if (new Set(input.exemption.returnIndicators).size !== input.exemption.returnIndicators.length) {
      throw new RangeError("exemption.returnIndicators must not contain duplicates");
    }
  }
}

function phaseFor(
  taxYear: "2024-25" | "2025-26" | "2026-27",
  row: MtdIncomeRow,
): MtdThresholdPhase {
  const rule = PHASES.find((phase) => phase.incomeYear === taxYear);
  if (!rule) throw new Error(`Missing MTD threshold phase for ${taxYear}`);
  const selfEmployment = row.selfEmploymentGrossPence;
  const ukProperty = row.ukPropertyGrossPence;
  const foreignProperty = row.foreignPropertyGrossPence;
  let qualifyingIncomePence: Pence | null = null;
  if (
    row.residence === "uk-resident"
    && typeof selfEmployment === "number"
    && typeof ukProperty === "number"
    && typeof foreignProperty === "number"
  ) {
    qualifyingIncomePence = selfEmployment + ukProperty + foreignProperty;
  } else if (
    row.residence === "non-uk-resident"
    && typeof selfEmployment === "number"
    && typeof ukProperty === "number"
  ) {
    qualifyingIncomePence = selfEmployment + ukProperty;
  }
  let assessment: MtdPhaseAssessment = "unknown";
  if (qualifyingIncomePence !== null && row.basis !== "unknown") {
    const above = qualifyingIncomePence > rule.qualifyingIncomeOver;
    assessment = row.basis === "submitted-return"
      ? (above ? "above-threshold" : "at-or-below-threshold")
      : (above ? "forecast-above-threshold" : "forecast-at-or-below-threshold");
  }
  return {
    incomeTaxYear: taxYear,
    mandatedFrom: rule.mandatedFrom,
    thresholdPence: rule.qualifyingIncomeOver,
    qualifyingIncomePence,
    basis: row.basis,
    residence: row.residence,
    assessment,
  };
}

function timingFor(asOfDate: string, dueDate: string): MtdObligation["timing"] {
  if (asOfDate === dueDate) return "due-today";
  return asOfDate < dueDate ? "upcoming" : "passed";
}

function cessationInCurrentYear(input: MtdIncomeTaxExpertRequest): string | null {
  const value = input.income.lastRelevantActivityCessationDate;
  return typeof value === "string"
    && value !== "unknown"
    && value !== "at-least-one-continues"
    && value >= "2026-04-06"
    && value <= "2027-04-05"
    ? value
    : null;
}

function obligationsFor(
  input: MtdIncomeTaxExpertRequest,
  digitalConditional: boolean,
  includeDigital: boolean,
  annualMode: "mtd" | "normal-self-assessment" | "conditional",
): MtdObligation[] {
  const election = input.reporting.updatePeriod === "calendar" ? "calendar" : "standard";
  const periodsKnown = input.reporting.updatePeriod !== "unknown";
  const allQuarters = quartersFor("2026-27", election);
  const cessationDate = cessationInCurrentYear(input);
  let quarters = allQuarters;
  let calendarBoundaryCessation = false;
  if (cessationDate !== null) {
    const finalIndex = allQuarters.findIndex((quarter) => quarter.periodEnd >= cessationDate);
    calendarBoundaryCessation = finalIndex === -1;
    quarters = calendarBoundaryCessation ? allQuarters : allQuarters.slice(0, finalIndex + 1);
  }
  const recordStart = periodsKnown ? (election === "calendar" ? "2026-04-01" : "2026-04-06") : null;
  const obligations: MtdObligation[] = [];
  if (includeDigital) {
    obligations.push({
      id: "keep-digital-records",
      title: cessationDate ? "Keep digital records through the final source cessation" : "Keep digital records in compatible software",
      dueDate: recordStart,
      timing: recordStart === null || input.asOfDate >= recordStart ? "active" : "upcoming",
      conditional: digitalConditional,
      condition: digitalConditional ? "if no exemption applies" : null,
      periodStart: recordStart,
      periodEnd: cessationDate,
      appliesPerBusiness: true,
      expectedSubmissions: null,
      sourceIds: ["uksi-2026-336", "hmrc-mtd-before-you-start"],
    });
    obligations.push(...quarters.map((quarter, index) => {
      const isFinal = cessationDate !== null && !calendarBoundaryCessation && index === quarters.length - 1;
      return {
        id: `quarterly-update-${quarter.index}`,
        title: isFinal
          ? `Send final cumulative quarterly update ${quarter.index} after cessation`
          : `Send cumulative quarterly update ${quarter.index}`,
        dueDate: quarter.deadline,
        timing: timingFor(input.asOfDate, quarter.deadline),
        conditional: digitalConditional,
        condition: digitalConditional ? "if no exemption applies" : null,
        periodStart: periodsKnown ? quarter.cumulativeStart : null,
        periodEnd: isFinal ? cessationDate : periodsKnown ? quarter.periodEnd : null,
        appliesPerBusiness: true,
        expectedSubmissions: null,
        sourceIds: cessationDate
          ? ["uksi-2026-336", "hmrc-mtd-quarterly-updates", "hmrc-mtd-circumstances-change"]
          : ["uksi-2026-336", "hmrc-mtd-quarterly-updates"],
      } satisfies MtdObligation;
    }));
  }
  if (includeDigital && calendarBoundaryCessation && cessationDate !== null) {
    obligations.push({
      id: "calendar-boundary-final-update",
      title: "Send the final update covering 1 April through cessation — exact deadline needs review",
      dueDate: null,
      timing: "active",
      conditional: digitalConditional,
      condition: digitalConditional ? "if no exemption applies" : null,
      periodStart: "2027-04-01",
      periodEnd: cessationDate,
      appliesPerBusiness: true,
      expectedSubmissions: null,
      sourceIds: ["uksi-2026-336", "hmrc-mtd-circumstances-change"],
    });
  }
  if (includeDigital && cessationDate !== null) {
    const finalQuarter = quarters.at(-1);
    obligations.push({
      id: "notify-hmrc-of-cessation",
      title: calendarBoundaryCessation
        ? "Tell HMRC each relevant-activity cessation — the final date's exact deadline needs review"
        : "Tell HMRC each relevant-activity cessation — the final date is mapped here",
      dueDate: calendarBoundaryCessation ? null : finalQuarter?.deadline ?? null,
      timing: calendarBoundaryCessation ? "active" : finalQuarter ? timingFor(input.asOfDate, finalQuarter.deadline) : "active",
      conditional: digitalConditional,
      condition: digitalConditional ? "if no exemption applies" : null,
      periodStart: cessationDate,
      periodEnd: cessationDate,
      appliesPerBusiness: true,
      expectedSubmissions: null,
      sourceIds: ["uksi-2026-336", "hmrc-mtd-circumstances-change"],
    });
  }
  if (annualMode === "mtd" || annualMode === "conditional") {
    obligations.push({
      id: "submit-mtd-tax-return",
      title: "Submit the 2026/27 tax return using compatible MTD software",
      dueDate: "2028-01-31",
      timing: timingFor(input.asOfDate, "2028-01-31"),
      conditional: annualMode === "conditional",
      condition: annualMode === "conditional" ? "if no exemption applies" : null,
      periodStart: "2026-04-06",
      periodEnd: "2027-04-05",
      appliesPerBusiness: false,
      expectedSubmissions: 1,
      sourceIds: ["hmrc-mtd-before-you-start", ...(cessationDate ? ["hmrc-mtd-circumstances-change"] : [])],
    });
  }
  if (annualMode === "normal-self-assessment" || annualMode === "conditional") {
    obligations.push(
      {
        id: "submit-paper-self-assessment-return",
        title: "Submit the 2026/27 paper Self Assessment return",
        dueDate: "2027-10-31",
        timing: timingFor(input.asOfDate, "2027-10-31"),
        conditional: true,
        condition: annualMode === "conditional"
          ? "if an exemption applies and you choose paper filing"
          : "if you choose paper filing",
        periodStart: "2026-04-06",
        periodEnd: "2027-04-05",
        appliesPerBusiness: false,
        expectedSubmissions: 1,
        sourceIds: ["hmrc-self-assessment-deadlines"],
      },
      {
        id: "submit-online-self-assessment-return",
        title: "Submit the 2026/27 online Self Assessment return",
        dueDate: "2028-01-31",
        timing: timingFor(input.asOfDate, "2028-01-31"),
        conditional: true,
        condition: annualMode === "conditional"
          ? "if an exemption applies and you choose online filing"
          : "if you choose online filing",
        periodStart: "2026-04-06",
        periodEnd: "2027-04-05",
        appliesPerBusiness: false,
        expectedSubmissions: 1,
        sourceIds: ["hmrc-self-assessment-deadlines"],
      },
    );
  }
  obligations.push({
    id: "pay-self-assessment-tax",
    title: "Pay the 2026/27 Self Assessment tax due",
    dueDate: "2028-01-31",
    timing: timingFor(input.asOfDate, "2028-01-31"),
    conditional: false,
    condition: null,
    periodStart: "2026-04-06",
    periodEnd: "2027-04-05",
    appliesPerBusiness: false,
    expectedSubmissions: 1,
    sourceIds: ["hmrc-self-assessment-deadlines"],
  });
  return obligations;
}

function fact(path: string, label: string, value: string | number | boolean, material: boolean): TaxFact {
  return { path, label, value, material };
}

function unknown(path: string, label: string, whyItMatters: string, material: boolean): UnknownTaxFact {
  return { path, label, whyItMatters, material };
}

interface DecisionWork {
  decision: MtdExpertDecision;
  status: TaxAnswerStatus;
  headline: string;
  reasonCodes: string[];
  materialPaths: Set<string>;
  escalationRequired: boolean;
}

function decision(
  decisionValue: MtdExpertDecision,
  status: TaxAnswerStatus,
  headline: string,
  reasonCodes: string[],
  materialPaths: Set<string>,
  escalationRequired: boolean,
): DecisionWork {
  return { decision: decisionValue, status, headline, reasonCodes, materialPaths, escalationRequired };
}

function decide(
  input: MtdIncomeTaxExpertRequest,
  currentPhase: MtdThresholdPhase,
  evaluatedOn: string,
): DecisionWork {
  const materialPaths = new Set<string>();
  if (input.asOfDate < "2026-04-06") {
    return decision("outside_supported_date", "unsupported", "This expert path starts with the rules in force from 6 April 2026.", ["AS_OF_DATE_BEFORE_RULESET"], materialPaths, false);
  }
  if (input.asOfDate > evaluatedOn) {
    return decision("outside_supported_date", "unsupported", "This expert path does not make a future-effective determination. Use today or an earlier date.", ["AS_OF_DATE_IN_FUTURE"], materialPaths, false);
  }
  if (MTD_INCOME_TAX_SOURCES.some((source) => source.reviewDueOn < evaluatedOn)) {
    return decision("source_review_required", "needs_professional_review", "The admitted source set needs a fresh review before this answer can be relied on.", ["SOURCE_REVIEW_OVERDUE"], materialPaths, true);
  }

  const returnPosition = input.person.relevantReturnPosition;
  if (returnPosition === "unknown") {
    materialPaths.add("person.relevantReturnPosition");
    return decision("insufficient_facts", "needs_facts", "Confirm whether you were required to deliver the 2024/25 return containing the relevant business or property information.", ["RELEVANT_RETURN_DUTY_UNKNOWN"], materialPaths, true);
  }
  if (returnPosition === "not-required") {
    return decision("out_of_scope", "determined", "The April 2026 entry condition is not met because no 2024/25 return containing the relevant activity was required.", ["RELEVANT_RETURN_NOT_REQUIRED"], materialPaths, false);
  }
  if (returnPosition === "required-not-submitted") {
    return decision("professional_review_needed", "needs_professional_review", "A required but unsubmitted return does not remove MTD; file or correct the return position before relying on a threshold result.", ["REQUIRED_RETURN_NOT_SUBMITTED"], materialPaths, true);
  }

  const cessation = input.income.lastRelevantActivityCessationDate;
  const continuedAtEntry = input.income.atLeastOneRelevantReturnActivityContinuedAtEntry;
  if (continuedAtEntry === "unknown") {
    materialPaths.add("income.atLeastOneRelevantReturnActivityContinuedAtEntry");
    return decision("insufficient_facts", "needs_facts", "Confirm whether at least one activity represented on the required 2024/25 return continued immediately before 6 April 2026.", ["RELEVANT_ACTIVITY_AT_ENTRY_UNKNOWN"], materialPaths, true);
  }
  if (continuedAtEntry === false) {
    if (
      cessation === "at-least-one-continues"
      || (cessation !== "unknown" && cessation >= "2026-04-06")
    ) {
      return decision("professional_review_needed", "needs_professional_review", "The supplied entry-continuation and cessation facts conflict. A new source cannot stand in for an activity represented on the 2024/25 return.", ["ENTRY_CESSATION_FACT_CONFLICT"], materialPaths, true);
    }
    return decision("out_of_scope", "determined", "No activity represented on the required 2024/25 return continued immediately before 6 April 2026. A different new source follows its own later entry timing.", ["NO_RELEVANT_RETURN_ACTIVITY_AT_ENTRY"], materialPaths, false);
  }

  if (typeof cessation === "string" && cessation !== "unknown" && cessation !== "at-least-one-continues" && cessation < "2026-04-06") {
    return decision("professional_review_needed", "needs_professional_review", "The supplied entry-continuation fact conflicts with a final relevant-activity cessation before 6 April 2026.", ["ENTRY_CESSATION_FACT_CONFLICT"], materialPaths, true);
  }

  const currentRow = input.income.taxYears["2024-25"];
  if (currentPhase.assessment === "unknown" || currentPhase.basis !== "submitted-return") {
    if (currentRow.residence === "unknown") materialPaths.add("income.taxYears.2024-25.residence");
    if (currentRow.selfEmploymentGrossPence === "unknown") materialPaths.add("income.taxYears.2024-25.selfEmploymentGrossPence");
    if (currentRow.ukPropertyGrossPence === "unknown") materialPaths.add("income.taxYears.2024-25.ukPropertyGrossPence");
    if (currentRow.residence === "uk-resident" && currentRow.foreignPropertyGrossPence === "unknown") {
      materialPaths.add("income.taxYears.2024-25.foreignPropertyGrossPence");
    }
    if (currentRow.basis !== "submitted-return") materialPaths.add("income.taxYears.2024-25.basis");
    return decision("insufficient_facts", "needs_facts", "Use the required 2024/25 return figures and period-specific residence so every included gross amount is explicit.", ["QUALIFYING_INCOME_INCOMPLETE"], materialPaths, true);
  }

  if (input.income.relevantReturnWasAmended === "unknown") {
    materialPaths.add("income.relevantReturnWasAmended");
    return decision("insufficient_facts", "needs_facts", "Confirm whether the 2024/25 return was amended; amendment timing can change which threshold figure is used.", ["RETURN_AMENDMENT_STATUS_UNKNOWN"], materialPaths, true);
  }
  if (input.income.relevantReturnWasAmended) {
    return decision("professional_review_needed", "needs_professional_review", "A 2024/25 return amendment needs its date, direction and original figure checked before this path can classify the April 2026 phase.", ["RETURN_AMENDMENT_REVIEW"], materialPaths, true);
  }
  if (input.income.annualisationOrOtherSpecialRulesMayApply === "unknown") {
    materialPaths.add("income.annualisationOrOtherSpecialRulesMayApply");
    return decision("insufficient_facts", "needs_facts", "Confirm whether annualisation or another special qualifying-income rule could change the return figure.", ["SPECIAL_QUALIFYING_INCOME_RULE_UNKNOWN"], materialPaths, true);
  }
  if (input.income.annualisationOrOtherSpecialRulesMayApply) {
    return decision("professional_review_needed", "needs_professional_review", "Annualisation or another special qualifying-income rule may change the amount HMRC uses.", ["SPECIAL_QUALIFYING_INCOME_RULE"], materialPaths, true);
  }
  if (currentPhase.assessment === "at-or-below-threshold") {
    return decision("out_of_scope", "determined", "Your admitted 2024/25 qualifying income is not over £50,000, so the April 2026 phase is not triggered.", ["CURRENT_PHASE_THRESHOLD_NOT_EXCEEDED"], materialPaths, false);
  }
  if (cessation === "unknown") {
    materialPaths.add("income.lastRelevantActivityCessationDate");
    return decision("insufficient_facts", "needs_facts", "The threshold is crossed; say whether an entry activity still continues or give the exact date the final one ceased.", ["CESSATION_POSITION_UNKNOWN"], materialPaths, true);
  }

  const indicators = input.exemption.returnIndicators;
  const indicatorList = Array.isArray(indicators) ? indicators : [];
  if (input.exemption.digitalExclusion === "hmrc-approved") {
    return decision("exempt", "determined", "HMRC-approved digital exclusion removes the MTD software obligations while Self Assessment continues.", ["HMRC_APPROVED_DIGITAL_EXCLUSION"], materialPaths, false);
  }
  if (input.exemption.otherExemptionApplication === "hmrc-approved-for-2026-27") {
    return decision("exempt", "determined", "HMRC has approved another exemption covering 2026/27; later phases and Self Assessment still need checking.", ["HMRC_APPROVED_OTHER_2026_27_EXEMPTION"], materialPaths, false);
  }
  if (indicatorList.some((item) => TEMPORARY_2026_TO_27_INDICATORS.has(item))) {
    return decision("exempt", "determined", "The supplied 2024/25 return evidence gives an automatic exemption for 2026/27; later phases still need checking.", ["RETURN_EVIDENCE_TEMPORARY_EXEMPTION"], materialPaths, false);
  }
  if (input.person.hadNationalInsuranceNumberAtStartOf2026To27 === false) {
    return decision("exempt", "determined", "No National Insurance number before the tax year began gives an automatic 2026/27 exemption; Self Assessment still continues.", ["NO_NINO_AT_TAX_YEAR_START"], materialPaths, false);
  }
  if (indicatorList.some((item) => COMPLEX_RETURN_INDICATORS.has(item))) {
    return decision("professional_review_needed", "needs_professional_review", "The return contains an exemption indicator whose duration or activity-level effect is outside this first deep path.", ["COMPLEX_RETURN_EXEMPTION_INDICATOR"], materialPaths, true);
  }
  if (input.person.hadNationalInsuranceNumberAtStartOf2026To27 === "unknown") {
    materialPaths.add("person.hadNationalInsuranceNumberAtStartOf2026To27");
    return decision("insufficient_facts", "needs_facts", "Confirm whether you had a National Insurance number before 2026/27 began.", ["NINO_STATUS_UNKNOWN"], materialPaths, true);
  }
  if (
    input.exemption.digitalExclusion === "application-pending"
    || input.exemption.otherExemptionApplication === "application-pending"
  ) {
    return decision("hmrc_decision_needed", "needs_professional_review", "The threshold is crossed, but HMRC must decide a pending exemption application.", ["EXEMPTION_APPLICATION_PENDING"], materialPaths, true);
  }
  if (indicators === "not-checked" || indicators === "unknown") {
    materialPaths.add("exemption.returnIndicators");
    return decision("exemption_possible", "needs_facts", "The threshold is crossed; compare the actual claims and supplementary pages on the 2024/25 return with HMRC's current list.", ["RETURN_EXEMPTION_EVIDENCE_NOT_CHECKED"], materialPaths, true);
  }
  if (input.exemption.digitalExclusion === "unknown") {
    materialPaths.add("exemption.digitalExclusion");
    return decision("exemption_possible", "needs_facts", "Confirm whether HMRC has approved, or is considering, a digital-exclusion application.", ["DIGITAL_EXCLUSION_STATUS_UNKNOWN"], materialPaths, true);
  }
  if (input.exemption.otherExemptionApplication === "not-checked" || input.exemption.otherExemptionApplication === "unknown") {
    materialPaths.add("exemption.otherExemptionApplication");
    return decision("exemption_possible", "needs_facts", "Confirm whether another HMRC exemption application covers 2026/27, including one based on a claim or page expected on a later return.", ["OTHER_EXEMPTION_APPLICATION_NOT_CHECKED"], materialPaths, true);
  }
  if (cessationInCurrentYear(input) && input.reporting.updatePeriod === "unknown") {
    materialPaths.add("reporting.updatePeriod");
    return decision("insufficient_facts", "needs_facts", "The final source ceased during 2026/27; standard or calendar periods decide the exact final update deadline.", ["CESSATION_UPDATE_PERIOD_UNKNOWN"], materialPaths, true);
  }
  if (
    input.reporting.updatePeriod === "calendar"
    && cessationInCurrentYear(input) !== null
    && cessationInCurrentYear(input)! >= "2027-04-01"
  ) {
    return decision("professional_review_needed", "needs_professional_review", "A calendar-period cessation from 1 to 5 April crosses the quarterly-period boundary. All four 2026/27 updates remain visible, but the final short-period update and notice deadline need review.", ["CALENDAR_CESSATION_YEAR_BOUNDARY"], materialPaths, true);
  }
  if (currentRow.residence === "non-uk-resident" && !indicatorList.includes("sa109-residence")) {
    return decision("professional_review_needed", "needs_professional_review", "The non-UK residence fact conflicts with the absence of SA109 return evidence; review the return and residence position.", ["NON_RESIDENCE_RETURN_EVIDENCE_CONFLICT"], materialPaths, true);
  }
  return decision(
    "in_scope",
    "determined",
    cessationInCurrentYear(input)
      ? "MTD Income Tax applied from 6 April 2026 until the final source ceased; the cessation notice, final update and annual return remain due."
      : "MTD Income Tax applies from 6 April 2026 on the supplied facts.",
    cessationInCurrentYear(input)
      ? ["CURRENT_PHASE_THRESHOLD_EXCEEDED", "NO_EXEMPTION_IDENTIFIED", "MID_YEAR_CESSATION"]
      : ["CURRENT_PHASE_THRESHOLD_EXCEEDED", "NO_EXEMPTION_IDENTIFIED"],
    materialPaths,
    false,
  );
}

function nextActionsFor(work: DecisionWork, input: MtdIncomeTaxExpertRequest): TaxNextAction[] {
  const actions: TaxNextAction[] = [];
  if (["in_scope", "exemption_possible", "hmrc_decision_needed"].includes(work.decision)) {
    actions.push({
      id: "get-ready",
      label: "Follow HMRC's sole trader and landlord MTD Income Tax steps",
      href: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/before-you-use-this-guide",
      responsibleParty: "caller",
    });
  }
  if (["exemption_possible", "hmrc_decision_needed", "exempt"].includes(work.decision)
    || work.reasonCodes.includes("COMPLEX_RETURN_EXEMPTION_INDICATOR")) {
    actions.push({
      id: "check-exemptions",
      label: "Check the actual return pages and current HMRC exemption route",
      href: "https://www.gov.uk/guidance/find-out-if-you-can-get-an-exemption-from-making-tax-digital-for-income-tax",
      responsibleParty: work.decision === "hmrc_decision_needed" ? "HMRC" : "caller",
    });
  }
  if (work.reasonCodes.includes("REQUIRED_RETURN_NOT_SUBMITTED")) {
    actions.push({
      id: "resolve-unsubmitted-return",
      label: "Resolve the required 2024/25 Self Assessment return; non-filing does not remove MTD",
      href: "https://www.gov.uk/self-assessment-tax-returns/sending-return",
      responsibleParty: "qualified-adviser",
    });
  }
  if (work.decision === "professional_review_needed"
    && !work.reasonCodes.includes("REQUIRED_RETURN_NOT_SUBMITTED")
    && !work.reasonCodes.includes("COMPLEX_RETURN_EXEMPTION_INDICATOR")
    && !work.reasonCodes.includes("CALENDAR_CESSATION_YEAR_BOUNDARY")) {
    actions.push({
      id: "review-qualifying-income",
      label: "Have the named return, residence or special-rule facts checked before relying on the result",
      href: "https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax",
      responsibleParty: "qualified-adviser",
    });
  }
  if (work.reasonCodes.includes("CALENDAR_CESSATION_YEAR_BOUNDARY")) {
    actions.push({
      id: "review-calendar-boundary-cessation",
      label: "Confirm the final short-period update and notice deadline for the 1 to 5 April cessation",
      href: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/if-your-circumstances-change",
      responsibleParty: "qualified-adviser",
    });
  }
  if (work.decision === "source_review_required") {
    actions.push({ id: "refresh-sources", label: "Refresh and re-admit the official MTD source set", responsibleParty: "TaxSorted" });
  }
  if (work.decision === "out_of_scope") {
    actions.push({
      id: "monitor-later-phases",
      label: "Keep the later £30,000 and £20,000 phases visible",
      href: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/before-you-use-this-guide",
      responsibleParty: "caller",
    });
  }
  if (cessationInCurrentYear(input) !== null && work.decision === "in_scope") {
    actions.push({
      id: "report-cessation",
      label: "Tell HMRC the cessation date and complete the final update for its period",
      href: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/if-your-circumstances-change",
      responsibleParty: "caller",
    });
  }
  if (work.status === "needs_facts") {
    actions.push({ id: "supply-facts", label: "Supply only the named missing facts and run the check again", responsibleParty: "caller" });
  }
  return actions;
}

function buildClaims(currentPhase: MtdThresholdPhase): EvidenceClaim[] {
  return [
    {
      id: "mtd-entry-law",
      statement: "First-cohort entry turns on carrying on the activity and being required to deliver the relevant 2024/25 return; actual filing is not the entry test.",
      kind: "law",
      support: "direct",
      sourceIds: ["uksi-2026-336"],
    },
    {
      id: "mtd-thresholds-law",
      statement: "Digital obligations are phased using the £50,000, £30,000 and £20,000 qualifying-income thresholds.",
      kind: "law",
      support: "direct",
      sourceIds: ["uksi-2026-336"],
    },
    {
      id: "mtd-income-residence",
      statement: "Qualifying income uses gross UK-return self-employment and property income; UK residents include foreign property, while non-UK residents generally do not.",
      kind: "hmrc-position",
      support: "direct",
      sourceIds: ["hmrc-mtd-qualifying-income"],
    },
    {
      id: "mtd-current-threshold-calculation",
      statement: currentPhase.qualifyingIncomePence === null
        ? "The 2024/25 total cannot be derived because an included amount or residence is unknown."
        : `The supplied 2024/25 included gross amounts total ${currentPhase.qualifyingIncomePence} pence.`,
      kind: "calculation",
      support: "derived",
      sourceIds: [],
    },
    {
      id: "mtd-amendments",
      statement: "Return amendments can affect qualifying income, but a post-start amendment increasing income over the threshold is not used to mandate that already-started year.",
      kind: "law",
      support: "direct",
      sourceIds: ["uksi-2026-336"],
    },
    {
      id: "mtd-exemptions-position",
      statement: "Some return claims or pages and absence of a National Insurance number create automatic exemptions; HMRC decides digital-exclusion applications.",
      kind: "hmrc-position",
      support: "direct",
      sourceIds: ["hmrc-mtd-exemptions"],
    },
    {
      id: "mtd-cessation-law",
      statement: "A cessation during a digital-obligation year requires notice and a final quarterly update for the period containing cessation; later periods for that activity stop.",
      kind: "law",
      support: "direct",
      sourceIds: ["uksi-2026-336"],
    },
    {
      id: "mtd-quarterly-obligations",
      statement: "An in-scope person keeps digital records and sends cumulative quarterly updates for each activity by the published deadlines.",
      kind: "hmrc-position",
      support: "direct",
      sourceIds: ["hmrc-mtd-before-you-start", "hmrc-mtd-quarterly-updates", "hmrc-mtd-circumstances-change"],
    },
    {
      id: "mtd-2026-27-penalty-position",
      statement: "There are no penalty points for missing a 2026/27 quarterly-update deadline, but required updates remain due before the return can be submitted.",
      kind: "hmrc-position",
      support: "direct",
      sourceIds: ["hmrc-mtd-penalties"],
    },
    {
      id: "self-assessment-deadlines",
      statement: "An MTD exemption does not remove Self Assessment; normal paper and online filing deadlines differ, while payment is due by 31 January.",
      kind: "hmrc-position",
      support: "direct",
      sourceIds: ["hmrc-mtd-exemptions", "hmrc-self-assessment-deadlines"],
    },
  ];
}

export function assessMtdIncomeTax(
  input: MtdIncomeTaxExpertRequest,
  options: MtdAssessmentOptions = {},
): TaxAnswer<MtdIncomeTaxDecision> {
  const evaluatedOn = options.evaluatedOn ?? todayUtc();
  validateRequest(input, evaluatedOn);
  const taxYears = ["2024-25", "2025-26", "2026-27"] as const;
  const phases = taxYears.map((taxYear) => phaseFor(taxYear, input.income.taxYears[taxYear]));
  const currentPhase = phases[0];
  const work = decide(input, currentPhase, evaluatedOn);
  const digitalObligationsConditional = work.decision === "exemption_possible" || work.decision === "hmrc_decision_needed";
  const showDigitalObligations = work.decision === "in_scope"
    || digitalObligationsConditional
    || work.reasonCodes.includes("CALENDAR_CESSATION_YEAR_BOUNDARY");
  const showAnnualReturn = showDigitalObligations || work.decision === "exempt";
  const annualMode = work.decision === "exempt"
    ? "normal-self-assessment" as const
    : digitalObligationsConditional ? "conditional" as const : "mtd" as const;
  const obligations = showAnnualReturn
    ? obligationsFor(input, digitalObligationsConditional, showDigitalObligations, annualMode)
    : [];

  const indicators = input.exemption.returnIndicators;
  const indicatorFactValue = Array.isArray(indicators)
    ? indicators.length > 0 ? indicators.join(", ") : "none-listed"
    : indicators;
  const provided: TaxFact[] = [
    fact("asOfDate", "Date the answer is for", input.asOfDate, true),
    fact("person.relevantReturnPosition", "2024/25 relevant-return duty and filing position", input.person.relevantReturnPosition, true),
    fact("person.hadNationalInsuranceNumberAtStartOf2026To27", "Had a National Insurance number before 2026/27 began", input.person.hadNationalInsuranceNumberAtStartOf2026To27, currentPhase.assessment === "above-threshold"),
    fact("income.atLeastOneRelevantReturnActivityContinuedAtEntry", "A relevant 2024/25-return activity continued at entry", input.income.atLeastOneRelevantReturnActivityContinuedAtEntry, input.person.relevantReturnPosition === "required-and-submitted"),
    fact("income.lastRelevantActivityCessationDate", "Final entry-activity cessation", input.income.lastRelevantActivityCessationDate, currentPhase.assessment === "above-threshold"),
    fact("income.relevantReturnWasAmended", "2024/25 return was amended", input.income.relevantReturnWasAmended, input.person.relevantReturnPosition === "required-and-submitted"),
    fact("income.annualisationOrOtherSpecialRulesMayApply", "Annualisation or another special income rule may apply", input.income.annualisationOrOtherSpecialRulesMayApply, input.person.relevantReturnPosition === "required-and-submitted"),
    fact("exemption.returnIndicators", "Claims, pages or circumstances on the relevant return", indicatorFactValue, currentPhase.assessment === "above-threshold"),
    fact("exemption.digitalExclusion", "HMRC digital-exclusion position", input.exemption.digitalExclusion, currentPhase.assessment === "above-threshold"),
    fact("exemption.otherExemptionApplication", "Other HMRC exemption application covering 2026/27", input.exemption.otherExemptionApplication, currentPhase.assessment === "above-threshold"),
    fact("reporting.updatePeriod", "Quarterly update period", input.reporting.updatePeriod, cessationInCurrentYear(input) !== null),
  ];
  for (const phase of phases) {
    const row = input.income.taxYears[phase.incomeTaxYear];
    const current = phase.incomeTaxYear === "2024-25";
    provided.push(
      fact(`income.taxYears.${phase.incomeTaxYear}.basis`, `${phase.incomeTaxYear} figure basis`, row.basis, current),
      fact(`income.taxYears.${phase.incomeTaxYear}.residence`, `${phase.incomeTaxYear} residence`, row.residence, current),
      fact(`income.taxYears.${phase.incomeTaxYear}.selfEmploymentGrossPence`, `${phase.incomeTaxYear} gross UK-return self-employment income`, row.selfEmploymentGrossPence, current),
      fact(`income.taxYears.${phase.incomeTaxYear}.ukPropertyGrossPence`, `${phase.incomeTaxYear} gross UK property income`, row.ukPropertyGrossPence, current),
      fact(`income.taxYears.${phase.incomeTaxYear}.foreignPropertyGrossPence`, `${phase.incomeTaxYear} gross foreign property income`, row.foreignPropertyGrossPence, current && row.residence === "uk-resident"),
    );
  }

  const derived: TaxFact[] = phases.flatMap((phase) => phase.qualifyingIncomePence === null ? [] : [
    fact(`derived.qualifyingIncome.${phase.incomeTaxYear}`, `${phase.incomeTaxYear} qualifying income`, phase.qualifyingIncomePence, phase.incomeTaxYear === "2024-25"),
  ]);
  const unknownFacts: UnknownTaxFact[] = [];
  for (const [taxYear, row] of Object.entries(input.income.taxYears)) {
    const fields: Array<[keyof MtdIncomeRow, string, string]> = [
      ["basis", `${taxYear} figure basis`, "A submitted-return figure supports the current decision; an estimate is only a forecast."],
      ["residence", `${taxYear} residence`, "Residence decides whether foreign property is included and can indicate an SA109 exemption."],
      ["selfEmploymentGrossPence", `${taxYear} gross UK-return self-employment income`, "It is included before expenses."],
      ["ukPropertyGrossPence", `${taxYear} gross UK property income`, "It is included before expenses."],
      ["foreignPropertyGrossPence", `${taxYear} gross foreign property income`, "It is included for a UK resident and generally excluded for a non-UK resident."],
    ];
    for (const [key, label, why] of fields) {
      if (row[key] === "unknown") {
        const path = `income.taxYears.${taxYear}.${key}`;
        unknownFacts.push(unknown(path, label, why, work.materialPaths.has(path)));
      }
    }
  }
  const scalarUnknowns: Array<[string, string, string, unknown]> = [
    ["person.relevantReturnPosition", "Relevant-return duty and filing position", "Being required to deliver, not actual filing, is the regulation 5 entry fact.", input.person.relevantReturnPosition],
    ["person.hadNationalInsuranceNumberAtStartOf2026To27", "National Insurance number at tax-year start", "No number before the year began creates an automatic exemption.", input.person.hadNationalInsuranceNumberAtStartOf2026To27],
    ["income.atLeastOneRelevantReturnActivityContinuedAtEntry", "Relevant-return activity at entry", "A different new source cannot replace the regulation 5 activity-continuation test.", input.income.atLeastOneRelevantReturnActivityContinuedAtEntry],
    ["income.lastRelevantActivityCessationDate", "Whether an entry activity still continues and when the final one ceased", "An exact date controls the final update and notice.", input.income.lastRelevantActivityCessationDate],
    ["income.relevantReturnWasAmended", "Return amendment status", "Amendment timing can change the threshold figure used.", input.income.relevantReturnWasAmended],
    ["income.annualisationOrOtherSpecialRulesMayApply", "Special qualifying-income rules", "Annualisation and special sources can change the amount HMRC uses.", input.income.annualisationOrOtherSpecialRulesMayApply],
    ["exemption.returnIndicators", "Return exemption evidence", "Actual claims and supplementary pages can create an automatic or delayed exemption.", indicators],
    ["exemption.digitalExclusion", "Digital-exclusion status", "Only HMRC can approve the application-based exemption.", input.exemption.digitalExclusion],
    ["exemption.otherExemptionApplication", "Other exemption application covering 2026/27", "HMRC may approve an application based on a claim or page expected on a later return.", input.exemption.otherExemptionApplication],
    ["reporting.updatePeriod", "Standard or calendar update periods", "Cessation near a period boundary can change the final deadline.", input.reporting.updatePeriod],
  ];
  for (const [path, label, why, value] of scalarUnknowns) {
    if (value === "unknown" || value === "not-checked") {
      unknownFacts.push(unknown(path, label, why, work.materialPaths.has(path)));
    }
  }

  const claims = buildClaims(currentPhase);
  const steps: ReasoningStep[] = [
    {
      id: "entry-conditions",
      statement: "Check the duty to deliver the 2024/25 return and whether the relevant activities existed at entry; do not reward non-filing.",
      factPaths: ["person.relevantReturnPosition", "income.atLeastOneRelevantReturnActivityContinuedAtEntry", "income.lastRelevantActivityCessationDate"],
      claimIds: ["mtd-entry-law", "mtd-cessation-law"],
    },
    {
      id: "qualifying-income",
      statement: currentPhase.qualifyingIncomePence === null
        ? "A complete residence-aware 2024/25 qualifying-income total is not available."
        : `Compare the residence-aware gross total of ${currentPhase.qualifyingIncomePence} pence with the strictly-over ${currentPhase.thresholdPence} pence threshold.`,
      factPaths: [
        "income.taxYears.2024-25.residence",
        "income.taxYears.2024-25.selfEmploymentGrossPence",
        "income.taxYears.2024-25.ukPropertyGrossPence",
        "income.taxYears.2024-25.foreignPropertyGrossPence",
      ],
      claimIds: ["mtd-thresholds-law", "mtd-income-residence", "mtd-current-threshold-calculation"],
    },
    {
      id: "amendments-and-special-rules",
      statement: "Stop before a threshold conclusion if amendment timing, annualisation or another admitted special rule can change the amount.",
      factPaths: ["income.relevantReturnWasAmended", "income.annualisationOrOtherSpecialRulesMayApply"],
      claimIds: ["mtd-amendments", "mtd-income-residence"],
    },
    {
      id: "exemptions",
      statement: "Derive supported automatic exemptions from concrete return evidence or NINO status, and leave application-based exemptions to HMRC.",
      factPaths: ["person.hadNationalInsuranceNumberAtStartOf2026To27", "exemption.returnIndicators", "exemption.digitalExclusion", "exemption.otherExemptionApplication"],
      claimIds: ["mtd-exemptions-position"],
    },
    {
      id: "obligations",
      statement: showDigitalObligations
        ? "Map digital records, cumulative updates and the annual return; if all sources ceased, retain the final update and HMRC notice."
        : work.decision === "exempt"
          ? "Remove MTD digital obligations while keeping the ordinary Self Assessment return visible."
          : "Do not attach MTD quarterly obligations or their penalty position to an out-of-scope result.",
      factPaths: ["reporting.updatePeriod", "income.lastRelevantActivityCessationDate"],
      claimIds: ["mtd-quarterly-obligations", "mtd-cessation-law", "mtd-2026-27-penalty-position", "self-assessment-deadlines"],
    },
  ];

  const penalty = penaltyPosition("2026-27");
  const answer: TaxAnswer<MtdIncomeTaxDecision> = {
    schema: "taxsorted.tax-answer/1",
    capability: {
      id: "uk.mtd-income-tax.readiness",
      version: "2026-07-11.3",
      jurisdiction: "United Kingdom",
      taxType: "Making Tax Digital for Income Tax",
      task: "classify",
    },
    status: work.status,
    applicability: {
      effectiveDate: input.asOfDate,
      evaluatedOn,
      knowledgeAsOf: retrievedOn,
      taxPeriod: { start: "2026-04-06", end: "2027-04-05", label: "2026/27" },
      territories: ["United Kingdom"],
      taxpayerTypes: ["individual sole trader", "individual landlord"],
      covered: !["professional_review_needed", "outside_supported_date", "source_review_required"].includes(work.decision),
      ruleIds: ["SI-2026-336-reg-5", "SI-2026-336-reg-6", "SI-2026-336-reg-9", "SI-2026-336-reg-14", "SI-2026-336-reg-25-to-27", "HMRC-MTD-exemptions"],
    },
    facts: { provided, derived, unknown: unknownFacts, assumptions: [] },
    answer: {
      decision: work.decision,
      headline: work.headline,
      reasonCodes: work.reasonCodes,
      currentPhase,
      phases,
      obligations,
      penaltyPosition: {
        applies: showDigitalObligations,
        conditional: digitalObligationsConditional,
        quarterlyPenaltyPoints2026To27: false,
        quarterlyUpdatesStillRequired: showDigitalObligations,
        note: showDigitalObligations
          ? penalty.note
          : "No MTD quarterly-update penalty position is attached to this out-of-scope, exempt or unresolved assessment.",
        sourceIds: showDigitalObligations ? ["hmrc-mtd-penalties"] : [],
      },
      excludedIncomeTypes: ["employment (PAYE)", "individual partnership profit share", "dividends", "State Pension", "private pensions"],
      boundaries: [
        "Gross income means before expenses; it is not profit.",
        "UK-resident totals include foreign property; non-UK-resident cases use only amounts admitted to the UK-return scope.",
        "A missing HMRC letter or an unsubmitted required return does not remove the obligation.",
        "Exact per-source workload needs each source's start, prior-return and cessation history; this path does not guess a submission count.",
        "The final entry-activity cessation date does not prove that earlier activity-level cessation notices were completed.",
        "TaxSorted does not approve exemptions, sign anyone up or calculate the final Income Tax bill.",
      ],
    },
    reasoning: { steps },
    evidence: { claims, sources: [...MTD_INCOME_TAX_SOURCES] },
    confidence: {
      level: work.status === "determined" ? (work.decision === "exempt" ? "medium" : "high") : "low",
      basis: work.status === "determined"
        ? ["Explicit facts", "Residence-aware integer-pence comparison", "Current admitted official sources", "No material assumption"]
        : ["Deterministic rule path", "Official sources and blockers remain visible"],
      blockers: [
        ...unknownFacts.filter((item) => item.material).map((item) => item.path),
        ...(work.status === "needs_professional_review" ? work.reasonCodes : []),
      ],
      notProbability: true,
    },
    escalation: {
      required: work.escalationRequired,
      reasonCodes: work.escalationRequired ? work.reasonCodes : [],
      factsNeeded: [...work.materialPaths],
      nextActions: nextActionsFor(work, input),
    },
    dataUse: {
      stored: false,
      retention: "The deterministic assessment uses request facts in memory and does not write them to TaxSorted application storage.",
      usedForTraining: false,
    },
  };
  assertTaxAnswerInvariants(answer);
  return answer;
}
