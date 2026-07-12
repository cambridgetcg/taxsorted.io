import { configForTaxYear } from "./config";
import type { UkCgtInput, UkCgtResult, UkIncomeTaxInput, UkIncomeTaxResult } from "./types";
import { computeRestOfUkNonSavingsIncomeTaxPence } from "../personal/threshold-engine";

function money(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function roundPence(value: number) {
  return Math.round(value * 100) / 100;
}

const toPence = (value: number): number => Math.round(money(value) * 100);
const fromPence = (value: number): number => value / 100;

export function personalAllowanceFor(adjustedNetIncome: number, taxYear: UkIncomeTaxInput["taxYear"] = "2026/27") {
  configForTaxYear(taxYear);
  const canonical = computeRestOfUkNonSavingsIncomeTaxPence({
    totalIncomePence: toPence(adjustedNetIncome),
    adjustedNetIncomePence: toPence(adjustedNetIncome),
  });
  return {
    allowance: fromPence(canonical.personalAllowancePence),
    lost: fromPence(canonical.personalAllowanceLostPence),
  };
}

export function computeUkIncomeTax(input: UkIncomeTaxInput): UkIncomeTaxResult {
  const taxYear = input.taxYear ?? "2026/27";
  configForTaxYear(taxYear);
  const employmentIncome = money(input.employmentIncome);
  const canonical = computeRestOfUkNonSavingsIncomeTaxPence({
    totalIncomePence: toPence(employmentIncome),
  });
  const totalIncomeTax = fromPence(canonical.totalIncomeTaxPence);

  return {
    taxYear,
    employmentIncome,
    personalAllowance: fromPence(canonical.personalAllowancePence),
    personalAllowanceLost: fromPence(canonical.personalAllowanceLostPence),
    taxableIncome: fromPence(canonical.taxableIncomePence),
    basicTax: fromPence(canonical.basicTaxPence),
    higherTax: fromPence(canonical.higherTaxPence),
    additionalTax: fromPence(canonical.additionalTaxPence),
    totalIncomeTax,
    effectiveRate: employmentIncome > 0 ? totalIncomeTax / employmentIncome : 0,
    marginalRateApprox: canonical.marginalRateApprox,
  };
}

export function computeUkCgt(input: UkCgtInput): UkCgtResult {
  const taxYear = input.taxYear ?? "2026/27";
  const cfg = configForTaxYear(taxYear);
  const gains = money(input.gains);
  const relief = input.relief ?? "none";
  const taxableIncomeBeforeGains = money(input.taxableIncomeBeforeGains ?? 0);
  const taxableGains = Math.max(0, gains - cfg.cgtAnnualExemptAmount);

  if (relief === "badr") {
    const cgt = roundPence(taxableGains * cfg.cgtRates.badr);
    return {
      taxYear,
      gains,
      annualExemptAmount: cfg.cgtAnnualExemptAmount,
      taxableGains: roundPence(taxableGains),
      basicRateGains: 0,
      higherRateGains: roundPence(taxableGains),
      cgt,
      effectiveRate: gains > 0 ? cgt / gains : 0,
      relief,
    };
  }

  const basicBandRemaining = Math.max(0, cfg.basicRateLimitTaxable - taxableIncomeBeforeGains);
  const basicRateGains = Math.min(taxableGains, basicBandRemaining);
  const higherRateGains = Math.max(0, taxableGains - basicRateGains);
  const cgt = roundPence(basicRateGains * cfg.cgtRates.basic + higherRateGains * cfg.cgtRates.higher);

  return {
    taxYear,
    gains,
    annualExemptAmount: cfg.cgtAnnualExemptAmount,
    taxableGains: roundPence(taxableGains),
    basicRateGains: roundPence(basicRateGains),
    higherRateGains: roundPence(higherRateGains),
    cgt,
    effectiveRate: gains > 0 ? cgt / gains : 0,
    relief,
  };
}

export function compareUkIncomeAndGains(amount: number) {
  const income = computeUkIncomeTax({ employmentIncome: amount });
  const gains = computeUkCgt({ gains: amount, taxableIncomeBeforeGains: 0 });
  return {
    amount: money(amount),
    asEmploymentIncome: income.totalIncomeTax,
    asCapitalGain: gains.cgt,
    difference: roundPence(income.totalIncomeTax - gains.cgt),
    incomeEffectiveRate: income.effectiveRate,
    gainsEffectiveRate: gains.effectiveRate,
  };
}
