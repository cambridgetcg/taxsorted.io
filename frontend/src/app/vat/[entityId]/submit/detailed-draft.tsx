"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  deriveTotals,
  parseVatExampleDetailedAmount,
  stripVatExamplePoundPrefix,
  validateVATReturnData,
  validateVatExampleDetailedTotals,
  type VatExampleDetailedAmountResult,
  type VATObligation,
  type VATReturnData,
} from "@taxsorted/engine/uk/vat";
import { Button } from "@/components/ui/button";
import { formatDate, formatPeriod } from "@/lib/utils";
import { presentVatDraft } from "./draft-presentation";

interface DetailedDraftProps {
  obligation: VATObligation;
  onComplete: (data: VATReturnData) => void;
}

type BoxKey =
  | "vatDueSales"
  | "vatDueAcquisitions"
  | "totalVatDue"
  | "vatReclaimedCurrPeriod"
  | "netVatDue"
  | "totalValueSalesExVAT"
  | "totalValuePurchasesExVAT"
  | "totalValueGoodsSuppliedExVAT"
  | "totalAcquisitionsExVAT";

const EDITABLE_BOX_KEYS = [
  "vatDueSales",
  "vatDueAcquisitions",
  "vatReclaimedCurrPeriod",
  "totalValueSalesExVAT",
  "totalValuePurchasesExVAT",
  "totalValueGoodsSuppliedExVAT",
  "totalAcquisitionsExVAT",
] as const satisfies readonly BoxKey[];

type EditableBoxKey = (typeof EDITABLE_BOX_KEYS)[number];

interface BoxDefinition {
  box: number;
  label: string;
  help: string;
  decimal: boolean;
  calculated?: boolean;
}

const BOX_DEFINITIONS: Record<BoxKey, BoxDefinition> = {
  vatDueSales: {
    box: 1,
    label: "VAT due on sales",
    help: "Enter the Box 1 figure established from the example records.",
    decimal: true,
  },
  vatDueAcquisitions: {
    box: 2,
    label: "VAT due on acquisitions",
    help: "Enter 0 when this box does not apply to the example.",
    decimal: true,
  },
  totalVatDue: {
    box: 3,
    label: "Total VAT due",
    help: "Box 1 plus Box 2, calculated here.",
    decimal: true,
    calculated: true,
  },
  vatReclaimedCurrPeriod: {
    box: 4,
    label: "VAT reclaimed in this period",
    help: "Enter the Box 4 figure already checked against the example records.",
    decimal: true,
  },
  netVatDue: {
    box: 5,
    label: "Estimated net VAT",
    help: "The absolute difference between Box 3 and Box 4, calculated here.",
    decimal: true,
    calculated: true,
  },
  totalValueSalesExVAT: {
    box: 6,
    label: "Sales excluding VAT",
    help: "Enter whole pounds for Box 6.",
    decimal: false,
  },
  totalValuePurchasesExVAT: {
    box: 7,
    label: "Purchases excluding VAT",
    help: "Enter whole pounds for Box 7.",
    decimal: false,
  },
  totalValueGoodsSuppliedExVAT: {
    box: 8,
    label: "Goods supplied under Northern Ireland and EU rules",
    help: "Enter whole pounds, or 0 when this does not apply to the example.",
    decimal: false,
  },
  totalAcquisitionsExVAT: {
    box: 9,
    label: "Acquisitions under Northern Ireland and EU rules",
    help: "Enter whole pounds, or 0 when this does not apply to the example.",
    decimal: false,
  },
};

const INITIAL_INPUTS: Record<EditableBoxKey, string> = {
  vatDueSales: "",
  vatDueAcquisitions: "",
  vatReclaimedCurrPeriod: "",
  totalValueSalesExVAT: "",
  totalValuePurchasesExVAT: "",
  totalValueGoodsSuppliedExVAT: "",
  totalAcquisitionsExVAT: "",
};

function isEditableBoxKey(field: BoxKey): field is EditableBoxKey {
  return EDITABLE_BOX_KEYS.includes(field as EditableBoxKey);
}

