"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  assessMtdIncomeTax,
  type KnownAnswer,
  type MtdDigitalExclusionStatus,
  type MtdIncomeRow,
  type MtdIncomeTaxDecision,
  type MtdIncomeTaxExpertRequest,
  type MtdIncomeTaxPassportPosition,
  type MtdOtherExemptionApplicationStatus,
  type MtdRelevantReturnPosition,
  type MtdResidence,
  type MtdReturnIndicator,
  type TaxAnswer,
  type TaxFact,
} from "@taxsorted/engine/uk/expert";
import { parsePounds, INVALID_AMOUNT_MESSAGE } from "@/lib/parse";

type AnswerChoice = "yes" | "no" | "unknown";
type CessationChoice = "continuing" | "ceased" | "unknown";
type ReturnIndicatorChoice = MtdReturnIndicator | "none-listed" | "not-checked" | "unknown";

interface FormState {
  returnPosition: MtdRelevantReturnPosition;
  continuedAtEntry: AnswerChoice;
  nino: AnswerChoice;
  residence2024: MtdResidence;
  residence2025: MtdResidence;
  residence2026: MtdResidence;
  amended: AnswerChoice;
  specialRules: AnswerChoice;
  cessation: CessationChoice;
  cessationDate: string;
  returnIndicator: ReturnIndicatorChoice;
  digitalExclusion: MtdDigitalExclusionStatus;
  otherExemptionApplication: MtdOtherExemptionApplicationStatus;
  updatePeriod: "standard" | "calendar" | "unknown";
  selfEmployment2024: string;
  ukProperty2024: string;
  foreignProperty2024: string;
  selfEmployment2025: string;
  ukProperty2025: string;
  foreignProperty2025: string;
  selfEmployment2026: string;
  ukProperty2026: string;
  foreignProperty2026: string;
}

export interface MtdIncomeSourceDefaults {
  selfEmployment: AnswerChoice;
  ukProperty: AnswerChoice;
  foreignProperty: AnswerChoice;
}

const INITIAL: FormState = {
  returnPosition: "unknown",
  continuedAtEntry: "unknown",
  nino: "unknown",
  residence2024: "unknown",
  residence2025: "unknown",
  residence2026: "unknown",
  amended: "unknown",
  specialRules: "unknown",
  cessation: "unknown",
  cessationDate: "",
  returnIndicator: "not-checked",
  digitalExclusion: "unknown",
  otherExemptionApplication: "not-checked",
  updatePeriod: "unknown",
  selfEmployment2024: "",
  ukProperty2024: "",
  foreignProperty2024: "",
  selfEmployment2025: "",
  ukProperty2025: "",
  foreignProperty2025: "",
  selfEmployment2026: "",
  ukProperty2026: "",
  foreignProperty2026: "",
};

function formStateFromIncomeSources(
  incomeSources?: MtdIncomeSourceDefaults,
): FormState {
  const form = { ...INITIAL };
  if (!incomeSources) return form;
  for (const year of ["2024", "2025", "2026"] as const) {
    if (incomeSources.selfEmployment === "no") {
      form[`selfEmployment${year}`] = "0";
    }
    if (incomeSources.ukProperty === "no") {
      form[`ukProperty${year}`] = "0";
    }
    if (incomeSources.foreignProperty === "no") {
      form[`foreignProperty${year}`] = "0";
    }
  }
  return form;
}

function answerChoice(value: KnownAnswer): AnswerChoice {
  return value === "unknown" ? "unknown" : value ? "yes" : "no";
}

function moneyText(value: number | "unknown"): string {
  if (value === "unknown") return "";
  return (value / 100).toFixed(2).replace(/\.00$/, "");
}

