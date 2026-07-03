"use client";

// i18n: deferred to M2 — plain English for launch

import { useId, useState, type FormEvent } from "react";
import {
  categoriesFor,
  type LedgerRecord,
  type SourceType,
} from "@taxsorted/engine/uk/itsa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { parsePounds, INVALID_AMOUNT_MESSAGE } from "@/lib/parse";
import { SOURCES } from "@/lib/sources";

export interface RecordFormProps {
  /** Adds one record. Rejects (e.g. an unknown category) surface as a form error. */
  onAdd: (record: Omit<LedgerRecord, "id">) => Promise<unknown>;
}

const KINDS: { value: LedgerRecord["kind"]; label: string }[] = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

const TOGGLE_BASE =
  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";
const TOGGLE_ON = "border-accent bg-accent text-white";
const TOGGLE_OFF = "border-gray-300 bg-white text-gray-700 hover:bg-gray-50";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The first category of the given kind for a source, falling back to the list's first entry. */
function defaultCategoryFor(source: SourceType, kind: LedgerRecord["kind"]): string {
  const list = categoriesFor(source);
  return list.find((c) => c.kind === kind)?.key ?? list[0].key;
}

/**
 * Add-one-record form: date, amount, income/expense, source, and a category
 * drawn from the exact HMRC digital-record field list for that source —
 * nothing here is submitted anywhere, `onAdd` is the only way a record
 * leaves this component.
 */
export function RecordForm({ onAdd }: RecordFormProps) {
  const [date, setDate] = useState(todayIso());
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<LedgerRecord["kind"]>("income");
  const [source, setSource] = useState<SourceType>("self-employment");
  const [category, setCategory] = useState(() => defaultCategoryFor("self-employment", "income"));
  const [description, setDescription] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dateId = useId();
  const amountId = useId();
  const categoryId = useId();
  const descriptionId = useId();

  const categories = categoriesFor(source);

  const changeSource = (next: SourceType) => {
    setSource(next);
    setCategory(defaultCategoryFor(next, kind));
  };

  const changeKind = (next: LedgerRecord["kind"]) => {
    setKind(next);
    setCategory(defaultCategoryFor(source, next));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parsePounds(amount);
    if (parsed === "blank") {
      setAmountError("Enter an amount.");
      return;
    }
    if (parsed === "invalid") {
      setAmountError(INVALID_AMOUNT_MESSAGE);
      return;
    }
    setAmountError(null);
    setFormError(null);
    setSubmitting(true);
    try {
      await onAdd({
        date,
        amount: parsed,
        kind,
        category,
        source,
        description: description.trim() === "" ? undefined : description.trim(),
      });
      setAmount("");
      setDescription("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add that record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4 rounded-2xl border border-line p-4 sm:p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={dateId}>Date</Label>
          <Input
            id={dateId}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={amountId}>Amount (£)</Label>
          <Input
            id={amountId}
            type="text"
            inputMode="decimal"
            placeholder="£0.00"
            value={amount}
            aria-invalid={amountError ? true : undefined}
            aria-describedby={amountError ? `${amountId}-error` : undefined}
            onChange={(e) => {
              setAmount(e.target.value);
              if (amountError) setAmountError(null);
            }}
          />
          {amountError ? (
            <p id={`${amountId}-error`} className="text-sm text-red-600">
              {amountError}
            </p>
          ) : null}
        </div>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-ink">Income or expense</legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Income or expense">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={kind === k.value}
              title={k.value === "income" ? "Money coming in" : "Money going out"}
              onClick={() => changeKind(k.value)}
              className={cn(TOGGLE_BASE, kind === k.value ? TOGGLE_ON : TOGGLE_OFF)}
            >
              {k.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-ink">Source</legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Source">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={source === s.value}
              title={s.plain}
              onClick={() => changeSource(s.value)}
              className={cn(TOGGLE_BASE, source === s.value ? TOGGLE_ON : TOGGLE_OFF)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor={categoryId}>Category</Label>
        {/*
          Every category for this source is listed, grouped by kind, so the
          dropdown reads like the full HMRC field list — but only options
          matching the income/expense toggle above are selectable, so a
          record's `kind` and `category` can never disagree.
        */}
        <select
          id={categoryId}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <optgroup label="Income">
            {categories
              .filter((c) => c.kind === "income")
              .map((c) => (
                <option key={c.key} value={c.key} disabled={kind !== "income"} title={c.plain}>
                  {c.label}
                </option>
              ))}
          </optgroup>
          <optgroup label="Expenses">
            {categories
              .filter((c) => c.kind === "expense")
              .map((c) => (
                <option key={c.key} value={c.key} disabled={kind !== "expense"} title={c.plain}>
                  {c.label}
                </option>
              ))}
          </optgroup>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={descriptionId}>Description (optional)</Label>
        <Input
          id={descriptionId}
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was this for?"
        />
      </div>

      {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

      <Button type="submit" disabled={submitting}>
        Add record
      </Button>
    </form>
  );
}
