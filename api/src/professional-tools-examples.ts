export const sdltCalculationRequestExample = {
  effectiveDate: "2026-07-10",
  chargeableConsiderationPence: 29_500_000,
  land: {
    jurisdiction: "england",
    use: "residential",
    interest: "freehold",
    dwellingCount: 1,
  },
  buyerKind: "individual",
  treatment: {
    firstTimeBuyerRelief: "do-not-claim",
    higherRates: "standard",
    nonResidentSurcharge: "do-not-apply",
  },
  specialCases: {
    linkedTransactions: false,
    sharedOwnership: false,
    otherReliefClaimed: false,
    complexConsideration: false,
    transitionalContractMayApply: false,
  },
} as const;

export const mtdIncomeTaxAssessmentRequestExample = {
  schema: "taxsorted.uk.mtd-income-tax.request/1",
  asOfDate: "2026-07-11",
  person: {
    relevantReturnPosition: "required-and-submitted",
    hadNationalInsuranceNumberAtStartOf2026To27: true,
  },
  income: {
    taxYears: {
      "2024-25": {
        basis: "submitted-return",
        residence: "uk-resident",
        selfEmploymentGrossPence: 5_000_001,
        ukPropertyGrossPence: 0,
        foreignPropertyGrossPence: 0,
      },
      "2025-26": {
        basis: "working-estimate",
        residence: "uk-resident",
        selfEmploymentGrossPence: 0,
        ukPropertyGrossPence: 0,
        foreignPropertyGrossPence: 0,
      },
      "2026-27": {
        basis: "working-estimate",
        residence: "uk-resident",
        selfEmploymentGrossPence: 0,
        ukPropertyGrossPence: 0,
        foreignPropertyGrossPence: 0,
      },
    },
    atLeastOneRelevantReturnActivityContinuedAtEntry: true,
    lastRelevantActivityCessationDate: "at-least-one-continues",
    relevantReturnWasAmended: false,
    annualisationOrOtherSpecialRulesMayApply: false,
  },
  exemption: {
    returnIndicators: [],
    digitalExclusion: "not-approved-or-pending",
    otherExemptionApplication: "none",
  },
  reporting: { updatePeriod: "standard" },
} as const;
