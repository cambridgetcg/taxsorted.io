import { UK_PERSONAL_2026_27 } from "./config";
import type { AdjustedNetIncomeBreakdown, PlanningMove, ThresholdWarning, UKPersonalProfile, UKPersonalTaxPlan } from "./types";
import { assessThresholdInteractions, computeRestOfUkNonSavingsIncomeTaxPence } from "./threshold-engine";

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
const amount = (n: number | undefined, label = "amount"): number => {
  // Preserve the original planner API's forgiving normalization. Machine users
  // that need rejection and explicit unknowns should use assessThresholdInteractions.
  void label;
  return Math.max(0, Number.isFinite(n ?? 0) ? (n ?? 0) : 0);
};
const toPence = (n: number): number => Math.round(n * 100);
const fromPence = (n: number): number => n / 100;

function wholeCount(n: number | undefined, label: string): number {
  // Backwards-compatible teaching helper: negative/non-finite values become 0
  // and fractional child counts are floored. The strict pence API rejects them.
  void label;
  return Math.max(0, Math.floor(Number.isFinite(n ?? 0) ? (n ?? 0) : 0));
}

export function annualChildBenefit(children = 0): number {
  const c = wholeCount(children, "children");
  if (c === 0) return 0;
  const weekly = UK_PERSONAL_2026_27.childBenefitWeekly.eldestOrOnly +
    Math.max(0, c - 1) * UK_PERSONAL_2026_27.childBenefitWeekly.additionalChild;
  return round2(weekly * UK_PERSONAL_2026_27.childBenefitWeekly.fullYearAwardWeeks);
}

export function adjustedNetIncome(profile: UKPersonalProfile): AdjustedNetIncomeBreakdown {
  const totalTaxableIncome = round2(
    amount(profile.employmentIncome, "employmentIncome") +
    amount(profile.selfEmploymentProfit, "selfEmploymentProfit") +
    amount(profile.propertyIncome, "propertyIncome") +
    amount(profile.pensionIncome, "pensionIncome") +
    amount(profile.savingsInterest, "savingsInterest") +
    amount(profile.dividendIncome, "dividendIncome") +
    amount(profile.foreignIncome, "foreignIncome") +
    amount(profile.trustIncome, "trustIncome") +
    amount(profile.taxableStateBenefits, "taxableStateBenefits") +
    amount(profile.otherTaxableIncome, "otherTaxableIncome"),
  );
  const tradingLosses = round2(amount(profile.tradingLosses, "tradingLosses"));
  const grossPensionContributions = round2(
    amount(profile.grossPensionContributions, "grossPensionContributions"),
  );
  const reliefAtSourcePensionNet = round2(
    amount(
      profile.reliefAtSourcePensionContributionsNet,
      "reliefAtSourcePensionContributionsNet",
    ),
  );
  const giftAidNet = round2(amount(profile.giftAidDonationsNet, "giftAidDonationsNet"));
  const tradeUnionOrPoliceRelief = round2(
    amount(profile.tradeUnionOrPoliceReliefAddBack, "tradeUnionOrPoliceReliefAddBack"),
  );
  const canonical = assessThresholdInteractions({
    taxYear: "2026-27",
    individual: {
      totalTaxableIncomePence: toPence(totalTaxableIncome),
      netIncomeDeductionsPence: toPence(tradingLosses + grossPensionContributions),
      reliefAtSourcePensionContributionsNetPence: toPence(reliefAtSourcePensionNet),
      giftAidDonationsNetPence: toPence(giftAidNet),
      tradeUnionOrPoliceReliefAddBackPence: toPence(tradeUnionOrPoliceRelief),
    },
    hicbcPartner: { status: "none" },
    taxFreeChildcarePartner: { status: "none" },
  }).adjustedNetIncome;
  const reliefAtSourcePensionGrossedUp = (
    canonical.reliefAtSourcePensionGrossedUpQuarterPence / 400
  );
  const giftAidGrossedUp = canonical.giftAidGrossedUpQuarterPence / 400;
  const reliefs = {
    tradingLosses,
    grossPensionContributions,
    reliefAtSourcePensionGrossedUp,
    giftAidGrossedUp,
  };
  const addBacks = {
    tradeUnionOrPoliceRelief,
  };
  return {
    totalTaxableIncome,
    reliefs,
    addBacks,
    adjustedNetIncome: (canonical.amountQuarterPence ?? 0) / 400,
  };
}

