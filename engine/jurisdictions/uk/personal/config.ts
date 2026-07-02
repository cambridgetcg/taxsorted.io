// UK personal tax planning constants for 2026/27.
// Scope: UK-wide thresholds and England/Wales/Northern Ireland income tax bands
// for non-savings, non-dividend income. Scotland has separate earned-income
// rates; UK-wide thresholds like ANI, HICBC, pensions, dividend allowance and
// CGT allowance still matter.

export const UK_PERSONAL_2026_27 = {
  taxYear: "2026-27",
  sources: {
    incomeTaxRates: "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    adjustedNetIncome: "https://www.gov.uk/guidance/adjusted-net-income",
    highIncomeChildBenefitCharge: "https://www.gov.uk/child-benefit-tax-charge",
    childBenefitRates: "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    pensionAnnualAllowance: "https://www.gov.uk/tax-on-your-private-pension/annual-allowance",
    pensionTaper: "https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm057100",
    pensionTaxRelief: "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
    dividendTax: "https://www.gov.uk/tax-on-dividends",
    capitalGainsAllowance: "https://www.gov.uk/capital-gains-tax/allowances",
    capitalGainsRates: "https://www.gov.uk/capital-gains-tax/rates",
  },
  personalAllowance: 12_570,
  personalAllowanceIncomeLimit: 100_000,
  personalAllowanceZeroAt: 125_140,
  basicRateLimitAfterAllowance: 37_700,
  higherRateLimitAfterAllowance: 125_140,
  bandsEnglandWalesNI: {
    basic: { rate: 0.2, taxableFrom: 0, taxableTo: 37_700 },
    higher: { rate: 0.4, taxableFrom: 37_700, taxableTo: 125_140 },
    additional: { rate: 0.45, taxableFrom: 125_140 },
  },
  highIncomeChildBenefitCharge: {
    threshold: 60_000,
    fullChargeAt: 80_000,
    percentPer: 200,
  },
  childBenefitWeekly: {
    eldestOrOnly: 27.05,
    additionalChild: 17.90,
  },
  pensions: {
    annualAllowance: 60_000,
    taperAdjustedIncomeStart: 260_000,
    taperThresholdIncomeStart: 200_000,
    minimumTaperedAllowance: 10_000,
    moneyPurchaseAnnualAllowance: 10_000,
  },
  dividends: {
    allowance: 500,
    rates: { basic: 0.1075, higher: 0.3575, additional: 0.3935 },
  },
  capitalGains: {
    annualExemptAmount: 3_000,
    rates: { basic: 0.18, higherOrAdditional: 0.24 },
  },
} as const;

export type UKPersonalTaxYear = typeof UK_PERSONAL_2026_27;
