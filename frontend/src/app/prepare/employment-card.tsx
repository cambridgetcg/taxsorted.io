"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  employmentReviewIssues,
  reviewEmploymentSource,
  updateEmploymentSource,
  type EmploymentSource,
  type PreparationYear,
} from "@/lib/return-preparation";

export const fieldClass =
  "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-line-strong bg-paper px-3 py-2 text-base text-ink";
export const helpLinkClass =
  "inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4";

export function EmploymentCard({
  source,
  year,
  index,
  onChange,
  onRemove,
}: {
  source: EmploymentSource;
  year: PreparationYear;
  index: number;
  onChange: (source: EmploymentSource) => void;
  onRemove: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [removing, setRemoving] = useState(false);
  const issues = employmentReviewIssues(source, year);
  const reviewed = source.reviewed && issues.length === 0;
  const prefix = `employment-${source.id}`;
  function change(patch: Partial<EmploymentSource>) {
    setConfirmed(false);
    setShowIssues(false);
    onChange(updateEmploymentSource(source, patch));
  }
  function review() {
    if (issues.length || !confirmed) {
      setShowIssues(true);
      return;
    }
    onChange(reviewEmploymentSource(source, year, confirmed));
    setShowIssues(false);
  }
  return (
    <section
      aria-labelledby={`${prefix}-title`}
      className="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${prefix}-title`} className="text-xl font-semibold text-ink">
          Employment {index + 1}
        </h3>
        <span className="rounded-full bg-paper px-3 py-1 text-sm text-ink-soft">
          {reviewed ? "Reviewed against your document" : "To review"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-soft">
        Use one entry per job. Keep documents for that job together so the same
        pay is not counted twice. No figures are added together here.
      </p>
      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
        <label
          className="min-w-0 text-sm font-semibold text-ink"
          htmlFor={`${prefix}-employer`}
        >
          Employer or job label
          <input
            id={`${prefix}-employer`}
            value={source.employerName}
            maxLength={120}
            onChange={(event) => change({ employerName: event.target.value })}
            className={fieldClass}
            placeholder="For example, Job A"
            autoComplete="off"
          />
        </label>
        <label
          className="min-w-0 text-sm font-semibold text-ink"
          htmlFor={`${prefix}-type`}
        >
          Document type
          <select
            id={`${prefix}-type`}
            value={source.documentType}
            onChange={(event) =>
              change({
                documentType: event.target
                  .value as EmploymentSource["documentType"],
              })
            }
            className={fieldClass}
          >
            <option value="P60">P60</option>
            <option value="P45">P45</option>
            <option value="other">Other document / needs help</option>
          </select>
        </label>
        <label
          className="min-w-0 text-sm font-semibold text-ink"
          htmlFor={`${prefix}-year`}
        >
          Tax year shown on the document
          <select
            id={`${prefix}-year`}
            value={source.documentYear}
            onChange={(event) =>
              change({
                documentYear: event.target
                  .value as EmploymentSource["documentYear"],
              })
            }
            className={fieldClass}
          >
            <option value="unknown">Not checked yet</option>
            <option value="2025-26">2025–26</option>
            <option value="2026-27">2026–27</option>
          </select>
        </label>
        <label
          className="min-w-0 text-sm font-semibold text-ink"
          htmlFor={`${prefix}-label`}
        >
          Document label or where you keep it
          <input
            id={`${prefix}-label`}
            value={source.sourceLabel}
            maxLength={200}
            onChange={(event) => change({ sourceLabel: event.target.value })}
            className={fieldClass}
            placeholder="For example, Job A P60 in my tax folder"
            autoComplete="off"
          />
        </label>
      </div>
      {source.documentType === "P60" ? (
        <div className="mt-5 rounded-xl border border-accent/20 bg-accent-soft p-4">
          <h4 className="font-semibold text-ink">
            Use the “In this employment” figures
          </h4>
          <p
            id={`${prefix}-figures-help`}
            className="mt-2 text-sm leading-6 text-ink-soft"
          >
            Copy pay and tax from the P60’s “In this employment” section. Do not
            copy “Total for year” or previous employments. Leave a missing
            figure blank; enter 0 only if the document says zero. If the tax
            figure is marked R (refund), enter it with a minus sign. Pay cannot
            be negative.
          </p>
          <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
            <label
              className="min-w-0 text-sm font-semibold text-ink"
              htmlFor={`${prefix}-pay`}
            >
              Pay in this employment (£)
              <input
                id={`${prefix}-pay`}
                value={source.pay}
                onChange={(event) => change({ pay: event.target.value })}
                inputMode="decimal"
                maxLength={16}
                autoComplete="off"
                aria-describedby={`${prefix}-figures-help`}
                className={fieldClass}
              />
            </label>
            <label
              className="min-w-0 text-sm font-semibold text-ink"
              htmlFor={`${prefix}-tax`}
            >
              Tax deducted in this employment (£)
              <input
                id={`${prefix}-tax`}
                value={source.tax}
                onChange={(event) => change({ tax: event.target.value })}
                inputMode="decimal"
                maxLength={16}
                autoComplete="off"
                aria-describedby={`${prefix}-figures-help`}
                className={fieldClass}
              />
            </label>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            Find your P60 in your employer’s payroll portal or ask the employer
            for a replacement. A separate P60 covers each job held at the end of
            the tax year.
          </p>
          <a
            href="https://www.gov.uk/paye-forms-p45-p60-p11d/p60"
            target="_blank"
            rel="noreferrer noopener"
            className={helpLinkClass}
          >
            GOV.UK: finding your P60 (opens in a new tab)
          </a>
          <a
            href="https://www.gov.uk/government/publications/self-assessment-employment-sa102"
            target="_blank"
            rel="noreferrer noopener"
            className={helpLinkClass}
          >
            GOV.UK: employment return notes (opens in a new tab)
          </a>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="font-semibold text-ink">
            Keep this as an unresolved follow-up
          </h4>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {source.documentType === "P45"
              ? "A P45 relates to a job you left. Keep it with your final payslip and any later P60. Pay may overlap across documents, so this journey does not combine their figures."
              : "Keep the document and note what needs checking. This journey only reviews P60 entries; other sources need a separate check."}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Figures previously entered on this card are not used as reviewed
            figures while this document type is selected.
          </p>
          <a
            href="https://www.gov.uk/paye-forms-p45-p60-p11d/p45"
            target="_blank"
            rel="noreferrer noopener"
            className={helpLinkClass}
          >
            GOV.UK: P45 help (opens in a new tab)
          </a>
        </div>
      )}
      <label
        className="mt-4 block text-sm font-semibold text-ink"
        htmlFor={`${prefix}-notes`}
      >
        Notes or questions (optional)
        <textarea
          id={`${prefix}-notes`}
          value={source.notes}
          maxLength={2000}
          onChange={(event) => change({ notes: event.target.value })}
          className={`${fieldClass} min-h-24`}
          aria-describedby={`${prefix}-notes-help`}
        />
      </label>
      <p id={`${prefix}-notes-help`} className="mt-2 text-sm text-ink-soft">
        Use a short reminder. Leave out National Insurance numbers, UTRs,
        account numbers and login details.
      </p>
      {source.documentType === "P60" && !reviewed && (
        <div className="mt-5">
          <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-ink">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-accent"
            />
            I checked this job, the tax year and both “In this employment”
            figures against the document.
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={review}
            className="mt-3 whitespace-normal"
          >
            Mark employment {index + 1} reviewed
          </Button>
          {showIssues && (
            <div role="alert" className="mt-3 text-sm text-amber-950">
              <p className="font-semibold">
                Before marking this entry reviewed:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
                {!confirmed && <li>Confirm that you checked the document.</li>}
              </ul>
            </div>
          )}
        </div>
      )}
      <p className="mt-4 text-sm leading-6 text-ink-soft">
        “Reviewed” records your own document check. Editing this entry removes
        that mark. It does not confirm tax treatment or completeness.
      </p>
      <Button
        type="button"
        variant="ghost"
        onClick={() =>
          source.employerName ||
          source.sourceLabel ||
          source.pay ||
          source.tax ||
          source.notes
            ? setRemoving(true)
            : onRemove()
        }
        className="mt-3 whitespace-normal"
      >
        Remove employment {index + 1}
      </Button>
      {removing && (
        <div
          role="group"
          aria-label={`Remove employment ${index + 1}`}
          className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <p className="text-sm leading-6 text-amber-950">
            Remove this entry and its figures and notes from the draft on this
            page? Your previously saved preparation changes only when you save
            again.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoving(false)}
              className="whitespace-normal"
            >
              Keep employment {index + 1}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onRemove}
              className="whitespace-normal"
            >
              Confirm removal of employment {index + 1}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
