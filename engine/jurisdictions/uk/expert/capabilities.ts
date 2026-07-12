export type CoverageStage =
  | "mapped"
  | "explained"
  | "classified"
  | "calculated"
  | "prepared"
  | "filed";

export interface UkTaxExpertCapability {
  id: string;
  journey: string;
  title: string;
  status: "available" | "limited" | "planned";
  stages: CoverageStage[];
  scope: string;
  exclusions: string[];
  humanHref?: string;
  apiHref?: string;
  review: { reviewedOn: string; owner: string };
}

const reviewedOn = "2026-07-12";

/** Product coverage, not a claim that every UK tax rule is implemented. */
export const UK_TAX_EXPERT_CAPABILITIES: readonly UkTaxExpertCapability[] = [
  {
    id: "uk.mtd-income-tax.readiness",
    journey: "Become or remain a sole trader or landlord",
    title: "Making Tax Digital for Income Tax readiness",
    status: "available",
    stages: ["mapped", "explained", "classified"],
    scope: "Individuals required to deliver the relevant Self Assessment return where at least one represented activity continued at entry; residence-aware thresholds, concrete exemption evidence, cessation and 2026/27 deadlines.",
    exclusions: ["HMRC exemption decisions", "Amended-return and automatic annualisation calculations", "Exact source-level workload without start and prior-return history", "Preparation or filing"],
    humanHref: "/uk/tax-expert",
    apiHref: "/v1/uk/tax-expert/mtd-income-tax/assessments",
    review: { reviewedOn, owner: "TaxSorted UK tax rules" },
  },
  {
    id: "uk.sdlt.residential.individual",
    journey: "Buy a home or residential land",
    title: "Residential Stamp Duty Land Tax",
    status: "available",
    stages: ["mapped", "explained", "classified", "calculated"],
    scope: "One ordinary residential dwelling in England or Northern Ireland, with explicit legal classifications supplied by the caller.",
    exclusions: ["Scotland and Wales", "Mixed or non-residential land", "Linked or complex transactions", "Relief eligibility advice"],
    apiHref: "/v1/uk/sdlt/calculations",
    review: { reviewedOn: "2026-07-10", owner: "TaxSorted UK tax rules" },
  },
  {
    id: "uk.vat",
    journey: "Sell goods or services",
    title: "VAT records, returns and HMRC connection",
    status: "limited",
    stages: ["mapped", "explained", "classified", "calculated", "prepared"],
    scope: "UK VAT records, common schemes, nine-box return preparation and HMRC sandbox/live connection when configured.",
    exclusions: ["A universal VAT place-of-supply classifier", "Production availability without HMRC credentials", "Every sector scheme"],
    humanHref: "/dashboard",
    review: { reviewedOn, owner: "TaxSorted UK tax rules" },
  },
  {
    id: "uk.personal-tax.thresholds",
    journey: "Income or family circumstances change",
    title: "Adjusted net income and threshold interactions",
    status: "available",
    stages: ["mapped", "explained", "classified", "calculated"],
    scope: "A strict 2026/27 ANI spine for the Personal Allowance taper, a simplified full-year HICBC estimate and the separate Tax-Free Childcare household-partner income condition, with quarter-penny-exact boundaries and local-only checking.",
    exclusions: ["Full Tax-Free Childcare eligibility", "Changing partner or claimant periods", "Filing-grade liability", "Scottish earned-income rates", "Residence or treaty classification", "Trust and estate calculations"],
    humanHref: "/uk/personal-tax#threshold-check",
    review: { reviewedOn, owner: "TaxSorted UK tax rules" },
  },
  {
    id: "uk.self-assessment.liability",
    journey: "Prepare an individual tax return",
    title: "Rest-of-UK Self Assessment estimate",
    status: "limited",
    stages: ["mapped", "explained", "calculated", "prepared"],
    scope: "One rest-of-UK taxpayer with self-employment, UK property and other non-savings income.",
    exclusions: ["Savings and dividend ordering", "Scottish rates", "Student loans", "Foreign income", "Loss carry-forward and final HMRC calculation"],
    humanHref: "/itsa",
    review: { reviewedOn, owner: "TaxSorted UK tax rules" },
  },
  {
    id: "uk.employment-paye",
    journey: "Start or change a job or pension",
    title: "PAYE, tax codes, benefits and employee National Insurance",
    status: "planned",
    stages: ["mapped"],
    scope: "Coverage map only.",
    exclusions: ["Classification", "Calculation", "Payroll filing"],
    review: { reviewedOn, owner: "TaxSorted coverage" },
  },
  {
    id: "uk.savings-investments-gains",
    journey: "Save, invest or sell assets",
    title: "Savings, dividends and Capital Gains Tax",
    status: "planned",
    stages: ["mapped", "explained"],
    scope: "Plain-language source map and simplified teaching examples.",
    exclusions: ["Income ordering calculation", "Losses and reliefs", "60-day property reporting decision"],
    review: { reviewedOn, owner: "TaxSorted coverage" },
  },
  {
    id: "uk.residence-foreign-income",
    journey: "Arrive, leave or work across borders",
    title: "Residence and foreign income or gains",
    status: "planned",
    stages: ["mapped"],
    scope: "Coverage map only; fact-heavy cases must stop for review.",
    exclusions: ["Statutory Residence Test decision", "Treaty analysis", "FIG, remittance and Overseas Workday Relief claims"],
    review: { reviewedOn, owner: "TaxSorted coverage" },
  },
  {
    id: "uk.pensions",
    journey: "Contribute to or draw a pension",
    title: "Pension tax relief and allowances",
    status: "planned",
    stages: ["mapped", "explained"],
    scope: "Threshold explanation and limited annual-allowance warnings.",
    exclusions: ["Carry-forward proof", "Lump-sum and death-benefit calculation", "Scheme-specific advice"],
    review: { reviewedOn, owner: "TaxSorted coverage" },
  },
  {
    id: "uk.inheritance-trusts-estates",
    journey: "Give assets, die, administer an estate or trust",
    title: "Inheritance Tax, trusts and estates",
    status: "planned",
    stages: ["mapped"],
    scope: "Coverage map only.",
    exclusions: ["Liability", "Valuation", "Relief qualification", "Trust Registration Service"],
    review: { reviewedOn, owner: "TaxSorted coverage" },
  },
  {
    id: "uk.corporation-tax",
    journey: "Form and run a company",
    title: "Corporation Tax and company-owner interactions",
    status: "planned",
    stages: ["mapped"],
    scope: "Coverage map only.",
    exclusions: ["Accounting-period computation", "Capital allowances", "Losses", "R&D", "Company filing"],
    review: { reviewedOn, owner: "TaxSorted coverage" },
  },
  {
    id: "uk.disputes-corrections-payment",
    journey: "Correct, dispute, appeal or cannot pay",
    title: "Corrections, appeals, penalties and payment difficulty",
    status: "planned",
    stages: ["mapped"],
    scope: "Coverage map only.",
    exclusions: ["Case strategy", "Representation", "Appeal filing", "Payment-plan negotiation"],
    review: { reviewedOn, owner: "TaxSorted coverage" },
  },
];

export const UK_TAX_EXPERT_MANIFEST = {
  schema: "taxsorted.uk.tax-expert/1" as const,
  name: "TaxSorted UK tax expert",
  reviewedOn,
  stance: "Evidence before eloquence. Unknown is never zero. Calculation, preparation and filing are different powers.",
  stages: ["mapped", "explained", "classified", "calculated", "prepared", "filed"] as const,
  capabilities: UK_TAX_EXPERT_CAPABILITIES,
  privacy: {
    browserChecks: "run locally unless the person deliberately calls the API",
    apiAssessments: "stateless; request facts are not written to application storage",
    identifiersNeeded: [],
  },
  boundaries: [
    "No generic AI answer may invent or override a tax rule.",
    "A source URL is not enough: source kind, legal force, effective period and review date remain visible.",
    "TaxSorted distinguishes explain, classify, calculate, prepare and file.",
    "A case outside a declared scope returns the missing fact or review path, not a guessed answer.",
  ],
};
