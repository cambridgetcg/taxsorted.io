import {
  PREPARATION_CIRCUMSTANCES,
  PREPARATION_PERIODS,
  derivePreparationReview,
  employmentReviewIssues,
  type CircumstanceId,
  type GenericEvidenceId,
  type PreparationDraft,
  type PreparationYear,
} from "@/lib/return-preparation";

export const PREPARATION_QUESTIONS: Record<CircumstanceId, string> = {
  employment: "Did you work for an employer during this tax year?",
  trading: "Did you earn money from work you did for yourself?",
  property: "Did you receive rent from property or land?",
  pension: "Did you receive pension income or make pension contributions?",
  "savings-investments": "Did you receive interest or dividends, or sell investments?",
  "other-income": "Did you have other income or gains, including overseas?",
  "life-changes": "Did your circumstances change, such as moving or a change in your family?",
  "hmrc-letter": "Did HMRC send you a letter or notice asking you to take action?",
};

export const PREPARATION_EVIDENCE_HELP: Record<GenericEvidenceId, { why: string; where: string; href?: string }> = {
  trading: {
    why: "Business income and costs need their own supporting records; this journey does not calculate a profit.",
    where: "Look in invoices, receipts, bank statements and your accounting records.",
    href: "https://www.gov.uk/self-employed-records/what-records-to-keep",
  },
  property: {
    why: "Rental income and costs need checking separately from employment.",
    where: "Look in rent statements, letting-agent statements, invoices and your property records.",
  },
  pension: {
    why: "Pension income and pension contributions are different facts to check.",
    where: "Look for pension-provider statements, pension P60s and contribution records.",
  },
  "savings-investments": {
    why: "Interest, dividends and investment disposals can need different records. This journey does not work out their tax treatment.",
    where: "Look in bank interest summaries, dividend vouchers and investment-provider statements.",
  },
  "other-income": {
    why: "Other or overseas income and gains need a separate review. Marking documents reviewed here does not resolve those tax questions.",
    where: "Gather the relevant statements and keep a question list for HMRC or an adviser.",
  },
  "life-changes": {
    why: "A change in your circumstances can affect which questions you need to answer.",
    where: "Keep relevant dates and supporting correspondence, such as moving or a change in family circumstances. Do not enter identifiers here.",
  },
  "hmrc-letter": {
    why: "An HMRC letter may ask for an action or give a deadline that this journey cannot assess.",
    where: "Find the original letter or message and check its tax year, requested action and deadline. Do not copy reference numbers here.",
  },
};

export interface PreparationAction {
  id: string;
  kind: "answer" | "gather" | "review" | "question";
  title: string;
  why: string;
  where: string;
  next: string;
  question?: string;
  target: { step: "circumstances" | "evidence"; circumstance: CircumstanceId };
}

export interface PreparationActionPlan {
  year: PreparationYear;
  actions: PreparationAction[];
}

const employmentWhere = "Look in your own employment documents, payslips and correspondence for this tax year.";
const questionPrompts: Record<CircumstanceId, string> = {
  employment: "Which employment documents and facts should I check to establish what applies to this tax year?",
  trading: "Which income, expense and business records should I check for work I did for myself in this tax year?",
  property: "Which rental income, cost and ownership records should I check for this tax year?",
  pension: "Which pension income and contribution statements should I check, and which facts need a separate review?",
  "savings-investments": "Which interest, dividend, investment and disposal statements should I check, and what tax questions remain?",
  "other-income": "How should I record other or overseas income or gains for this tax year, and which facts and documents are needed to assess their tax treatment?",
  "life-changes": "Which dates and documents about my change in circumstances should I check, and could it affect what I need to report for this tax year?",
  "hmrc-letter": "What action does this letter ask me to take, for which tax year, and by what deadline?",
};

function whereFor(id: CircumstanceId): string {
  return id === "employment" ? employmentWhere : PREPARATION_EVIDENCE_HELP[id].where;
}

/**
 * A fresh view of the current draft, including unfinished in-memory entries.
 * No saved task flags, I/O, source identifiers, figures, labels or notes leave
 * this function. Actions are bounded by topics, never one per employment row.
 */
