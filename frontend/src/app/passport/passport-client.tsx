"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PASSPORT_EVIDENCE_DEFINITIONS,
  type MtdIncomeTaxPassportPosition,
  type PassportAnswer,
  type PassportEvidenceId,
  type PassportEvidenceState,
  type PassportIncomeSourceId,
} from "@taxsorted/engine/uk/passport";
import { MtdExpertCheck } from "@/components/tax-expert/MtdExpertCheck";
import { Button } from "@/components/ui/button";
import {
  createEmptyPassportDraft,
  createPassportStore,
  type PassportStore,
  type TaxPositionPassportDraft,
} from "@/lib/passport-store";

const INCOME_SOURCES: readonly {
  id: PassportIncomeSourceId;
  label: string;
  detail: string;
}[] = [
  {
    id: "employment",
    label: "Employment or PAYE income",
    detail:
      "Recorded for the wider picture. This Passport does not calculate PAYE or check a tax code.",
  },
  {
    id: "self-employment",
    label: "Self-employment as a sole trader",
    detail:
      "Gross income can feed the MTD check. Separate trades and full accounts remain outside this first Passport.",
  },
  {
    id: "uk-property",
    label: "UK property income",
    detail:
      "Use your own share where property is jointly owned. UK property is treated as a property business, not one source per building.",
  },
  {
    id: "foreign-property",
    label: "Foreign property income",
    detail:
      "Residence can change whether it enters the MTD qualifying-income check, so the deeper check asks separately.",
  },
  {
    id: "other-or-complex",
    label: "Another source or a complex situation",
    detail:
      "For example a partnership, pension, savings, gains, trusts, company income or cross-border facts.",
  },
] as const;

const ANSWERS: readonly { value: PassportAnswer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Not sure" },
];

const EVIDENCE_OPTIONS: readonly {
  value: Exclude<PassportEvidenceState, "not-expected">;
  label: string;
}[] = [
  { value: "held", label: "I have it" },
  { value: "missing", label: "I need it" },
  { value: "not-checked", label: "Not checked" },
];

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatInstant(value: string): string {
  return dateTime.format(new Date(value));
}

function answerLabel(answer: PassportAnswer): string {
  return ANSWERS.find((option) => option.value === answer)?.label ?? answer;
}

function evidenceLabel(state: PassportEvidenceState): string {
  return (
    {
      held: "Held — named by you, not inspected",
      missing: "Needed",
      "not-checked": "Not checked",
      "not-expected": "Not expected for the source map",
    } satisfies Record<PassportEvidenceState, string>
  )[state];
}

function effectiveEvidenceState(
  draft: TaxPositionPassportDraft,
  definition: (typeof PASSPORT_EVIDENCE_DEFINITIONS)[number],
): PassportEvidenceState {
  if (
    definition.supportsIncomeSourceIds.every(
      (sourceId) => draft.incomeSources[sourceId] === "no",
    )
  ) {
    return "not-expected";
  }
  return draft.evidence[definition.id];
}

function isNotExplicitZero(value: number | "unknown"): boolean {
  return value === "unknown" || value !== 0;
}

function sourceConflicts(draft: TaxPositionPassportDraft): string[] {
  const position = draft.mtdIncomeTaxPosition;
  if (!position) return [];
  const rows = Object.values(position.request.income.taxYears);
  const conflicts: string[] = [];
  const mtdSourceAnswers = [
    draft.incomeSources["self-employment"],
    draft.incomeSources["uk-property"],
    draft.incomeSources["foreign-property"],
  ];
  if (mtdSourceAnswers.every((answer) => answer === "no")) {
    conflicts.push(
      "An MTD check is attached even though the source map now says no self-employment, UK property or foreign property income.",
    );
  }
  if (
    draft.incomeSources["self-employment"] === "no"
    && rows.some((row) => isNotExplicitZero(row.selfEmploymentGrossPence))
  ) {
    conflicts.push(
      "The source map says no self-employment, but the saved MTD check does not contain explicit zero self-employment income for every year.",
    );
  }
  if (
    draft.incomeSources["uk-property"] === "no"
    && rows.some((row) => isNotExplicitZero(row.ukPropertyGrossPence))
  ) {
    conflicts.push(
      "The source map says no UK property income, but the saved MTD check does not contain explicit zero UK property income for every year.",
    );
  }
  if (
    draft.incomeSources["foreign-property"] === "no"
    && rows.some((row) => isNotExplicitZero(row.foreignPropertyGrossPence))
  ) {
    conflicts.push(
      "The source map says no foreign property income, but the saved MTD check does not contain explicit zero foreign property income for every year.",
    );
  }
  return conflicts;
}