export function personalAllowanceFor(adjustedIncome: number): { amount: number; lost: number; fullyLost: boolean } {
  const income = amount(adjustedIncome, "adjustedIncome");
  const canonical = computeRestOfUkNonSavingsIncomeTaxPence({
    totalIncomePence: toPence(income),
    adjustedNetIncomePence: toPence(income),
  });
  return {
    amount: fromPence(canonical.personalAllowancePence),
    lost: fromPence(canonical.personalAllowanceLostPence),
    fullyLost: canonical.personalAllowancePence === 0,
  };
}

export function highIncomeChildBenefitCharge(adjustedIncome: number, benefit: number): { applies: boolean; chargePercent: number; estimatedCharge: number } {
  const income = amount(adjustedIncome, "adjustedIncome");
  const annualBenefit = amount(benefit, "benefit");
  const assessment = assessThresholdInteractions({
    taxYear: "2026-27",
    individual: { totalTaxableIncomePence: toPence(income) },
    hicbcPartner: { status: "none" },
    taxFreeChildcarePartner: { status: "none" },
    annualChildBenefitPence: toPence(annualBenefit),
  }).highIncomeChildBenefitCharge;
  const chargePercent = assessment.chargePercent ?? 0;
  const estimatedCharge = fromPence(assessment.estimatedChargePence ?? 0);
  return { applies: estimatedCharge > 0, chargePercent, estimatedCharge };
}

export function pensionAnnualAllowance(profile: UKPersonalProfile, ani: number): UKPersonalTaxPlan["pensionAnnualAllowance"] {
  const cfg = UK_PERSONAL_2026_27.pensions;
  if (profile.flexiblyAccessedPension) {
    const excess = Math.max(0, amount(profile.pensionInputAmount, "pensionInputAmount") - cfg.moneyPurchaseAnnualAllowance);
    return {
      annualAllowance: cfg.moneyPurchaseAnnualAllowance,
      tapered: false,
      excessInput: round2(excess),
      notes: ["Money Purchase Annual Allowance may apply because pension benefits were flexibly accessed."],
    };
  }

  const adjustedIncome = amount(profile.adjustedIncomeForPensionTaper, "adjustedIncomeForPensionTaper") || round2(ani + amount(profile.employerPensionContributions, "employerPensionContributions"));
  const thresholdIncome = amount(profile.thresholdIncomeForPensionTaper, "thresholdIncomeForPensionTaper") || ani;
  let allowance: number = Number(cfg.annualAllowance);
  let tapered = false;
  const notes: string[] = [];
  if (thresholdIncome > cfg.taperThresholdIncomeStart && adjustedIncome > cfg.taperAdjustedIncomeStart) {
    tapered = true;
    allowance = Math.max(Number(cfg.minimumTaperedAllowance), Number(cfg.annualAllowance) - (adjustedIncome - Number(cfg.taperAdjustedIncomeStart)) / 2);
    notes.push("Tapered annual allowance may apply: threshold income is over £200,000 and adjusted income is over £260,000.");
  }
  const excess = Math.max(0, amount(profile.pensionInputAmount, "pensionInputAmount") - allowance);
  return { annualAllowance: round2(allowance), tapered, excessInput: round2(excess), notes };
}

