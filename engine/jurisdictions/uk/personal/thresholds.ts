import { UK_PERSONAL_2026_27 } from "./config";
import type { AdjustedNetIncomeBreakdown, PlanningMove, ThresholdWarning, UKPersonalProfile, UKPersonalTaxPlan } from "./types";

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
const positive = (n: number | undefined): number => Math.max(0, Number.isFinite(n ?? 0) ? (n ?? 0) : 0);

export function annualChildBenefit(children = 0): number {
  const c = Math.max(0, Math.floor(children));
  if (c === 0) return 0;
  const weekly = UK_PERSONAL_2026_27.childBenefitWeekly.eldestOrOnly +
    Math.max(0, c - 1) * UK_PERSONAL_2026_27.childBenefitWeekly.additionalChild;
  return round2(weekly * 52);
}

export function adjustedNetIncome(profile: UKPersonalProfile): AdjustedNetIncomeBreakdown {
  const totalTaxableIncome = round2(
    positive(profile.employmentIncome) +
    positive(profile.selfEmploymentProfit) +
    positive(profile.propertyIncome) +
    positive(profile.pensionIncome) +
    positive(profile.savingsInterest) +
    positive(profile.dividendIncome) +
    positive(profile.otherTaxableIncome),
  );
  const reliefAtSourcePensionGrossedUp = round2(positive(profile.reliefAtSourcePensionContributionsNet) * 1.25);
  const giftAidGrossedUp = round2(positive(profile.giftAidDonationsNet) * 1.25);
  const reliefs = {
    tradingLosses: positive(profile.tradingLosses),
    grossPensionContributions: positive(profile.grossPensionContributions),
    reliefAtSourcePensionGrossedUp,
    giftAidGrossedUp,
  };
  const adjusted = totalTaxableIncome - reliefs.tradingLosses - reliefs.grossPensionContributions - reliefAtSourcePensionGrossedUp - giftAidGrossedUp;
  return { totalTaxableIncome, reliefs, adjustedNetIncome: round2(Math.max(0, adjusted)) };
}

export function personalAllowanceFor(adjustedIncome: number): { amount: number; lost: number; fullyLost: boolean } {
  const cfg = UK_PERSONAL_2026_27;
  const lost = adjustedIncome <= cfg.personalAllowanceIncomeLimit
    ? 0
    : Math.min(cfg.personalAllowance, (adjustedIncome - cfg.personalAllowanceIncomeLimit) / 2);
  const amount = round2(Math.max(0, cfg.personalAllowance - lost));
  return { amount, lost: round2(lost), fullyLost: amount === 0 };
}

export function highIncomeChildBenefitCharge(adjustedIncome: number, benefit: number): { applies: boolean; chargePercent: number; estimatedCharge: number } {
  const cfg = UK_PERSONAL_2026_27.highIncomeChildBenefitCharge;
  if (benefit <= 0 || adjustedIncome <= cfg.threshold) {
    return { applies: false, chargePercent: 0, estimatedCharge: 0 };
  }
  const percent = adjustedIncome >= cfg.fullChargeAt
    ? 100
    : Math.min(100, Math.floor((adjustedIncome - cfg.threshold) / cfg.percentPer));
  return { applies: percent > 0, chargePercent: percent, estimatedCharge: round2(benefit * percent / 100) };
}

export function pensionAnnualAllowance(profile: UKPersonalProfile, ani: number): UKPersonalTaxPlan["pensionAnnualAllowance"] {
  const cfg = UK_PERSONAL_2026_27.pensions;
  if (profile.flexiblyAccessedPension) {
    const excess = Math.max(0, positive(profile.pensionInputAmount) - cfg.moneyPurchaseAnnualAllowance);
    return {
      annualAllowance: cfg.moneyPurchaseAnnualAllowance,
      tapered: false,
      excessInput: round2(excess),
      notes: ["Money Purchase Annual Allowance may apply because pension benefits were flexibly accessed."],
    };
  }

  const adjustedIncome = positive(profile.adjustedIncomeForPensionTaper) || round2(ani + positive(profile.employerPensionContributions));
  const thresholdIncome = positive(profile.thresholdIncomeForPensionTaper) || ani;
  let allowance: number = Number(cfg.annualAllowance);
  let tapered = false;
  const notes: string[] = [];
  if (thresholdIncome > cfg.taperThresholdIncomeStart && adjustedIncome > cfg.taperAdjustedIncomeStart) {
    tapered = true;
    allowance = Math.max(Number(cfg.minimumTaperedAllowance), Number(cfg.annualAllowance) - (adjustedIncome - Number(cfg.taperAdjustedIncomeStart)) / 2);
    notes.push("Tapered annual allowance may apply: threshold income is over £200,000 and adjusted income is over £260,000.");
  }
  const excess = Math.max(0, positive(profile.pensionInputAmount) - allowance);
  return { annualAllowance: round2(allowance), tapered, excessInput: round2(excess), notes };
}