function formStateFromRequest(
  request: MtdIncomeTaxExpertRequest,
): FormState {
  const cessation = request.income.lastRelevantActivityCessationDate;
  const returnIndicators = request.exemption.returnIndicators;
  return {
    returnPosition: request.person.relevantReturnPosition,
    continuedAtEntry: answerChoice(
      request.income.atLeastOneRelevantReturnActivityContinuedAtEntry,
    ),
    nino: answerChoice(
      request.person.hadNationalInsuranceNumberAtStartOf2026To27,
    ),
    residence2024: request.income.taxYears["2024-25"].residence,
    residence2025: request.income.taxYears["2025-26"].residence,
    residence2026: request.income.taxYears["2026-27"].residence,
    amended: answerChoice(request.income.relevantReturnWasAmended),
    specialRules: answerChoice(
      request.income.annualisationOrOtherSpecialRulesMayApply,
    ),
    cessation:
      cessation === "at-least-one-continues"
        ? "continuing"
        : cessation === "unknown"
          ? "unknown"
          : "ceased",
    cessationDate:
      cessation === "at-least-one-continues" || cessation === "unknown"
        ? ""
        : cessation,
    returnIndicator: Array.isArray(returnIndicators)
      ? (returnIndicators[0] ?? "none-listed")
      : returnIndicators,
    digitalExclusion: request.exemption.digitalExclusion,
    otherExemptionApplication:
      request.exemption.otherExemptionApplication,
    updatePeriod: request.reporting.updatePeriod,
    selfEmployment2024: moneyText(
      request.income.taxYears["2024-25"].selfEmploymentGrossPence,
    ),
    ukProperty2024: moneyText(
      request.income.taxYears["2024-25"].ukPropertyGrossPence,
    ),
    foreignProperty2024: moneyText(
      request.income.taxYears["2024-25"].foreignPropertyGrossPence,
    ),
    selfEmployment2025: moneyText(
      request.income.taxYears["2025-26"].selfEmploymentGrossPence,
    ),
    ukProperty2025: moneyText(
      request.income.taxYears["2025-26"].ukPropertyGrossPence,
    ),
    foreignProperty2025: moneyText(
      request.income.taxYears["2025-26"].foreignPropertyGrossPence,
    ),
    selfEmployment2026: moneyText(
      request.income.taxYears["2026-27"].selfEmploymentGrossPence,
    ),
    ukProperty2026: moneyText(
      request.income.taxYears["2026-27"].ukPropertyGrossPence,
    ),
    foreignProperty2026: moneyText(
      request.income.taxYears["2026-27"].foreignPropertyGrossPence,
    ),
  };
}

const MONEY_FIELDS = [
  "selfEmployment2024",
  "ukProperty2024",
  "foreignProperty2024",
  "selfEmployment2025",
  "ukProperty2025",
  "foreignProperty2025",
  "selfEmployment2026",
  "ukProperty2026",
  "foreignProperty2026",
] as const;

/** Plain names for the error summary, so each error links to its field by name. */
const FIELD_NAMES: Record<string, string> = {
  selfEmployment2024: "Self-employment income (2024/25)",
  ukProperty2024: "UK property income (2024/25)",
  foreignProperty2024: "Foreign property income (2024/25)",
  selfEmployment2025: "Self-employment income (2025/26 forecast)",
  ukProperty2025: "UK property income (2025/26 forecast)",
  foreignProperty2025: "Foreign property income (2025/26 forecast)",
  selfEmployment2026: "Self-employment income (2026/27 forecast)",
  ukProperty2026: "UK property income (2026/27 forecast)",
  foreignProperty2026: "Foreign property income (2026/27 forecast)",
  cessationDate: "Date the last activity stopped",
};
const MAX_MONEY_PENCE = 1_000_000_000_000;

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

const humanDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string): string {
  return humanDate.format(new Date(`${value}T00:00:00Z`));
}

function knownAnswer(value: AnswerChoice): KnownAnswer {
  return value === "unknown" ? "unknown" : value === "yes";
}

function money(value: string): number | "unknown" | "invalid" {
  const parsed = parsePounds(value);
  if (parsed === "blank") return "unknown";
  if (parsed === "invalid" || parsed > MAX_MONEY_PENCE) return "invalid";
  return parsed;
}

function row(
  selfEmployment: string,
  ukProperty: string,
  foreignProperty: string,
  residence: MtdResidence,
  basis: MtdIncomeRow["basis"],
): MtdIncomeRow | "invalid" {
  const selfEmploymentGrossPence = money(selfEmployment);
  const ukPropertyGrossPence = money(ukProperty);
  const foreignPropertyGrossPence = money(foreignProperty);
  if (
    selfEmploymentGrossPence === "invalid"
    || ukPropertyGrossPence === "invalid"
    || foreignPropertyGrossPence === "invalid"
  ) return "invalid";
  return {
    basis,
    residence,
    selfEmploymentGrossPence,
    ukPropertyGrossPence,
    foreignPropertyGrossPence,
  };
}

function decisionLabel(decision: MtdIncomeTaxDecision["decision"]): string {
  return ({
    in_scope: "In scope",
    out_of_scope: "Not triggered on these facts",
    exempt: "Exempt for this phase",
    exemption_possible: "Check exemption evidence",
    hmrc_decision_needed: "HMRC decision needed",
    insufficient_facts: "More facts needed",
    professional_review_needed: "Special-case review needed",
    source_review_required: "Source refresh needed",
    outside_supported_date: "Date outside this ruleset",
  } satisfies Record<MtdIncomeTaxDecision["decision"], string>)[decision];
}

function statusClass(status: TaxAnswer<MtdIncomeTaxDecision>["status"]): string {
  if (status === "determined") return "border-accent/30 bg-accent-soft";
  if (status === "needs_facts") return "border-amber-300 bg-amber-50";
  return "border-rose-300 bg-rose-50";
}

