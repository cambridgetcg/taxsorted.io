"use client";

import { useId, useRef, useState } from "react";
import { categoriesFor, categoryByKey } from "@taxsorted/engine/uk/itsa";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PillRadioGroup } from "@/components/prep/pill-radio-group";
import { formatUkDate, gbp } from "@/lib/format";
import { parsePounds } from "@/lib/parse";
import type { AccountingEvent, LocalLedger } from "@/lib/local-books";
import type { ReviewEventInput } from "@/lib/records";

export interface MoneyInboxProps {
  events: AccountingEvent[];
  ledgers: LocalLedger[];
  onReview: (id: string, input: ReviewEventInput) => Promise<AccountingEvent>;
}

const INBOX_PAGE_SIZE = 20;

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function MoneyInbox({ events, ledgers, onReview }: MoneyInboxProps) {
  const [visibility, setVisibility] = useState({
    eventCount: events.length,
    count: INBOX_PAGE_SIZE,
  });
  const visibleCount =
    visibility.eventCount === events.length ? visibility.count : INBOX_PAGE_SIZE;
  const pending = events.filter((event) => event.reviewState === "needs-review");
  const visible = pending.slice(0, visibleCount);
  const ledgerById = new Map(ledgers.map((ledger) => [ledger.id, ledger]));
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const emptyRef = useRef<HTMLParagraphElement>(null);

  const focusEmptyStatus = () => {
    let attempts = 0;
    const tryFocus = () => {
      if (emptyRef.current) {
        emptyRef.current.focus();
        return;
      }
      attempts += 1;
      if (attempts < 3) window.requestAnimationFrame(tryFocus);
    };
    window.requestAnimationFrame(tryFocus);
  };

  const decide = async (event: AccountingEvent, input: ReviewEventInput) => {
    const index = visible.findIndex((candidate) => candidate.id === event.id);
    const next = visible[index + 1] ?? visible[index - 1];
    await onReview(event.id, input);
    if (next) window.setTimeout(() => cardRefs.current.get(next.id)?.focus(), 0);
    else focusEmptyStatus();
  };

  return (
    <section aria-labelledby="money-inbox-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="money-inbox-heading" className="text-2xl font-bold text-ink">
            Money Inbox
          </h2>
          <p className="mt-1 text-base text-ink-soft">
            Imported rows wait here. Nothing enters your figures until you make the decision.
          </p>
        </div>
        <p className="text-sm font-medium text-ink" aria-live="polite">
          {pending.length} to review
        </p>
      </div>

      {pending.length === 0 ? (
        <p
          ref={emptyRef}
          tabIndex={-1}
          className="rounded-2xl border border-dashed border-line p-5 text-center text-base text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Inbox clear. Bring in a CSV above, or try the made-up card-shop example first.
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((event) => {
            const ledger = ledgerById.get(event.ledgerId);
            if (!ledger) return null;
            return (
              <MoneyReviewCard
                key={event.id}
                ref={(node) => {
                  if (node) cardRefs.current.set(event.id, node);
                  else cardRefs.current.delete(event.id);
                }}
                event={event}
                ledger={ledger}
                onDecision={(input) => decide(event, input)}
              />
            );
          })}
          {visible.length < pending.length ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-3">
              <p className="text-sm text-ink-soft">
                Showing {visible.length} of {pending.length} waiting records.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setVisibility({
                    eventCount: events.length,
                    count: visibleCount + INBOX_PAGE_SIZE,
                  })
                }
              >
                Show next {Math.min(INBOX_PAGE_SIZE, pending.length - visible.length)}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <p className="text-sm text-ink-soft">
        Keep the original CSV, bank statement and receipts somewhere safe. This first version
        keeps only a source trail in this browser; clearing site data can remove these local books.
      </p>
    </section>
  );
}

interface MoneyReviewCardProps {
  event: AccountingEvent;
  ledger: LocalLedger;
  onDecision: (input: ReviewEventInput) => Promise<void>;
  ref?: React.Ref<HTMLElement>;
}

function MoneyReviewCard({ event, ledger, onDecision, ref }: MoneyReviewCardProps) {
  const posting = event.postings[0];
  const [purpose, setPurpose] = useState<"yes" | "partly" | "no" | "unsure" | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [occurredOn, setOccurredOn] = useState(event.occurredOn);
  const [amount, setAmount] = useState((event.cash.amount / 100).toFixed(2));
  const [cashDirection, setCashDirection] = useState<"in" | "out">(event.cash.direction);
  const [activity, setActivity] = useState(ledger.activity);
  const [description, setDescription] = useState(event.description ?? "");
  const [category, setCategory] = useState(posting.category);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryId = useId();
  const postingKind = cashDirection === "in" ? "income" : "expense";
  const choices = categoriesFor(activity).filter((candidate) => candidate.kind === postingKind);
  const selectedCategory = choices.some((choice) => choice.key === category)
    ? category
    : choices[0]?.key;
  const definition = selectedCategory ? categoryByKey(selectedCategory, activity) : null;
  const parsedAmount = parsePounds(amount);
  const validAmount = typeof parsedAmount === "number" && parsedAmount > 0;
  const validDate = isIsoDate(occurredOn);
  const signedCash = validAmount
    ? `${cashDirection === "out" ? "−" : "+"}${gbp(parsedAmount)}`
    : "Amount needs checking";

  const profitEffect = (() => {
    const effectivePostingEffect =
      cashDirection === event.cash.direction ? posting.effect : "increase";
    const raisesProfit =
      (postingKind === "income" && effectivePostingEffect === "increase") ||
      (postingKind === "expense" && effectivePostingEffect === "decrease");
    return validAmount
      ? `${raisesProfit ? "Would raise" : "Would reduce"} profit by ${gbp(parsedAmount)} if confirmed.`
      : "Fix the amount before this can affect profit.";
  })();

  const submit = async (reviewState: "ready" | "excluded") => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onDecision({
        expectedRevision: event.revision,
        reviewState,
        ...(reviewState === "ready" && validAmount && selectedCategory
          ? {
              occurredOn,
              amount: parsedAmount,
              ...(cashDirection !== event.cash.direction ? { cashDirection } : {}),
              activity,
              category: selectedCategory,
              description: description.trim() || null,
            }
          : {}),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save that decision.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      ref={ref}
      tabIndex={-1}
      aria-labelledby={`${categoryId}-heading`}
      className="rounded-2xl border border-line bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">
            {validDate ? formatUkDate(occurredOn) : "Date needs checking"}
          </p>
          <h3 id={`${categoryId}-heading`} className="text-lg font-semibold text-ink">
            {description || (cashDirection === "in" ? "Money in" : "Money out")}
          </h3>
        </div>
        <div className="text-right">
          <Badge variant="outline">Needs your decision</Badge>
          <p className="mt-1 text-lg font-semibold text-ink">{signedCash}</p>
        </div>
      </div>

      <p className="mt-4 font-medium text-ink">
        {postingKind === "income"
          ? "Was this money earned by this business?"
          : "Was all of this paid for this business?"}
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        Confirm only if the date, amount, business purpose and category all look right. If only
        part is business, or you are not sure, leave it here for now.
      </p>

      {event.reviewNote ? (
        <p role="note" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Check this: {event.reviewNote}
        </p>
      ) : null}

      <PillRadioGroup
        className="mt-4"
        label="Was all of this for this business?"
        hideLabel
        value={purpose}
        onChange={setPurpose}
        options={[
          { value: "yes", label: "Yes" },
          { value: "partly", label: "Partly" },
          { value: "no", label: "No" },
          { value: "unsure", label: "Not sure" },
        ]}
      />

      {purpose === "partly" || purpose === "unsure" ? (
        <p role="status" className="mt-3 rounded-xl bg-paper p-3 text-sm text-ink">
          Leave this waiting for now. Splitting a partly-business payment is not supported yet;
          check it with your records or an accountant before deciding.
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium text-ink">
          Date
          <input
            type="date"
            value={occurredOn}
            onChange={(change) => setOccurredOn(change.target.value)}
            className="flex min-h-11 w-full rounded-md border border-line bg-white px-3 py-2 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-ink">
          Amount in pounds
          <input
            inputMode="decimal"
            value={amount}
            onChange={(change) => setAmount(change.target.value)}
            aria-invalid={!validAmount}
            className="flex min-h-11 w-full rounded-md border border-line bg-white px-3 py-2 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>
      </div>
      {!validAmount ? <p role="alert" className="mt-2 text-sm text-red-700">Enter an amount above £0.</p> : null}
      {!validDate ? <p role="alert" className="mt-2 text-sm text-red-700">Enter a real date.</p> : null}

      <PillRadioGroup
        className="mt-4"
        label="Cash direction"
        value={cashDirection}
        onChange={(nextDirection) => {
          setCashDirection(nextDirection);
          const nextKind = nextDirection === "in" ? "income" : "expense";
          const nextChoices = categoriesFor(activity).filter((choice) => choice.kind === nextKind);
          setCategory(nextChoices[0]?.key ?? "");
        }}
        options={[
          { value: "in", label: "Money in" },
          { value: "out", label: "Money out" },
        ]}
      />

      <PillRadioGroup
        className="mt-4"
        label="Which activity does it belong to?"
        value={activity}
        onChange={(nextActivity) => {
          setActivity(nextActivity);
          const nextChoices = categoriesFor(nextActivity).filter((choice) => choice.kind === postingKind);
          setCategory(nextChoices[0]?.key ?? "");
        }}
        options={[
          { value: "self-employment", label: "Self-employment" },
          { value: "uk-property", label: "UK property" },
        ]}
      />

      <label className="mt-4 block space-y-1.5 text-sm font-medium text-ink">
        Description
        <input
          value={description}
          onChange={(change) => setDescription(change.target.value)}
          className="flex min-h-11 w-full rounded-md border border-line bg-white px-3 py-2 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>

      <div className="mt-4 space-y-1.5">
        <label htmlFor={categoryId} className="text-sm font-medium text-ink">
          Proposed tax category
        </label>
        <select
          id={categoryId}
          value={selectedCategory}
          onChange={(change) => setCategory(change.target.value)}
          className="flex min-h-11 w-full rounded-md border border-line bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {choices.map((choice) => (
            <option key={choice.key} value={choice.key}>
              {choice.label}
            </option>
          ))}
        </select>
        {definition ? <p className="text-sm text-ink-soft">{definition.plain}</p> : null}
      </div>

      <details className="mt-3 rounded-xl bg-paper p-3 text-sm">
        <summary className="cursor-pointer font-medium text-ink">Why this suggestion?</summary>
        <p className="mt-2 text-ink-soft">
          {event.suggestion?.basis ?? "The amount direction supplied the starting category."}
        </p>
        <p className="mt-1 text-ink-soft">
          {event.suggestion?.limitation ?? "Only you can confirm what the transaction was for."}
        </p>
      </details>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Lens label="Cash" value={`${signedCash} ${cashDirection === "in" ? "came in" : "left the account"}.`} />
        <Lens label="Profit" value={profitEffect} />
        <Lens
          label="Tax"
          value={definition ? `${definition.label}${definition.saBox ? ` · ${definition.saBox}` : ""}. A category proposal, not tax due.` : "Choose a valid category."}
        />
        <Lens
          label="Source trail"
          value={
            event.origin.label
              ? `${event.origin.label}${event.origin.row ? ` · row ${event.origin.row}` : ""}. Bank line only; no receipt attached.`
              : "No source document attached yet."
          }
        />
      </dl>

      <label className="mt-4 flex min-h-11 items-start gap-3 rounded-xl border border-line p-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(change) => setAcknowledged(change.target.checked)}
          className="mt-0.5 h-5 w-5 accent-accent"
        />
        <span>
          I checked the date, amount, cash direction, activity, category
          {event.reviewNote ? " and the warning above" : ""}.
        </span>
      </label>

      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => submit("ready")}
          disabled={busy || purpose !== "yes" || !acknowledged || !validAmount || !validDate || !selectedCategory}
        >
          {busy ? "Saving…" : "Confirm transaction"}
        </Button>
        <Button type="button" variant="outline" onClick={() => submit("excluded")} disabled={busy || purpose !== "no"}>
          Leave out
        </Button>
      </div>
    </article>
  );
}

