import type { UkTaxYear } from "./types";
import { UK_PERSONAL_2026_27 } from "../personal/config";

export const UK_PERSONAL_TAX_2026_27 = {
  taxYear: "2026/27" as UkTaxYear,
  personalAllowance: UK_PERSONAL_2026_27.personalAllowance,
  personalAllowanceTaperStarts: UK_PERSONAL_2026_27.personalAllowanceIncomeLimit,
  personalAllowanceTaperRate: 0.5, // £1 allowance lost per £2 adjusted net income
  basicRateLimitTaxable: UK_PERSONAL_2026_27.bandsEnglandWalesNI.basic.taxableTo,
  // Taxable income remains in the higher-rate band through £125,140. Subtracting
  // the full Personal Allowance here was wrong because the allowance is already
  // fully tapered away by this edge.
  higherRateLimitTaxable: UK_PERSONAL_2026_27.bandsEnglandWalesNI.higher.taxableTo,
  incomeRates: {
    basic: UK_PERSONAL_2026_27.bandsEnglandWalesNI.basic.rate,
    higher: UK_PERSONAL_2026_27.bandsEnglandWalesNI.higher.rate,
    additional: UK_PERSONAL_2026_27.bandsEnglandWalesNI.additional.rate,
  },
  cgtAnnualExemptAmount: UK_PERSONAL_2026_27.capitalGains.annualExemptAmount,
  cgtRates: {
    basic: UK_PERSONAL_2026_27.capitalGains.rates.basic,
    higher: UK_PERSONAL_2026_27.capitalGains.rates.higherOrAdditional,
    badr: UK_PERSONAL_2026_27.capitalGains.rates.businessAssetDisposalRelief,
  },
  isaAnnualAllowance: UK_PERSONAL_2026_27.isaAnnualAllowance,
} as const;

export function configForTaxYear(taxYear: UkTaxYear = "2026/27") {
  if (taxYear !== "2026/27") throw new Error(`Unsupported UK personal tax year: ${taxYear}`);
  return UK_PERSONAL_TAX_2026_27;
}
