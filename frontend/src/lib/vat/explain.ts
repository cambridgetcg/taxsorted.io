// The teaching layer. The engine computes; this explains — in plain English, to a person
// or an agent. What you need to do, what you can safely skip, how to optimise. No jargon,
// no fear, no punishment framing. Educate, don't gatekeep.

import type { VatReturnSummary } from "./summary";
import type { SchemeComparison } from "./optimiser";

export interface Explanation {
  headline: string;
  whatItMeans: string;
  youNeedTo: string[];
  youCanSkip: string[];
  howToOptimise: string[];
}

const gbp = (n: number): string =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

/** Explain a finished VAT return to a human (or an agent) in plain words. */
export function explainReturn(summary: VatReturnSummary): Explanation {
  const due = summary.dueDate ? ` by ${summary.dueDate}` : "";

  let whatItMeans: string;
  if (summary.position === "payable") {
    whatItMeans = `Over this period you charged more VAT than you reclaimed, so you pay HMRC the ${gbp(summary.amount)} difference. It's their money you collected, passing through — not a tax on your profit.`;
  } else if (summary.position === "repayment") {
    whatItMeans = `You reclaimed more VAT than you charged, so HMRC owes you ${gbp(summary.amount)} back. This is normal for businesses making big purchases or zero-rated sales.`;
  } else {
    whatItMeans = "Your VAT charged and VAT reclaimed cancelled out, so there's nothing to pay or reclaim this period.";
  }

  const youNeedTo: string[] = [`Submit the return${due}.`];
  if (summary.position === "payable") {
    youNeedTo.push(`Set aside ${gbp(summary.amount)} to pay HMRC${due}.`);
  }
  youNeedTo.push("Keep your records digitally (the law just wants the figures, kept in software).");

  const youCanSkip: string[] = [
    "You don't send invoices or receipts to HMRC — only the nine totals.",
    "You don't need paper records.",
    "Boxes 8 and 9 are blank unless you move goods between Northern Ireland and the EU.",
  ];

  const howToOptimise: string[] = [
    "Reclaim VAT on every business cost — that's Box 4, and it directly lowers what you pay.",
    "Check you're on the cheapest VAT scheme for your numbers (see the scheme comparison).",
  ];
  if (summary.daysRemaining !== undefined && summary.daysRemaining > 0) {
    howToOptimise.push(`File early if you like — there's no rush and no penalty for being on time. You have ${summary.daysRemaining} day${summary.daysRemaining === 1 ? "" : "s"}.`);
  }

  return { headline: summary.headline, whatItMeans, youNeedTo, youCanSkip, howToOptimise };
}

/** Explain a scheme comparison: what to do and why, in one short brief. */
export function explainScheme(c: SchemeComparison): string[] {
  const lines = [c.headline];
  if (c.flatRate.limitedCost) {
    lines.push(
      "Because your spend on goods is low, the Flat Rate Scheme would force you onto the 16.5% 'limited cost' rate — which usually costs more than just doing standard VAT and reclaiming your actual costs.",
    );
  } else if (c.recommendation === "flatRate") {
    lines.push(
      "The Flat Rate Scheme is simpler (one percentage of turnover, no tracking input VAT) and, on your numbers, cheaper. You give up reclaiming most costs in exchange.",
    );
  } else {
    lines.push(
      "Standard accounting wins here because you reclaim your real costs, which beats a flat percentage of turnover.",
    );
  }
  lines.push(...c.notes);
  return lines;
}