export function derivePreparationActionPlan(
  draft: PreparationDraft,
  asOfDate = new Date().toISOString().slice(0, 10),
): PreparationActionPlan {
  const review = derivePreparationReview(draft, asOfDate);
  const actions: PreparationAction[] = [];
  for (const { id, label } of PREPARATION_CIRCUMSTANCES) {
    const answer = draft.circumstances[id];
    if (answer === null) {
      actions.push({
        id: `${id}-answer`, kind: "answer", title: `Answer: ${label}`,
        why: "This question is unanswered. An untouched answer does not mean No.",
        where: whereFor(id),
        next: `${PREPARATION_QUESTIONS[id]} Choose Yes, No or Not sure after checking.`,
        target: { step: "circumstances", circumstance: id },
      });
    } else if (answer === "unknown") {
      actions.push({
        id: `${id}-clarify`, kind: "question", title: `Clarify: ${label}`,
        why: "You marked this Not sure. Evidence labels do not resolve that answer.",
        where: whereFor(id),
        next: "Check the records and update the circumstance answer when you know. If you need help, take this question to HMRC or an adviser.",
        question: questionPrompts[id],
        target: { step: "circumstances", circumstance: id },
      });
    } else if (answer === "yes" && id !== "employment") {
      const status = draft.evidence[id];
      const help = PREPARATION_EVIDENCE_HELP[id];
      if (status !== "reviewed") actions.push({
        id: `${id}-evidence`,
        kind: status === "missing" ? "gather" : status === "collected" ? "review" : "question",
        title: `${status === "missing" ? "Gather records" : status === "collected" ? "Review records" : "Follow up"}: ${label}`,
        why: help.why,
        where: help.where,
        next: status === "missing" ? "Find the records for this tax year, keep the originals in your own files, and update the evidence status when collected."
          : status === "collected" ? "Check the collected records for this year. Mark them reviewed only after your own check, or leave a follow-up if something is unclear."
            : "Check what remains unresolved. Take this question to HMRC or an adviser if you need help; update the evidence label only after your own review.",
        ...(status === "unresolved" ? { question: questionPrompts[id] } : {}),
        target: { step: "evidence", circumstance: id },
      });
    }
  }

  // A document review cannot settle unsupported tax treatment. Avoid repeating
  // the same prompt if this topic already produced a question above.
  if (draft.circumstances["other-income"] === "yes"
    && !actions.some(action => action.target.circumstance === "other-income" && action.kind === "question")) {
    actions.push({
      id: "other-income-tax-question", kind: "question", title: "Keep a question about other or overseas income",
      why: PREPARATION_EVIDENCE_HELP["other-income"].why,
      where: PREPARATION_EVIDENCE_HELP["other-income"].where,
      next: "Check whether this circumstance applies. If it does, take the tax-treatment question to HMRC or an adviser; this preparation cannot resolve it.",
      question: questionPrompts["other-income"],
      target: { step: "evidence", circumstance: "other-income" },
    });
  }

  if (review.employment.active) {
    const ended = asOfDate > PREPARATION_PERIODS[draft.year].end;
    if (review.employment.total === 0) actions.push({
      id: "employment-gather", kind: "gather", title: "Gather your employment documents",
      why: "Employment is marked Yes, but no employment documents are entered in this draft.",
      where: employmentWhere,
      next: ended ? "Find this year's employment documents and add each job separately. Keep missing figures unknown until you can check them."
        : "Keep current payslips as other documents while you organise your records. This year's P60 cannot be marked reviewed yet.",
      target: { step: "evidence", circumstance: "employment" },
    });
    const p60 = draft.employmentSources.filter(source => source.documentType === "P60");
    const p60ToCheck = p60.filter(source => !source.reviewed || employmentReviewIssues(source, draft.year, asOfDate).length > 0).length;
    if (p60ToCheck > 0) actions.push({
      id: "employment-p60-review", kind: "review", title: "Check your P60 entries",
      why: `${p60ToCheck} P60 ${p60ToCheck === 1 ? "entry needs" : "entries need"} a check before being counted as reviewed for this year.`,
      where: employmentWhere,
      next: ended ? "Check each remaining P60's year, employer, source label, pay and tax. Keep unknown figures blank. Confirm review only after checking the document."
        : "Check the recorded details, but leave this year's P60 entries unresolved until the tax year has ended.",
      target: { step: "evidence", circumstance: "employment" },
    });
    if (!ended) actions.push({
      id: "employment-year-in-progress", kind: "review", title: "Keep ongoing-year employment records unresolved",
      why: "This tax year has not ended. A saved review mark cannot make its P60 ready for review.",
      where: employmentWhere,
      next: "Keep current payslips as other documents while organising records. Return to the P60 check after the tax year has ended.",
      target: { step: "evidence", circumstance: "employment" },
    });
    const unsupported = draft.employmentSources.filter(source => source.documentType !== "P60").length;
    if (unsupported > 0) actions.push({
      id: "employment-other-documents", kind: "question", title: "Follow up P45 or other employment documents",
      why: `${unsupported} employment ${unsupported === 1 ? "document is" : "documents are"} outside the current P60 review step.`,
      where: employmentWhere,
      next: "Keep these entries unresolved. Take the question and your own documents to HMRC or an adviser if you need help with the next step.",
      question: "How should I use my P45 or other employment documents for this tax year, and how can I avoid counting figures again if they also appear on a P60?",
      target: { step: "evidence", circumstance: "employment" },
    });
  } else if (review.employment.inactive > 0) {
    actions.push({
      id: "employment-inactive", kind: "review", title: "Review the answer behind inactive employment entries",
      why: `${review.employment.inactive} retained employment ${review.employment.inactive === 1 ? "entry is" : "entries are"} inactive because employment is not marked Yes.`,
      where: employmentWhere,
      next: "Review the employment circumstance. Retained documents do not answer it for you; keep No or Not sure if that remains the appropriate answer.",
      target: { step: "circumstances", circumstance: "employment" },
    });
  }
  if (review.warnings.length > 0) actions.push({
    id: "employment-overlap", kind: "review", title: "Check employment documents for overlap",
    why: "More than one employment entry uses the same employer or source label. Entries have not been combined or removed.",
    where: employmentWhere,
    next: "Compare the original documents before combining figures, including any P45 and P60 overlap. Inactive entries can still need this check.",
    question: "Do these employment documents overlap, and which figures should I use without counting the same income or tax twice?",
    target: {
      step: draft.circumstances.employment === "yes" || draft.circumstances.employment === "unknown" ? "evidence" : "circumstances",
      circumstance: "employment",
    },
  });
  // Work already identified comes before untouched questions. Within those
  // groups, keep the familiar circumstance order and each topic's step order.
  const topicOrder = new Map(PREPARATION_CIRCUMSTANCES.map((topic, index) => [topic.id, index]));
  actions.sort((left, right) => Number(left.kind === "answer") - Number(right.kind === "answer")
    || topicOrder.get(left.target.circumstance)! - topicOrder.get(right.target.circumstance)!);
  return { year: draft.year, actions };
}

/** Fixed prompts only; suitable for the existing deliberate summary export. */
export function formatPreparationActionPlan(draft: PreparationDraft, asOfDate?: string): string {
  const plan = derivePreparationActionPlan(draft, asOfDate);
  const lines = [
    "Preparation actions and questions",
    `Tax year: ${PREPARATION_PERIODS[plan.year].label}`,
    "Derived from current draft answers and review labels; these may include unsaved changes. No document has been inspected and no filing obligation or tax treatment is established.",
  ];
  if (!plan.actions.length) lines.push("No actions are derived from these draft answers. This does not establish completeness or readiness to file.");
  for (const [index, action] of plan.actions.entries()) {
    lines.push("", `${index + 1}. ${action.title}`, `Why: ${action.why}`, `Where to look: ${action.where}`, `Next: ${action.next}`);
    if (action.question) lines.push(`Question for HMRC or an adviser: ${action.question}`);
  }
  return lines.join("\n");
}
