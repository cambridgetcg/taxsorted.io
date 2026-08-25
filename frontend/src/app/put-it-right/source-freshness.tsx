"use client";

import { useSyncExternalStore } from "react";
import { formatUkDate } from "@/lib/format";

const REVIEWED_ON = "2026-08-25";
const REVIEW_DUE_ON = "2026-11-25";

function millisecondsUntilNextUtcDate() {
  const now = new Date();
  const nextUtcDate = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    1,
  );
  return Math.max(1_000, nextUtcDate - now.getTime());
}

function subscribeToDate(onDateMayHaveChanged: () => void) {
  let midnightTimer: number;
  const scheduleMidnight = () => {
    midnightTimer = window.setTimeout(() => {
      onDateMayHaveChanged();
      scheduleMidnight();
    }, millisecondsUntilNextUtcDate());
  };
  const checkVisibleDate = () => onDateMayHaveChanged();

  scheduleMidnight();
  window.addEventListener("focus", checkVisibleDate);
  document.addEventListener("visibilitychange", checkVisibleDate);

  return () => {
    window.clearTimeout(midnightTimer);
    window.removeEventListener("focus", checkVisibleDate);
    document.removeEventListener("visibilitychange", checkVisibleDate);
  };
}

function readClientDate(): string | null {
  return new Date().toISOString().slice(0, 10);
}

function readServerDate(): string | null {
  return null;
}

export function RecourseSourceFreshness() {
  const today = useSyncExternalStore(subscribeToDate, readClientDate, readServerDate);

  const overdue = today !== null && today > REVIEW_DUE_ON;

  return (
    <aside
      role={overdue ? "alert" : "status"}
      className={`mt-8 rounded-2xl border p-4 text-sm leading-6 ${
        overdue ? "border-warm/50 bg-warm/5 text-ink" : "border-line bg-paper text-ink-soft"
      }`}
    >
      {overdue ? (
        <>
          <strong className="text-ink">Source review overdue since {formatUkDate(REVIEW_DUE_ON)}.</strong>{" "}
          TaxSorted&apos;s route summaries may be stale. Use the date and route on the notice and
          follow the current GOV.UK instructions linked below before acting.
        </>
      ) : (
        <>
          Official routes last checked {formatUkDate(REVIEWED_ON)} · review due {formatUkDate(REVIEW_DUE_ON)}.
          The notice and current GOV.UK instructions remain authoritative for a real case.
        </>
      )}
    </aside>
  );
}