function addMove(moves: PlanningMove[], move: PlanningMove) {
  if ((move.grossAmount ?? 1) <= 0) return;
  moves.push({ ...move, grossAmount: move.grossAmount ? round2(move.grossAmount) : undefined, estimatedNetCost: move.estimatedNetCost ? round2(move.estimatedNetCost) : undefined, estimatedTaxSaved: move.estimatedTaxSaved ? round2(move.estimatedTaxSaved) : undefined });
}

export function planUKPersonalTax(profile: UKPersonalProfile): UKPersonalTaxPlan {
  const cfg = UK_PERSONAL_2026_27;
  const aniBreakdown = adjustedNetIncome(profile);
  const ani = aniBreakdown.adjustedNetIncome;
  const pa = personalAllowanceFor(ani);
  const benefit = profile.annualChildBenefit ?? annualChildBenefit(profile.children ?? 0);
  const hicbc = highIncomeChildBenefitCharge(ani, benefit);
  const pension = pensionAnnualAllowance(profile, ani);
  const warnings: ThresholdWarning[] = [];
  const moves: PlanningMove[] = [];

  if ((profile.taxpayerRegion ?? "england-wales-ni") === "scotland") {
    warnings.push({
      code: "SCOTTISH_RATES_SCOPE",
      severity: "info",
      title: "Scottish earned-income rates are different",
      message: "This scanner still catches UK-wide thresholds, but it does not calculate Scottish non-savings earned-income bands.",
      source: cfg.sources.incomeTaxRates,
    });
  }

  if (hicbc.estimatedCharge > 0) {
    warnings.push({
      code: "HICBC_TAPER",
      severity: ani >= cfg.highIncomeChildBenefitCharge.fullChargeAt ? "high" : "warning",
      title: "High Income Child Benefit Charge",
      message: `Adjusted net income of £${ani.toLocaleString("en-GB")} claws back ${hicbc.chargePercent}% of Child Benefit.`,
      amountAtRisk: hicbc.estimatedCharge,
      currentValue: ani,
      threshold: cfg.highIncomeChildBenefitCharge.threshold,
      source: cfg.sources.highIncomeChildBenefitCharge,
    });
    const to60k = ani - cfg.highIncomeChildBenefitCharge.threshold;
    addMove(moves, {
      lever: "pension",
      title: "Bring adjusted net income back to £60,000",
      action: "Consider gross pension contributions or salary sacrifice before tax year end.",
      grossAmount: to60k,
      estimatedNetCost: to60k * 0.8,
      targetAdjustedNetIncome: cfg.highIncomeChildBenefitCharge.threshold,
      estimatedTaxSaved: hicbc.estimatedCharge,
      why: "Adjusted net income reductions can reduce or remove the Child Benefit clawback.",
      caveats: ["Check pension annual allowance/carry-forward and contribution method.", "Salary sacrifice must be agreed with the employer prospectively."],
    });
    addMove(moves, {
      lever: "claimChildBenefit",
      title: "Do not skip the Child Benefit claim just because of HICBC",
      action: "If payments are opted out, still consider claiming to protect National Insurance credits and automatic NI number issue for the child.",
      why: "GOV.UK says claimants can opt out of payments but should still fill in the claim form for NI credits and child NI number reasons.",
      caveats: ["The higher-income partner may still need to pay HICBC."],
    });
  } else if (benefit > 0 && ani <= cfg.highIncomeChildBenefitCharge.threshold) {
    warnings.push({
      code: "HICBC_SAFE",
      severity: "info",
      title: "Child Benefit is below the HICBC threshold",
      message: "Adjusted net income is at or below £60,000, so the High Income Child Benefit Charge should not apply on these figures.",
      source: cfg.sources.highIncomeChildBenefitCharge,
    });
  }

  if (pa.lost > 0) {
    warnings.push({
      code: "PERSONAL_ALLOWANCE_TAPER",
      severity: pa.fullyLost ? "high" : "warning",
      title: "Personal Allowance taper",
      message: `Adjusted net income over £100,000 has reduced the Personal Allowance by about £${pa.lost.toLocaleString("en-GB")}.`,
      amountAtRisk: pa.lost * 0.4,
      currentValue: ani,
      threshold: cfg.personalAllowanceIncomeLimit,
      source: cfg.sources.incomeTaxRates,
    });
    const to100k = ani - cfg.personalAllowanceIncomeLimit;
    addMove(moves, {
      lever: "pension",
      title: "Target the £100,000 Personal Allowance line",
      action: "Consider gross pension contributions, salary sacrifice, or Gift Aid planning to reduce adjusted net income toward £100,000.",
      grossAmount: to100k,
      estimatedNetCost: to100k * 0.8,
      targetAdjustedNetIncome: cfg.personalAllowanceIncomeLimit,
      estimatedTaxSaved: Math.min(pa.lost * 0.4, to100k * 0.6),
      why: "Between £100,000 and £125,140, each £2 of adjusted net income removes £1 of Personal Allowance, creating an effective 60% income-tax band for many taxpayers.",
      caveats: ["Actual saving depends on income type, region, pension method and available annual allowance.", "Do not make artificial transactions: the lever must be real and documented."],
    });
  }

  if (pension.excessInput > 0 || pension.tapered) {
    warnings.push({
      code: "PENSION_ANNUAL_ALLOWANCE",
      severity: pension.excessInput > 0 ? "high" : "warning",
      title: "Pension annual allowance check",
      message: pension.excessInput > 0
        ? `Pension input appears to exceed the available annual allowance by about £${pension.excessInput.toLocaleString("en-GB")}.`
        : `Estimated annual allowance is tapered to about £${pension.annualAllowance.toLocaleString("en-GB")}.`,
      amountAtRisk: pension.excessInput,
      source: cfg.sources.pensionAnnualAllowance,
    });
  }

  if (positive(profile.dividendIncome) > cfg.dividends.allowance) {
    warnings.push({
      code: "DIVIDEND_ALLOWANCE",
      severity: "info",
      title: "Dividend allowance exceeded",
      message: `Dividend income above the £${cfg.dividends.allowance} allowance may be taxed at dividend rates depending on your band.`,
      currentValue: positive(profile.dividendIncome),
      threshold: cfg.dividends.allowance,
      source: cfg.sources.dividendTax,
    });
    addMove(moves, {
      lever: "isa",
      title: "Shelter future dividends where possible",
      action: "Consider holding investments inside an ISA or pension for future tax years where suitable.",
      why: "GOV.UK says dividends from ISA shares are not taxed, while dividends above the allowance are taxable.",
      caveats: ["ISA and pension allowances/eligibility apply.", "This is future planning; it does not rewrite dividends already paid."],
    });
  }

  if (positive(profile.capitalGains) > cfg.capitalGains.annualExemptAmount) {
    warnings.push({
      code: "CGT_AEA",
      severity: "info",
      title: "Capital gains exceed the annual exempt amount",
      message: `Gains above the £${cfg.capitalGains.annualExemptAmount} annual exempt amount may be taxable.`,
      currentValue: positive(profile.capitalGains),
      threshold: cfg.capitalGains.annualExemptAmount,
      source: cfg.sources.capitalGainsAllowance,
    });
    addMove(moves, {
      lever: "timing",
      title: "Plan disposals before you sell",
      action: "Before disposal, model timing, loss use, spouse/civil-partner transfers and ISA sheltering where lawful and commercially real.",
      why: "The annual exempt amount is use-it-or-lose-it each tax year and rates depend on income band/circumstances.",
      caveats: ["Do not do bed-and-breakfast style artificial steps without advice.", "Residential property and carried interest can have special rules."],
    });
  }

  moves.sort((a, b) => (b.estimatedTaxSaved ?? 0) - (a.estimatedTaxSaved ?? 0));

  return {
    taxYear: cfg.taxYear,
    scope: "UK-wide thresholds plus England/Wales/Northern Ireland non-savings income-tax bands. Legal planning only; not evasion advice.",
    adjustedNetIncome: aniBreakdown,
    personalAllowance: pa,
    highIncomeChildBenefitCharge: {
      applies: hicbc.applies,
      annualChildBenefit: benefit,
      chargePercent: hicbc.chargePercent,
      estimatedCharge: hicbc.estimatedCharge,
      liablePerson: profile.partnerAdjustedNetIncome == null ? "unknown" : (ani >= profile.partnerAdjustedNetIncome ? "you" : "partner"),
    },
    pensionAnnualAllowance: pension,
    warnings,
    moves,
    sources: cfg.sources,
  };
}