function phaseAssessment(value: MtdIncomeTaxDecision["currentPhase"]["assessment"]): string {
  return ({
    "above-threshold": "Over threshold on admitted return figures",
    "at-or-below-threshold": "Not over threshold on admitted return figures",
    "forecast-above-threshold": "Forecast over threshold",
    "forecast-at-or-below-threshold": "Forecast not over threshold",
    unknown: "Not enough information",
  } satisfies Record<MtdIncomeTaxDecision["currentPhase"]["assessment"], string>)[value];
}

function sourceKind(value: string): string {
  return ({
    "secondary-legislation": "Statutory instrument",
    "hmrc-guidance": "HMRC guidance",
  } as Record<string, string>)[value] ?? value.replaceAll("-", " ");
}

function legalForce(value: string): string {
  return ({
    "binding-law": "binding law",
    "official-explanation": "official explanation, not legislation",
  } as Record<string, string>)[value] ?? value.replaceAll("-", " ");
}

function displayFactValue(fact: TaxFact): string {
  if (typeof fact.value === "number" && fact.path.toLowerCase().includes("pence")) {
    return gbp.format(fact.value / 100);
  }
  if (typeof fact.value === "boolean") return fact.value ? "Yes" : "No";
  return String(fact.value).replaceAll("-", " ");
}

export interface MtdExpertCheckProps {
  initialPosition?: MtdIncomeTaxPassportPosition | null;
  incomeSourceDefaults?: MtdIncomeSourceDefaults;
  onPositionChange?: (
    position: MtdIncomeTaxPassportPosition | null,
  ) => void;
  persistenceNote?: string;
}