function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function PassportClient({
  store: injectedStore,
}: {
  store?: PassportStore;
}) {
  const store = useMemo(
    () => injectedStore ?? createPassportStore(),
    [injectedStore],
  );
  const [draft, setDraft] = useState<TaxPositionPassportDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [selfCheckedAt, setSelfCheckedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [mtdInstance, setMtdInstance] = useState(0);
  const [externalChange, setExternalChange] = useState<string | null>(null);
  const editGenerationRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    store.load().then(
      (saved) => {
        if (cancelled) return;
        setDraft(saved ?? createEmptyPassportDraft());
        setLoadError(null);
      },
      (caught) => {
        if (cancelled) return;
        setLoadError(
          caught instanceof Error
            ? caught.message
            : "The Tax Position Passport could not be read.",
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [store]);

  useEffect(
    () =>
      store.subscribe((change) => {
        if (change.source === "local") return;
        setExternalChange(
          change.kind === "deleted"
            ? "Another tab deleted this Passport."
            : "Another tab changed this Passport.",
        );
        setSelfCheckedAt(null);
        setSavedMessage(null);
      }),
    [store],
  );

  const edit = (change: (next: TaxPositionPassportDraft) => void) => {
    editGenerationRef.current += 1;
    setDraft((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      change(next);
      next.updatedAt = new Date().toISOString();
      return next;
    });
    setDirty(true);
    setSelfCheckedAt(null);
    setSavedMessage(null);
    setActionError(null);
    setDeleteArmed(false);
  };

  const setIncomeSource = (
    id: PassportIncomeSourceId,
    answer: PassportAnswer,
  ) => {
    edit((next) => {
      next.incomeSources[id] = answer;
      if (!next.answeredIncomeSourceIds.includes(id)) {
        next.answeredIncomeSourceIds.push(id);
      }
    });
  };

  const setEvidence = (
    id: PassportEvidenceId,
    state: PassportEvidenceState,
  ) => {
    edit((next) => {
      next.evidence[id] = state;
    });
  };

  const setMtdPosition = (
    position: MtdIncomeTaxPassportPosition | null,
  ) => {
    if (position === null && draft?.mtdIncomeTaxPosition === null) return;
    edit((next) => {
      next.mtdIncomeTaxPosition = position;
    });
  };

  const save = async () => {
    if (!draft || busy || externalChange) return;
    const generationAtStart = editGenerationRef.current;
    setBusy(true);
    setActionError(null);
    try {
      const saved = await store.save(draft);
      const changedDuringSave =
        editGenerationRef.current !== generationAtStart;
      setDraft((current) => {
        if (!changedDuringSave || !current) return saved;
        return {
          ...current,
          revision: saved.revision,
          createdAt: saved.createdAt,
        };
      });
      setDirty(changedDuringSave);
      setSavedMessage(
        changedDuringSave
          ? "Saved the earlier changes. Newer edits remain unsaved."
          : `Saved in this browser ${formatInstant(saved.updatedAt)}.`,
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The Passport could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };

  const clearMtdPosition = () => {
    edit((next) => {
      next.mtdIncomeTaxPosition = null;
    });
    setMtdInstance((current) => current + 1);
  };

  const deletePassport = async () => {
    if (!draft || busy || externalChange) return;
    setBusy(true);
    setActionError(null);
    try {
      await store.delete(draft.revision);
      setDraft(createEmptyPassportDraft());
      setDirty(false);
      setSelfCheckedAt(null);
      setDeleteArmed(false);
      setMtdInstance((current) => current + 1);
      setSavedMessage(
        "The local Passport was deleted. Starter Books and other browser tools were not changed.",
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The local Passport could not be deleted.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div
        role="alert"
        className="mt-10 rounded-2xl border-2 border-red-700 bg-red-50 p-5 text-red-900"
      >
        <h2 className="font-semibold">Your Passport could not be opened</h2>
        <p className="mt-2">{loadError}</p>
        <p className="mt-2 text-sm">
          No replacement was written. Clearing or replacing browser data is a
          separate decision.
        </p>
      </div>
    );
  }

  if (!draft) {
    return (
      <p
        role="status"
        className="mt-10 rounded-2xl border border-line bg-white p-5 text-ink-soft"
      >
        Checking this browser for an existing Passport…
      </p>
    );
  }

  const conflicts = sourceConflicts(draft);
  const sourceMapComplete =
    draft.answeredIncomeSourceIds.length === INCOME_SOURCES.length;
  const mtdRelevant = sourceMapComplete && [
    draft.incomeSources["self-employment"],
    draft.incomeSources["uk-property"],
    draft.incomeSources["foreign-property"],
  ].some((answer) => answer !== "no");
  const storedCurrent = draft.revision > 0 && !dirty;
  const canHandoff =
    sourceMapComplete
    && selfCheckedAt !== null
    && conflicts.length === 0
    && externalChange === null;
  const exportOptions = {
    selfCheckedAt,
    storedInBrowser: storedCurrent,
  };

  const downloadPassport = () => {
    if (!canHandoff) return;
    setActionError(null);
    try {
      const day = new Date().toISOString().slice(0, 10);
      downloadTextFile(
        store.exportJson(draft, exportOptions),
        `taxsorted-tax-position-${day}.json`,
        "application/json",
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The Passport export could not be made.",
      );
    }
  };

  const printHandoff = () => {
    if (!canHandoff) return;
    window.print();
  };

  return (
    <div className="mt-10">
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 print:hidden"
      >
        <div>
          <p className="font-semibold text-ink">
            {externalChange
              ? "Reload needed"
              : draft.revision === 0
              ? "Not saved"
              : dirty
                ? "Unsaved changes"
                : "Saved in this browser"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {externalChange
              ? "A different tab changed the stored Passport. This tab has not been overwritten."
              : draft.revision === 0
              ? "This working copy is in memory only."
              : dirty
                ? `Local revision ${draft.revision} · working copy changed ${formatInstant(draft.updatedAt)}`
                : `Local revision ${draft.revision} · last saved ${formatInstant(draft.updatedAt)}`}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void save()}
          disabled={busy || externalChange !== null}
        >
          {busy
            ? "Working…"
            : externalChange
              ? "Reload before saving"
              : "Save this Passport"}
        </Button>
      </div>

      {externalChange ? (
        <div
          className="mt-3 rounded-2xl border-2 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">{externalChange}</p>
          <p className="mt-1">
            Reload this page before saving, reviewing, exporting or deleting.
            Unsaved work in this tab has not been silently replaced.
          </p>
        </div>
      ) : null}

      {savedMessage ? (
        <p className="mt-3 text-sm text-ink-soft" role="status">
          {savedMessage}
        </p>
      ) : null}
      {actionError ? (
        <p
          className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      <section
        aria-labelledby="passport-income-title"
        className="mt-10 print:hidden"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          1. Map the sources
        </p>
        <h2
          id="passport-income-title"
          className="mt-2 text-2xl font-semibold text-ink"
        >
          Which income sources belong in this picture?
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          “Not sure” is a real answer. A blank or unknown fact never becomes
          zero.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {INCOME_SOURCES.map((source) => (
            <fieldset
              key={source.id}
              className="rounded-2xl border border-line bg-white p-5"
            >
              <legend className="px-1 font-semibold text-ink">
                {source.label}
              </legend>
              <p className="mt-1 text-sm text-ink-soft">{source.detail}</p>
              <div className="mt-4 flex flex-wrap gap-4">
                {ANSWERS.map((option) => (
                  <label
                    key={option.value}
                    className="inline-flex min-h-11 items-center gap-2 text-sm text-ink"
                  >
                    <input
                      type="radio"
                      name={`passport-income-${source.id}`}
                      value={option.value}
                      checked={
                        draft.answeredIncomeSourceIds.includes(source.id)
                        && draft.incomeSources[source.id] === option.value
                      }
                      onChange={() =>
                        setIncomeSource(source.id, option.value)
                      }
                      className="h-4 w-4 accent-[var(--color-accent)]"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        {!draft.answeredIncomeSourceIds.includes("other-or-complex")
          || draft.incomeSources["other-or-complex"] !== "no" ? (
          <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <strong>Coverage gap:</strong>{" "}
            {!draft.answeredIncomeSourceIds.includes("other-or-complex")
              ? "Another or complex source has not been answered."
              : draft.incomeSources["other-or-complex"] === "yes"
              ? "You have another or complex source."
              : "Another or complex source has not been ruled out."}{" "}
            This Passport will preserve that gap, but the first release does
            not classify it.
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="passport-evidence-title"
        className="mt-12 print:hidden"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          2. Name the evidence
        </p>
        <h2
          id="passport-evidence-title"
          className="mt-2 text-2xl font-semibold text-ink"
        >
          What do you say you hold?
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          TaxSorted stores only the state you choose. It does not upload,
          inspect or verify a document.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {PASSPORT_EVIDENCE_DEFINITIONS.map((definition) => {
            const state = effectiveEvidenceState(draft, definition);
            const notExpected = state === "not-expected";
            return (
              <article
                key={definition.id}
                className="rounded-2xl border border-line bg-white p-5"
              >
                <h3 className="font-semibold text-ink">{definition.label}</h3>
                <a
                  href={definition.guidanceHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4 hover:text-accent-deep"
                >
                  Why this evidence matters on GOV.UK ↗
                </a>
                <label className="mt-3 block text-sm font-medium text-ink">
                  Evidence state
                  <span className="sr-only">{" "}for {definition.label}</span>
                  <select
                    aria-label={`Evidence state for ${definition.label}`}
                    value={state}
                    disabled={notExpected}
                    onChange={(event) =>
                      setEvidence(
                        definition.id,
                        event.target.value as PassportEvidenceState,
                      )
                    }
                    className="mt-2 min-h-11 w-full rounded-md border border-ink-soft bg-white px-3 text-base text-ink disabled:bg-paper disabled:text-ink-soft"
                  >
                    {notExpected ? (
                      <option value="not-expected">Not expected</option>
                    ) : (
                      EVIDENCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </article>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="passport-mtd-title"
        className="mt-12 print:hidden"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          3. Check one live position
        </p>
        <h2
          id="passport-mtd-title"
          className="mt-2 text-2xl font-semibold text-ink"
        >
          Making Tax Digital for Income Tax
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          Employment income stays outside qualifying income. The checker keeps
          return history, residence, exemptions, cessation and unknown facts
          separate instead of guessing.
        </p>

        {!sourceMapComplete ? (
          <div className="mt-5 rounded-2xl border border-line bg-paper p-5">
            <p className="font-semibold text-ink">
              Complete the income-source map first
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              The deep MTD check opens after all five source questions have an
              explicit answer. “Not sure” remains valid for every source.
            </p>
          </div>
        ) : mtdRelevant ? (
          <div className="mt-6">
            <MtdExpertCheck
              key={mtdInstance}
              initialPosition={draft.mtdIncomeTaxPosition}
              incomeSourceDefaults={{
                selfEmployment: draft.incomeSources["self-employment"],
                ukProperty: draft.incomeSources["uk-property"],
                foreignProperty: draft.incomeSources["foreign-property"],
              }}
              onPositionChange={setMtdPosition}
              persistenceNote="This check runs in the browser. Its complete request and answer join the working Passport in memory; they reach IndexedDB only when you press “Save this Passport”. Nothing is sent to TaxSorted or HMRC."
            />
          </div>
        ) : draft.mtdIncomeTaxPosition ? (
          <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
            <p className="font-semibold">An earlier MTD check is still attached</p>
            <p className="mt-2 text-sm">
              The current source map says no self-employment, UK property or
              foreign property income. Remove the earlier check or change the
              source map before handoff.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={clearMtdPosition}
            >
              Remove the earlier MTD check
            </Button>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-line bg-paper p-5">
            <p className="font-semibold text-ink">
              MTD Income Tax is not indicated by the reported sources.
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              This means only that the source map says no self-employment or
              property income. It is not a full Self Assessment or PAYE
              calculation.
            </p>
          </div>
        )}
      </section>

      {conflicts.length > 0 ? (
        <div
          className="mt-10 rounded-2xl border-2 border-red-700 bg-red-50 p-5 text-red-950"
          role="alert"
        >
          <h2 className="font-semibold">Resolve conflicting facts before handoff</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {conflicts.map((conflict) => (
              <li key={conflict}>{conflict}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <HandoffSummary
        draft={draft}
        selfCheckedAt={selfCheckedAt}
        conflicts={conflicts}
      />

      <section
        aria-labelledby="passport-handoff-actions"
        className="mt-10 rounded-3xl border border-line bg-white p-5 sm:p-6 print:hidden"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          5. Review and hand off
        </p>
        <h2
          id="passport-handoff-actions"
          className="mt-2 text-2xl font-semibold text-ink"
        >
          Carry the same understanding elsewhere
        </h2>
        <label className="mt-5 flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={selfCheckedAt !== null}
            disabled={
              !sourceMapComplete
              || conflicts.length > 0
              || externalChange !== null
            }
            onChange={(event) =>
              setSelfCheckedAt(
                event.target.checked ? new Date().toISOString() : null,
              )
            }
            className="mt-1 h-5 w-5 accent-[var(--color-accent)] disabled:cursor-not-allowed"
          />
          <span>
            I reviewed the source map, evidence states, MTD result and unknown
            facts shown above. This is my own check, not a signature or
            professional approval.
          </span>
        </label>
        {!sourceMapComplete ? (
          <p className="mt-3 text-sm font-medium text-amber-900">
            Answer all five source questions before confirming the handoff.
            “Not sure” is valid.
          </p>
        ) : null}
        {conflicts.length > 0 ? (
          <p className="mt-3 text-sm font-medium text-red-900">
            Resolve the conflicting source and MTD facts before confirming the
            handoff.
          </p>
        ) : null}
        {externalChange ? (
          <p className="mt-3 text-sm font-medium text-amber-900">
            Reload this tab before confirming or exporting the handoff.
          </p>
        ) : null}
        {!selfCheckedAt ? (
          <p className="mt-3 text-sm text-ink-soft">
            Review confirmation unlocks the two handoff actions. Unknown facts
            may remain; contradictions may not.
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={downloadPassport}
            disabled={!canHandoff}
          >
            Download Passport JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={printHandoff}
            disabled={!canHandoff}
          >
            Print or save as PDF
          </Button>
          <a
            href="/itsa/records"
            className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-accent underline underline-offset-4 hover:text-accent-deep"
          >
            Export detailed Starter Books separately
          </a>
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          The JSON and printed report can contain financial facts. Files are
          not encrypted by TaxSorted. Giving a pack to an accountant does not
          authorise them to act for you with HMRC.
        </p>
      </section>

      <section
        aria-labelledby="passport-delete-title"
        className="mt-8 rounded-2xl border border-line bg-paper p-5 print:hidden"
      >
        <h2 id="passport-delete-title" className="font-semibold text-ink">
          Delete the local Passport
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          This removes only the Passport. It does not delete Starter Books,
          VAT businesses, account data or HMRC sandbox connections.
        </p>
        {!deleteArmed ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => setDeleteArmed(true)}
            disabled={busy || externalChange !== null}
          >
            Prepare to delete
          </Button>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="destructive"
              onClick={() => void deletePassport()}
              disabled={busy || externalChange !== null}
            >
              Delete this Passport now
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteArmed(false)}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function HandoffSummary({
  draft,
  selfCheckedAt,
  conflicts,
}: {
  draft: TaxPositionPassportDraft;
  selfCheckedAt: string | null;
  conflicts: string[];
}) {
  const position = draft.mtdIncomeTaxPosition;
  const answer = position?.answer.answer ?? null;
  const materialUnknowns =
    position?.answer.facts.unknown.filter((fact) => fact.material) ?? [];
  const heldEvidence = PASSPORT_EVIDENCE_DEFINITIONS.filter(
    (definition) => effectiveEvidenceState(draft, definition) === "held",
  ).length;
  const neededEvidence = PASSPORT_EVIDENCE_DEFINITIONS.filter(
    (definition) => effectiveEvidenceState(draft, definition) === "missing",
  ).length;
  const notCheckedEvidence = PASSPORT_EVIDENCE_DEFINITIONS.filter(
    (definition) =>
      effectiveEvidenceState(draft, definition) === "not-checked",
  ).length;
  const notExpectedEvidence = PASSPORT_EVIDENCE_DEFINITIONS.filter(
    (definition) =>
      effectiveEvidenceState(draft, definition) === "not-expected",
  ).length;
  const sourceMapComplete =
    draft.answeredIncomeSourceIds.length === INCOME_SOURCES.length;

  let positionStatus = sourceMapComplete
    ? "Income sources mapped; no MTD check attached"
    : "Income source map needs explicit answers";
  if (conflicts.length > 0) positionStatus = "Conflicting facts — review needed";
  else if (position?.answer.status === "determined") {
    positionStatus = "MTD position checked within the stated scope";
  } else if (position?.answer.status === "needs_facts") {
    positionStatus = "MTD position needs more facts";
  } else if (position) {
    positionStatus = "MTD position needs specialist or source review";
  }

  return (
    <section
      aria-labelledby="passport-summary-title"
      className="mt-12 rounded-3xl border border-accent/30 bg-accent-soft p-5 sm:p-7 print:mt-0 print:border-0 print:bg-white print:p-0"
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">
        4. Current handoff
      </p>
      <h2
        id="passport-summary-title"
        className="mt-2 text-3xl font-bold tracking-tight text-ink"
      >
        Your Tax Position Passport
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Evidence is named by you, not inspected. Accountant review, HMRC
        submission and filing all remain separate.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatusCard label="Position" value={positionStatus} />
        <StatusCard
          label="Evidence"
          value={`${heldEvidence} held · ${neededEvidence} needed · ${notCheckedEvidence} not checked · ${notExpectedEvidence} not expected`}
        />
        <StatusCard label="Accountant" value="Not professionally reviewed" />
        <StatusCard label="HMRC" value="Nothing sent" />
        <StatusCard label="Filing" value="Not filed" />
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold text-ink">Income-source facts</h3>
          <dl className="mt-3 space-y-2 text-sm">
            {INCOME_SOURCES.map((source) => (
              <div
                key={source.id}
                className="flex items-start justify-between gap-4 border-b border-line py-2"
              >
                <dt className="text-ink-soft">{source.label}</dt>
                <dd className="font-medium text-ink">
                  {draft.answeredIncomeSourceIds.includes(source.id)
                    ? answerLabel(draft.incomeSources[source.id])
                    : "Not answered"}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-ink">Evidence index</h3>
          <dl className="mt-3 space-y-2 text-sm">
            {PASSPORT_EVIDENCE_DEFINITIONS.map((definition) => {
              const state = effectiveEvidenceState(draft, definition);
              return (
                <div
                  key={definition.id}
                  className="border-b border-line py-2"
                >
                  <dt className="text-ink-soft">{definition.label}</dt>
                  <dd className="mt-1 font-medium text-ink">
                    {evidenceLabel(state)}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-line bg-white p-5">
        <h3 className="text-lg font-semibold text-ink">
          MTD Income Tax position
        </h3>
        {position && answer ? (
          <>
            <p className="mt-2 text-xl font-semibold text-ink">
              {answer.headline}
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Result status: {position.answer.status.replaceAll("_", " ")} ·
              evaluated {position.answer.applicability.evaluatedOn} ·
              knowledge as at {position.answer.applicability.knowledgeAsOf}
            </p>
            {materialUnknowns.length > 0 ? (
              <div className="mt-5">
                <h4 className="font-semibold text-ink">Material unknowns</h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                  {materialUnknowns.map((fact) => (
                    <li key={fact.path}>
                      <strong className="text-ink">{fact.label}:</strong>{" "}
                      {fact.whyItMatters}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">
                No material unknown fact remains inside this checker&apos;s
                stated scope.
              </p>
            )}
            <details className="mt-5" open>
              <summary className="cursor-pointer font-semibold text-ink">
                Official receipts carried with this position
              </summary>
              <ul className="mt-3 space-y-3 text-sm text-ink-soft">
                {position.answer.evidence.sources.map((source) => (
                  <li key={source.id}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium text-accent underline underline-offset-4"
                    >
                      {source.title}
                    </a>
                    <span className="block">
                      {source.publisher} · {source.legalForce.replaceAll("-", " ")} ·
                      retrieved {source.retrievedOn}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : position ? (
          <p className="mt-2 text-sm text-ink-soft">
            The attached check has no conclusion because its facts or sources
            need review. Its complete unknown-fact and escalation path remains
            in the JSON export.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">
            No MTD position is attached. The Passport still carries the source
            map and evidence index without inventing a conclusion.
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-line pt-4 text-sm text-ink-soft">
        <p>
          User review:{" "}
          {selfCheckedAt
            ? `${formatInstant(selfCheckedAt)} — self-check only`
            : "not yet confirmed for handoff"}
        </p>
        <p className="mt-1">
          Boundary: this is not identity proof, a signature, professional
          approval, agent authority or evidence that anything was filed.
        </p>
      </div>
    </section>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}
