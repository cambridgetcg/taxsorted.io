"use client";

// i18n: deferred to the personal-tax language-pack follow-up.

import { FormEvent, useId, useState } from "react";
import {
  annualChildBenefit,
  assessThresholdInteractions,
  type ThresholdInteractionAssessment,
} from "@taxsorted/engine/uk/personal";
import { EducationNotice } from "@/components/prep/education-notice";
import { gbp } from "@/lib/format";
import {
  INVALID_AMOUNT_MESSAGE,
  parsePounds,
  parsePoundsToQuarterPence,
} from "@/lib/parse";

type PartnerMode = "unanswered" | "none" | "known" | "unknown";
type Claimant = "individual" | "partner" | "unknown" | "someone-else";
type Field =
  | "form"
  | "totalIncome"
  | "pensionNet"
  | "giftAidNet"
  | "hicbcPartnerMode"
  | "hicbcPartnerAni"
  | "taxFreeChildcarePartnerMode"
  | "taxFreeChildcarePartnerAni"
  | "claimant"
  | "childBenefitChildren"
  | "ordinaryChildcareChildren"
  | "disabledChildcareChildren";

const MAX_CHILD_COUNT = 50;
const INVALID_ANI_MESSAGE = "Enter a number in pounds, like 75000. A rough figure is fine.";
const exactGbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const inputClass = [
  "mt-1 flex h-11 w-full rounded-lg border border-ink-soft bg-white px-3 py-2 text-base text-ink",
  "placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-accent focus-visible:ring-offset-2",
].join(" ");

function optionalPence(raw: string): number | "invalid" {
  const parsed = parsePounds(raw);
  return parsed === "blank" ? 0 : parsed;
}

function wholeCount(raw: string): number | "invalid" {
  if (raw.trim() === "") return 0;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= MAX_CHILD_COUNT
    ? parsed
    : "invalid";
}

function optionalWholeCount(raw: string): number | "blank" | "invalid" {
  if (raw.trim() === "") return "blank";
  return wholeCount(raw);
}

function ResultCard({
  title,
  headline,
  body,
  tone = "plain",
}: {
  title: string;
  headline: string;
  body: string;
  tone?: "plain" | "good" | "attention";
}) {
  const toneClass = tone === "good"
    ? "border-accent/40 bg-accent-soft"
    : tone === "attention"
      ? "border-amber-300 bg-amber-50"
      : "border-line bg-white";
  return (
    <article className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{title}</p>
      <h4 className="mt-2 text-xl font-semibold text-ink">{headline}</h4>
      <p className="mt-2 text-sm text-ink-soft">{body}</p>
    </article>
  );
}

