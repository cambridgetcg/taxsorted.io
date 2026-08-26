"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SourceType } from "@taxsorted/engine/uk/itsa";
import { api, type ApiEntity } from "@/lib/api";
import {
  runSyntheticAccountingDemo,
  type SyntheticAccountingDemoResult,
  type SyntheticDemoStage,
} from "@/lib/synthetic-accounting-demo";
import {
  clearSyntheticDemoRecords,
  createSyntheticDemoRecordsStore,
} from "@/lib/records";

type DoorState =
  | "loading"
  | "production-disabled"
  | "signed-out"
  | "passkey-needed"
  | "claimable"
  | "ready"
  | "failed";
type RunState = "idle" | "running" | "stopped" | "failed" | "complete";
type BoundChoice = { entityId: string; activity: SourceType };

const STAGE_LABEL: Record<SyntheticDemoStage, string> = {
  "opening-source": "Opening the made-up provider",
  "checking-source": "Checking the saved source",
  "binding-browser": "Binding this browser replica",
  "starting-sync": "Starting a fenced sync run",
  "reading-page": "Reading a made-up page",
  "checking-page": "Checking its exact digest and manifest",
  "saving-page": "Saving raw and normalised versions locally",
  "acknowledging-page": "Acknowledging the locally saved page",
  "completing-run": "Completing the whole run before moving the checkpoint",
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "The made-up connector could not finish. Nothing was filed or sent to a real provider.";
}

