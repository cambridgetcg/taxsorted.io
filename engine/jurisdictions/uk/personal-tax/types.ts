export type UkTaxYear = "2026/27";

export interface UkIncomeTaxInput {
  employmentIncome: number;
  taxYear?: UkTaxYear;
}

export interface UkIncomeTaxResult {
  taxYear: UkTaxYear;
  employmentIncome: number;
  personalAllowance: number;
  personalAllowanceLost: number;
  taxableIncome: number;
  basicTax: number;
  higherTax: number;
  additionalTax: number;
  totalIncomeTax: number;
  effectiveRate: number;
  marginalRateApprox: number;
}

export interface UkCgtInput {
  gains: number;
  taxableIncomeBeforeGains?: number;
  relief?: "none" | "badr";
  taxYear?: UkTaxYear;
}

export interface UkCgtResult {
  taxYear: UkTaxYear;
  gains: number;
  annualExemptAmount: number;
  taxableGains: number;
  basicRateGains: number;
  higherRateGains: number;
  cgt: number;
  effectiveRate: number;
  relief: "none" | "badr";
}