function Lens({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

export function PracticeShop() {
  const [answer, setAnswer] = useState<"net" | "gross" | null>(null);

  return (
    <details className="rounded-2xl border border-accent bg-accent-soft p-4 sm:p-5">
      <summary className="cursor-pointer font-semibold text-ink">
        Play first: Mina&apos;s first card sale
      </summary>
      <div className="mt-4 space-y-3">
        <p className="text-sm font-medium text-accent-deep">
          Made-up example. Nothing here is saved or mixed with your books.
        </p>
        <p className="text-base text-ink">
          A buyer paid £180 for a card. The marketplace kept an £18 fee and paid Mina £162.
          What was the business&apos;s sale before costs?
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose the sale amount">
          <Button type="button" variant="outline" aria-pressed={answer === "net"} onClick={() => setAnswer("net")}>
            £162 payout
          </Button>
          <Button type="button" variant="outline" aria-pressed={answer === "gross"} onClick={() => setAnswer("gross")}>
            £180 sale
          </Button>
        </div>
        {answer ? (
          <p className="rounded-xl bg-white p-3 text-sm text-ink" aria-live="polite">
            {answer === "gross"
              ? "Yes. Cash payout was £162, but the books usually need £180 sales and £18 marketplace fees as separate facts."
              : "Close: £162 is the cash payout. The sale was £180; the £18 marketplace fee is a separate cost. Cash and profit are different lenses."}
          </p>
        ) : null}
      </div>
    </details>
  );
}