export default function SyntheticAccountingDemoClient() {
  const [door, setDoor] = useState<DoorState>("loading");
  const [entities, setEntities] = useState<ApiEntity[]>([]);
  const [entityId, setEntityId] = useState("");
  const [activity, setActivity] = useState<SourceType>("self-employment");
  const [consented, setConsented] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [claimableEntities, setClaimableEntities] = useState(0);
  const [boundChoice, setBoundChoice] = useState<BoundChoice | null>(null);
  const [runState, setRunState] = useState<RunState>("idle");
  const [stage, setStage] = useState<{ name: SyntheticDemoStage; page?: number } | null>(null);
  const [result, setResult] = useState<SyntheticAccountingDemoResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const productionBuild = process.env.NODE_ENV === "production";

  useEffect(() => {
    let current = true;
    async function load() {
      try {
        if (productionBuild) {
          setDoor("production-disabled");
          return;
        }
        const account = await api.getAccount();
        if (!current) return;
        if (!account.signedIn) {
          setDoor("signed-out");
          return;
        }
        if (!account.mfa) {
          setDoor("passkey-needed");
          return;
        }
        if (account.claimableEntities > 0) {
          setClaimableEntities(account.claimableEntities);
          setDoor("claimable");
          return;
        }
        const listed = await api.listEntities();
        if (!current) return;
        setEntities(listed.entities);
        const demoState = await createSyntheticDemoRecordsStore().state();
        if (!current) return;
        const activeBindings = demoState.providerBindings.filter(
          (binding) =>
            binding.provider === "synthetic" &&
            binding.environment === "sandbox" &&
            binding.state === "active"
        );
        if (activeBindings.length > 1) {
          throw new Error("The isolated demo store has more than one active made-up source.");
        }
        const saved = activeBindings[0];
        if (saved) {
          const ledger = demoState.ledgers.find((candidate) => candidate.id === saved.ledgerId);
          const entity = listed.entities.find((candidate) => candidate.id === saved.entityId);
          if (!ledger || !entity) {
            throw new Error("The saved demo binding no longer matches an account-owned profile.");
          }
          setEntityId(entity.id);
          setActivity(ledger.activity);
          setBoundChoice({ entityId: entity.id, activity: ledger.activity });
        }
        setDoor("ready");
      } catch (error) {
        if (!current) return;
        setMessage(errorMessage(error));
        setDoor("failed");
      }
    }
    void load();
    return () => {
      current = false;
      abortRef.current?.abort();
    };
  }, [productionBuild]);

  async function createEntity() {
    if (!newName.trim() || boundChoice || abortRef.current) return;
    setCreating(true);
    setMessage(null);
    try {
      const created = await api.createEntity({ name: newName.trim(), kind: "person" });
      setEntities((current) => [...current, created.entity]);
      setEntityId(created.entity.id);
      setNewName("");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function start() {
    if (abortRef.current) return;
    const entity = entities.find((candidate) => candidate.id === entityId);
    if (
      !entity ||
      !consented ||
      productionBuild ||
      (boundChoice &&
        (boundChoice.entityId !== entity.id || boundChoice.activity !== activity))
    ) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunState("running");
    setResult(null);
    setMessage(null);
    setStage({ name: "opening-source" });
    try {
      const completed = await runSyntheticAccountingDemo({
        entity: { id: entity.id, name: entity.name },
        activity,
        signal: controller.signal,
        onProgress: (progress) => setStage({ name: progress.stage, page: progress.page }),
      });
      setResult(completed);
      setBoundChoice({ entityId: entity.id, activity });
      setRunState("complete");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessage(
          "Stopped at a safe boundary and released the server run. A saved page may remain staged, but no incomplete run became the checkpoint."
        );
        setRunState("stopped");
      } else {
        setMessage(errorMessage(error));
        setRunState("failed");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function clearDemo() {
    if (abortRef.current || clearing) return;
    setClearing(true);
    setMessage(null);
    try {
      await clearSyntheticDemoRecords();
      setBoundChoice(null);
      setResult(null);
      setRunState("idle");
      setStage(null);
      setConsented(false);
      setMessage(
        "Made-up browser records were cleared. Server-side control metadata remains, but a fresh browser identity cannot inherit its checkpoint."
      );
    } catch (error) {
      setMessage(errorMessage(error));
      setRunState("failed");
    } finally {
      setClearing(false);
    }
  }

  if (door === "loading") {
    return <p className="mt-10 text-ink-soft">Checking the passkey door…</p>;
  }

  if (door === "production-disabled") {
    return (
      <section className="mt-10 rounded-2xl border border-line bg-white p-6">
        <h2 className="text-2xl font-semibold text-ink">The made-up connector is closed here</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Production builds cannot start this local proof. No sign-in or account change can enable it.
        </p>
        <Link href="/books/connect" className="mt-5 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4">
          Return to accounting software options
        </Link>
      </section>
    );
  }

  if (door === "signed-out" || door === "passkey-needed") {
    return (
      <section className="mt-10 rounded-2xl border border-line bg-white p-6">
        <h2 className="text-2xl font-semibold text-ink">
          {door === "signed-out" ? "Sign in before opening a source" : "Confirm with a passkey"}
        </h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Provider connections belong to an account, not an anonymous browser session. Recovery
          access can view the account but cannot open a connector.
        </p>
        <Link
          href="/account"
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-accent px-6 font-semibold text-white hover:bg-accent-deep"
        >
          Open my account
        </Link>
      </section>
    );
  }

  if (door === "failed") {
    return (
      <section className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
        <h2 className="text-xl font-semibold">The account door could not be checked</h2>
        <p className="mt-2">{message}</p>
      </section>
    );
  }

  if (door === "claimable") {
    return (
      <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="text-2xl font-semibold">Finish adopting your browser profiles first</h2>
        <p className="mt-2 max-w-2xl">
          This browser has {claimableEntities} profile{claimableEntities === 1 ? "" : "s"} that
          do not yet belong to your passkey account. Adopt or remove them before choosing a
          connector profile, so ownership is never guessed.
        </p>
        <Link href="/account" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-accent px-6 font-semibold text-white hover:bg-accent-deep">
          Finish in my account
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="demo-steps-title" className="mt-12">
      <h2 id="demo-steps-title" className="text-3xl font-bold tracking-tight text-ink">
        Three explicit choices, then the proof runs
      </h2>
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
          <label htmlFor="demo-entity" className="block font-semibold text-ink">
            1. TaxSorted person or organisation
          </label>
          <select
            id="demo-entity"
            value={entityId}
            onChange={(event) => setEntityId(event.target.value)}
            disabled={runState === "running" || boundChoice !== null}
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-white px-3 text-ink"
          >
            <option value="">Choose one—never assumed</option>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name} ({entity.kind})
              </option>
            ))}
          </select>

          <div className="mt-4 rounded-xl bg-paper p-4">
              <label htmlFor="demo-entity-name" className="block text-sm font-semibold text-ink">
                Add an account-owned profile first
              </label>
              <p className="mt-1 text-xs text-ink-soft">
                This profile persists in TaxSorted. It does not add a tax number or connect HMRC.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  id="demo-entity-name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="e.g. My sole trade"
                  disabled={boundChoice !== null || runState === "running"}
                  className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-ink"
                />
                <button
                  type="button"
                  onClick={() => void createEntity()}
                  disabled={creating || boundChoice !== null || runState === "running" || !newName.trim()}
                  className="min-h-11 rounded-md border border-line bg-white px-4 font-semibold text-ink disabled:opacity-50"
                >
                  {creating ? "Adding…" : "Add profile"}
                </button>
              </div>
            </div>

          {boundChoice ? (
            <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
              Safe refresh keeps the same profile and activity. Clear the isolated demo data below
              before choosing a different binding.
            </p>
          ) : null}

          <fieldset className="mt-6" disabled={runState === "running" || boundChoice !== null}>
            <legend className="font-semibold text-ink">2. One separate activity</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                ["self-employment", "Self-employment"],
                ["uk-property", "UK property"],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex min-h-11 items-center gap-3 rounded-lg border border-line p-3">
                  <input
                    type="radio"
                    name="activity"
                    value={value}
                    checked={activity === value}
                    onChange={() => setActivity(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-6 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
            <input
              type="checkbox"
              checked={consented}
              onChange={(event) => setConsented(event.target.checked)}
              disabled={runState === "running"}
              className="mt-1"
            />
            <span>
              <strong>3. Run the made-up proof.</strong> I understand this creates connector
              control records on the local API and saves three fictional transactions in an
              isolated browser demo store. Ordinary Starter Books stay untouched. It does not
              contact accounting software or HMRC.
            </span>
          </label>

          {productionBuild ? (
            <p className="mt-5 rounded-xl border border-line bg-paper p-4 text-sm text-ink">
              This proof is visible for inspection but cannot run in a production build.
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void start()}
              disabled={
                productionBuild || runState === "running" || !entityId || !consented
              }
              className="min-h-11 rounded-md bg-accent px-6 font-semibold text-white hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {runState === "complete" ? "Run a safe refresh" : "Run the connector proof"}
            </button>
            {runState === "running" ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="min-h-11 rounded-md border border-red-300 bg-white px-5 font-semibold text-red-800"
              >
                Stop at next safe boundary
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void clearDemo()}
              disabled={runState === "running" || clearing}
              className="min-h-11 rounded-md border border-line bg-white px-5 font-semibold text-ink disabled:opacity-50"
            >
              {clearing ? "Clearing…" : "Clear made-up browser data"}
            </button>
          </div>
        </div>

        <div aria-live="polite" className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
          <h3 className="text-xl font-semibold text-ink">Visible connector truth</h3>
          {runState === "idle" ? (
            <p className="mt-3 text-sm text-ink-soft">
              No source has been opened from this screen. Choose explicitly to begin.
            </p>
          ) : null}
          {runState === "running" && stage ? (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
              <p className="text-sm font-semibold">Working</p>
              <p className="mt-1">
                {STAGE_LABEL[stage.name]}
                {stage.page ? " · page " + stage.page : ""}
              </p>
            </div>
          ) : null}
          {message ? (
            <div
              className={
                runState === "stopped"
                  ? "mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
                  : "mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
              }
            >
              {message}
            </div>
          ) : null}
          {result ? (
            <div className="mt-4">
              <p className="rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-900">
                Complete. The local and server checkpoints agree.
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-white p-3">
                  <dt className="text-ink-soft">Run</dt>
                  <dd className="mt-1 font-semibold text-ink">{result.kind}</dd>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <dt className="text-ink-soft">Pages proved</dt>
                  <dd className="mt-1 font-semibold text-ink">{result.pageCount}</dd>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <dt className="text-ink-soft">New review items</dt>
                  <dd className="mt-1 font-semibold text-ink">{result.added}</dd>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <dt className="text-ink-soft">Conflicts held</dt>
                  <dd className="mt-1 font-semibold text-ink">{result.conflicts}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm text-ink-soft">
                Source: {result.organisation.name}. Raw versions, normalised versions and page
                proofs stay in this browser; provider tokens do not.
              </p>
              <p className="mt-4 text-sm text-ink-soft">
                This proof stays in its own demo store and does not appear in To check in your
                ordinary Books.
              </p>
            </div>
          ) : null}

          <ol className="mt-6 space-y-3 border-t border-line pt-5 text-sm text-ink-soft">
            <li><strong className="text-ink">1.</strong> Raw page digest must match.</li>
            <li><strong className="text-ink">2.</strong> One IndexedDB write keeps records and proof together.</li>
            <li><strong className="text-ink">3.</strong> Only that saved page may be acknowledged.</li>
            <li><strong className="text-ink">4.</strong> Only a complete run moves the checkpoint.</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
