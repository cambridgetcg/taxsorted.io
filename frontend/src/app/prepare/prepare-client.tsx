"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PREPARATION_CIRCUMSTANCES,
  PREPARATION_PERIODS,
  PREPARATION_PURPOSES,
  PREPARATION_YEARS,
  PREPARATION_MAX_EMPLOYMENT_SOURCES,
  createEmploymentSource,
  createPreparationDraft,
  derivePreparationReview,
  exportPreparationSummary,
  type CircumstanceId,
  type EvidenceStatus,
  type PreparationAnswer,
  type PreparationDraft,
  type PreparationPurpose,
  type PreparationYear,
} from "@/lib/return-preparation";
import { createReturnPreparationStore } from "@/lib/return-preparation-store";
import { EmploymentCard, fieldClass, helpLinkClass } from "./employment-card";

type Step = "circumstances" | "evidence" | "review";
type UnsavedWork = {
  draft: PreparationDraft;
  saved: string | null;
  step: Step;
  temporary: boolean;
  store: ReturnType<typeof createReturnPreparationStore> | null;
  pendingSave?: Promise<PreparationDraft>;
};
// In-memory only: survives client navigation within this tab, never reload/quit.
let unsavedWork: UnsavedWork | null = null;
const steps: { id: Step; label: string }[] = [
  { id: "circumstances", label: "Circumstances" },
  { id: "evidence", label: "Evidence" },
  { id: "review", label: "Review" },
];
const answers: { value: PreparationAnswer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Not sure" },
  { value: null, label: "Unanswered" },
];
const evidenceLabels: Record<EvidenceStatus, string> = {
  missing: "Missing",
  collected: "Collected",
  reviewed: "Reviewed by me",
  unresolved: "Needs a follow-up",
};
const recordsUrl = "https://www.gov.uk/keeping-your-pay-tax-records";
const circumstanceQuestions: Record<CircumstanceId, string> = {
  employment: "Did you work for an employer during this tax year?",
  trading: "Did you earn money from work you did for yourself?",
  property: "Did you receive rent from property or land?",
  pension: "Did you receive pension income or make pension contributions?",
  "savings-investments":
    "Did you receive interest or dividends, or sell investments?",
  "other-income": "Did you have other income or gains, including overseas?",
  "life-changes":
    "Did your circumstances change, such as moving or a change in your family?",
  "hmrc-letter":
    "Did HMRC send you a letter or notice asking you to take action?",
};
function yearHasEnded(year: PreparationYear) {
  return new Date().toISOString().slice(0, 10) > PREPARATION_PERIODS[year].end;
}
const evidenceHelp: Record<
  Exclude<CircumstanceId, "employment">,
  { why: string; where: string; href?: string }
> = {
  trading: {
    why: "Business income and costs need their own supporting records; this journey does not calculate a profit.",
    where:
      "Look in invoices, receipts, bank statements and your accounting records.",
    href: "https://www.gov.uk/self-employed-records/what-records-to-keep",
  },
  property: {
    why: "Rental income and costs need checking separately from employment.",
    where:
      "Look in rent statements, letting-agent statements, invoices and your property records.",
  },
  pension: {
    why: "Pension income and pension contributions are different facts to check.",
    where:
      "Look for pension-provider statements, pension P60s and contribution records.",
  },
  "savings-investments": {
    why: "Interest, dividends and investment disposals can need different records. This journey does not work out their tax treatment.",
    where:
      "Look in bank interest summaries, dividend vouchers and investment-provider statements.",
  },
  "other-income": {
    why: "Other or overseas income and gains need a separate review. Marking documents reviewed here does not resolve those tax questions.",
    where:
      "Gather the relevant statements and keep a question list for HMRC or an adviser.",
  },
  "life-changes": {
    why: "A change in your circumstances can affect which questions you need to answer.",
    where:
      "Keep relevant dates and supporting correspondence, such as moving or a change in family circumstances. Do not enter identifiers here.",
  },
  "hmrc-letter": {
    why: "An HMRC letter may ask for an action or give a deadline that this journey cannot assess.",
    where:
      "Find the original letter or message and check its tax year, requested action and deadline. Do not copy reference numbers here.",
  },
};

