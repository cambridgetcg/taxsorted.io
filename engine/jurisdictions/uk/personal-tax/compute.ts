import { configForTaxYear } from "./config";
import type { UkCgtInput, UkCgtResult, UkIncomeTaxInput, UkIncomeTaxResult } from "./types";

function money(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function roundPence(value: number) {
  return Math.round(value * 100) / 100;
}

export function personalAllowanceFor(adjustedNetIncome: number, taxYear: UkIncomeTaxInput["taxYear"] = "2026/27") {
  const cfg = configForTaxYear(taxYear);
  const income = money(adjustedNetIncome);
  const excess = Math.max(0, income - cfg.personalAllowanceTaperStarts);
  const lost = Math.min(cfg.personalAllowance, excess * cfg.personalAllowanceTaperRate);
  return {
    allowance: roundPence(cfg.personalAllowance - lost),
    lost: roundPence(lost),
  };
}

export function computeUkIncomeTax(input: UkIncomeTaxInput): UkIncomeTaxResult {
  const taxYear = input.taxYear ?? "2026/27";
  const cfg = configForTaxYear(taxYear);
  const employmentIncome = money(input.employmentIncome);
  const allowance = personalAllowanceFor(employmentIncome, taxYear);
  const taxableIncome = Math.max(0, employmentIncome - allowance.allowance);

  const basicSlice = Math.min(taxableIncome, cfg.basicRateLimitTaxable);
  const higherSlice = Math.min(Math.max(0, taxableIncome - cfg.basicRateLimitTaxable), cfg.higherRateLimitTaxable - cfg.basicRateLimitTaxable);
  const additionalSlice = Math.max(0, taxableIncome - cfg.higherRateLimitTaxable);

  const basicTax = basicSlice * cfg.incomeRates.basic;
  const higherTax = higherSlice * cfg.incomeRates.higher;
  const additionalTax = additionalSlice * cfg.incomeRates.additional;
  const totalIncomeTax = roundPence(basicTax + higherTax + additionalTax);

  // Approximate marginal income-tax rate only, ignoring NI/student loans.
  let marginalRateApprox: number = cfg.incomeRates.basic;
  if (employmentIncome > cfg.personalAllowanceTaperStarts && allowance.allowance > 0) {
    marginalRateApprox = cfg.incomeRates.higher * 1.5; // 40% on the £1 + 40% on lost £0.50 allowance
  } else if (taxableIncome > cfg.higherRateLimitTaxable) {
    marginalRateApprox = cfg.incomeRates.additional;
  } else if (taxableIncome > cfg.basicRateLimitTaxable) {
    marginalRateApprox = cfg.incomeRates.higher;
  } else if (taxableIncome <= 0) {
    marginalRateApprox = 0;
  }

  return {
    taxYear,
    employmentIncome,
    personalAllowance: allowance.allowance,
    personalAllowanceLost: allowance.lost,
    taxableIncome: roundPence(taxableIncome),
    basicTax: roundPence(basicTax),
    higherTax: roundPence(higherTax),
    additionalTax: roundPence(additionalTax),
    totalIncomeTax,
    effectiveRate: employmentIncome > 0 ? totalIncomeTax / employmentIncome : 0,
    marginalRateApprox,
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
