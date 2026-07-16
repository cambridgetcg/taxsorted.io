"use client";

// i18n: deferred to M2 — plain English for launch

import { staleEntries, type RoleEntry } from "@/lib/gov/contacts";
import { todayIsoLocal } from "@/lib/local-date";
import { useMounted } from "@/lib/use-mounted";

export interface RoleCardProps {
  role: RoleEntry;
  /**
   * Override "today" for tests only. Production callers never pass this —
   * the card always re-derives staleness from the reader's own clock via
   * `todayIsoLocal()`, gated on `useMounted()` so the pre-hydration render
   * matches the server (same reasoning as QuarterCard/EstimateCard's
   * mount-guards).
   */
  today?: string;
}

/**
 * One office or body from `ROLES`: what it does, who holds it (role-anchored
 * — never a bare name), and how to reach it. The "as of" date is data, so it
 * always renders; the amber "re-verify" badge depends on the reader's own
 * clock, so it only appears once mounted client-side.
 */
export function RoleCard({ role, today }: RoleCardProps) {
  const mounted = useMounted();
  const effectiveToday = today ?? todayIsoLocal();
  const isStale = mounted && staleEntries(effectiveToday).some((e) => e.id === role.id);
  // Every entry carries a sourceUrl (required by VerifiedFact); contactUrl is
  // the nicer "how to reach them" page when one exists, but falling back to
  // sourceUrl means every card still links somewhere to verify the holder —
  // about half of ROLES (HMRC governance, OBR) have no separate contactUrl.
  // Both are official gov.uk/parliament.uk pages (data discipline in
  // contacts.ts), so one label covers either: "Official page" (unified here
  // — was two different labels depending on which field was present).
  const linkUrl = role.contactUrl ?? role.sourceUrl;
  const linkLabel = "Official page";

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5" data-role-id={role.id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-ink">{role.role}</h3>
        {isStale ? (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
            re-verify
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-base text-ink-soft">{role.whatTheyDo}</p>
      {role.holder ? (
        <p className="mt-2 text-sm text-ink-soft">
          {role.holder.name} — as of {role.holder.asOf}
        </p>
      ) : null}
      {role.contactRoute ? <p className="mt-2 text-base text-ink">{role.contactRoute}</p> : null}
      <a
        href={linkUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-1 inline-flex min-h-11 items-center text-base font-medium text-accent underline hover:text-accent-deep"
      >
        {linkLabel}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}
