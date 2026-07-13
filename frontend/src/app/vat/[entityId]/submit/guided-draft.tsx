"use client";

import { useState } from "react";
import { ArrowRight, Info } from "lucide-react";
import {
  parseVatExampleGuidedAmount,
  prepareVatReturn,
  ratesFor,
  stripVatExamplePoundPrefix,
  type VATObligation,
  type VATReturnData,
  vatExampleGuidedAmountLimit,
} from "@taxsorted/engine/uk/vat";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatDraftBoxValue, presentVatDraft } from "./draft-presentation";

interface GuidedDraftProps {
  obligation: VATObligation;
  onComplete: (data: VATReturnData) => void;
  onUseDetailed: () => void;
}

/** A deliberately narrow local estimate, never a filing or saved draft. */
export function GuidedDraft({
  obligation,
  onComplete,
  onUseDetailed,
}: GuidedDraftProps) {
  const [fitsQuickEstimate, setFitsQuickEstimate] = useState(false);
  const [sales, setSales] = useState("");
  const [costs, setCosts] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const standardRate = ratesFor(obligation.end).standard;
  const standardRatePercent = standardRate * 100;
  const exampleYear = obligation.end.slice(0, 4);
  const maximumAmount = vatExampleGuidedAmountLimit(standardRate);
  const salesResult = parseVatExampleGuidedAmount(
    sales,
    "standard-rated sales",
    maximumAmount,
  );
  const costsResult = parseVatExampleGuidedAmount(
    costs,
    "eligible standard-rated purchases",
    maximumAmount,
  );
  const figuresReady = fitsQuickEstimate && salesResult.ok && costsResult.ok;

  const { data } = prepareVatReturn(
    [
      { kind: "sale", net: salesResult.ok ? salesResult.value : 0, rate: standardRate },
      {
        kind: "purchase",
        net: costsResult.ok ? costsResult.value : 0,
        rate: standardRate,
        reclaimable: true,
      },
    ],
    {
      periodKey: obligation.periodKey,
      periodEnd: obligation.end,
      finalised: confirmed,
    },
  );
  const presentation = presentVatDraft(data);

  const resetConfirmation = () => setConfirmed(false);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Step 1 · Check the fit
        </p>
        <h2 className="mt-2 text-xl font-semibold text-ink">
          Can this narrow estimate handle the example?
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          It uses only the {standardRatePercent}% rate recorded for this fictional {exampleYear}{" "}
          period. Confirm the assumptions before entering figures, and check the{" "}
          <a
            href="https://www.gov.uk/vat-rates"
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline underline-offset-4 hover:text-accent-deep"
          >
            official VAT rates
          </a>
          .
        </p>

        <label className="mt-5 flex items-start gap-3 rounded-lg border border-line bg-paper p-4">
          <input
            type="checkbox"
            checked={fitsQuickEstimate}
            onChange={(event) => {
              setFitsQuickEstimate(event.target.checked);
              setConfirmed(false);
            }}
            className="mt-1 h-4 w-4 accent-accent"
          />
          <span className="text-sm leading-6 text-ink">
            Every sale in these totals is standard-rated, and the purchase total contains
            only standard-rated business costs whose VAT has been checked as eligible to
            reclaim.
          </span>
        </label>

        <details className="mt-4 rounded-lg border border-line p-4 text-sm">
          <summary className="cursor-pointer font-medium text-ink">
            When should I avoid the quick estimate?
          </summary>
          <p className="mt-3 leading-6 text-ink-soft">
            Use suitable records or software when another VAT rate, an exemption, a special
            accounting scheme, imports, reverse charge, Northern Ireland or EU goods rules,
            or adjustments are involved.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onUseDetailed}>
            Use the detailed boxes
            <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
          </Button>
        </details>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Step 2 · Add the totals
        </p>
        <h2 className="mt-2 text-xl font-semibold text-ink">Standard-rate figures</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Fictional period ending {formatDate(obligation.end)}. Nothing entered here is
          stored or sent.
        </p>

        <div className="mt-5 space-y-5">
          <AmountField
            id="guided-sales"
            label="Standard-rated sales, before VAT"
            help="The net sales value included in this narrow estimate."
            value={sales}
            disabled={!fitsQuickEstimate}
            error={sales !== "" && !salesResult.ok ? salesResult.error : undefined}
            onChange={(value) => {
              setSales(stripVatExamplePoundPrefix(value));
              resetConfirmation();
            }}
            onBlur={() => {
              if (salesResult.ok) setSales(String(salesResult.value));
            }}
          />
          <AmountField
            id="guided-costs"
            label="Eligible standard-rated purchases, before VAT"
            help="Only the purchase value included in this narrow estimate."
            value={costs}
            disabled={!fitsQuickEstimate}
            error={costs !== "" && !costsResult.ok ? costsResult.error : undefined}
            onChange={(value) => {
              setCosts(stripVatExamplePoundPrefix(value));
              resetConfirmation();
            }}
            onBlur={() => {
              if (costsResult.ok) setCosts(String(costsResult.value));
            }}
          />
        </div>

        {fitsQuickEstimate && !figuresReady ? (
          <p className="mt-5 flex items-start gap-2 rounded-lg bg-accent-soft p-3 text-sm leading-6 text-ink">
            <Info aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-accent" />
            Enter both totals to see an estimate. Enter 0 only when the real total was zero.
          </p>
        ) : null}
      </section>

      {figuresReady ? (
        <section className="space-y-5" aria-labelledby="guided-estimate-heading">
          <div
            className="rounded-lg border border-line bg-accent-soft p-5 sm:p-6"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Step 3 · Review the estimate
            </p>
            <h2 id="guided-estimate-heading" className="mt-2 text-2xl font-semibold text-ink">
              {presentation.headline}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{presentation.detail}</p>
            <p className="mt-3 text-sm font-medium text-ink">
              Example only · based on the assumptions above · not checked by HMRC
            </p>
          </div>

          <details className="rounded-lg border border-line bg-white p-5">
            <summary className="cursor-pointer font-medium text-ink">
              See the draft nine-box breakdown
            </summary>
            <dl className="mt-4 divide-y divide-line">
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
          </details>

          <label className="flex items-start gap-3 rounded-lg border border-line bg-white p-4">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 h-4 w-4 accent-accent"
            />
            <span className="text-sm leading-6 text-ink">
              I checked this example draft against the figures I entered. Completing it still
              does not save or send anything.
            </span>
          </label>

          <div className="flex justify-end">
            <Button type="button" disabled={!confirmed} onClick={() => onComplete(data)}>
              Review completed calculation
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function AmountField({
  id,
  label,
  help,
  value,
  disabled,
  error,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  help: string;
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="font-medium text-ink">
        {label}
      </label>
      <p id={helpId} className="mt-1 text-sm leading-6 text-ink-soft">
        {help}
      </p>
      <div className="relative mt-2">
        <span aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 text-ink-soft">
          £
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
          className="min-h-11 w-full rounded-md border border-line bg-white py-2 pl-7 pr-3 text-ink disabled:bg-paper disabled:text-ink-soft"
          placeholder="0.00"
        />
      </div>
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
