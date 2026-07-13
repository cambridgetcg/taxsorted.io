"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Printer, RotateCcw } from "lucide-react";
import {
  ratesFor,
  type VATObligation,
  type VATReturnData,
} from "@taxsorted/engine/uk/vat";
import { DemoNotice } from "@/components/demo-notice";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, formatDate, formatPeriod } from "@/lib/utils";
import { DetailedDraft } from "./detailed-draft";
import { formatDraftBoxValue, presentVatDraft } from "./draft-presentation";
import { GuidedDraft } from "./guided-draft";

// Fixed fixtures for this retired prototype route. They are never described
// as obligations fetched from HMRC or attached to a real account.
const EXAMPLE_PERIODS: VATObligation[] = [
  {
    periodKey: "26A2",
    start: "2026-04-01",
    end: "2026-06-30",
    due: "2026-08-07",
    status: "O",
  },
  {
    periodKey: "26A3",
    start: "2026-07-01",
    end: "2026-09-30",
    due: "2026-11-07",
    status: "O",
  },
];

type DraftMode = "guided" | "detailed";

interface VATSubmitPageClientProps {
  entityId: string;
}

export default function VATSubmitPageClient({ entityId }: VATSubmitPageClientProps) {
  const periodKey = useSearchParams().get("period");
  const [mode, setMode] = useState<DraftMode>("guided");
  const [completed, setCompleted] = useState<{
    periodKey: string;
    data: VATReturnData;
  } | null>(null);

  const obligation = periodKey
    ? EXAMPLE_PERIODS.find((item) => item.periodKey === periodKey) ?? null
    : EXAMPLE_PERIODS[0];
  const completedData =
    completed && completed.periodKey === obligation?.periodKey ? completed.data : null;
  const standardRatePercent = obligation ? ratesFor(obligation.end).standard * 100 : 20;

  useEffect(() => {
    if (completedData) document.getElementById("completion-heading")?.focus();
  }, [completedData]);

  const focusTab = (nextMode: DraftMode) => {
    setMode(nextMode);
    window.requestAnimationFrame(() => {
      document.getElementById(`${nextMode}-tab`)?.focus();
    });
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextMode: DraftMode | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      nextMode = mode === "guided" ? "detailed" : "guided";
    } else if (event.key === "Home") {
      nextMode = "guided";
    } else if (event.key === "End") {
      nextMode = "detailed";
    }

    if (!nextMode) return;
    event.preventDefault();
    focusTab(nextMode);
  };

  const completeDraft = (data: VATReturnData) => {
    setCompleted({ periodKey: data.periodKey, data });
  };

  const returnToFigures = () => {
    setCompleted(null);
    window.requestAnimationFrame(() => {
      document.getElementById(`${mode}-tab`)?.focus();
    });
  };

  if (!obligation) {
    return (
      <div className="mx-auto min-h-[70vh] max-w-3xl px-4 py-10 sm:px-6">
        <BackToExample entityId={entityId} />
        <section className="mt-6 rounded-lg border border-line bg-white p-5" aria-labelledby="period-error-heading">
          <h1 id="period-error-heading" className="text-xl font-semibold text-ink">
            That fictional period is not available
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Choose one of these fixed examples. They are not HMRC obligations.
          </p>
          <ul className="mt-4 space-y-2">
            {EXAMPLE_PERIODS.map((item) => (
              <li key={item.periodKey}>
                <Link
                  href={`/vat/${entityId}/submit?period=${item.periodKey}`}
                  className="font-medium text-accent underline underline-offset-4 hover:text-accent-deep"
                >
                  {formatPeriod(item.start, item.end)} · fictional due date {formatDate(item.due)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <>
      {completedData ? (
        <CompletionReview
          data={completedData}
          obligation={obligation}
          onReturn={returnToFigures}
        />
      ) : null}

      {/* Keep both calculators mounted while switching modes and reviewing. */}
      <div hidden={Boolean(completedData)} className="min-h-[70vh] bg-paper">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
          <BackToExample entityId={entityId} />

          <div className="mt-6 space-y-6">
            <DemoNotice title="Fictional browser-only calculator">
              This legacy page uses a fixed example period. It does not connect to an
              account or HMRC, save a draft, or file a return.
            </DemoNotice>

            <header>
              <p className="text-sm font-semibold text-accent">VAT example draft</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Understand the figures before anything happens.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">
                Try a narrow {standardRatePercent}% estimate or enter a detailed nine-box
                example. Every result stays in this browser tab and must be checked before
                it is used elsewhere.
              </p>
            </header>

            <div
              className="inline-flex max-w-full rounded-lg border border-line bg-white p-1"
              role="tablist"
              aria-label="VAT example method"
            >
              <button
                id="guided-tab"
                type="button"
                role="tab"
                aria-selected={mode === "guided"}
                aria-controls="guided-panel"
                tabIndex={mode === "guided" ? 0 : -1}
                onClick={() => setMode("guided")}
                onKeyDown={handleTabKeyDown}
                className={cn(
                  "min-h-11 rounded-md px-4 text-sm font-semibold",
                  mode === "guided"
                    ? "bg-accent text-white"
                    : "text-ink-soft hover:bg-accent-soft hover:text-ink",
                )}
              >
                Quick {standardRatePercent}% estimate
              </button>
              <button
                id="detailed-tab"
                type="button"
                role="tab"
                aria-selected={mode === "detailed"}
                aria-controls="detailed-panel"
                tabIndex={mode === "detailed" ? 0 : -1}
                onClick={() => setMode("detailed")}
                onKeyDown={handleTabKeyDown}
                className={cn(
                  "min-h-11 rounded-md px-4 text-sm font-semibold",
                  mode === "detailed"
                    ? "bg-accent text-white"
                    : "text-ink-soft hover:bg-accent-soft hover:text-ink",
                )}
              >
                Detailed boxes
              </button>
            </div>

            <div
              id="guided-panel"
              role="tabpanel"
              aria-labelledby="guided-tab"
              hidden={mode !== "guided"}
            >
              <GuidedDraft
                key={`guided-${obligation.periodKey}`}
                obligation={obligation}
                onComplete={completeDraft}
                onUseDetailed={() => focusTab("detailed")}
              />
            </div>
            <div
              id="detailed-panel"
              role="tabpanel"
              aria-labelledby="detailed-tab"
              hidden={mode !== "detailed"}
            >
              <DetailedDraft
                key={`detailed-${obligation.periodKey}`}
                obligation={obligation}
                onComplete={completeDraft}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CompletionReview({
  data,
  obligation,
  onReturn,
}: {
  data: VATReturnData;
  obligation: VATObligation;
  onReturn: () => void;
}) {
  const presentation = presentVatDraft(data);

  return (
    <section
      className="mx-auto min-h-[70vh] max-w-3xl px-4 py-10 sm:px-6"
      aria-labelledby="completion-heading"
    >
      <div className="rounded-lg border border-line bg-accent-soft p-6 sm:p-10">
        <div className="text-center">
          <CheckCircle2 aria-hidden="true" className="mx-auto h-12 w-12 text-accent" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-accent">
            Local calculation complete
          </p>
          <h1
            id="completion-heading"
            tabIndex={-1}
            className="mt-2 text-3xl font-semibold tracking-tight text-ink"
          >
            Review the fictional VAT draft
          </h1>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-ink">
            {presentation.headline} for {formatPeriod(obligation.start, obligation.end)}.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-soft">
            {presentation.detail} Fictional due date: {formatDate(obligation.due)}.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-soft">
            Nothing was saved, connected to an account, or sent to HMRC. Check every figure
            against records and the current{" "}
            <a
              href="https://www.gov.uk/guidance/how-to-fill-in-and-submit-your-vat-return-vat-notice-70012"
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-accent underline underline-offset-4 hover:text-accent-deep"
            >
              HMRC VAT Return guidance
            </a>{" "}
            before using it in a real return.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-line bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-ink">Nine draft boxes</h2>
          <dl className="mt-3 divide-y divide-line">
            {presentation.boxes.map((box) => (
              <div key={box.box} className="flex items-start justify-between gap-4 py-3 text-sm">
                <dt className="text-ink-soft">
                  <span className="font-medium text-ink">Box {box.box}</span> · {box.label}
                </dt>
                <dd className="shrink-0 font-semibold text-ink">
                  {formatDraftBoxValue(box.box, box.value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row print:hidden">
          <Button type="button" onClick={() => window.print()}>
            <Printer aria-hidden="true" className="mr-2 h-4 w-4" />
            Print or save as PDF
          </Button>
          <Button type="button" variant="outline" onClick={onReturn}>
            <RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" />
            Return to the figures
          </Button>
        </div>
      </div>
    </section>
  );
}

function BackToExample({ entityId }: { entityId: string }) {
  return (
    <Link
      href={`/vat/${entityId}`}
      className={buttonVariants({ variant: "ghost", size: "sm" })}
    >
      <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
      Back to the fictional VAT workspace
    </Link>
  );
}
