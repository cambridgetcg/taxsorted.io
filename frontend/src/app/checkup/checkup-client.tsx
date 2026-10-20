"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AUDIENCES, getAudience, servicesForAudience, SERVICE_AVAILABILITY_LABELS,
  type AudienceId, type ServiceId,
} from "@/lib/tax-services";
import {
  CHECKLIST_SCHEMA, emptyChecklistProgress, parseSavedChecklist,
  type SavedChecklist,
} from "./checklist-state";
import { TaxYearProgressPanel } from "./tax-year-progress";
import { createChecklistStore } from "@/lib/checklist-store";

async function readSavedChecklist(store: ReturnType<typeof createChecklistStore>) {
  try {
    const raw = await store.load();
    const saved = raw === null ? null : parseSavedChecklist(raw);
    return {
      raw,
      saved,
      error: raw !== null && saved === null
        ? "The saved checklist could not be read. It has been left untouched. You can use a temporary checklist or clear the saved checklist to start again."
        : null,
    };
  } catch {
    return {
      raw: null,
      saved: null,
      error: "Checklist storage on this device could not be read. You can use the checklist for this visit, but saving is unavailable. Your other records have not changed.",
    };
  }
}

export function CheckupClient() {
  const store = useMemo(() => createChecklistStore(), []);
  const [saving, setSaving] = useState(false);
  const searchParams = useSearchParams();
  const requestedAudience = searchParams.get("for");
  const [lastRequest, setLastRequest] = useState(requestedAudience);
  const [chosenAudience, setChosenAudience] = useState<AudienceId | null>(null);
  const [restoredAudience, setRestoredAudience] = useState<AudienceId | null>(null);
  const [checked, setChecked] = useState(emptyChecklistProgress);
  const [ready, setReady] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [canSave, setCanSave] = useState(true);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSavedRaw = useRef<string | null>(null);

  // A new audience URL changes the view, never the other audience's checkmarks.
  if (requestedAudience !== lastRequest) {
    setLastRequest(requestedAudience);
    setChosenAudience(null);
    setMessage(null);
  }

  const selected = chosenAudience ?? getAudience(requestedAudience)?.id ?? restoredAudience;
  const audience = getAudience(selected);
  const services = servicesForAudience(selected);
  const checkedCount = selected ? checked[selected].length : 0;
  const snapshot = selected
    ? JSON.stringify({ schema: CHECKLIST_SCHEMA, audience: selected, checked } satisfies SavedChecklist)
    : null;
  const unsaved = snapshot !== null && snapshot !== savedSnapshot;

  useEffect(() => {
    let active = true;
    void readSavedChecklist(store).then((result) => {
      if (!active) return;
      lastSavedRaw.current = result.raw;
      setHasSaved(result.raw !== null);
      setCanSave(result.error === null);
      setError(result.error);
      if (result.saved) {
        setChecked(result.saved.checked);
        setRestoredAudience(result.saved.audience);
        setSavedSnapshot(JSON.stringify(result.saved));
        setMessage("Your saved checklist has been restored on this device.");
      }
      setReady(true);
    });
    return () => { active = false; };
  }, [store]);

  function chooseAudience(id: AudienceId) {
    setChosenAudience(id);
    setMessage(null);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("for", id);
    window.history.replaceState(window.history.state, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }

  function toggleStep(serviceId: ServiceId, isChecked: boolean) {
    if (!selected) return;
    setChecked((current) => ({
      ...current,
      [selected]: isChecked
        ? [...current[selected].filter((id) => id !== serviceId), serviceId]
        : current[selected].filter((id) => id !== serviceId),
    }));
    setMessage(null);
  }

  async function saveChecklist() {
    if (!ready || !canSave || snapshot === null || saving) return;
    setSaving(true);
    try {
      await store.save(snapshot, lastSavedRaw.current);
      lastSavedRaw.current = snapshot;
      setSavedSnapshot(snapshot);
      setHasSaved(true);
      setError(null);
      setMessage("Checklist saved on this device. It includes your selected audience and checkmarks for each audience; no tax figures or identifying details.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The checklist could not be saved. Your checkmarks are still here for this visit.");
      setMessage(null);
    } finally { setSaving(false); }
  }

  async function clearSavedChecklist() {
    if (saving) return;
    setSaving(true);
    try {
      await store.clear();
      lastSavedRaw.current = null;
      setSavedSnapshot(null);
      setChecked(emptyChecklistProgress());
      setRestoredAudience(null);
      setChosenAudience(selected);
      setHasSaved(false);
      setCanSave(true);
      setError(null);
      setMessage("The saved checklist and its checkmarks have been cleared. Your books, Tax Passport and account are unchanged.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The saved checklist could not be cleared. Nothing was changed.");
      setMessage(null);
    } finally { setSaving(false); }
  }

  const feedback = (
    <>
      <div className="mt-4" aria-live="polite" aria-atomic="true">
        {message && <p role="status" className="rounded-xl border border-accent/20 bg-accent-soft p-3 text-sm leading-6 text-accent-deep">{message}</p>}
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950">{error}</p>}
      {ready && (hasSaved || !canSave) && (
        <Button type="button" variant="ghost" disabled={saving} onClick={() => void clearSavedChecklist()} className="mt-3 gap-2 whitespace-normal text-sm">
          <Trash2 aria-hidden="true" className="h-4 w-4 shrink-0" />Clear saved checklist
        </Button>
      )}
    </>
  );

  return (
    <section className="mt-10" aria-labelledby="checklist-audience-title">
      {audience ? (
        <div className="rounded-2xl border border-line bg-surface p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <label htmlFor="checklist-audience" id="checklist-audience-title" className="text-lg font-semibold text-ink">
              Who are you sorting tax for?
            </label>
            <p className="mt-1 text-sm leading-6 text-ink-soft">You can switch. Each audience keeps its own checkmarks.</p>
          </div>
          <select
            id="checklist-audience"
            value={audience.id}
            onChange={(event) => {
              const next = getAudience(event.target.value);
              if (next) chooseAudience(next.id);
            }}
            disabled={!ready || saving}
            className="mt-3 min-h-12 w-full max-w-full rounded-xl border border-line-strong bg-paper px-3 text-base text-ink sm:mt-0 sm:w-80"
          >
            {AUDIENCES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      ) : <fieldset disabled={!ready || saving}>
        <legend id="checklist-audience-title" className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Who are you sorting tax for?
        </legend>
        <p className="mt-2 max-w-3xl leading-7 text-ink-soft">
          Choose a starting point. More than one can apply: switch between them and keep a separate
          set of checkmarks for each.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map((item) => (
            <label
              key={item.id}
              className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                selected === item.id ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/60"
              }`}
            >
              <input
                type="radio"
                name="checklist-audience"
                value={item.id}
                checked={selected === item.id}
                onChange={() => chooseAudience(item.id)}
                aria-label={item.name}
                aria-describedby={`audience-${item.id}-description`}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <span>
                <span className="font-semibold text-ink">{item.name}</span>
                <span id={`audience-${item.id}-description`} className="mt-1 block text-sm leading-6 text-ink-soft">
                  {item.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>}

      {!ready && <p role="status" className="mt-6 text-sm text-ink-soft">Loading your checklist…</p>}

      {ready && audience ? (
        <>
        <TaxYearProgressPanel audience={audience.id} />
        <div className="mt-9 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <aside className="rounded-2xl border border-line bg-accent-soft/50 p-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1" aria-labelledby="keep-checklist-title">
            <h2 id="keep-checklist-title" className="text-lg font-semibold text-ink">Keep your place</h2>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              Save before leaving to keep your checkmarks. Checkmarks are your reminders, not confirmation that tax is correct or a return was filed.
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              Only your audience choices and checkmarks stay in this app or browser on this device. This does not save figures in other tools or back up your books. Clearing the app’s or browser’s stored data can erase it.
            </p>
            <p className="mt-4 text-sm font-semibold text-ink">{unsaved ? "Changes are not saved" : "Saved on this device"}</p>
            <Button type="button" onClick={() => void saveChecklist()} disabled={!canSave || saving} className="mt-3 w-full gap-2">
              <Save aria-hidden="true" className="h-4 w-4" />Save checklist
            </Button>
            {feedback}
            <Link href="/backups" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">
              Back up your saved workspace
            </Link>
            <Link href={`/services/${audience.id}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">
              See all services for {audience.shortName.toLowerCase()}
            </Link>
          </aside>
          <div className="lg:col-start-1 lg:row-start-1">
            <div className="rounded-t-2xl border border-line bg-surface px-5 py-6 sm:px-7">
              <p className="section-label">Your personal checklist</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{audience.shortName} checklist</h2>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{audience.scope}</p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                These are your own reminders, kept separately from saved-work progress.
                They are not tied to a tax year and never change automatically.
              </p>
              <p className="mt-4 text-sm font-semibold text-accent" aria-live="polite" aria-atomic="true">
                {checkedCount} of {services.length} steps checked by you
              </p>
            </div>
            <ol className="divide-y divide-line overflow-hidden rounded-b-2xl border-x border-b border-line bg-surface">
              {services.map((service, index) => {
                const isChecked = checked[audience.id].includes(service.id);
                return (
                  <li key={service.id} className="p-5 sm:p-7">
                    <div className="flex gap-4">
                      <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isChecked ? "bg-accent text-white" : "bg-accent-soft text-accent"}`}>
                        {isChecked ? <Check className="h-4 w-4" /> : index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-ink-soft">{SERVICE_AVAILABILITY_LABELS[service.availability]}</p>
                        <h3 className="mt-1 text-lg font-semibold text-ink">{service.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-ink-soft">{service.description}</p>
                        <Link href={service.href} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent underline decoration-accent/30 underline-offset-4 hover:text-accent-deep">
                          {service.action}<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                        </Link>
                        <details className="mt-2 text-sm leading-6 text-ink-soft">
                          <summary className="min-h-11 cursor-pointer py-2 font-medium text-ink">What this step covers</summary>
                          <p className="pb-2">{service.boundary}</p>
                        </details>
                        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-paper px-3 py-2 text-sm font-medium text-ink">
                          <input
                            type="checkbox"
                            disabled={saving}
                            checked={isChecked}
                            onChange={(event) => toggleStep(service.id, event.target.checked)}
                            aria-label={`I have checked this step: ${service.name}`}
                            className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                          />
                          I have checked this step
                        </label>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

        </div>
        </>
      ) : ready ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-6 leading-7 text-ink-soft">
          Choose who this is for to see the relevant services in order. Nothing is saved until you choose Save checklist.
        </p>
      ) : null}

      {(!ready || !audience) && feedback}
    </section>
  );
}