export function PersonalThresholdCheck() {
  const id = useId();
  const [totalIncome, setTotalIncome] = useState("");
  const [pensionNet, setPensionNet] = useState("");
  const [giftAidNet, setGiftAidNet] = useState("");
  const [hicbcPartnerMode, setHicbcPartnerMode] = useState<PartnerMode>("unanswered");
  const [hicbcPartnerAni, setHicbcPartnerAni] = useState("");
  const [taxFreeChildcarePartnerMode, setTaxFreeChildcarePartnerMode] = useState<PartnerMode>("unanswered");
  const [taxFreeChildcarePartnerAni, setTaxFreeChildcarePartnerAni] = useState("");
  const [claimant, setClaimant] = useState<Claimant>("unknown");
  const [childBenefitChildren, setChildBenefitChildren] = useState("");
  const [ordinaryChildcareChildren, setOrdinaryChildcareChildren] = useState("0");
  const [disabledChildcareChildren, setDisabledChildcareChildren] = useState("0");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [result, setResult] = useState<ThresholdInteractionAssessment | null>(null);

  function clearFieldErrors(...fields: Field[]) {
    setErrors((current) => {
      const next = { ...current };
      for (const field of fields) delete next[field];
      delete next.form;
      return next;
    });
  }

  function change(field: Field, setter: (value: string) => void, value: string) {
    setter(value);
    setResult(null);
    clearFieldErrors(field);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Record<Field, string>> = {};
    const total = parsePounds(totalIncome);
    if (total === "blank") nextErrors.totalIncome = "Enter your expected total taxable income.";
    if (total === "invalid") nextErrors.totalIncome = INVALID_AMOUNT_MESSAGE;
    const pension = optionalPence(pensionNet);
    if (pension === "invalid") nextErrors.pensionNet = INVALID_AMOUNT_MESSAGE;
    const giftAid = optionalPence(giftAidNet);
    if (giftAid === "invalid") nextErrors.giftAidNet = INVALID_AMOUNT_MESSAGE;
    const benefitChildren = optionalWholeCount(childBenefitChildren);
    if (benefitChildren === "invalid") {
      nextErrors.childBenefitChildren = `Enter a whole number from 0 to ${MAX_CHILD_COUNT}.`;
    }
    const ordinaryChildren = wholeCount(ordinaryChildcareChildren);
    if (ordinaryChildren === "invalid") {
      nextErrors.ordinaryChildcareChildren = `Enter a whole number from 0 to ${MAX_CHILD_COUNT}.`;
    }
    const disabledChildren = wholeCount(disabledChildcareChildren);
    if (disabledChildren === "invalid") {
      nextErrors.disabledChildcareChildren = `Enter a whole number from 0 to ${MAX_CHILD_COUNT}.`;
    }

    const hicbcRequested = typeof benefitChildren === "number" && benefitChildren > 0;
    const childcareRequested = typeof ordinaryChildren === "number"
      && typeof disabledChildren === "number"
      && ordinaryChildren + disabledChildren > 0;
    let hicbcPartnerQuarterPence: number | "invalid" = 0;
    if (hicbcRequested && hicbcPartnerMode === "unanswered") {
      nextErrors.hicbcPartnerMode = "Choose your partner situation for the Child Benefit charge.";
    }
    if (hicbcRequested && hicbcPartnerMode === "known") {
      const parsed = parsePoundsToQuarterPence(hicbcPartnerAni);
      if (parsed === "blank") {
        nextErrors.hicbcPartnerAni = "Enter your partner's expected adjusted net income (ANI).";
      }
      if (parsed === "invalid") nextErrors.hicbcPartnerAni = INVALID_ANI_MESSAGE;
      hicbcPartnerQuarterPence = parsed === "blank" ? "invalid" : parsed;
    }
    let childcarePartnerQuarterPence: number | "invalid" = 0;
    if (childcareRequested && taxFreeChildcarePartnerMode === "unanswered") {
      nextErrors.taxFreeChildcarePartnerMode = "Choose your partner situation for Tax-Free Childcare.";
    }
    if (childcareRequested && taxFreeChildcarePartnerMode === "known") {
      const parsed = parsePoundsToQuarterPence(taxFreeChildcarePartnerAni);
      if (parsed === "blank") {
        nextErrors.taxFreeChildcarePartnerAni = "Enter your childcare partner's expected adjusted net income.";
      }
      if (parsed === "invalid") nextErrors.taxFreeChildcarePartnerAni = INVALID_ANI_MESSAGE;
      childcarePartnerQuarterPence = parsed === "blank" ? "invalid" : parsed;
    }
    if (hicbcRequested && claimant === "someone-else") {
      nextErrors.claimant = "This check only covers you and the partner above. For anyone else, use HMRC's period-aware calculator.";
    }
    if (
      Object.keys(nextErrors).length > 0
      || typeof total !== "number"
      || benefitChildren === "invalid"
      || ordinaryChildren === "invalid"
      || disabledChildren === "invalid"
      || hicbcPartnerQuarterPence === "invalid"
      || childcarePartnerQuarterPence === "invalid"
    ) {
      setErrors(nextErrors);
      setResult(null);
      return;
    }

    const partnerFor = (mode: PartnerMode, partnerQuarterPence: number) => mode === "none"
      ? { status: "none" as const }
      : mode === "known"
        ? { status: "known" as const, adjustedNetIncomeQuarterPence: partnerQuarterPence }
        : { status: "unknown" as const };
    const hicbcPartner = partnerFor(hicbcPartnerMode, hicbcPartnerQuarterPence);
    const taxFreeChildcarePartner = partnerFor(
      taxFreeChildcarePartnerMode,
      childcarePartnerQuarterPence,
    );
    const annualBenefit = benefitChildren === "blank"
      ? undefined
      : benefitChildren === 0
        ? 0
        : Math.round(annualChildBenefit(benefitChildren) * 100);
    const childcareChildren = ordinaryChildren + disabledChildren > 0
      ? { ordinary: ordinaryChildren, disabled: disabledChildren }
      : undefined;

    try {
      const assessment = assessThresholdInteractions({
        taxYear: "2026-27",
        individual: {
          totalTaxableIncomePence: total,
          reliefAtSourcePensionContributionsNetPence: pension as number,
          giftAidDonationsNetPence: giftAid as number,
        },
        hicbcPartner,
        taxFreeChildcarePartner,
        annualChildBenefitPence: annualBenefit,
        childBenefitClaimant: claimant === "individual" || claimant === "partner"
          ? claimant
          : undefined,
        taxFreeChildcareChildren: childcareChildren,
      });
      setErrors({});
      setResult(assessment);
    } catch (error) {
      setResult(null);
      setErrors({
        form: error instanceof RangeError
          ? "These figures are outside the check's safe calculation range. Review them or use HMRC's calculator."
          : "The check could not calculate these figures.",
      });
    }
  }

  const ani = result?.adjustedNetIncome.amountPence ?? null;
  const aniQuarterPence = result?.adjustedNetIncome.amountQuarterPence ?? null;
  const aniDisplay = aniQuarterPence !== null && aniQuarterPence % 4 !== 0
    ? exactGbp.format(aniQuarterPence / 400)
    : gbp(ani ?? 0);
  const overOneHundredThousandQuarterPence = aniQuarterPence === null
    ? 0
    : Math.max(0, aniQuarterPence - 10_000_000 * 4);
  const distanceToOneHundredThousandPence = Math.ceil(
    overOneHundredThousandQuarterPence / 4,
  );
  const pa = result?.personalAllowance;
  const hicbc = result?.highIncomeChildBenefitCharge;
  const tfc = result?.taxFreeChildcare;
  const errorSummary = Object.values(errors).filter((message): message is string => Boolean(message));
  const hicbcBody = hicbc?.status === "not-checked"
    ? "Add the children covered by full-year Child Benefit payments, or enter 0 for no payments."
    : hicbc?.status === "needs-facts"
      ? hicbc.missingFacts.includes("hicbcPartner.adjustedNetIncome")
        ? "Your partner's ANI is needed before we can say who would pay, and how much."
        : "The supplied ANIs are equal and above £60,000, so the Child Benefit claimant is needed to identify who pays."
      : hicbc?.status === "charge"
        ? `${hicbc.liablePerson === "partner" ? "Your partner has" : "You have"} the higher ANI on the supplied facts.`
        : "No HICBC is due on the supplied full-year payment and income facts.";
  const tfcBody = tfc?.status === "not-checked"
    ? "Add at least one child above to check the income condition."
    : tfc?.status === "needs-facts"
      ? "Blank stays unknown; it is never silently treated as zero."
      : tfc?.status === "fails-income-test"
        ? `The supplied income fails the condition for up to ${gbp(tfc.potentialAnnualTopUpPence ?? 0)} of potential annual top-up. Other eligibility rules remain separate.`
        : `${gbp(tfc?.potentialAnnualTopUpPence ?? 0)} is the maximum potential annual top-up for the child counts supplied. Other eligibility rules still apply.`;

  return (
    <section id="threshold-check" className="mt-12" aria-labelledby={`${id}-title`} lang="en" dir="ltr">
      <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Private — runs in your browser</p>
        <h2 id={`${id}-title`} className="mt-2 text-3xl font-bold tracking-tight text-ink">
          Check your £60,000 and £100,000 position
        </h2>
        <p className="mt-3 max-w-3xl text-base text-ink-soft">
          Your adjusted net income (ANI) is your income after certain deductions, like pension
          payments and Gift Aid. It decides three things: your tax-free Personal Allowance,
          whether you repay Child Benefit, and Tax-Free Childcare. Nothing you type is sent,
          saved or submitted.
        </p>
        <p className="mt-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-ink">
          2026/27 tax year · 6 April 2026 to 5 April 2027
        </p>

        <form className="mt-7 space-y-7" onSubmit={submit} noValidate>
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className={errorSummary.length > 0
              ? "rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800"
              : "sr-only"}
          >
            {errorSummary.length > 0 ? `Check the form: ${errorSummary.join(" ")}` : ""}
          </div>
          <fieldset>
            <legend className="text-lg font-semibold text-ink">1. Work out your adjusted net income (ANI)</legend>
            <p className="mt-1 text-base text-ink-soft">
              Start with your taxable income before the Personal Allowance comes off: pay and benefits, business
              profit, rent, pensions, interest, dividends, taxable benefits, foreign and trust income.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="text-base font-medium text-ink" htmlFor={`${id}-income`}>
                Total taxable income (£, required)
                <input
                  id={`${id}-income`}
                  value={totalIncome}
                  onChange={(event) => change("totalIncome", setTotalIncome, event.target.value)}
                  className={inputClass}
                  inputMode="decimal"
                  placeholder="112,000"
                  required
                  aria-required="true"
                  aria-invalid={errors.totalIncome ? true : undefined}
                  aria-describedby={errors.totalIncome ? `${id}-income-error` : undefined}
                />
                {errors.totalIncome ? <span id={`${id}-income-error`} className="mt-1 block text-sm text-red-700">{errors.totalIncome}</span> : null}
              </label>
              <label className="text-base font-medium text-ink" htmlFor={`${id}-pension`}>
                Money you paid into your pension from your bank account (£, optional)
                <input
                  id={`${id}-pension`}
                  value={pensionNet}
                  onChange={(event) => change("pensionNet", setPensionNet, event.target.value)}
                  className={inputClass}
                  inputMode="decimal"
                  placeholder="9,600"
                  aria-invalid={errors.pensionNet ? true : undefined}
                  aria-describedby={errors.pensionNet ? `${id}-pension-error` : undefined}
                />
                {errors.pensionNet ? <span id={`${id}-pension-error`} className="mt-1 block text-sm text-red-700">{errors.pensionNet}</span> : null}
              </label>
              <label className="text-base font-medium text-ink" htmlFor={`${id}-gift-aid`}>
                Gift Aid donations you paid from your bank account (£, optional)
                <input
                  id={`${id}-gift-aid`}
                  value={giftAidNet}
                  onChange={(event) => change("giftAidNet", setGiftAidNet, event.target.value)}
                  className={inputClass}
                  inputMode="decimal"
                  placeholder="0"
                  aria-invalid={errors.giftAidNet ? true : undefined}
                  aria-describedby={errors.giftAidNet ? `${id}-gift-error` : undefined}
                />
                {errors.giftAidNet ? <span id={`${id}-gift-error`} className="mt-1 block text-sm text-red-700">{errors.giftAidNet}</span> : null}
              </label>
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              We add the 20% tax relief back to pension and Gift Aid payments for you (× 1.25) —
              HMRC calls this &ldquo;relief at source&rdquo;. Other deductions and add-backs can
              change ANI; use HMRC&apos;s full method for a final figure.
            </p>
          </fieldset>

          <fieldset>
            <legend className="text-lg font-semibold text-ink">2. Child Benefit — will some be clawed back?</legend>
            <p id={`${id}-hicbc-help`} className="mt-1 max-w-3xl text-base text-ink-soft">
              If you or your partner has ANI over £60,000, some Child Benefit may have to be paid
              back. This is the High Income Child Benefit Charge (HICBC).
            </p>
            <details className="mt-2 max-w-3xl text-sm text-ink-soft">
              <summary className="cursor-pointer font-medium text-ink">Who counts as a partner for this charge?</summary>
              <p className="mt-2">
                A spouse or civil partner you are not separated from — under a court order, or in a
                way likely to be permanent. Or someone you live with as if married or civil partners.
              </p>
              <p className="mt-2">
                This simple check assumes the same relationship and payments all year. For changed
                periods, or a claimant outside this pair, use the{" "}
                <a
                  href="https://www.gov.uk/child-benefit-tax-calculator"
                  className="font-medium text-accent underline hover:text-accent-deep"
                >
                  HMRC Child Benefit tax calculator
                </a>.
              </p>
            </details>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-base font-medium text-ink" htmlFor={`${id}-benefit-children`}>
                Children covered by payments received for the full 2026/27 year
                <input
                  id={`${id}-benefit-children`}
                  value={childBenefitChildren}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    change("childBenefitChildren", setChildBenefitChildren, nextValue);
                    const nextCount = optionalWholeCount(nextValue);
                    if (nextCount === "blank" || nextCount === 0) {
                      clearFieldErrors("hicbcPartnerMode", "hicbcPartnerAni", "claimant");
                    }
                  }}
                  className={inputClass}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={MAX_CHILD_COUNT}
                  step="1"
                  placeholder="Leave blank to skip"
                  aria-invalid={errors.childBenefitChildren ? true : undefined}
                  aria-describedby={`${id}-benefit-help${errors.childBenefitChildren ? ` ${id}-benefit-children-error` : ""}`}
                />
                <span id={`${id}-benefit-help`} className="mt-1 block text-xs font-normal text-ink-soft">
                  Enter 0 if no payments were received or they were opted out for the full year.
                  Use HMRC for part-year awards or opt-outs.
                </span>
                {errors.childBenefitChildren ? <span id={`${id}-benefit-children-error`} className="mt-1 block text-sm text-red-700">{errors.childBenefitChildren}</span> : null}
              </label>
              <label className="text-base font-medium text-ink" htmlFor={`${id}-hicbc-partner-mode`}>
                Partner situation for this charge (HICBC)
                <select
                  id={`${id}-hicbc-partner-mode`}
                  value={hicbcPartnerMode}
                  onChange={(event) => {
                    const nextMode = event.target.value as PartnerMode;
                    setHicbcPartnerMode(nextMode);
                    if (nextMode === "none" && claimant === "partner") setClaimant("unknown");
                    setResult(null);
                    clearFieldErrors("hicbcPartnerMode", "hicbcPartnerAni");
                  }}
                  className={inputClass}
                  required={Number(childBenefitChildren) > 0}
                  aria-required={Number(childBenefitChildren) > 0 ? "true" : undefined}
                  aria-invalid={errors.hicbcPartnerMode ? true : undefined}
                  aria-describedby={`${id}-hicbc-help${errors.hicbcPartnerMode ? ` ${id}-hicbc-partner-mode-error` : ""}`}
                >
                  <option value="unanswered">Choose when checking payments</option>
                  <option value="none">No partner under this definition</option>
                  <option value="known">Partner — I know their ANI</option>
                  <option value="unknown">Partner — their ANI is unknown</option>
                </select>
                {errors.hicbcPartnerMode ? <span id={`${id}-hicbc-partner-mode-error`} className="mt-1 block text-sm text-red-700">{errors.hicbcPartnerMode}</span> : null}
              </label>
              {hicbcPartnerMode === "known" ? (
                <label className="text-base font-medium text-ink" htmlFor={`${id}-hicbc-partner-income`}>
                  Partner&apos;s expected ANI for this charge (£, required)
                  <input
                    id={`${id}-hicbc-partner-income`}
                    value={hicbcPartnerAni}
                    onChange={(event) => change("hicbcPartnerAni", setHicbcPartnerAni, event.target.value)}
                    className={inputClass}
                    inputMode="decimal"
                    placeholder="75,000"
                    required={Number(childBenefitChildren) > 0}
                    aria-required={Number(childBenefitChildren) > 0 ? "true" : undefined}
                    aria-invalid={errors.hicbcPartnerAni ? true : undefined}
                    aria-describedby={`${id}-hicbc-partner-precision${errors.hicbcPartnerAni ? ` ${id}-hicbc-partner-error` : ""}`}
                  />
                  <span id={`${id}-hicbc-partner-precision`} className="mt-1 block text-xs font-normal text-ink-soft">
                    A rough figure is fine — whole pounds work, like 75,000.
                  </span>
                  {errors.hicbcPartnerAni ? <span id={`${id}-hicbc-partner-error`} className="mt-1 block text-sm text-red-700">{errors.hicbcPartnerAni}</span> : null}
                </label>
              ) : <div />}
              {Number(childBenefitChildren) > 0 ? (
                <label className="text-base font-medium text-ink" htmlFor={`${id}-claimant`}>
                  Who received the Child Benefit payments?
                  <select
                    id={`${id}-claimant`}
                    value={claimant}
                    onChange={(event) => {
                      setClaimant(event.target.value as Claimant);
                      setResult(null);
                      clearFieldErrors("claimant");
                    }}
                    className={inputClass}
                    aria-invalid={errors.claimant ? true : undefined}
                    aria-describedby={errors.claimant ? `${id}-claimant-error` : undefined}
                  >
                    <option value="unknown">Not sure</option>
                    <option value="individual">I did</option>
                    {hicbcPartnerMode !== "none" ? <option value="partner">My partner did</option> : null}
                    <option value="someone-else">Someone outside this pair</option>
                  </select>
                  {errors.claimant ? <span id={`${id}-claimant-error`} className="mt-1 block text-sm text-red-700">{errors.claimant}</span> : null}
                </label>
              ) : <div />}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-lg font-semibold text-ink">3. Tax-Free Childcare — does your income pass its test?</legend>
            <p id={`${id}-childcare-partner-help`} className="mt-1 max-w-3xl text-base text-ink-soft">
              Tax-Free Childcare has its own income test — and its own partner rule.
              For childcare, a partner is a spouse or civil partner in the same household,
              or someone you live with as a couple. This can differ from the Child Benefit answer above.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-base font-medium text-ink" htmlFor={`${id}-childcare-ordinary`}>
                Non-disabled children to check for Tax-Free Childcare
                <input
                  id={`${id}-childcare-ordinary`}
                  value={ordinaryChildcareChildren}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    change("ordinaryChildcareChildren", setOrdinaryChildcareChildren, nextValue);
                    const nextOrdinary = wholeCount(nextValue);
                    const currentDisabled = wholeCount(disabledChildcareChildren);
                    if (
                      typeof nextOrdinary === "number"
                      && typeof currentDisabled === "number"
                      && nextOrdinary + currentDisabled === 0
                    ) {
                      clearFieldErrors(
                        "taxFreeChildcarePartnerMode",
                        "taxFreeChildcarePartnerAni",
                      );
                    }
                  }}
                  className={inputClass}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={MAX_CHILD_COUNT}
                  step="1"
                  aria-invalid={errors.ordinaryChildcareChildren ? true : undefined}
                  aria-describedby={errors.ordinaryChildcareChildren ? `${id}-childcare-ordinary-error` : undefined}
                />
                {errors.ordinaryChildcareChildren ? <span id={`${id}-childcare-ordinary-error`} className="mt-1 block text-sm text-red-700">{errors.ordinaryChildcareChildren}</span> : null}
              </label>
              <label className="text-base font-medium text-ink" htmlFor={`${id}-childcare-disabled`}>
                Disabled children (do not include them above)
                <input
                  id={`${id}-childcare-disabled`}
                  value={disabledChildcareChildren}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    change("disabledChildcareChildren", setDisabledChildcareChildren, nextValue);
                    const currentOrdinary = wholeCount(ordinaryChildcareChildren);
                    const nextDisabled = wholeCount(nextValue);
                    if (
                      typeof currentOrdinary === "number"
                      && typeof nextDisabled === "number"
                      && currentOrdinary + nextDisabled === 0
                    ) {
                      clearFieldErrors(
                        "taxFreeChildcarePartnerMode",
                        "taxFreeChildcarePartnerAni",
                      );
                    }
                  }}
                  className={inputClass}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={MAX_CHILD_COUNT}
                  step="1"
                  aria-invalid={errors.disabledChildcareChildren ? true : undefined}
                  aria-describedby={errors.disabledChildcareChildren ? `${id}-childcare-disabled-error` : undefined}
                />
                {errors.disabledChildcareChildren ? <span id={`${id}-childcare-disabled-error`} className="mt-1 block text-sm text-red-700">{errors.disabledChildcareChildren}</span> : null}
              </label>
              <label className="text-base font-medium text-ink" htmlFor={`${id}-childcare-partner-mode`}>
                Partner situation for Tax-Free Childcare
                <select
                  id={`${id}-childcare-partner-mode`}
                  value={taxFreeChildcarePartnerMode}
                  onChange={(event) => {
                    setTaxFreeChildcarePartnerMode(event.target.value as PartnerMode);
                    setResult(null);
                    clearFieldErrors("taxFreeChildcarePartnerMode", "taxFreeChildcarePartnerAni");
                  }}
                  className={inputClass}
                  required={Number(ordinaryChildcareChildren) + Number(disabledChildcareChildren) > 0}
                  aria-required={Number(ordinaryChildcareChildren) + Number(disabledChildcareChildren) > 0 ? "true" : undefined}
                  aria-invalid={errors.taxFreeChildcarePartnerMode ? true : undefined}
                  aria-describedby={`${id}-childcare-partner-help${errors.taxFreeChildcarePartnerMode ? ` ${id}-childcare-partner-mode-error` : ""}`}
                >
                  <option value="unanswered">Choose when checking childcare</option>
                  <option value="none">No partner under this definition</option>
                  <option value="known">Partner — I know their ANI</option>
                  <option value="unknown">Partner — their ANI is unknown</option>
                </select>
                {errors.taxFreeChildcarePartnerMode ? <span id={`${id}-childcare-partner-mode-error`} className="mt-1 block text-sm text-red-700">{errors.taxFreeChildcarePartnerMode}</span> : null}
              </label>
              {taxFreeChildcarePartnerMode === "known" ? (
                <label className="text-base font-medium text-ink" htmlFor={`${id}-childcare-partner-income`}>
                  Childcare partner&apos;s expected ANI (£, required)
                  <input
                    id={`${id}-childcare-partner-income`}
                    value={taxFreeChildcarePartnerAni}
                    onChange={(event) => change("taxFreeChildcarePartnerAni", setTaxFreeChildcarePartnerAni, event.target.value)}
                    className={inputClass}
                    inputMode="decimal"
                    placeholder="75,000"
                    required={Number(ordinaryChildcareChildren) + Number(disabledChildcareChildren) > 0}
                    aria-required={Number(ordinaryChildcareChildren) + Number(disabledChildcareChildren) > 0 ? "true" : undefined}
                    aria-invalid={errors.taxFreeChildcarePartnerAni ? true : undefined}
                    aria-describedby={`${id}-childcare-partner-precision${errors.taxFreeChildcarePartnerAni ? ` ${id}-childcare-partner-error` : ""}`}
                  />
                  <span id={`${id}-childcare-partner-precision`} className="mt-1 block text-xs font-normal text-ink-soft">
                    A rough figure is fine — whole pounds work, like 75,000.
                  </span>
                  {errors.taxFreeChildcarePartnerAni ? <span id={`${id}-childcare-partner-error`} className="mt-1 block text-sm text-red-700">{errors.taxFreeChildcarePartnerAni}</span> : null}
                </label>
              ) : <div />}
            </div>
          </fieldset>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-base font-medium text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Check my thresholds
          </button>
        </form>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {result && ani !== null ? `Threshold results ready. Adjusted net income ${aniDisplay}.` : ""}
        </p>
      </div>

      {result && ani !== null && pa && hicbc && tfc ? (
        <div className="mt-6 rounded-3xl border border-line bg-paper p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Your adjusted net income (ANI)</p>
          <h3 className="mt-2 text-4xl font-bold tracking-tight text-ink">{aniDisplay}</h3>
          <p className="mt-2 text-base text-ink-soft">
            The Child Benefit clawback starts above £60,000. The Personal Allowance taper starts
            above £100,000; £100,000 exactly remains inside Tax-Free Childcare&apos;s per-person limit.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <ResultCard
              title="Personal Allowance"
              headline={pa.lostPence === 0 ? `${gbp(pa.amountPence ?? 0)} remains` : `${gbp(pa.lostPence ?? 0)} lost`}
              body={pa.lostPence === 0
                ? "No income-related taper on the supplied ANI."
                : `${gbp(pa.amountPence ?? 0)} of the standard allowance remains.`}
              tone={pa.lostPence === 0 ? "good" : "attention"}
            />
            <ResultCard
              title="High Income Child Benefit Charge"
              headline={hicbc.status === "not-checked"
                ? "Not checked"
                : hicbc.status === "needs-facts"
                  ? "One fact is still missing"
                  : hicbc.status === "no-charge"
                    ? "No charge on these facts"
                    : `${hicbc.chargePercent}% · ${gbp(hicbc.estimatedChargePence ?? 0)}`}
              body={hicbcBody}
              tone={hicbc.status === "charge" || hicbc.status === "needs-facts" ? "attention" : hicbc.status === "no-charge" ? "good" : "plain"}
            />
            <ResultCard
              title="Tax-Free Childcare income test"
              headline={tfc.status === "not-checked"
                ? "Not checked"
                : tfc.status === "needs-facts"
                  ? "Household partner ANI needed"
                  : tfc.status === "passes-income-test"
                    ? "Income test passes"
                    : "Income test fails"}
              body={tfcBody}
              tone={tfc.status === "passes-income-test" ? "good" : tfc.status === "fails-income-test" || tfc.status === "needs-facts" ? "attention" : "plain"}
            />
          </div>

          {overOneHundredThousandQuarterPence > 0 ? (
            <div className="mt-5 rounded-2xl border border-accent/30 bg-accent-soft p-5 text-base text-ink">
              <strong>Practical distance back to £100,000: {gbp(distanceToOneHundredThousandPence)} gross ANI.</strong>{" "}
              A relief-at-source pension payment is grossed up, so the equivalent net payment
              would be about {gbp(Math.ceil(distanceToOneHundredThousandPence * 0.8))}—but annual allowance,
              contribution method and your full circumstances must be checked first.
            </div>
          ) : null}

          <details className="mt-5 rounded-2xl border border-line bg-white p-4 text-sm text-ink-soft">
            <summary className="cursor-pointer font-medium text-ink">Method, limits and official receipts</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li><a className="text-accent underline hover:text-accent-deep" href={result.sources.adjustedNetIncome}>HMRC: adjusted net income method</a></li>
              <li><a className="text-accent underline hover:text-accent-deep" href={result.sources.personalAllowanceCalculation}>HMRC Tax Logic: Personal Allowance whole-pound calculation</a></li>
              <li><a className="text-accent underline hover:text-accent-deep" href={result.sources.highIncomeChildBenefitCharge}>HMRC: High Income Child Benefit Charge</a></li>
              <li><a className="text-accent underline hover:text-accent-deep" href={result.sources.highIncomeChildBenefitChargeLaw}>ITEPA 2003 s 681C: HICBC amount and whole-pound rounding</a></li>
              <li><a className="text-accent underline hover:text-accent-deep" href={result.sources.childBenefitCalculator}>HMRC: period-aware Child Benefit tax calculator</a></li>
              <li><a className="text-accent underline hover:text-accent-deep" href={result.sources.taxFreeChildcareEligibility}>GOV.UK: Tax-Free Childcare eligibility</a></li>
              <li><a className="text-accent underline hover:text-accent-deep" href={result.sources.taxFreeChildcarePartner}>HMRC: Tax-Free Childcare household-partner definition</a></li>
              <li>The HICBC estimate assumes the same relevant partnership and claimant facts for the full-year award entered; changed circumstances need a period-by-period check.</li>
              <li>Passing the childcare income condition does not decide age, work, immigration, provider or conflicting-support conditions.</li>
              <li>Ruleset {result.ruleset.version}, effective {result.ruleset.effectiveFrom}, reviewed {result.ruleset.reviewedOn}.</li>
            </ul>
          </details>

          <div className="mt-5"><EducationNotice /></div>
        </div>
      ) : null}
    </section>
  );
}