function addMove(moves: PlanningMove[], move: PlanningMove) {
  if ((move.grossAmount ?? 1) <= 0) return;
  moves.push({
    ...move,
    grossAmount: move.grossAmount ? round2(move.grossAmount) : undefined,
    estimatedNetCost: move.estimatedNetCost ? round2(move.estimatedNetCost) : undefined,
    estimatedTaxSaved: move.estimatedTaxSaved ? round2(move.estimatedTaxSaved) : undefined,
    potentialAnnualSupportProtected: move.potentialAnnualSupportProtected
      ? round2(move.potentialAnnualSupportProtected)
      : undefined,
  });
}

export function planUKPersonalTax(profile: UKPersonalProfile): UKPersonalTaxPlan {
  const cfg = UK_PERSONAL_2026_27;
  const aniBreakdown = adjustedNetIncome(profile);
  const ani = aniBreakdown.adjustedNetIncome;
  const benefit = profile.annualChildBenefit ?? annualChildBenefit(profile.children ?? 0);
  const partnerState = (
    hasPartner: boolean | undefined,
    partnerAdjustedNetIncome: number | undefined,
    label: string,
  ) => hasPartner === false
    ? { status: "none" as const }
    : partnerAdjustedNetIncome !== undefined
      ? {
        status: "known" as const,
        adjustedNetIncomeQuarterPence: Math.round(
          amount(partnerAdjustedNetIncome, label) * 400,
        ),
      }
      : { status: "unknown" as const };
  const hicbcPartner = partnerState(
    profile.hicbcHasPartner ?? profile.hasPartner,
    profile.hicbcPartnerAdjustedNetIncome ?? profile.partnerAdjustedNetIncome,
    "hicbcPartnerAdjustedNetIncome",
  );
  const taxFreeChildcarePartner = partnerState(
    profile.taxFreeChildcareHasPartner ?? profile.hasPartner,
    profile.taxFreeChildcarePartnerAdjustedNetIncome ?? profile.partnerAdjustedNetIncome,
    "taxFreeChildcarePartnerAdjustedNetIncome",
  );
  const thresholdAssessment = assessThresholdInteractions({
    taxYear: "2026-27",
    individual: {
      totalTaxableIncomePence: toPence(aniBreakdown.totalTaxableIncome),
      netIncomeDeductionsPence: toPence(
        aniBreakdown.reliefs.tradingLosses + aniBreakdown.reliefs.grossPensionContributions,
      ),
      reliefAtSourcePensionContributionsNetPence: toPence(
        amount(profile.reliefAtSourcePensionContributionsNet, "reliefAtSourcePensionContributionsNet"),
      ),
      giftAidDonationsNetPence: toPence(amount(profile.giftAidDonationsNet, "giftAidDonationsNet")),
      tradeUnionOrPoliceReliefAddBackPence: toPence(
        aniBreakdown.addBacks.tradeUnionOrPoliceRelief,
      ),
    },
    hicbcPartner,
    taxFreeChildcarePartner,
    annualChildBenefitPence: toPence(benefit),
    childBenefitClaimant: profile.childBenefitClaimant === "you"
      ? "individual"
      : profile.childBenefitClaimant,
    taxFreeChildcareChildren: profile.taxFreeChildcareChildren,
  });
  const pa = {
    amount: fromPence(thresholdAssessment.personalAllowance.amountPence ?? 0),
    lost: fromPence(thresholdAssessment.personalAllowance.lostPence ?? 0),
    fullyLost: thresholdAssessment.personalAllowance.fullyLost ?? false,
  };
  const strictHicbc = thresholdAssessment.highIncomeChildBenefitCharge;
  const provisionalHicbc = strictHicbc.status === "needs-facts";
  const fallbackHicbc = provisionalHicbc
    ? highIncomeChildBenefitCharge(ani, benefit)
    : null;
  const liablePerson: "you" | "partner" | "unknown" = strictHicbc.liablePerson === "individual"
    ? "you"
    : strictHicbc.liablePerson === "partner"
      ? "partner"
      : "unknown";
  const hicbc = {
    applies: strictHicbc.status === "charge" || (fallbackHicbc?.applies ?? false),
    chargePercent: strictHicbc.chargePercent ?? fallbackHicbc?.chargePercent ?? 0,
    estimatedCharge: strictHicbc.estimatedChargePence === null
      ? fallbackHicbc?.estimatedCharge ?? 0
      : fromPence(strictHicbc.estimatedChargePence),
    liableAdjustedNetIncome: strictHicbc.liableAdjustedNetIncomePence === null
      ? ani
      : fromPence(strictHicbc.liableAdjustedNetIncomePence),
    liablePerson,
    provisional: provisionalHicbc,
  };
  const tfc = thresholdAssessment.taxFreeChildcare;
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

  if (benefit > 0 && hicbc.provisional) {
    const claimantOnlyMissing = strictHicbc.missingFacts.length > 0
      && strictHicbc.missingFacts.every((fact) => fact === "childBenefitClaimant");
    warnings.push({
      code: claimantOnlyMissing ? "HICBC_CLAIMANT_UNKNOWN" : "HICBC_PARTNER_INCOME_UNKNOWN",
      severity: "warning",
      title: claimantOnlyMissing
        ? "Child Benefit claimant is needed to resolve equal incomes"
        : "Partner income is needed for the Child Benefit charge",
      message: claimantOnlyMissing
        ? "Both adjusted net incomes are known and equal above £60,000. The claimant is needed to identify who is liable; the provisional amount must not be treated as the final answer."
        : "The higher-income partner pays HICBC. The provisional figure uses your income only and must not be treated as the household answer.",
      currentValue: ani,
      threshold: cfg.highIncomeChildBenefitCharge.threshold,
      source: cfg.sources.highIncomeChildBenefitCharge,
    });
  } else if (hicbc.estimatedCharge > 0) {
    const liableLabel = hicbc.liablePerson === "partner" ? "Your partner's" : "Your";
    warnings.push({
      code: "HICBC_TAPER",
      severity: hicbc.liableAdjustedNetIncome >= cfg.highIncomeChildBenefitCharge.fullChargeAt ? "high" : "warning",
      title: "High Income Child Benefit Charge",
      message: `${liableLabel} adjusted net income of £${hicbc.liableAdjustedNetIncome.toLocaleString("en-GB")} claws back ${hicbc.chargePercent}% of Child Benefit.`,
      amountAtRisk: hicbc.estimatedCharge,
      currentValue: hicbc.liableAdjustedNetIncome,
      threshold: cfg.highIncomeChildBenefitCharge.threshold,
      source: cfg.sources.highIncomeChildBenefitCharge,
    });
    const to60k = hicbc.liableAdjustedNetIncome - cfg.highIncomeChildBenefitCharge.threshold;
    addMove(moves, {
      lever: "pension",
      title: `${hicbc.liablePerson === "partner" ? "Higher-income partner: bring" : "Bring"} adjusted net income back to £60,000`,
      action: `${hicbc.liablePerson === "partner" ? "The liable partner can consider" : "Consider"} real gross pension contributions, Gift Aid, or prospective salary sacrifice before tax year end.`,
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
  } else if (benefit > 0) {
    warnings.push({
      code: "HICBC_SAFE",
      severity: "info",
      title: "Child Benefit is below the HICBC threshold",
      message: "The higher individual adjusted net income supplied is at or below £60,000, so HICBC should not apply on these figures.",
      source: cfg.sources.highIncomeChildBenefitCharge,
    });
  }

  const tfcPotentialAnnualTopUp = tfc.potentialAnnualTopUpPence === null
    ? null
    : fromPence(tfc.potentialAnnualTopUpPence);
  const tfcIndividualOverBy = tfc.individualOverByPence === null
    ? null
    : fromPence(tfc.individualOverByPence);
  const tfcPartnerOverBy = tfc.partnerOverByPence === null
    ? null
    : fromPence(tfc.partnerOverByPence);
  if (tfc.status === "fails-income-test") {
    const failedPeople = [
      (tfcIndividualOverBy ?? 0) > 0 ? "your income" : null,
      (tfcPartnerOverBy ?? 0) > 0 ? "your partner's income" : null,
    ].filter(Boolean).join(" and ");
    warnings.push({
      code: "TFC_INCOME_LIMIT",
      severity: "high",
      title: "Tax-Free Childcare £100,000 income limit",
      message: `${failedPeople} is over the per-person adjusted-net-income limit. This fails the income condition; the other eligibility conditions remain separate.`,
      amountAtRisk: tfcPotentialAnnualTopUp ?? undefined,
      threshold: cfg.taxFreeChildcare.adjustedNetIncomeLimit,
      source: cfg.sources.taxFreeChildcareEligibility,
    });
  } else if (tfc.status === "needs-facts") {
    warnings.push({
      code: "TFC_PARTNER_INCOME_UNKNOWN",
      severity: "warning",
      title: "Tax-Free Childcare needs both partners' income",
      message: "Each partner must expect adjusted net income not to be over £100,000. A blank partner figure stays unknown; it is not treated as zero.",
      threshold: cfg.taxFreeChildcare.adjustedNetIncomeLimit,
      source: cfg.sources.taxFreeChildcareEligibility,
    });
  } else if (tfc.status === "passes-income-test") {
    warnings.push({
      code: "TFC_INCOME_TEST_PASSES",
      severity: "info",
      title: "Tax-Free Childcare income test passes",
      message: "Each supplied adjusted net income is at or below £100,000. This checks the income condition only, not work, child, immigration or conflicting-support rules.",
      threshold: cfg.taxFreeChildcare.adjustedNetIncomeLimit,
      source: cfg.sources.taxFreeChildcareEligibility,
    });
  }

  if (
    tfc.status === "fails-income-test"
    && (tfcIndividualOverBy ?? 0) > 0
    && (tfcPartnerOverBy ?? 0) === 0
    && pa.lost === 0
  ) {
    addMove(moves, {
      lever: "pension",
      title: "Cross back under the Tax-Free Childcare £100,000 line",
      action: "Check whether a real pension contribution, Gift Aid payment, or prospective salary sacrifice can bring expected ANI to £100,000 or below.",
      grossAmount: tfcIndividualOverBy ?? undefined,
      estimatedNetCost: (tfcIndividualOverBy ?? 0) * 0.8,
      targetAdjustedNetIncome: cfg.taxFreeChildcare.adjustedNetIncomeLimit,
      potentialAnnualSupportProtected: tfcPotentialAnnualTopUp ?? undefined,
      why: "Tax-Free Childcare fails on any positive ANI excess, even before whole-pound Personal Allowance tapering produces a reduction.",
      caveats: ["This only addresses the income condition; every other eligibility rule still applies.", "Pension, Gift Aid and salary-sacrifice steps must be genuine and properly documented."],
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
    const alsoRestoresTfcIncomeTest = tfc.status === "fails-income-test"
      && (tfcIndividualOverBy ?? 0) > 0
      && (tfcPartnerOverBy ?? 0) === 0;
    addMove(moves, {
      lever: "pension",
      title: alsoRestoresTfcIncomeTest
        ? "Target the shared £100,000 line"
        : "Target the £100,000 Personal Allowance line",
      action: "Consider gross pension contributions, salary sacrifice, or Gift Aid planning to reduce adjusted net income toward £100,000.",
      grossAmount: to100k,
      estimatedNetCost: to100k * 0.8,
      targetAdjustedNetIncome: cfg.personalAllowanceIncomeLimit,
      estimatedTaxSaved: Math.min(pa.lost * 0.4, to100k * 0.6),
      potentialAnnualSupportProtected: alsoRestoresTfcIncomeTest
        ? tfcPotentialAnnualTopUp ?? undefined
        : undefined,
      why: `Between £100,000 and £125,140, each £2 of adjusted net income removes £1 of Personal Allowance, creating an effective 60% income-tax band for many taxpayers.${alsoRestoresTfcIncomeTest ? " The same £100,000 per-person ceiling is also the Tax-Free Childcare income test." : ""}`,
      caveats: ["Actual saving depends on income type, region, pension method and available annual allowance.", "Do not make artificial transactions: the lever must be real and documented."],
    });
  }

  if ((tfcPartnerOverBy ?? 0) > 0 && (tfcIndividualOverBy ?? 0) === 0) {
    addMove(moves, {
      lever: "pension",
      title: "Partner: check the Tax-Free Childcare £100,000 line",
      action: "Your partner can check whether real pension contributions, Gift Aid, or prospective salary sacrifice bring their expected ANI to £100,000 or below.",
      grossAmount: tfcPartnerOverBy ?? undefined,
      estimatedNetCost: (tfcPartnerOverBy ?? 0) * 0.8,
      targetAdjustedNetIncome: cfg.taxFreeChildcare.adjustedNetIncomeLimit,
      potentialAnnualSupportProtected: tfcPotentialAnnualTopUp ?? undefined,
      why: "Tax-Free Childcare applies its £100,000 adjusted-net-income ceiling to each partner separately.",
      caveats: ["This only addresses the income condition; every other eligibility rule still applies.", "Pension, Gift Aid and salary-sacrifice steps must be genuine and properly documented."],
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

  if (amount(profile.dividendIncome, "dividendIncome") > cfg.dividends.allowance) {
    warnings.push({
      code: "DIVIDEND_ALLOWANCE",
      severity: "info",
      title: "Dividend allowance exceeded",
      message: `Dividend income above the £${cfg.dividends.allowance} allowance may be taxed at dividend rates depending on your band.`,
      currentValue: amount(profile.dividendIncome, "dividendIncome"),
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

  if (amount(profile.capitalGains, "capitalGains") > cfg.capitalGains.annualExemptAmount) {
    warnings.push({
      code: "CGT_AEA",
      severity: "info",
      title: "Capital gains exceed the annual exempt amount",
      message: `Gains above the £${cfg.capitalGains.annualExemptAmount} annual exempt amount may be taxable.`,
      currentValue: amount(profile.capitalGains, "capitalGains"),
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

  moves.sort((a, b) =>
    Math.max(b.estimatedTaxSaved ?? 0, b.potentialAnnualSupportProtected ?? 0)
    - Math.max(a.estimatedTaxSaved ?? 0, a.potentialAnnualSupportProtected ?? 0));

  return {
    taxYear: cfg.taxYear,
    scope: "UK-wide ANI interactions for Personal Allowance, HICBC and the Tax-Free Childcare income condition, plus bounded planning reminders. Legal planning only; not evasion advice.",
    adjustedNetIncome: aniBreakdown,
    personalAllowance: pa,
    highIncomeChildBenefitCharge: {
      applies: hicbc.applies,
      annualChildBenefit: benefit,
      chargePercent: hicbc.chargePercent,
      estimatedCharge: hicbc.estimatedCharge,
      liablePerson: hicbc.liablePerson,
      liableAdjustedNetIncome: hicbc.liableAdjustedNetIncome,
      provisional: hicbc.provisional,
    },
    taxFreeChildcare: {
      status: tfc.status,
      incomeLimit: fromPence(tfc.incomeLimitPence),
      individualOverBy: tfcIndividualOverBy,
      partnerOverBy: tfcPartnerOverBy,
      potentialAnnualTopUp: tfcPotentialAnnualTopUp,
      missingFacts: tfc.missingFacts,
      fullEligibilityDetermined: false,
    },
    pensionAnnualAllowance: pension,
    warnings,
    moves,
    ruleset: { ...cfg.ruleset },
    sources: cfg.sources,
  };
}