function downloadSummary(text: string, year: PreparationYear) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = `taxsorted-preparation-${year}.txt`;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export function PrepareClient({ requestedYear = "2025-26" }: { requestedYear?: PreparationYear }) {
  const [year, setYear] = useState<PreparationYear>(requestedYear);
  const [lastRequestedYear, setLastRequestedYear] = useState(requestedYear);
  const [purpose, setPurpose] = useState<PreparationPurpose>("prepare-return");
  const [draft, setDraft] = useState<PreparationDraft | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("circumstances");
  const [busy, setBusy] = useState<"loading" | "saving" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [existing, setExisting] = useState(false);
  const [temporaryAvailable, setTemporaryAvailable] = useState(false);
  const [temporary, setTemporary] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [includeFigures, setIncludeFigures] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [downloadAcknowledged, setDownloadAcknowledged] = useState(false);
  const [hasUnsavedWork, setHasUnsavedWork] = useState(
    () => unsavedWork !== null,
  );
  const store = useRef<ReturnType<typeof createReturnPreparationStore> | null>(
    null,
  );
  const request = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const dirty = draft !== null && JSON.stringify(draft) !== saved;
  const hasDraft = draft !== null;
  const latestWork = useRef<UnsavedWork | null>(null);
  const entryVersion = useRef(0);

  // URL changes select the next draft, never replace work already open here.
  if (lastRequestedYear !== requestedYear) {
    setLastRequestedYear(requestedYear);
    setYear(requestedYear);
    if (!draft && !hasUnsavedWork) {
      setBusy(null);
      setError(null);
      setMessage(null);
      setExisting(false);
      setTemporaryAvailable(false);
    }
  }
  useEffect(() => {
    // Fence only opening reads: a URL change must not interrupt an explicit save.
    entryVersion.current += 1;
  }, [requestedYear]);

  useEffect(() => {
    latestWork.current =
      draft && dirty ? { draft, saved, step, temporary, store: store.current } : null;
  }, [draft, dirty, saved, step, temporary]);

  useEffect(
    () => () => {
      request.current += 1;
      if (latestWork.current) unsavedWork = latestWork.current;
    },
    [],
  );
  useEffect(() => {
    if (hasDraft) heading.current?.focus();
  }, [step, hasDraft]);
  useEffect(() => {
    if (error) feedback.current?.focus();
  }, [error]);
  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    function beforeLink(event: MouseEvent) {
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.download ||
        anchor.target === "_blank" ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;
      if (
        !window.confirm(
          "You have unsaved preparation changes. Leave this page? You can resume them in this tab until it is reloaded or closed.",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
    };
  }, [dirty]);

  async function open(mode: "start" | "resume") {
    const operation = ++request.current;
    const openedFrom = entryVersion.current;
    setBusy("loading");
    setError(null);
    setMessage(null);
    setExisting(false);
    setTemporaryAvailable(false);
    const selectedStore = createReturnPreparationStore(year);
    try {
      const loaded = await selectedStore.load();
      if (operation !== request.current || openedFrom !== entryVersion.current) return;
      if (loaded && mode === "start") {
        setExisting(true);
        setMessage(
          "There is already a saved preparation for this year. Resume it to keep your existing work.",
        );
        return;
      }
      if (!loaded && mode === "resume") {
        setMessage(
          "No saved preparation was found for this year. Choose Start preparation to begin.",
        );
        return;
      }
      store.current = selectedStore;
      setDraft(loaded ?? createPreparationDraft(year, purpose));
      setSaved(loaded ? JSON.stringify(loaded) : null);
      setTemporary(false);
      setStep("circumstances");
      setLeaving(false);
      setMessage(
        loaded
          ? "Saved preparation resumed. It keeps its saved purpose and tax year."
          : "Your new preparation is in memory. Choose Save preparation on this device when you want to keep it.",
      );
    } catch {
      if (operation !== request.current || openedFrom !== entryVersion.current) return;
      setError(
        "The saved preparation could not be read. Existing saved data has been left untouched. Try again, or use a temporary preparation without saving.",
      );
      setTemporaryAvailable(true);
    } finally {
      if (operation === request.current && openedFrom === entryVersion.current) setBusy(null);
    }
  }
  function edit(next: PreparationDraft) {
    setDraft(next);
    setMessage(null);
    setError(null);
    setPreview(null);
    setDownloadAcknowledged(false);
  }
  async function save() {
    if (!draft || !store.current || busy || temporary) return;
    const operation = ++request.current;
    setBusy("saving");
    setMessage(null);
    setError(null);
    try {
      const pendingSave = store.current.save(draft);
      latestWork.current = { draft, saved, step, temporary, pendingSave, store: store.current };
      const stored = await pendingSave;
      if (operation !== request.current) return;
      setDraft(stored);
      unsavedWork = null;
      latestWork.current = null;
      setSaved(JSON.stringify(stored));
      setPreview(null);
      setDownloadAcknowledged(false);
      setMessage(
        "Preparation saved on this device. No information was uploaded.",
      );
    } catch {
      if (operation !== request.current) return;
      setError(
        "Your changes could not be saved. They are still here. Check any entered figures and try again. If this draft changed in another tab, keep a summary of your changes before returning to resume the latest saved version.",
      );
    } finally {
      if (operation === request.current) setBusy(null);
    }
  }
  function closeDraft() {
    request.current += 1;
    unsavedWork = null;
    latestWork.current = null;
    setHasUnsavedWork(false);
    setDraft(null);
    setSaved(null);
    store.current = null;
    setMessage(null);
    setError(null);
    setLeaving(false);
    setExisting(false);
    setPreview(null);
    setIncludeFigures(false);
    setIncludeNotes(false);
    setDownloadAcknowledged(false);
    setTemporaryAvailable(false);
    setTemporary(false);
  }
  function changeSelection(
    nextYear: PreparationYear,
    nextPurpose: PreparationPurpose,
  ) {
    request.current += 1;
    setYear(nextYear);
    setPurpose(nextPurpose);
    setMessage(null);
    setError(null);
    setExisting(false);
    setTemporaryAvailable(false);
  }
  function showPreview() {
    if (!draft) return;
    setError(null);
    setDownloadAcknowledged(false);
    try {
      setPreview(
        exportPreparationSummary(draft, { includeFigures, includeNotes }),
      );
    } catch {
      setPreview(null);
      setError(
        "The summary could not be prepared. Check entered amounts: use pounds without commas or currency symbols, with at most two decimal places. Leave unknown amounts blank. Your entries are still here.",
      );
    }
  }
  async function resumeUnsavedWork() {
    if (!unsavedWork || busy) return;
    const recovered = unsavedWork;
    const operation = ++request.current;
    setBusy("loading");
    let recoveredDraft = recovered.draft;
    let recoveredSaved = recovered.saved;
    if (recovered.pendingSave) {
      try {
        recoveredDraft = await recovered.pendingSave;
        recoveredSaved = JSON.stringify(recoveredDraft);
      } catch {
        // The original entries stay recoverable if their pending save failed.
      }
    }
    if (operation !== request.current) return;
    unsavedWork = null;
    setHasUnsavedWork(false);
    setDraft(recoveredDraft);
    setSaved(recoveredSaved);
    setStep(recovered.step);
    setTemporary(recovered.temporary);
    setBusy(null);
    setPurpose(recoveredDraft.purpose);
    store.current = recovered.store;
    setMessage(
      JSON.stringify(recoveredDraft) === recoveredSaved
        ? "Your completed save was recovered from this tab’s memory. The latest changes are saved on this device."
        : "Unsaved work resumed from this tab’s memory. Save it to keep it after closing or reloading.",
    );
  }
  const review = draft ? derivePreparationReview(draft) : null;
  const currentIndex = steps.findIndex((item) => item.id === step);

  return (
    <section className="mt-9 min-w-0" aria-label="Tax return preparation">
      <div className="rounded-2xl border border-accent/25 bg-accent-soft p-5 text-sm leading-6 text-ink-soft">
        <p className="font-semibold text-ink">
          Your device, your choice to save
        </p>
        <p className="mt-2">
          Save only when you choose. Drafts stay on this device, unencrypted;
          nothing is uploaded.
        </p>
        <details className="mt-2">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-accent-deep">
            Where your draft lives
          </summary>
          <p className="mt-2">
            Start or Resume reads only the selected year’s preparation on this
            device. Opening this page reads no saved tax facts. Only “Save
            preparation on this device” saves your draft. Nothing is imported
            from Books or your Tax Passport.
          </p>
          <p className="mt-2">
            Saved drafts are local and unencrypted. Anyone with access to this
            browser or app profile may be able to read them. Clearing its data
            may erase them. Books backups do not include preparation drafts. No
            document uploads, account numbers or login details are needed.
          </p>
        </details>
      </div>
      {draft && draft.year !== requestedYear && year === requestedYear && (
        <p className="mt-5 rounded-xl border border-line bg-surface p-4 text-sm leading-6 text-ink-soft" role="status">
          Your {PREPARATION_PERIODS[draft.year].label} preparation is still open.
          To prepare {PREPARATION_PERIODS[requestedYear].label}, use
          “Choose another tax year” below. Keep or save your current work first.
        </p>
      )}
      {!draft ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-7">
          <h2 className="text-2xl font-semibold text-ink">
            Choose the work you want to do
          </h2>
          {hasUnsavedWork && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm leading-6 text-amber-950">
                You have preparation work in this tab’s memory. It survives
                navigation within this tab, but not a reload or closing the app.
                Resuming waits for any pending save. Resume it or explicitly
                discard it before starting another draft. Discarding this memory
                does not cancel a save already requested.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void resumeUnsavedWork()}
                  className="whitespace-normal"
                >
                  Resume unsaved work in this tab
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() => {
                    unsavedWork = null;
                    setHasUnsavedWork(false);
                  }}
                  className="whitespace-normal"
                >
                  Discard unsaved work in this tab
                </Button>
              </div>
            </div>
          )}
          <fieldset
            disabled={busy !== null || hasUnsavedWork}
            className="mt-5 min-w-0"
          >
            <legend className="sr-only">Preparation choices</legend>
            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
              <label
                className="min-w-0 font-semibold text-ink"
                htmlFor="prepare-year"
              >
                Tax year
                <select
                  id="prepare-year"
                  value={year}
                  onChange={(event) =>
                    changeSelection(
                      event.target.value as PreparationYear,
                      purpose,
                    )
                  }
                  className={fieldClass}
                >
                  {PREPARATION_YEARS.map((value) => (
                    <option key={value} value={value}>
                      {PREPARATION_PERIODS[value].label}
                      {yearHasEnded(value) ? " · ended" : " · in progress"}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="min-w-0 font-semibold text-ink"
                htmlFor="prepare-purpose"
              >
                What are you working towards?
                <select
                  id="prepare-purpose"
                  value={purpose}
                  onChange={(event) =>
                    changeSelection(
                      year,
                      event.target.value as PreparationPurpose,
                    )
                  }
                  className={fieldClass}
                >
                  {PREPARATION_PURPOSES.map((value) => (
                    <option key={value.id} value={value.id}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-4 text-sm leading-6 text-ink-soft">
              {year === "2026-27"
                ? "2026–27 covers 6 April 2026 to 5 April 2027."
                : "2025–26 covers 6 April 2025 to 5 April 2026."}{" "}
              {yearHasEnded(year)
                ? "This year has ended. Choose it when preparing that year’s return."
                : "This year is still in progress. You can organise records as you go; this is not a completed-year return."}{" "}
              Each tax year has its own draft. Changing year never copies
              answers or figures.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {!existing && (
                <Button
                  type="button"
                  onClick={() => void open("start")}
                  className="whitespace-normal"
                >
                  Start preparation
                </Button>
              )}
              <Button
                type="button"
                variant={existing ? "default" : "outline"}
                onClick={() => void open("resume")}
                className="whitespace-normal"
              >
                Resume saved preparation
              </Button>
            </div>
          </fieldset>
          <p className="mt-5 text-sm leading-6 text-ink-soft">
            Unsure whether you need to send a return? The official checker can
            help you decide what to do. Check the tax year shown there before
            using it.
          </p>
          <a
            href="https://www.gov.uk/check-if-you-need-tax-return"
            target="_blank"
            rel="noreferrer noopener"
            className={helpLinkClass}
          >
            Check whether I need a return (opens in a new tab)
          </a>
          {busy === "loading" && (
            <div className="mt-4">
              <p role="status">Reading this year’s preparation…</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  request.current += 1;
                  setBusy(null);
                }}
                className="mt-2"
              >
                Cancel loading
              </Button>
            </div>
          )}
          {temporaryAvailable && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                store.current = null;
                setDraft(createPreparationDraft(year, purpose));
                setSaved(null);
                setTemporary(true);
                setTemporaryAvailable(false);
                setError(null);
                setStep("circumstances");
              }}
              className="mt-4 whitespace-normal"
            >
              Use a temporary preparation
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="section-label">
                  {PREPARATION_PERIODS[draft.year].label}
                  {yearHasEnded(draft.year)
                    ? " · ended tax year"
                    : " · year in progress"}
                </p>
                <label
                  htmlFor="active-preparation-purpose"
                  className="mt-3 block text-sm font-semibold text-ink"
                >
                  Preparation purpose
                  <select
                    id="active-preparation-purpose"
                    value={draft.purpose}
                    disabled={busy !== null}
                    onChange={(event) =>
                      edit({
                        ...draft,
                        purpose: event.target.value as PreparationPurpose,
                      })
                    }
                    className={fieldClass}
                  >
                    {PREPARATION_PURPOSES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-2 text-sm text-ink-soft">
                  {temporary
                    ? "Temporary preparation — saving is unavailable."
                    : dirty
                      ? "Unsaved changes on this page"
                      : "Your latest changes are saved on this device."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void save()}
                  disabled={busy !== null || temporary || !dirty}
                  className="whitespace-normal"
                >
                  {busy === "saving"
                    ? "Saving preparation…"
                    : "Save preparation on this device"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() => (dirty ? setLeaving(true) : closeDraft())}
                  className="whitespace-normal"
                >
                  Choose another tax year
                </Button>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              <Link href="/backups" className={helpLinkClass}>Back up your saved workspace</Link>
              {" "}includes saved preparation. Save changes here before making a backup.
            </p>
            {leaving && (
              <div
                role="group"
                aria-label="Unsaved preparation changes"
                className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4"
              >
                <p className="text-sm leading-6 text-amber-950">
                  You have unsaved changes. Save them first, or discard this
                  page’s changes to choose another year. Any previously saved
                  draft stays on this device.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLeaving(false)}
                    className="whitespace-normal"
                  >
                    Keep editing
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={closeDraft}
                    className="whitespace-normal"
                  >
                    Discard unsaved changes
                  </Button>
                </div>
              </div>
            )}
          </div>
          <nav aria-label="Preparation steps" className="mt-6">
            <ol className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 sm:grid-cols-3">
              {steps.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={step === item.id ? "step" : undefined}
                    onClick={() => setStep(item.id)}
                    disabled={busy !== null}
                    className={`min-h-14 w-full rounded-xl border p-2 text-center text-sm font-semibold sm:text-base ${step === item.id ? "border-accent bg-accent-soft text-accent-deep" : "border-line bg-surface text-ink-soft"}`}
                  >
                    <span className="block text-xs">Step {index + 1}</span>{" "}
                    {item.label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <fieldset disabled={busy !== null} className="mt-7 min-w-0">
            <legend className="sr-only">Edit preparation</legend>
            <h2
              ref={heading}
              tabIndex={-1}
              className="scroll-mt-28 text-2xl font-semibold text-ink"
            >
              {currentIndex + 1}. {steps[currentIndex].label}
            </h2>
            {step === "circumstances" && (
              <>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">
                  Answer for {PREPARATION_PERIODS[draft.year].label}. “Not sure”
                  keeps a question open; unanswered is never treated as “No”.
                  These prompts help gather evidence and do not cover every
                  possible tax situation.
                </p>
                <div className="mt-5 space-y-4">
                  {PREPARATION_CIRCUMSTANCES.map((item) => (
                    <fieldset
                      key={item.id}
                      aria-describedby={`circumstance-${item.id}-question`}
                      className="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-5"
                    >
                      <legend className="px-1 font-semibold text-ink">
                        {item.label}
                      </legend>
                      <p
                        id={`circumstance-${item.id}-question`}
                        className="text-base leading-6 text-ink"
                      >
                        {circumstanceQuestions[item.id]}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">
                        {item.evidenceHint}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {answers.map((answer) => (
                          <label
                            key={answer.label}
                            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
                          >
                            <input
                              type="radio"
                              name={`circumstance-${item.id}`}
                              checked={
                                draft.circumstances[item.id] === answer.value
                              }
                              onChange={() =>
                                edit({
                                  ...draft,
                                  circumstances: {
                                    ...draft.circumstances,
                                    [item.id]: answer.value,
                                  },
                                })
                              }
                              className="h-4 w-4 shrink-0 accent-accent"
                            />
                            {answer.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </>
            )}
            {step === "evidence" && (
              <>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  Keep the original documents in your own files. This page
                  records your document checks; it does not inspect files or
                  verify their contents.
                </p>
                {(draft.circumstances.employment === "yes" ||
                  draft.circumstances.employment === "unknown") && (
                  <section
                    aria-labelledby="preparation-employment-title"
                    className="mt-6"
                  >
                    <h3
                      id="preparation-employment-title"
                      className="text-xl font-semibold text-ink"
                    >
                      Your employment documents
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      Add each job separately. P60 pay and tax are only part of
                      the picture: benefits or P11D, tips, redundancy, share
                      schemes and expenses may need other records. Keep those as
                      follow-up questions.
                    </p>
                    {!yearHasEnded(draft.year) && (
                      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                        This tax year has not ended. Its P60 cannot be marked
                        reviewed yet. Keep current payslips as other documents
                        while you organise your records.
                      </p>
                    )}
                    {draft.circumstances.employment === "unknown" && (
                      <p className="mt-3 text-sm text-ink-soft">
                        Employment is still marked “Not sure”. Document entries
                        do not resolve that answer.
                      </p>
                    )}
                    <div className="mt-4 space-y-5">
                      {draft.employmentSources.map((source, index) => (
                        <EmploymentCard
                          key={source.id}
                          source={source}
                          year={draft.year}
                          index={index}
                          onChange={(next) =>
                            edit({
                              ...draft,
                              employmentSources: draft.employmentSources.map(
                                (item) => (item.id === next.id ? next : item),
                              ),
                            })
                          }
                          onRemove={() =>
                            edit({
                              ...draft,
                              employmentSources: draft.employmentSources.filter(
                                (item) => item.id !== source.id,
                              ),
                            })
                          }
                        />
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        draft.employmentSources.length >=
                        PREPARATION_MAX_EMPLOYMENT_SOURCES
                      }
                      onClick={() =>
                        edit({
                          ...draft,
                          employmentSources: [
                            ...draft.employmentSources,
                            createEmploymentSource(),
                          ],
                        })
                      }
                      className="mt-4 whitespace-normal"
                    >
                      Add an employment
                    </Button>
                    {draft.employmentSources.length >=
                      PREPARATION_MAX_EMPLOYMENT_SOURCES && (
                      <p className="mt-3 text-sm text-ink-soft">
                        This draft supports up to{" "}
                        {PREPARATION_MAX_EMPLOYMENT_SOURCES} employment entries.
                        Keep any additional jobs as a separate follow-up.
                      </p>
                    )}
                  </section>
                )}
                {draft.circumstances.employment !== "yes" &&
                  draft.circumstances.employment !== "unknown" &&
                  draft.employmentSources.length > 0 && (
                    <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                      Your employment entries are retained but inactive because
                      employment is{" "}
                      {draft.circumstances.employment === "no"
                        ? "marked No"
                        : "unanswered"}
                      . Return to Circumstances to review that answer. Inactive
                      entries remain labelled in the summary.
                    </p>
                  )}
                <div className="mt-6 space-y-4">
                  {PREPARATION_CIRCUMSTANCES.filter(
                    (item) =>
                      item.id !== "employment" &&
                      (draft.circumstances[item.id] === "yes" ||
                        draft.circumstances[item.id] === "unknown"),
                  ).map((item) => {
                    const id = item.id as Exclude<CircumstanceId, "employment">;
                    const help = evidenceHelp[id];
                    return (
                      <section
                        key={id}
                        aria-labelledby={`evidence-${id}-title`}
                        className="rounded-2xl border border-line bg-surface p-5"
                      >
                        <h3
                          id={`evidence-${id}-title`}
                          className="text-xl font-semibold text-ink"
                        >
                          {item.label}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-ink-soft">
                          <strong>Why this is here:</strong> {help.why}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-ink-soft">
                          <strong>Where to look:</strong> {help.where}
                        </p>
                        {draft.circumstances[id] === "unknown" && (
                          <p className="mt-2 text-sm leading-6 text-ink-soft">
                            Your circumstance is still “Not sure”; changing the
                            evidence status does not answer it.
                          </p>
                        )}
                        <label
                          htmlFor={`evidence-${id}-status`}
                          className="mt-4 block text-sm font-semibold text-ink"
                        >
                          Evidence status
                          <select
                            id={`evidence-${id}-status`}
                            value={draft.evidence[id]}
                            onChange={(event) =>
                              edit({
                                ...draft,
                                evidence: {
                                  ...draft.evidence,
                                  [id]: event.target.value as EvidenceStatus,
                                },
                              })
                            }
                            className={`${fieldClass} sm:max-w-sm`}
                          >
                            {Object.entries(evidenceLabels).map(
                              ([value, label]) => (
                                <option value={value} key={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <a
                          href={help.href ?? recordsUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={`${helpLinkClass} mt-2`}
                        >
                          GOV.UK records guidance (opens in a new tab)
                        </a>
                      </section>
                    );
                  })}
                </div>
                {!PREPARATION_CIRCUMSTANCES.some(
                  (item) =>
                    draft.circumstances[item.id] === "yes" ||
                    draft.circumstances[item.id] === "unknown",
                ) && (
                  <p className="mt-5 rounded-xl border border-line p-4 text-sm leading-6 text-ink-soft">
                    No evidence cards are shown from your answers yet. Return to
                    Circumstances if anything is unanswered or needs changing.
                    This does not establish that no records or return are
                    needed.
                  </p>
                )}
                <p className="mt-5 text-sm leading-6 text-ink-soft">
                  Collected means you have the documents. Reviewed means you
                  checked them yourself for this year. Neither status settles
                  their tax treatment.
                </p>
              </>
            )}
            {step === "review" && review && (
              <>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  Use this review to decide what to gather or ask next. It does
                  not confirm that a return is complete, correct or ready to
                  file.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    ["missing", "collected", "reviewed", "unresolved"] as const
                  ).map((status) => (
                    <div
                      key={status}
                      className="rounded-xl border border-line bg-surface p-4"
                    >
                      <p className="text-sm text-ink-soft">
                        {evidenceLabels[status]}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-ink">
                        {
                          review.checklist.filter(
                            (item) => item.status === status,
                          ).length
                        }
                      </p>
                      <p className="text-xs text-ink-soft">evidence areas</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-ink-soft">
                  {review.unanswered.length} unanswered circumstances ·{" "}
                  {review.uncertain.length} marked “Not sure”. Employment
                  entries: {review.employment.reviewed} reviewed;{" "}
                  {review.employment.unresolved} unresolved;{" "}
                  {review.employment.inactive} inactive.
                </p>
                <ul className="mt-5 space-y-3">
                  {review.checklist.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-line bg-surface p-4"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <h3 className="font-semibold text-ink">{item.label}</h3>
                        <span className="text-sm text-ink-soft">
                          {item.status === "unanswered"
                            ? "Unanswered"
                            : item.status === "not-applicable"
                              ? "You answered No"
                              : evidenceLabels[item.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">
                        {item.detail}
                      </p>
                    </li>
                  ))}
                </ul>
                {draft.circumstances["other-income"] !== "no" && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                    Other income remains a follow-up unless you explicitly
                    answer No. This journey does not calculate or resolve
                    overseas income, gains or other unsupported tax situations.
                  </p>
                )}
                {review.warnings?.length > 0 && (
                  <ul className="mt-4 list-disc space-y-2 rounded-xl bg-amber-50 p-5 pl-9 text-sm text-amber-950">
                    {review.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("circumstances")}
                    className="whitespace-normal"
                  >
                    Edit circumstances
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("evidence")}
                    className="whitespace-normal"
                  >
                    Edit evidence
                  </Button>
                </div>
                <section
                  aria-labelledby="summary-title"
                  className="mt-8 rounded-2xl border border-line bg-surface p-5"
                >
                  <h3
                    id="summary-title"
                    className="text-xl font-semibold text-ink"
                  >
                    Preview a preparation summary
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-ink-soft">
                    Choose what to include before downloading. The text file is
                    unencrypted, is not a restorable backup and does not submit
                    anything. It reflects the draft on this page, including
                    unsaved changes. Circumstance answers and employer and
                    document labels are included. Figures and employment notes
                    are optional below.
                  </p>
                  <div className="mt-4 space-y-2">
                    <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={includeFigures}
                        onChange={(event) => {
                          setIncludeFigures(event.target.checked);
                          setPreview(null);
                          setDownloadAcknowledged(false);
                        }}
                        className="h-5 w-5 accent-accent"
                      />
                      Include employment figures
                    </label>
                    <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={includeNotes}
                        onChange={(event) => {
                          setIncludeNotes(event.target.checked);
                          setPreview(null);
                          setDownloadAcknowledged(false);
                        }}
                        className="h-5 w-5 accent-accent"
                      />
                      Include my employment notes
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={showPreview}
                    className="mt-3 whitespace-normal"
                  >
                    Preview summary
                  </Button>
                  {preview !== null && (
                    <>
                      <pre
                        aria-label="Preparation summary preview"
                        tabIndex={0}
                        className="mt-5 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-line bg-paper p-4 font-mono text-sm leading-6 text-ink"
                      >
                        {preview}
                      </pre>
                      <label className="mt-4 flex min-h-11 items-start gap-3 text-sm leading-6 text-ink">
                        <input
                          type="checkbox"
                          checked={downloadAcknowledged}
                          onChange={(event) =>
                            setDownloadAcknowledged(event.target.checked)
                          }
                          className="mt-1 h-5 w-5 shrink-0 accent-accent"
                        />
                        I understand this summary is unencrypted and will store
                        and share it carefully.
                      </label>
                      <Button
                        type="button"
                        disabled={!downloadAcknowledged}
                        onClick={() => {
                          try {
                            downloadSummary(preview, draft.year);
                            setMessage(
                              "Summary download requested. Check the file in your downloads. Your preparation draft was not saved by downloading.",
                            );
                          } catch {
                            setError(
                              "The summary could not be downloaded. The preview and your preparation are still here.",
                            );
                          }
                        }}
                        className="mt-3 whitespace-normal"
                      >
                        Download plain-text summary
                      </Button>
                    </>
                  )}
                </section>
              </>
            )}
            <div className="mt-7 flex flex-wrap justify-between gap-3">
              {currentIndex > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(steps[currentIndex - 1].id)}
                  className="whitespace-normal"
                >
                  Back to {steps[currentIndex - 1].label.toLowerCase()}
                </Button>
              )}
              {currentIndex < steps.length - 1 && (
                <Button
                  type="button"
                  onClick={() => setStep(steps[currentIndex + 1].id)}
                  className="ml-auto whitespace-normal"
                >
                  Continue to {steps[currentIndex + 1].label.toLowerCase()}
                </Button>
              )}
            </div>
          </fieldset>
        </>
      )}
      {message && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-accent/20 bg-accent-soft p-4 text-sm leading-6 text-ink"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          ref={feedback}
          tabIndex={-1}
          role="alert"
          className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
        >
          {error}
        </p>
      )}
      <p className="mt-7 text-sm leading-6 text-ink-soft">
        Guidance links checked 30 September 2026. They open official GOV.UK
        pages in a new tab; no preparation answers or figures are included in
        those links.
      </p>
    </section>
  );
}
