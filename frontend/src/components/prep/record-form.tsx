"use client";

// i18n: deferred to M2 — plain English for launch

import { useId, useState, type FormEvent } from "react";
import {
  categoriesFor,
  categoryByKey,
  type LedgerRecord,
  type SourceType,
} from "@taxsorted/engine/uk/itsa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionError } from "@/components/ui/action-error";
import { PillRadioGroup } from "@/components/prep/pill-radio-group";
import { todayIsoLocal } from "@/lib/local-date";
import { parsePounds, INVALID_AMOUNT_MESSAGE } from "@/lib/parse";
import { SOURCES } from "@/lib/sources";

export interface RecordFormProps {
  /** Adds one record. Rejects (e.g. an unknown category) surface as a form error. */
  onAdd: (record: Omit<LedgerRecord, "id">) => Promise<unknown>;
  /** Preserves the activity chosen at the Books front door. */
  initialSource?: SourceType;
}

const KINDS: { value: LedgerRecord["kind"]; label: string; title: string }[] = [
  { value: "income", label: "Money in", title: "Money that came into the business" },
  { value: "expense", label: "Money out", title: "Money that left the business" },
];

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
export function RecordForm({
  onAdd,
  initialSource = "self-employment",
}: RecordFormProps) {
  const [date, setDate] = useState(todayIsoLocal());
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<LedgerRecord["kind"]>("income");
  const [source, setSource] = useState<SourceType>(initialSource);
  const [category, setCategory] = useState(() => defaultCategoryFor(initialSource, "income"));
  const [description, setDescription] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [formError, setFormError] = useState<{ technical?: string } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
      setAmountError("Enter an amount, for example £40 or £40.50.");
      return;
    }
    if (parsed === "invalid") {
      setAmountError(INVALID_AMOUNT_MESSAGE);
      return;
    }
    setAmountError(null);
    setFormError(null);
    setSuccess(null);
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
      setSuccess("Added. Check this item before it changes your totals.");
    } catch (err) {
      setFormError({
        ...(err instanceof Error && err.message ? { technical: err.message } : {}),
      });
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
          <Label htmlFor={dateId}>When did the money move?</Label>
          <Input
            id={dateId}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={amountId}>How much?</Label>
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
            <p id={`${amountId}-error`} className="text-base text-red-600">
              {amountError}
            </p>
          ) : null}
        </div>
      </div>

      <PillRadioGroup
        label="Did money come in or go out?"
        options={KINDS}
        value={kind}
        onChange={changeKind}
      />

      <PillRadioGroup
        label="Which work was this for?"
        options={SOURCES.map((sourceOption) => ({
          value: sourceOption.value,
          label:
            sourceOption.value === "self-employment"
              ? "My own business"
              : "A property I let",
          title: sourceOption.label,
        }))}
        value={source}
        onChange={changeSource}
      />
      <p className="text-sm text-ink-soft">
        {SOURCES.find((sourceOption) => sourceOption.value === source)?.plain}
      </p>

      <div className="space-y-1.5">
        <Label htmlFor={categoryId}>What was it for?</Label>
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
          className="flex min-h-11 w-full rounded-md border border-line bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
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
        <p className="text-sm text-ink-soft">{categoryByKey(category, source).plain}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={descriptionId}>Your note (optional)</Label>
        <Input
          id={descriptionId}
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="For example, Royal Mail postage"
        />
      </div>

      {formError ? (
        <ActionError
          message="We couldn’t add this item. Nothing was saved. Try again."
          technical={formError.technical}
        />
      ) : null}
      {success ? (
        <p role="status" className="text-base text-green-700">
          {success}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting}>
        Add to check
      </Button>
    </form>
  );
}
