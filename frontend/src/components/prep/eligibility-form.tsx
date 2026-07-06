"use client";

// i18n: deferred to M2 — plain English for launch

import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  checkEligibility,
  type EligibilityResult,
  type TaxYear,
  type YearlyGrossIncome,
} from "@taxsorted/engine/uk/itsa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parsePounds, penceOf, INVALID_AMOUNT_MESSAGE } from "@/lib/parse";
import { formatUkDate } from "@/lib/format";

const YEARS: TaxYear[] = ["2024-25", "2025-26", "2026-27"];

interface YearField {
  se: string;
  property: string;
}

type FieldState = Record<TaxYear, YearField>;

const EMPTY_FIELDS: FieldState = {
  "2024-25": { se: "", property: "" },
  "2025-26": { se: "", property: "" },
  "2026-27": { se: "", property: "" },
};

// A year nobody typed anything into is "not measured", not "measured at
// zero" — those read completely differently to checkEligibility, so a fully
// blank row is left out of the call rather than sent as {se: 0, property: 0}.
function isRowBlank(row: YearField): boolean {
  return row.se.trim() === "" && row.property.trim() === "";
}

/**
 * Every explain/exemption sentence from the engine carries its source as a
 * literal URL inline in the text. This turns just that URL into a real link,
 * leaving the rest of the sentence — including any trailing punctuation — as
 * plain text.
 */
function linkify(text: string, keyPrefix: string): ReactNode[] {
  const urlPattern = /(https?:\/\/\S+)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = urlPattern.exec(text)) !== null) {
    let url = match[0];
    let trailing = "";
    if (/[).,]$/.test(url)) {
      trailing = url.slice(-1);
      url = url.slice(0, -1);
    }
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <a
        key={`${keyPrefix}-link-${i++}`}
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="text-accent underline hover:text-accent-deep"
      >
        {url}
      </a>
    );
    if (trailing) parts.push(trailing);
    lastIndex = match.index + match[0].length;
  }
  parts.push(text.slice(lastIndex));
  return parts;
}

function headlineFor(result: EligibilityResult): string {
  if (result.status === "mandated" && result.mandatedFrom) {
    return `You're already in — since ${formatUkDate(result.mandatedFrom)}`;
  }
  if (result.status === "mandated-later" && result.mandatedFrom) {
    return `You'll be in from ${formatUkDate(result.mandatedFrom)}`;
  }
  return "Not required on these figures";
}

/**
 * "Am I in?" — three year-rows of gross self-employment and UK property
 * income, checked against the MTD IT phased thresholds. Nothing here is
 * submitted anywhere; it's arithmetic against gov.uk's published rules.
 */
export function EligibilityForm() {
  const [fields, setFields] = useState<FieldState>(EMPTY_FIELDS);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [exemptionsOpen, setExemptionsOpen] = useState(false);
  const exemptionsPanelId = useId();

  const updateField = (year: TaxYear, source: keyof YearField, value: string) => {
    setFields((prev) => ({ ...prev, [year]: { ...prev[year], [source]: value } }));
    // editing a field clears its own stale error, nothing else
    const fieldId = `${source}-${year}`;
    setFieldErrors((prev) => {
      if (!(fieldId in prev)) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validate every non-blank field before anything reaches the engine —
    // an unparsable field must never be silently read as zero.
    const nextErrors: Record<string, string> = {};
    for (const year of YEARS) {
      if (parsePounds(fields[year].se) === "invalid") {
        nextErrors[`se-${year}`] = INVALID_AMOUNT_MESSAGE;
      }
      if (parsePounds(fields[year].property) === "invalid") {
        nextErrors[`property-${year}`] = INVALID_AMOUNT_MESSAGE;
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError(null);
      setResult(null);
      return;
    }
    setFieldErrors({});

    const incomes: YearlyGrossIncome[] = YEARS.filter((year) => !isRowBlank(fields[year])).map(
      (year) => ({
        taxYear: year,
        selfEmploymentGross: penceOf(fields[year].se),
        ukPropertyGross: penceOf(fields[year].property),
      })
    );

    if (incomes.length === 0) {
      setFormError("Enter at least one year's gross income to check.");
      setResult(null);
      return;
    }

    setFormError(null);
    const nextResult = checkEligibility(incomes);
    // Mandated people are the exemptions note's primary audience — someone
    // digitally excluded shouldn't have to hunt for their legal recourse, so
    // the note opens by itself for them. Below-threshold keeps it behind the
    // toggle: for them it's background reading, not a doorway.
    setExemptionsOpen(nextResult.status !== "below-threshold");
    setResult(nextResult);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {YEARS.map((year) => (
          <fieldset key={year} className="rounded-2xl border border-line p-4 sm:p-5">
            <legend className="px-1 text-sm font-semibold text-ink">{year}</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <AmountField
                id={`se-${year}`}
                label={`Self-employment gross income ${year}`}
                value={fields[year].se}
                error={fieldErrors[`se-${year}`]}
                onChange={(value) => updateField(year, "se", value)}
              />
              <AmountField
                id={`property-${year}`}
                label={`UK property gross income ${year}`}
                value={fields[year].property}
                error={fieldErrors[`property-${year}`]}
                onChange={(value) => updateField(year, "property", value)}
              />
            </div>
          </fieldset>
        ))}

        {formError ? (
          <Alert variant="destructive">
            <AlertTitle>Nothing to check yet</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit">Check eligibility</Button>
      </form>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>{headlineFor(result)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-ink-soft">
              {result.explain.map((line, i) => (
                <p key={i}>{linkify(line, `explain-${i}`)}</p>
              ))}
            </div>

            <Alert>
              <AlertTitle>The gotcha</AlertTitle>
              <AlertDescription>
                It&apos;s your income before expenses — the number most people get wrong.
              </AlertDescription>
            </Alert>

            <div>
              <button
                type="button"
                aria-expanded={exemptionsOpen}
                aria-controls={exemptionsPanelId}
                onClick={() => setExemptionsOpen((v) => !v)}
                className="text-sm font-medium text-accent underline hover:text-accent-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                {exemptionsOpen
                  ? "Hide the exclusion note"
                  : "Digital exclusion or other circumstances — could you be excused?"}
              </button>
              {exemptionsOpen ? (
                <p id={exemptionsPanelId} className="mt-2 text-sm text-ink-soft">
                  {linkify(result.exemptionsNote, "exemptions")}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/**
 * One labelled money input. When its value fails validation the input is
 * marked aria-invalid and described by the visible error message below it,
 * so screen readers announce the problem in place.
 */
function AmountField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="text"
        inputMode="decimal"
        placeholder="£0"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={error ? "border-red-600 focus-visible:ring-red-600" : undefined}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