export function DetailedDraft({ obligation, onComplete }: DetailedDraftProps) {
  const goodsBoxesRef = useRef<HTMLDetailsElement>(null);
  const [inputs, setInputs] = useState<Record<EditableBoxKey, string>>(INITIAL_INPUTS);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const parsedInputs = Object.fromEntries(
    EDITABLE_BOX_KEYS.map((field) => [
      field,
      parseVatExampleDetailedAmount(
        inputs[field],
        BOX_DEFINITIONS[field].label,
        !BOX_DEFINITIONS[field].decimal,
      ),
    ]),
  ) as Record<EditableBoxKey, VatExampleDetailedAmountResult>;

  const parsedValue = (field: EditableBoxKey): number => {
    const result = parsedInputs[field];
    return result.ok ? result.value : 0;
  };
  const allInputsReady = EDITABLE_BOX_KEYS.every((field) => parsedInputs[field].ok);

  const baseData: VATReturnData = {
    periodKey: obligation.periodKey,
    vatDueSales: parsedValue("vatDueSales"),
    vatDueAcquisitions: parsedValue("vatDueAcquisitions"),
    totalVatDue: 0,
    vatReclaimedCurrPeriod: parsedValue("vatReclaimedCurrPeriod"),
    netVatDue: 0,
    totalValueSalesExVAT: parsedValue("totalValueSalesExVAT"),
    totalValuePurchasesExVAT: parsedValue("totalValuePurchasesExVAT"),
    totalValueGoodsSuppliedExVAT: parsedValue("totalValueGoodsSuppliedExVAT"),
    totalAcquisitionsExVAT: parsedValue("totalAcquisitionsExVAT"),
    finalised: confirmed,
  };
  const { box3, box5 } = deriveTotals(
    baseData.vatDueSales,
    baseData.vatDueAcquisitions,
    baseData.vatReclaimedCurrPeriod,
  );
  const draftData: VATReturnData = {
    ...baseData,
    totalVatDue: box3,
    netVatDue: box5,
  };
  const presentation = presentVatDraft(draftData);

  const handleInputChange = (field: BoxKey, value: string) => {
    if (!isEditableBoxKey(field)) return;

    setInputs((previous) => ({
      ...previous,
      [field]: stripVatExamplePoundPrefix(value),
    }));
    setConfirmed(false);
    setErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      if (
        field === "vatDueSales" ||
        field === "vatDueAcquisitions" ||
        field === "vatReclaimedCurrPeriod"
      ) {
        delete next.totalVatDue;
        delete next.netVatDue;
      }
      return next;
    });
  };

  const handleInputBlur = (field: BoxKey) => {
    if (!isEditableBoxKey(field)) return;
    const result = parsedInputs[field];
    if (!result.ok) {
      setErrors((previous) => ({ ...previous, [field]: result.error }));
      return;
    }

    setInputs((previous) => ({ ...previous, [field]: String(result.value) }));
  };

  const revealAndFocus = (field: string) => {
    if (
      field === "totalValueGoodsSuppliedExVAT" ||
      field === "totalAcquisitionsExVAT"
    ) {
      goodsBoxesRef.current?.setAttribute("open", "");
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById(field === "finalised" ? "detailed-confirm" : `detailed-${field}`)
        ?.focus();
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const incomplete = EDITABLE_BOX_KEYS.filter((field) => !parsedInputs[field].ok);
    if (incomplete.length > 0) {
      setErrors(
        Object.fromEntries(
          incomplete.map((field) => {
            const result = parsedInputs[field];
            return [field, result.ok ? "" : result.error];
          }),
        ),
      );
      revealAndFocus(incomplete[0]);
      return;
    }

    const validation = validateVATReturnData(draftData);
    const exampleTotalErrors = validateVatExampleDetailedTotals(draftData);
    if (!validation.valid || exampleTotalErrors.length > 0) {
      const validationErrors = [
        ...validation.errors.map((error) => [
          error.field,
          error.field === "finalised"
            ? "Confirm that you checked the example figures."
            : error.message,
        ] as const),
        ...exampleTotalErrors.map((error) => [error.field, error.error] as const),
      ];
      setErrors(Object.fromEntries(validationErrors));
      const firstField = validationErrors[0]?.[0];
      if (firstField) {
        revealAndFocus(firstField);
      }
      return;
    }

    setErrors({});
    onComplete(draftData);
  };

  const displayValue = (field: BoxKey): string | number =>
    isEditableBoxKey(field) ? inputs[field] : (draftData[field] as number);

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <section className="rounded-lg border border-line bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Detailed local calculation
        </p>
        <h2 className="mt-2 text-xl font-semibold text-ink">Build a nine-box example</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          {formatPeriod(obligation.start, obligation.end)} · fictional due date {formatDate(obligation.due)}.
          Enter figures already established from records; this screen does not decide VAT treatment.
        </p>
        <p className="mt-4 rounded-lg bg-accent-soft p-3 text-sm leading-6 text-ink">
          This example follows the engine&apos;s existing non-negative input boundary. Negative
          adjustments are not interpreted here; use suitable records or software for them.
          Check HMRC&apos;s{" "}
          <a
            href="https://www.gov.uk/guidance/how-to-fill-in-and-submit-your-vat-return-vat-notice-70012"
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline underline-offset-4 hover:text-accent-deep"
          >
            VAT Return guidance
          </a>
          .
        </p>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">VAT figures</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {(["vatDueSales", "vatDueAcquisitions", "totalVatDue", "vatReclaimedCurrPeriod"] as BoxKey[]).map(
            (field) => (
              <DraftField
                key={field}
                field={field}
                value={displayValue(field)}
                readOnly={BOX_DEFINITIONS[field].calculated}
                error={errors[field]}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
              />
            ),
          )}
        </div>
        <div className="mt-5 rounded-lg border-2 border-accent bg-accent-soft p-4">
          <DraftField
            field="netVatDue"
            value={displayValue("netVatDue")}
            readOnly
            error={errors.netVatDue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
          />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Totals excluding VAT</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {(["totalValueSalesExVAT", "totalValuePurchasesExVAT"] as BoxKey[]).map((field) => (
            <DraftField
              key={field}
              field={field}
              value={displayValue(field)}
              error={errors[field]}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
            />
          ))}
        </div>

        <details ref={goodsBoxesRef} className="mt-5 rounded-lg border border-line p-4">
          <summary className="cursor-pointer font-medium text-ink">
            Northern Ireland and EU goods boxes
          </summary>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {(["totalValueGoodsSuppliedExVAT", "totalAcquisitionsExVAT"] as BoxKey[]).map((field) => (
              <DraftField
                key={field}
                field={field}
                value={displayValue(field)}
                error={errors[field]}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
              />
            ))}
          </div>
        </details>
      </section>

      {allInputsReady ? (
        <section className="rounded-lg border border-line bg-accent-soft p-5" aria-labelledby="detailed-estimate-heading">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Live draft estimate</p>
          <h2 id="detailed-estimate-heading" className="mt-2 text-xl font-semibold text-ink">
            {presentation.headline}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{presentation.detail}</p>
        </section>
      ) : (
        <p className="rounded-lg border border-line bg-accent-soft p-4 text-sm leading-6 text-ink">
          Enter an explicit figure or 0 in every editable box before this example shows an estimate.
        </p>
      )}

      <label className="flex items-start gap-3 rounded-lg border border-line bg-white p-4">
        <input
          id="detailed-confirm"
          type="checkbox"
          checked={confirmed}
          onChange={(event) => {
            setConfirmed(event.target.checked);
            setErrors((previous) => {
              if (!previous.finalised) return previous;
              const next = { ...previous };
              delete next.finalised;
              return next;
            });
          }}
          aria-describedby={errors.finalised ? "detailed-confirm-error" : undefined}
          className="mt-1 h-4 w-4 accent-accent"
        />
        <span className="text-sm leading-6 text-ink">
          I checked these example figures against my records. This confirmation completes a
          browser-only calculation; it does not save or send a return.
          {errors.finalised ? (
            <span id="detailed-confirm-error" className="mt-1 block text-red-700">
              {errors.finalised}
            </span>
          ) : null}
        </span>
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={!confirmed}>
          Review completed calculation
        </Button>
      </div>
    </form>
  );
}

function DraftField({
  field,
  value,
  readOnly = false,
  error,
  onChange,
  onBlur,
}: {
  field: BoxKey;
  value: string | number;
  readOnly?: boolean;
  error?: string;
  onChange: (field: BoxKey, value: string) => void;
  onBlur: (field: BoxKey) => void;
}) {
  const definition = BOX_DEFINITIONS[field];
  const id = `detailed-${field}`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="font-medium text-ink">
        {definition.label} <span className="text-ink-soft">(Box {definition.box})</span>
      </label>
      <p id={helpId} className="mt-1 text-sm leading-6 text-ink-soft">
        {definition.help}
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
          readOnly={readOnly}
          onChange={(event) => onChange(field, event.target.value)}
          onFocus={(event) => {
            if (!readOnly && event.currentTarget.value === "0") event.currentTarget.select();
          }}
          onBlur={() => onBlur(field)}
          aria-invalid={Boolean(error)}
          aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
          className="min-h-11 w-full rounded-md border border-line bg-white py-2 pl-7 pr-3 text-ink read-only:bg-paper read-only:text-ink-soft"
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
