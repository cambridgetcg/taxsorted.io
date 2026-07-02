import type { UkTaxYear } from "./types";

export const UK_PERSONAL_TAX_2026_27 = {
  taxYear: "2026/27" as UkTaxYear,
  personalAllowance: 12_570,
  personalAllowanceTaperStarts: 100_000,
  personalAllowanceTaperRate: 0.5, // £1 allowance lost per £2 adjusted net income
  basicRateLimitTaxable: 37_700,
  higherRateLimitTaxable: 125_140 - 12_570,
  incomeRates: {
    basic: 0.20,
    higher: 0.40,
    additional: 0.45,
  },
  cgtAnnualExemptAmount: 3_000,
  cgtRates: {
    basic: 0.18,
    higher: 0.24,
    badr: 0.18,
  },
  isaAnnualAllowance: 20_000,
} as const;

export function configForTaxYear(taxYear: UkTaxYear = "2026/27") {
  if (taxYear !== "2026/27") throw new Error(`Unsupported UK personal tax year: ${taxYear}`);
  return UK_PERSONAL_TAX_2026_27;
}
