"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gbp } from "@/lib/format";
import {
  LEARNING_PROGRESS_KEY,
  parseLearningProgress,
  readLearningProgressRaw,
  removeLearningProgress,
  subscribeToLearningProgress,
  writeLearningProgress,
} from "@/lib/learning-progress";
import { LEARNING_ROUNDS } from "@/lib/learning-scenarios";

type AnswerFeedback = {
  kind: "correct" | "wrong" | "missing";
  text: string;
};

const serverProgressSnapshot = () => null;

export function LearningPlayground() {
  const storedProgressRaw = useSyncExternalStore(
    subscribeToLearningProgress,
    readLearningProgressRaw,
    serverProgressSnapshot,
  );
  const storedCompletedIds = useMemo(
    () => parseLearningProgress(storedProgressRaw),
    [storedProgressRaw],
  );
  const [sessionCompletedIds, setSessionCompletedIds] = useState<string[] | null>(null);
  const [activeId, setActiveId] = useState(LEARNING_ROUNDS[0].id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, AnswerFeedback>>({});
  const [resetArmed, setResetArmed] = useState(false);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const roundHeading = useRef<HTMLHeadingElement>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  const confirmResetButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (resetArmed) confirmResetButton.current?.focus();
  }, [resetArmed]);

  const completedIds = sessionCompletedIds ?? storedCompletedIds;
  const activeIndex = Math.max(
    0,
    LEARNING_ROUNDS.findIndex((round) => round.id === activeId),
  );
  const activeRound = LEARNING_ROUNDS[activeIndex];
  const selectedAnswer = answers[activeRound.id];
  const activeFeedback = feedback[activeRound.id];
  const completed = completedIds.includes(activeRound.id);

  const rememberCompletion = (roundId: string) => {
    if (completedIds.includes(roundId)) return;
    const next = LEARNING_ROUNDS.map((round) => round.id).filter(
      (id) => completedIds.includes(id) || id === roundId,
    );
    setSessionCompletedIds(next);
    if (!writeLearningProgress(next)) {
      setStorageNotice("This browser isn’t saving progress; play still works.");
    } else {
      setStorageNotice(null);
    }
  };

  const checkAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const answer = activeRound.answers.find((candidate) => candidate.id === selectedAnswer);
    if (!answer) {
      setFeedback((current) => ({
        ...current,
        [activeRound.id]: {
          kind: "missing",
          text: "Choose one move before checking it.",
        },
      }));
      return;
    }

    if (answer.correct) rememberCompletion(activeRound.id);
    setFeedback((current) => ({
      ...current,
      [activeRound.id]: {
        kind: answer.correct ? "correct" : "wrong",
        text: answer.feedback,
      },
    }));
  };

  const openRound = (roundId: string) => {
    setActiveId(roundId);
    window.setTimeout(() => roundHeading.current?.focus(), 0);
  };

  const continuePlaying = () => {
    const next = LEARNING_ROUNDS[(activeIndex + 1) % LEARNING_ROUNDS.length];
    openRound(next.id);
  };

  const returnFocusToReset = () => {
    window.setTimeout(() => resetButton.current?.focus(), 0);
  };

  const cancelReset = () => {
    setResetArmed(false);
    setStorageNotice("Reset cancelled. Your completed rounds are unchanged.");
    returnFocusToReset();
  };

  const resetProgress = () => {
    if (!removeLearningProgress()) {
      setResetArmed(false);
      setStorageNotice("Saved progress could not be removed. Your completed rounds are unchanged.");
      returnFocusToReset();
      return;
    }
    setSessionCompletedIds([]);
    setAnswers({});
    setFeedback({});
    setResetArmed(false);
    setStorageNotice("Practice progress reset on this browser.");
    returnFocusToReset();
  };

  return (
    <section
      aria-labelledby="learning-playground-title"
      className="mt-8 overflow-hidden rounded-3xl border border-accent bg-white"
    >
      <div className="bg-accent-soft p-5 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-deep">
          Play → notice → understand → keep
        </p>
        <h2
          id="learning-playground-title"
          className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-ink sm:text-4xl"
        >
          Play the books. Keep the money you can prove.
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink-soft">
          Predict first. Open the calculation. Trace the source. Then explain the move back in
          your own words. No timer, no lives and no shame in trying again.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)]">
          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Training progress</p>
                <p className="mt-1 text-2xl font-bold text-ink">
                  {completedIds.length} of {LEARNING_ROUNDS.length} rounds completed
                </p>
              </div>
              {completedIds.length === LEARNING_ROUNDS.length ? (
                <Badge variant="success">All rounds completed</Badge>
              ) : (
                <Badge variant="info">Every round stays open</Badge>
              )}
            </div>
            <progress
              aria-label="Learning rounds completed"
              value={completedIds.length}
              max={LEARNING_ROUNDS.length}
              className="mt-4 h-3 w-full accent-[var(--accent)]"
            />
          </div>

          <div className="rounded-2xl bg-ink p-4 text-paper sm:p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-paper/80">
              Learning earnings
            </p>
            <p className="mt-2 text-xl font-bold">Understanding earns its keep.</p>
            <p className="mt-2 text-sm leading-6 text-paper/80">
              Each completed worked example writes one honest value below. Different meanings
              and different examples are never added into a fake total.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-8">
        <nav aria-label="Choose a learning round">
          <ol className="grid gap-3 sm:grid-cols-3">
            {LEARNING_ROUNDS.map((round) => {
              const isActive = round.id === activeRound.id;
              const isComplete = completedIds.includes(round.id);
              return (
                <li key={round.id}>
                  <button
                    type="button"
                    aria-controls="active-learning-round"
                    aria-pressed={isActive}
                    onClick={() => openRound(round.id)}
                    className={`min-h-16 w-full rounded-xl border p-3 text-left text-base transition-colors ${
                      isActive
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-line bg-white text-ink hover:border-accent"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-accent-deep">
                      Round {round.number}
                    </span>
                    <span className="mt-1 block font-semibold">{round.shortTitle}</span>
                    <span className="mt-1 block text-sm text-ink-soft">
                      {isComplete ? "Completed — replay any time" : "Ready to play"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <article
          id="active-learning-round"
          aria-labelledby="active-learning-round-title"
          className="mt-6 rounded-2xl border border-line bg-paper p-5 sm:p-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                Round {activeRound.number} of {LEARNING_ROUNDS.length}
              </p>
              <h3
                ref={roundHeading}
                id="active-learning-round-title"
                tabIndex={-1}
                className="mt-2 text-2xl font-bold text-ink"
              >
                {activeRound.title}
              </h3>
            </div>
            <Badge variant={completed ? "success" : "outline"}>
              {completed ? "Completed" : "In play"}
            </Badge>
          </div>

          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-soft">
            {activeRound.setup}
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-ink sm:grid-cols-3">
            {activeRound.facts.map((fact) => (
              <li key={fact} className="rounded-xl border border-line bg-white p-3">
                {fact}
              </li>
            ))}
          </ul>

          <form key={activeRound.id} className="mt-6" onSubmit={checkAnswer} noValidate>
            <fieldset>
              <legend className="text-lg font-semibold text-ink">{activeRound.question}</legend>
              <div className="mt-3 space-y-3">
                {activeRound.answers.map((answer) => (
                  <label
                    key={answer.id}
                    className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3 text-base text-ink hover:border-accent"
                  >
                    <input
                      type="radio"
                      name={`answer-${activeRound.id}`}
                      value={answer.id}
                      checked={selectedAnswer === answer.id}
                      onChange={() => {
                        setAnswers((current) => ({ ...current, [activeRound.id]: answer.id }));
                        setFeedback((current) => {
                          const next = { ...current };
                          delete next[activeRound.id];
                          return next;
                        });
                      }}
                      className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
                    />
                    <span>{answer.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4">
              <Button type="submit">Check my move</Button>
            </div>
          </form>

          {activeFeedback ? (
            <div
              role={activeFeedback.kind === "missing" ? "alert" : "status"}
              aria-live={activeFeedback.kind === "missing" ? "assertive" : "polite"}
              aria-atomic="true"
              className={`mt-5 rounded-xl border p-4 text-base ${
                activeFeedback.kind === "correct"
                  ? "border-green-300 bg-green-50 text-green-900"
                  : activeFeedback.kind === "wrong"
                    ? "border-yellow-300 bg-yellow-50 text-yellow-900"
                    : "border-red-300 bg-red-50 text-red-900"
              }`}
            >
              <p className="font-semibold">
                {activeFeedback.kind === "correct"
                  ? "Correct move."
                  : activeFeedback.kind === "wrong"
                    ? "Useful miss — try another move."
                    : "One move is missing."}
              </p>
              <p className="mt-1">{activeFeedback.text}</p>
            </div>
          ) : null}

          {activeFeedback?.kind === "correct" ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <section
                aria-labelledby={`reward-${activeRound.id}`}
                className="rounded-2xl border border-accent bg-white p-5"
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-accent-deep">
                  {activeRound.reward.label}
                </p>
                <h4
                  id={`reward-${activeRound.id}`}
                  className="mt-2 text-2xl font-bold text-ink"
                >
                  {activeRound.reward.headline}
                </h4>
                <p className="mt-3 text-sm leading-6 text-ink-soft">
                  {activeRound.reward.boundary}
                </p>
              </section>

              <section className="rounded-2xl border border-line bg-white p-5">
                <h4 className="text-lg font-semibold text-ink">Why the move works</h4>
                <p className="mt-2 text-base text-ink-soft">{activeRound.explanation}</p>
                <details className="mt-3">
                  <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-accent">
                    Say it back, then check the one-breath answer
                  </summary>
                  <p className="mt-2 rounded-xl bg-accent-soft p-3 text-sm text-ink">
                    {activeRound.explainBack}
                  </p>
                </details>
              </section>
            </div>
          ) : null}

          <details className="mt-5 rounded-2xl border border-line bg-white p-5">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink">
              Sources and assumptions
            </summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-soft">
              {activeRound.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
            <a
              href={activeRound.source.href}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
            >
              {activeRound.source.label}
              <span aria-hidden="true">&nbsp;↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </details>

          {activeFeedback?.kind === "correct" ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={activeRound.next.href}
                className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 py-2 font-semibold text-white hover:bg-accent-deep"
              >
                {activeRound.next.label} →
              </Link>
              <Button type="button" variant="outline" onClick={continuePlaying}>
                {activeIndex === LEARNING_ROUNDS.length - 1
                  ? "Replay from round 1"
                  : "Continue to next round"}
              </Button>
            </div>
          ) : null}
        </article>

        <section aria-labelledby="learning-ledger-title" className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                The learning ledger
              </p>
              <h3 id="learning-ledger-title" className="mt-1 text-2xl font-bold text-ink">
                What each completed example revealed
              </h3>
            </div>
            <p className="text-sm text-ink-soft">No grand total: meanings stay separate.</p>
          </div>

          {completedIds.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-line p-5 text-ink-soft">
              Complete one round and its first honest line will appear here.
            </p>
          ) : (
            <ol className="mt-4 grid gap-4 md:grid-cols-2">
              {LEARNING_ROUNDS.filter((round) => completedIds.includes(round.id)).map((round) => (
                <li key={round.id} className="rounded-2xl border border-line bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="font-semibold text-ink">{round.shortTitle}</h4>
                    <Badge variant="success">Completed</Badge>
                  </div>
                  <p className="mt-2 text-lg font-bold text-ink">{round.reward.headline}</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    {round.reward.values.map((value) => (
                      <div
                        key={value.kind}
                        className="flex justify-between gap-4 border-t border-line pt-2"
                      >
                        <dt className="text-ink-soft">{value.label}</dt>
                        <dd className="font-semibold text-ink">{gbp(value.amount)}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ol>
          )}

          <p className="mt-4 text-sm leading-6 text-ink-soft">
            Saved progress, when this browser allows it, contains only completed round IDs under{" "}
            <code className="rounded bg-paper px-1 py-0.5">{LEARNING_PROGRESS_KEY}</code>. It is
            not synced or backed up by a TaxSorted Account; clearing site data removes it.
          </p>

          {storageNotice ? (
            <p role="status" aria-live="polite" className="mt-3 text-sm font-medium text-ink">
              {storageNotice}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!resetArmed ? (
              <Button
                ref={resetButton}
                type="button"
                variant="ghost"
                onClick={() => {
                  setStorageNotice(null);
                  setResetArmed(true);
                }}
              >
                Reset my practice
              </Button>
            ) : (
              <>
                <Button
                  ref={confirmResetButton}
                  type="button"
                  variant="destructive"
                  onClick={resetProgress}
                >
                  Yes, reset these rounds
                </Button>
                <Button type="button" variant="outline" onClick={cancelReset}>
                  Keep my progress
                </Button>
              </>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
