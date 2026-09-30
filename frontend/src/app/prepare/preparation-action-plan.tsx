"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { derivePreparationActionPlan, type PreparationAction } from "@/lib/preparation-action-plan";
import { PREPARATION_PERIODS, type PreparationDraft } from "@/lib/return-preparation";

interface PreparationActionPlanProps {
  draft: PreparationDraft;
  onNavigate: (target: PreparationAction["target"]) => void;
  busy?: boolean;
}

const kindLabels: Record<PreparationAction["kind"], string> = {
  answer: "Answer a question",
  gather: "Gather evidence",
  review: "Review evidence",
  question: "Ask a follow-up question",
};

export function PreparationActionPlan(props: PreparationActionPlanProps) {
  // A different year's plan begins with its own short list and focus state.
  return <ActionPlanForYear key={props.draft.year} {...props} />;
}

function ActionPlanForYear({ draft, onNavigate, busy = false }: PreparationActionPlanProps) {
  const plan = derivePreparationActionPlan(draft);
  const [expanded, setExpanded] = useState(false);
  const firstAdditionalHeading = useRef<HTMLHeadingElement>(null);
  const focusExpanded = useRef(false);
  const identifier = useId();
  const headingId = `${identifier}-heading`;
  const listId = `${identifier}-list`;
  const shown = expanded ? plan.actions : plan.actions.slice(0, 3);

  useEffect(() => {
    if (expanded && focusExpanded.current) {
      firstAdditionalHeading.current?.focus();
      focusExpanded.current = false;
    }
  }, [expanded]);

  return <section aria-labelledby={headingId} className="mt-6 min-w-0 rounded-2xl border border-line bg-paper p-4 sm:p-6">
    <p className="section-label">Preparation · {PREPARATION_PERIODS[plan.year].label}</p>
    <h3 id={headingId} className="mt-2 text-xl font-semibold text-ink">Your tasks and questions</h3>
    <p className="mt-3 text-sm leading-6 text-ink-soft">This list reflects your entries on this page, including unsaved changes. Use “Save preparation on this device” to keep them.</p>
    {plan.actions.length > 0 ? <>
      <p className="mt-2 text-sm leading-6 text-ink-soft">Update the relevant answer or evidence to change these tasks. Your preparation summary includes these tasks and questions.</p>
      <p className="mt-4 text-sm font-semibold text-ink">Showing {shown.length} of {plan.actions.length} tasks and questions</p>
      <ol id={listId} className="mt-3 space-y-4">
        {shown.map((action, index) => {
          const titleId = `${identifier}-action-${action.id}`;
          return <li key={action.id} className="min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-5">
            <p className="section-label">{kindLabels[action.kind]}</p>
            <h4 id={titleId} ref={index === 3 ? firstAdditionalHeading : undefined} tabIndex={-1} className="mt-2 scroll-mt-28 text-lg font-semibold text-ink">{action.title}</h4>
            <dl className="mt-3 space-y-3 text-sm leading-6">
              <div><dt className="font-semibold text-ink">Why this matters</dt><dd className="text-ink-soft">{action.why}</dd></div>
              <div><dt className="font-semibold text-ink">Where to look</dt><dd className="text-ink-soft">{action.where}</dd></div>
              <div><dt className="font-semibold text-ink">What to do next</dt><dd className="text-ink-soft">{action.next}</dd></div>
            </dl>
            {action.question ? <div className="mt-4 rounded-lg border border-accent/20 bg-accent-soft p-3 text-sm leading-6">
              <p className="font-semibold text-ink">Question to ask</p>
              <p className="mt-1 text-ink-soft">{action.question}</p>
            </div> : null}
            <Button type="button" variant="outline" disabled={busy} aria-describedby={titleId} className="mt-4 max-w-full whitespace-normal text-left" onClick={() => onNavigate(action.target)}>
              {action.target.step === "circumstances" ? "Review this answer" : "Open this evidence"}
            </Button>
          </li>;
        })}
      </ol>
      {plan.actions.length > 3 ? <Button type="button" variant="ghost" aria-expanded={expanded} aria-controls={listId} className="mt-4 max-w-full whitespace-normal" onClick={event => {
        focusExpanded.current = !expanded;
        setExpanded(!expanded);
        if (expanded) event.currentTarget.focus();
      }}>
        {expanded ? "Show first 3 tasks and questions" : `Show all ${plan.actions.length} tasks and questions`}
      </Button> : null}
    </> : <p className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm leading-6 text-ink-soft">No tasks are suggested from the answers and review labels in this draft. This does not establish complete records, correct tax treatment or readiness to file. Review your preparation summary and check whether anything else applies to you.</p>}
  </section>;
}