export function MtdExpertCheck({
  initialPosition = null,
  incomeSourceDefaults,
  onPositionChange,
  persistenceNote =
    "Runs in this browser. Nothing is sent to TaxSorted — not your name, your National Insurance number (NINO), your Unique Taxpayer Reference (UTR), or any figure you type.",
}: MtdExpertCheckProps = {}) {
  const [form, setForm] = useState<FormState>(() =>
    initialPosition
      ? formStateFromRequest(initialPosition.request)
      : formStateFromIncomeSources(incomeSourceDefaults)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TaxAnswer<MtdIncomeTaxDecision> | null>(
    () => initialPosition?.answer ?? null,
  );
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusErrorSummaryRef = useRef(false);
  const skipInitialResultFocusRef = useRef(Boolean(initialPosition));

  useEffect(() => {
    if (focusErrorSummaryRef.current && Object.keys(errors).length > 0) {
      focusErrorSummaryRef.current = false;
      errorSummaryRef.current?.focus();
    }
  }, [errors]);

  useEffect(() => {
    if (!result) return;
    if (skipInitialResultFocusRef.current) {
      skipInitialResultFocusRef.current = false;
      return;
    }
    resultHeadingRef.current?.focus();
  }, [result]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setResult(null);
    onPositionChange?.(null);
    setErrors((current) => {
      if (!(key in current) && !("_form" in current)) return current;
      const next = { ...current };
      delete next[key];
      delete next._form;
      return next;
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    for (const key of MONEY_FIELDS) {
      if (money(form[key]) === "invalid") {
        nextErrors[key] = `${INVALID_AMOUNT_MESSAGE} The service limit is £10 billion per field.`;
      }
    }
    if (form.cessation === "ceased" && form.cessationDate === "") {
      nextErrors.cessationDate = "Enter the date the last activity stopped.";
    }
    const today = new Date().toISOString().slice(0, 10);
    if (form.cessation === "ceased" && form.cessationDate > today) {
      nextErrors.cessationDate = "The date the last activity stopped cannot be in the future.";
    }
    if (Object.keys(nextErrors).length > 0) {
      focusErrorSummaryRef.current = true;
      setErrors(nextErrors);
      setResult(null);
      onPositionChange?.(null);
      return;
    }

    const currentBasis: MtdIncomeRow["basis"] = form.returnPosition === "required-and-submitted"
      ? "submitted-return"
      : form.returnPosition === "required-not-submitted" ? "working-estimate" : "unknown";
    const future2025Basis: MtdIncomeRow["basis"] = [form.selfEmployment2025, form.ukProperty2025, form.foreignProperty2025].some((value) => value.trim())
      ? "working-estimate"
      : "unknown";
    const future2026Basis: MtdIncomeRow["basis"] = [form.selfEmployment2026, form.ukProperty2026, form.foreignProperty2026].some((value) => value.trim())
      ? "working-estimate"
      : "unknown";
    const current = row(form.selfEmployment2024, form.ukProperty2024, form.foreignProperty2024, form.residence2024, currentBasis);
    const future2025 = row(form.selfEmployment2025, form.ukProperty2025, form.foreignProperty2025, form.residence2025, future2025Basis);
    const future2026 = row(form.selfEmployment2026, form.ukProperty2026, form.foreignProperty2026, form.residence2026, future2026Basis);
    if (current === "invalid" || future2025 === "invalid" || future2026 === "invalid") return;

    const returnIndicators = form.returnIndicator === "none-listed"
      ? []
      : form.returnIndicator === "not-checked" || form.returnIndicator === "unknown"
        ? form.returnIndicator
        : [form.returnIndicator];
    const lastRelevantActivityCessationDate = form.cessation === "continuing"
      ? "at-least-one-continues"
      : form.cessation === "ceased" ? form.cessationDate : "unknown";

    setErrors({});
    try {
      const request: MtdIncomeTaxExpertRequest = {
        schema: "taxsorted.uk.mtd-income-tax.request/1",
        asOfDate: today,
        person: {
          relevantReturnPosition: form.returnPosition,
          hadNationalInsuranceNumberAtStartOf2026To27: knownAnswer(form.nino),
        },
        income: {
          taxYears: {
            "2024-25": current,
            "2025-26": future2025,
            "2026-27": future2026,
          },
          atLeastOneRelevantReturnActivityContinuedAtEntry: knownAnswer(form.continuedAtEntry),
          lastRelevantActivityCessationDate,
          relevantReturnWasAmended: knownAnswer(form.amended),
          annualisationOrOtherSpecialRulesMayApply: knownAnswer(form.specialRules),
        },
        exemption: {
          returnIndicators,
          digitalExclusion: form.digitalExclusion,
          otherExemptionApplication: form.otherExemptionApplication,
        },
        reporting: { updatePeriod: form.updatePeriod },
      };
      const answer = assessMtdIncomeTax(request);
      setResult(answer);
      onPositionChange?.({
        kind: "mtd-income-tax-readiness",
        request,
        answer,
      });
    } catch {
      setResult(null);
      onPositionChange?.(null);
      focusErrorSummaryRef.current = true;
      setErrors({ _form: "This combination is outside the checker’s safe input boundary. Review the dates and amounts, then try again." });
    }
  };

  return (
    <div className="space-y-8">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {result?.answer ? `${decisionLabel(result.answer.decision)}. ${result.answer.headline}` : ""}
      </div>

      {Object.keys(errors).length > 0 ? (
        <div ref={errorSummaryRef} tabIndex={-1} role="alert" className="rounded-2xl border-2 border-red-700 bg-red-50 p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
          <h2 className="font-semibold text-red-900">There is a problem</h2>
          {errors._form ? <p className="mt-1 text-base text-red-800">{errors._form}</p> : null}
          <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-red-800">
            {Object.entries(errors).filter(([key]) => key !== "_form").map(([key, message]) => (
              <li key={key}>
                <a href={`#${key}`} className="font-medium text-red-900 underline underline-offset-2">{FIELD_NAMES[key] ?? key}</a>
                {": "}{message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form onSubmit={submit} noValidate className="space-y-7">
        <fieldset className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <legend className="px-2 text-lg font-semibold text-ink">1. Your 2024/25 tax return</legend>
          <p className="mt-2 text-base text-ink-soft">
            The law starts with your 2024/25 tax return — the one showing your self-employment or rent.
            Not sending a required return does not switch MTD off.
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <SelectField
              id="returnPosition"
              label="Your 2024/25 return — was it required, and was it sent?"
              value={form.returnPosition}
              onChange={(value) => set("returnPosition", value as MtdRelevantReturnPosition)}
              options={[
                ["unknown", "Not sure"],
                ["required-and-submitted", "Required and sent"],
                ["required-not-submitted", "Required but not sent"],
                ["not-required", "Not required for this work"],
              ]}
            />
            <Choice id="continuedAtEntry" label="Was at least one activity on that return still running just before 6 April 2026?" value={form.continuedAtEntry} onChange={(value) => set("continuedAtEntry", value)} />
            <Choice id="nino" label="Did you have a National Insurance number before 6 April 2026?" value={form.nino} onChange={(value) => set("nino", value)} />
          </div>
        </fieldset>

        <fieldset className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <legend className="px-2 text-lg font-semibold text-ink">2. Your income — the number HMRC tests</legend>
          <p className="mt-2 text-base text-ink-soft">
            Use gross amounts from the 2024/25 return — the figures before expenses.
            UK residents: include UK and foreign property income.
            Non-UK residents: enter only self-employment income in the UK return, plus UK property income.
            Type 0 only when it is truly zero. Blank means unknown.
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <ResidenceField id="residence2024" label="Tax residence in 2024/25" value={form.residence2024} onChange={(value) => set("residence2024", value)} />
            <MoneyField id="selfEmployment2024" label="Gross self-employment income in the UK return" value={form.selfEmployment2024} error={errors.selfEmployment2024} onChange={(value) => set("selfEmployment2024", value)} />
            <MoneyField id="ukProperty2024" label="Gross UK property income" value={form.ukProperty2024} error={errors.ukProperty2024} onChange={(value) => set("ukProperty2024", value)} />
            <MoneyField id="foreignProperty2024" label="Gross foreign property income" value={form.foreignProperty2024} error={errors.foreignProperty2024} onChange={(value) => set("foreignProperty2024", value)} />
            <Choice id="amended" label="Was the 2024/25 return amended (changed after sending)?" value={form.amended} onChange={(value) => set("amended", value)} />
            <Choice id="specialRules" label="Could a special income rule apply — like annualisation (scaling part-year income up to a full year)?" value={form.specialRules} onChange={(value) => set("specialRules", value)} />
            <SelectField
              id="cessation"
              label="Is any of that activity still running now?"
              value={form.cessation}
              onChange={(value) => set("cessation", value as CessationChoice)}
              options={[["unknown", "Not sure"], ["continuing", "At least one is still running"], ["ceased", "All have stopped"]]}
            />
            {form.cessation === "ceased" ? (
              <DateField id="cessationDate" label="Date the last activity stopped" value={form.cessationDate} error={errors.cessationDate} onChange={(value) => set("cessationDate", value)} />
            ) : null}
          </div>
        </fieldset>

        <fieldset className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <legend className="px-2 text-lg font-semibold text-ink">3. Exemptions and update periods</legend>
          <p className="mt-2 text-base text-ink-soft">
            This asks what the return actually shows, not whether you think an exemption applies.
            The definitions are in the{" "}
            <a className="font-medium text-accent underline underline-offset-2" href="https://www.gov.uk/guidance/find-out-if-you-can-get-an-exemption-from-making-tax-digital-for-income-tax" target="_blank" rel="noreferrer noopener">current HMRC exemption guide</a>.
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <SelectField
              id="returnIndicator"
              label="Does the 2024/25 return show any of these?"
              value={form.returnIndicator}
              onChange={(value) => set("returnIndicator", value as ReturnIndicatorChoice)}
              options={[
                ["not-checked", "Not checked against HMRC's list"],
                ["none-listed", "Checked — none of these"],
                ["sa103-averaging-relief", "Averaging relief on the self-employment pages (form SA103)"],
                ["qualifying-care-relief", "Qualifying care relief (foster or shared-lives care)"],
                ["sa107-trusts-or-estates", "Income from trusts or estates (form SA107)"],
                ["sa109-residence", "The pages about living abroad (form SA109)"],
                ["sa103l-lloyds", "Lloyd's of London underwriting pages (form SA103L)"],
                ["incapable-with-legal-representative", "A legal representative acts because of incapacity"],
                ["sa102m-minister-of-religion", "Minister of religion pages (form SA102M)"],
                ["married-couples-allowance", "Married Couple's Allowance"],
                ["blind-persons-allowance", "Blind Person's Allowance"],
                ["unknown", "Not sure what the return shows"],
              ]}
            />
            <SelectField
              id="digitalExclusion"
              label="Has HMRC agreed you are digitally excluded (you cannot reasonably use computers for tax)?"
              value={form.digitalExclusion}
              onChange={(value) => set("digitalExclusion", value as MtdDigitalExclusionStatus)}
              options={[
                ["unknown", "Not sure"],
                ["not-approved-or-pending", "No approval and no application waiting"],
                ["application-pending", "Application waiting with HMRC"],
                ["hmrc-approved", "HMRC has approved it"],
              ]}
            />
            <SelectField
              id="otherExemptionApplication"
              label="Any other HMRC exemption application covering 2026/27?"
              value={form.otherExemptionApplication}
              onChange={(value) => set("otherExemptionApplication", value as MtdOtherExemptionApplicationStatus)}
              options={[
                ["not-checked", "Not checked"],
                ["none", "No other application"],
                ["application-pending", "Application waiting with HMRC"],
                ["hmrc-approved-for-2026-27", "HMRC approved it for 2026/27"],
                ["unknown", "Not sure"],
              ]}
            />
            <SelectField
              id="updatePeriod"
              label="Your quarterly update period (when each 3-month report starts)"
              value={form.updatePeriod}
              onChange={(value) => set("updatePeriod", value as FormState["updatePeriod"])}
              options={[["unknown", "Not sure"], ["standard", "Standard — 6 April start"], ["calendar", "Calendar — 1 April start"]]}
            />
          </div>
        </fieldset>

        <details className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <summary className="cursor-pointer font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">Look ahead to the April 2027 and April 2028 phases</summary>
          <p className="mt-3 text-base text-ink-soft">These stay forecasts until the relevant return and residence position are known.</p>
          <div className="mt-5 grid gap-7 lg:grid-cols-2">
            <FutureYearFields
              year="2025/26"
              residenceId="residence2025"
              residence={form.residence2025}
              onResidence={(value) => set("residence2025", value)}
              selfEmploymentId="selfEmployment2025"
              selfEmployment={form.selfEmployment2025}
              ukPropertyId="ukProperty2025"
              ukProperty={form.ukProperty2025}
              foreignPropertyId="foreignProperty2025"
              foreignProperty={form.foreignProperty2025}
              errors={errors}
              set={set}
            />
            <FutureYearFields
              year="2026/27"
              residenceId="residence2026"
              residence={form.residence2026}
              onResidence={(value) => set("residence2026", value)}
              selfEmploymentId="selfEmployment2026"
              selfEmployment={form.selfEmployment2026}
              ukPropertyId="ukProperty2026"
              ukProperty={form.ukProperty2026}
              foreignPropertyId="foreignProperty2026"
              foreignProperty={form.foreignProperty2026}
              errors={errors}
              set={set}
            />
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-7 font-medium text-white hover:bg-accent-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-deep">
            Check my position
          </button>
          <p className="max-w-xl text-base text-ink-soft">
            {persistenceNote}
          </p>
        </div>
      </form>

      {result?.answer ? <AssessmentResult result={result} headingRef={resultHeadingRef} /> : null}
    </div>
  );
}

function AssessmentResult({
  result,
  headingRef,
}: {
  result: TaxAnswer<MtdIncomeTaxDecision>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const answer = result.answer!;
  const materialUnknowns = result.facts.unknown.filter((item) => item.material);
  const whyGraph = result.reasoning.whyGraph;
  const decisiveReasoning = whyGraph.nodes.filter(
    (node) => node.kind === "reasoning-step" && node.state === "decisive",
  );
  const decisiveRules = whyGraph.nodes.filter(
    (node) => node.kind === "rule" && node.state === "decisive",
  );
  const graphGaps = whyGraph.nodes.filter((node) => node.kind === "gap");
  return (
    <section className={`rounded-3xl border p-6 sm:p-8 ${statusClass(result.status)}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">{decisionLabel(answer.decision)}</p>
          <h2 ref={headingRef} tabIndex={-1} className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">{answer.headline}</h2>
        </div>
        <div className="rounded-full border border-line bg-white px-4 py-2 text-sm text-ink">
          Confidence: <span className="capitalize">{result.confidence.level}</span> <span className="text-ink-soft">(not a probability)</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <ResultMetric label="2024/25 qualifying income" value={answer.currentPhase.qualifyingIncomePence === null ? "Unknown" : gbp.format(answer.currentPhase.qualifyingIncomePence / 100)} />
        <ResultMetric label="April 2026 threshold" value={`Over ${gbp.format(answer.currentPhase.thresholdPence / 100)}`} />
        <ResultMetric label="Evidence reviewed" value={formatDate(result.applicability.knowledgeAsOf)} />
      </div>
      <p className="mt-3 text-xs text-ink-soft">Assessment evaluated {formatDate(result.applicability.evaluatedOn)} for the position on {formatDate(result.applicability.effectiveDate)}.</p>

      {materialUnknowns.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-400 bg-white p-5">
          <h3 className="font-semibold text-ink">What we still need to know</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base text-ink-soft">
            {materialUnknowns.map((item) => <li key={item.path}><strong className="text-ink">{item.label}:</strong> {item.whyItMatters}</li>)}
          </ul>
        </div>
      ) : null}

      {result.escalation.nextActions.length > 0 ? (
        <div className="mt-7">
          <h3 className="text-xl font-semibold text-ink">What to do next</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {result.escalation.nextActions.map((action) => action.href ? (
              <a key={action.id} href={action.href} target="_blank" rel="noreferrer noopener" className="rounded-2xl border border-line bg-white p-4 font-medium text-accent hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                {action.label}<span className="mt-1 block text-xs font-normal text-ink-soft">Responsible: {action.responsibleParty}</span>
              </a>
            ) : (
              <div key={action.id} className="rounded-2xl border border-line bg-white p-4 font-medium text-ink">
                {action.label}<span className="mt-1 block text-xs font-normal text-ink-soft">Responsible: {action.responsibleParty}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-7 text-sm text-ink-soft lg:hidden" aria-hidden="true">The table below scrolls sideways.</p>
      <div
        tabIndex={0}
        role="region"
        aria-label="Current and later phases — scrolls sideways"
        className="mt-2 overflow-x-auto rounded-2xl border border-line bg-white lg:mt-7"
      >
        <table className="w-full min-w-[42rem] text-left text-sm">
          <caption className="px-5 pt-5 text-left text-xl font-semibold text-ink">Current and later phases</caption>
          <thead className="text-ink-soft">
            <tr><th className="px-5 py-3">Income year</th><th className="px-5 py-3">Start if triggered</th><th className="px-5 py-3">Threshold</th><th className="px-5 py-3">Admitted total</th><th className="px-5 py-3">Reading</th></tr>
          </thead>
          <tbody>
            {answer.phases.map((phase) => (
              <tr key={phase.incomeTaxYear} className="border-t border-line align-top">
                <th className="px-5 py-4 font-medium text-ink">{phase.incomeTaxYear}</th>
                <td className="px-5 py-4 text-ink-soft">{formatDate(phase.mandatedFrom)}</td>
                <td className="px-5 py-4 text-ink-soft">Over {gbp.format(phase.thresholdPence / 100)}</td>
                <td className="px-5 py-4 text-ink-soft">{phase.qualifyingIncomePence === null ? "Unknown" : gbp.format(phase.qualifyingIncomePence / 100)}</td>
                <td className="px-5 py-4 text-ink-soft">{phaseAssessment(phase.assessment)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {answer.obligations.length > 0 ? (
        <div className="mt-7">
          <h3 className="text-xl font-semibold text-ink">Your path and dates</h3>
          <div className="mt-4 grid gap-3">
            {answer.obligations.map((obligation) => (
              <article key={obligation.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium text-ink">{obligation.title}{obligation.condition ? ` — ${obligation.condition}` : ""}</p>
                  <p className="text-sm font-semibold text-accent">{obligation.dueDate ? formatDate(obligation.dueDate) : "Ongoing"}</p>
                </div>
                {obligation.appliesPerBusiness ? (
                  <p className="mt-1 text-sm text-ink-soft">Applies for each activity that has entered quarterly reporting. Exact source-level workload needs its own history.</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {answer.penaltyPosition.applies ? (
        <div className="mt-7 rounded-2xl bg-white p-5">
          <h3 className="font-semibold text-ink">2026/27 penalty position{answer.penaltyPosition.conditional ? " — conditional" : ""}</h3>
          <p className="mt-2 text-sm text-ink-soft">{answer.penaltyPosition.note}</p>
        </div>
      ) : null}

      <details className="mt-7 rounded-2xl border border-line bg-white p-5">
        <summary className="cursor-pointer font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">Review your facts, confidence and boundaries</summary>
        <h3 className="mt-5 font-semibold text-ink">Facts used</h3>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
          {result.facts.provided.map((item) => (
            <div key={item.path} className="flex justify-between gap-4 border-b border-line py-2">
              <dt className="text-ink-soft">{item.label}</dt><dd className="text-right font-medium text-ink">{displayFactValue(item)}</dd>
            </div>
          ))}
        </dl>
        <h3 className="mt-6 font-semibold text-ink">Why confidence has this level</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
          {result.confidence.basis.map((item) => <li key={item}>{item}</li>)}
          {result.confidence.blockers.map((item) => <li key={item}>Blocker: {item}</li>)}
        </ul>
        <h3 className="mt-6 font-semibold text-ink">This answer does not claim</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
          {answer.boundaries.map((item) => <li key={item}>{item}</li>)}
          <li>Excluded from qualifying income here: {answer.excludedIncomeTypes.join(", ")}.</li>
        </ul>
      </details>

      <details className="mt-5 rounded-2xl border border-line bg-white p-5">
        <summary className="cursor-pointer font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">Show reasoning and official receipts</summary>
        <div className="mt-5 rounded-2xl border border-line bg-paper p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-ink">Trace this answer</h3>
              <p className="mt-1 max-w-3xl text-sm text-ink-soft">This path is TaxSorted analysis, not an HMRC decision. It shows what was decisive, what source gives a rule authority, and where enforcement or appeal routing is still unmapped.</p>
            </div>
            <a href="https://api.taxsorted.io/v1/why-graph" target="_blank" rel="noreferrer noopener" className="text-sm font-medium text-accent hover:text-accent-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Machine contract</a>
          </div>
          <h4 className="mt-5 text-sm font-semibold text-ink">Decisive reasoning</h4>
          {decisiveReasoning.length > 0 ? (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
              {decisiveReasoning.map((node) => <li key={node.id}>{node.label}</li>)}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">No reasoning step is labelled decisive because this result is not determined.</p>
          )}
          <h4 className="mt-5 text-sm font-semibold text-ink">Binding rules on that path</h4>
          {decisiveRules.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm text-ink-soft">
              {decisiveRules.map((node) => (
                <li key={node.id}>
                  {node.record?.kind === "external-resource" || node.record?.kind === "dataset-record" ? (
                    <a href={node.record.href} target="_blank" rel="noreferrer noopener" className="font-medium text-accent hover:text-accent-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{node.label}</a>
                  ) : <span className="font-medium text-ink">{node.label}</span>}
                  <span className="ml-2">{node.description}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">No binding rule is labelled applied because this result is not determined.</p>
          )}
          <h4 className="mt-5 text-sm font-semibold text-ink">Visible gaps and boundaries</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
            {graphGaps.map((node) => <li key={node.id}><strong className="text-ink">{node.label}:</strong> {node.description}</li>)}
          </ul>
        </div>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-ink-soft">
          {result.reasoning.steps.map((step) => <li key={step.id}>{step.statement}</li>)}
        </ol>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {result.evidence.sources.map((source) => (
            <a key={source.id} href={source.url} target="_blank" rel="noreferrer noopener" className="rounded-2xl border border-line p-4 hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <span className="text-xs font-semibold uppercase tracking-wide text-accent">{sourceKind(source.kind)} · {legalForce(source.legalForce)}</span>
              <span className="mt-1 block font-medium text-ink">{source.title}</span>
              <span className="mt-1 block text-xs text-ink-soft">Retrieved {formatDate(source.retrievedOn)} · scheduled review {formatDate(source.reviewDueOn)}</span>
              <span className="mt-3 block text-xs text-ink-soft"><strong className="text-ink">Does not prove:</strong> {source.doesNotProve.join(" ")}</span>
            </a>
          ))}
        </div>
      </details>

      <p className="mt-5 text-xs text-ink-soft">{result.dataUse.retention}</p>
    </section>
  );
}

function FutureYearFields({
  year,
  residenceId,
  residence,
  onResidence,
  selfEmploymentId,
  selfEmployment,
  ukPropertyId,
  ukProperty,
  foreignPropertyId,
  foreignProperty,
  errors,
  set,
}: {
  year: string;
  residenceId: "residence2025" | "residence2026";
  residence: MtdResidence;
  onResidence: (value: MtdResidence) => void;
  selfEmploymentId: "selfEmployment2025" | "selfEmployment2026";
  selfEmployment: string;
  ukPropertyId: "ukProperty2025" | "ukProperty2026";
  ukProperty: string;
  foreignPropertyId: "foreignProperty2025" | "foreignProperty2026";
  foreignProperty: string;
  errors: Record<string, string>;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-line p-4">
      <h3 className="font-semibold text-ink">{year} forecast</h3>
      <ResidenceField id={residenceId} label={`Expected residence in ${year}`} value={residence} onChange={onResidence} />
      <MoneyField id={selfEmploymentId} label="Gross UK-return self-employment" value={selfEmployment} error={errors[selfEmploymentId]} onChange={(value) => set(selfEmploymentId, value)} />
      <MoneyField id={ukPropertyId} label="Gross UK property" value={ukProperty} error={errors[ukPropertyId]} onChange={(value) => set(ukPropertyId, value)} />
      <MoneyField id={foreignPropertyId} label="Gross foreign property" value={foreignProperty} error={errors[foreignPropertyId]} onChange={(value) => set(foreignPropertyId, value)} />
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-line bg-white p-4"><p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p><p className="mt-2 text-xl font-semibold text-ink">{value}</p></div>;
}

function Choice({ id, label, value, onChange }: { id: string; label: string; value: AnswerChoice; onChange: (value: AnswerChoice) => void }) {
  return <SelectField id={id} label={label} value={value} onChange={(next) => onChange(next as AnswerChoice)} options={[["unknown", "Not sure"], ["yes", "Yes"], ["no", "No"]]} />;
}

function ResidenceField({ id, label, value, onChange }: { id: string; label: string; value: MtdResidence; onChange: (value: MtdResidence) => void }) {
  return <SelectField id={id} label={label} value={value} onChange={(next) => onChange(next as MtdResidence)} options={[["unknown", "Not sure"], ["uk-resident", "UK resident"], ["non-uk-resident", "Not UK resident"]]} />;
}

function SelectField({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-base font-medium text-ink">{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-ink-soft bg-white px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        {options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}
      </select>
    </label>
  );
}

function MoneyField({ id, label, value, error, onChange }: { id: keyof FormState; label: string; value: string; error?: string; onChange: (value: string) => void }) {
  const errorId = `${id}-error`;
  return (
    <label htmlFor={id} className="block">
      <span className="block text-base font-medium text-ink">{label}</span>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} inputMode="decimal" placeholder="£0" aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} className="mt-2 h-11 w-full rounded-xl border border-ink-soft bg-white px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" />
      {error ? <span id={errorId} className="mt-1 block text-sm text-red-700">{error}</span> : null}
    </label>
  );
}

function DateField({ id, label, value, error, onChange }: { id: keyof FormState; label: string; value: string; error?: string; onChange: (value: string) => void }) {
  const errorId = `${id}-error`;
  return (
    <label htmlFor={id} className="block">
      <span className="block text-base font-medium text-ink">{label}</span>
      <input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} className="mt-2 h-11 w-full rounded-xl border border-ink-soft bg-white px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" />
      {error ? <span id={errorId} className="mt-1 block text-sm text-red-700">{error}</span> : null}
    </label>
  );
}
