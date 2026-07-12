// UK personal tax planning constants for 2026/27.
// Scope: UK-wide thresholds and England/Wales/Northern Ireland income tax bands
// for non-savings, non-dividend income. Scotland has separate earned-income
// rates; UK-wide thresholds like ANI, HICBC, pensions, dividend allowance and
// CGT allowance still matter.

export const UK_PERSONAL_2026_27 = {
  taxYear: "2026-27",
  ruleset: {
    version: "uk-personal-thresholds/2026-27.2",
    effectiveFrom: "2026-04-06",
    reviewedOn: "2026-07-12",
  },
  sources: {
    incomeTaxRates: "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    personalAllowanceCalculation: "https://developer.service.hmrc.gov.uk/guides/tax-logic-service-guide/documentation/allowances-and-reliefs.html#personal-allowance",
    incomeTaxCalculation: "https://developer.service.hmrc.gov.uk/guides/tax-logic-service-guide/documentation/tax-calculation.html#income-tax-liability",
    adjustedNetIncome: "https://www.gov.uk/guidance/adjusted-net-income",
    highIncomeChildBenefitCharge: "https://www.gov.uk/child-benefit-tax-charge",
    highIncomeChildBenefitChargeLaw: "https://www.legislation.gov.uk/ukpga/2003/1/section/681C",
    childBenefitRates: "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    childBenefitCalculator: "https://www.gov.uk/child-benefit-tax-calculator",
    taxFreeChildcareEligibility: "https://www.gov.uk/tax-free-childcare/check-if-youre-eligible",
    taxFreeChildcareAdjustedNetIncome: "https://www.gov.uk/hmrc-internal-manuals/tax-free-childcare-technical-manual/tfc11050",
    taxFreeChildcarePartner: "https://www.gov.uk/hmrc-internal-manuals/tax-free-childcare-technical-manual/tfc06400",
    taxFreeChildcareTopUp: "https://beststartinlife.gov.uk/childcare-early-years-education/tax-free-childcare/how-it-works/",
    pensionAnnualAllowance: "https://www.gov.uk/tax-on-your-private-pension/annual-allowance",
    pensionTaper: "https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm057100",
    pensionTaxRelief: "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
    dividendTax: "https://www.gov.uk/tax-on-dividends",
    capitalGainsAllowance: "https://www.gov.uk/capital-gains-tax/allowances",
    capitalGainsRates: "https://www.gov.uk/capital-gains-tax/rates",
    isaAllowance: "https://www.gov.uk/individual-savings-accounts/how-isas-work",
  },
  personalAllowance: 12_570,
  personalAllowanceIncomeLimit: 100_000,
  personalAllowanceZeroAt: 125_140,
  adjustedNetIncomeTradeUnionPoliceAddBackMaximum: 100,
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
    /** 6 April 2026 and 5 April 2027 are both weekly entitlement points. */
    fullYearAwardWeeks: 53,
  },
  taxFreeChildcare: {
    /** Each partner must expect ANI not to be over this amount. Exactly £100,000 passes. */
    adjustedNetIncomeLimit: 100_000,
    ordinaryChildAnnualTopUp: 2_000,
    disabledChildAnnualTopUp: 4_000,
    ordinaryChildQuarterlyTopUp: 500,
    disabledChildQuarterlyTopUp: 1_000,
    minimumEarningsNext3Months: {
      age21OrOver: 2_643.68,
      age18To20: 2_256.80,
      under18OrApprentice: 1_664,
    },
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
    rates: { basic: 0.18, higherOrAdditional: 0.24, businessAssetDisposalRelief: 0.18 },
  },
  isaAnnualAllowance: 20_000,
} as const;

export type UKPersonalTaxYear = typeof UK_PERSONAL_2026_27;
