"use client";

// i18n: deferred to M2 — plain English for launch
//
// The your-voice civic panel: everything here is either read straight from
// `lib/gov/contacts.ts` (ROLES) or points at one of the four LIVE gov guide
// routes — zero invented links, zero retyped contact facts. This tile is
// deliberately compact (role name, one-line "what they do", link) rather
// than the full RoleCard used on the gov pages themselves — a dashboard
// tile has less room, and repeating two full cards here would crowd the
// HMRC connect panel it sits beside.
//
// No HMRC phone number, email or postal address is shown on this panel —
// per the plan, the honest move when you're not displaying HMRC contact
// details is to link the who-runs-your-taxes page instead of embedding
// them a second time, so no anti-phishing note is needed here (who-runs
// carries its own, right above its contact table).

import Link from "next/link";
import { ROLES, staleEntries, type RoleEntry } from "@/lib/gov/contacts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { todayIsoLocal } from "@/lib/local-date";
import { useMounted } from "@/lib/use-mounted";

export interface VoicePanelProps {
  /** Overrides "today" for deterministic tests — see StandStrip's note. */
  today?: string;
}

interface GuideLink {
  href: string;
  label: string;
  teaser: string;
}

// The four gov guides — all live routes as of this build (gov-pillar Tasks
// 2-6). Teasers paraphrase each page's own metadata description; the pages
// themselves carry the citations.
const GUIDES: GuideLink[] = [
  {
    href: "/learn/gov/how-tax-law-is-made",
    label: "How tax law is made",
    teaser: "The real pipeline from Budget speech to Finance Act, cited to source.",
  },
  {
    href: "/learn/gov/who-runs-your-taxes",
    label: "Who runs your taxes",
    teaser: "Who's actually in charge of HMRC and the tax rules — plus the real complaints ladder.",
  },
  {
    href: "/learn/gov/your-levers",
    label: "Your levers on tax policy",
    teaser: "The real, official channels for changing a tax rule — with honest odds attached.",
  },
  {
    href: "/learn/gov/receipts",
    label: "Receipts: when pressure worked",
    teaser: "Four verified times citizen and institutional pressure actually changed a tax rule.",
  },
];

/** One ROLES entry, compact: name, one-line remit, "as of" + re-verify badge,
    a single link out. No contactRoute text (phone/email/post) is rendered —
    that's what keeps this tile free of embedded HMRC/Parliament contact
    details (see the anti-phishing note above). */
function CompactRoleRow({ role, today }: { role: RoleEntry; today?: string }) {
  const mounted = useMounted();
  const effectiveToday = today ?? todayIsoLocal();
  const isStale = mounted && staleEntries(effectiveToday).some((e) => e.id === role.id);
  const linkUrl = role.contactUrl ?? role.sourceUrl;

  return (
    <li className="rounded-xl border border-line p-3" data-role-id={role.id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{role.role}</p>
        {isStale ? (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
            re-verify
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-ink-soft">{role.whatTheyDo}</p>
      {role.holder ? (
        <p className="mt-1 text-xs text-ink-soft">
          {role.holder.name} — as of {role.holder.asOf}
        </p>
      ) : null}
      <a
        href={linkUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-1 inline-block text-xs font-medium text-accent underline hover:text-accent-deep"
      >
        Official page
      </a>
    </li>
  );
}

/**
 * The your-voice civic panel: find your MP, see who holds the Treasury
 * Committee and where a Budget representation goes, then read how tax law
 * actually gets made — every fact and link sourced from the same corpus the
 * /learn/gov pages cite.
 */
export function VoicePanel({ today }: VoicePanelProps) {
  const yourMp = ROLES.find((r) => r.id === "your-mp")!;
  const treasuryCommitteeChair = ROLES.find((r) => r.id === "treasury-committee-chair")!;
  // Budget representations go to HM Treasury (the Chancellor's department) —
  // the same role card /learn/gov/your-levers uses for its own Budget
  // representations section, reused here rather than inventing a new link.
  const chancellor = ROLES.find((r) => r.id === "chancellor-of-the-exchequer")!;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Your voice</CardTitle>
        <CardDescription>
          Who to contact, and how tax law actually gets made — every link below reads from our
          verified civic corpus.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <a
            href={yourMp.contactUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm font-medium text-accent underline hover:text-accent-deep"
          >
            Find your MP →
          </a>
          <p className="mt-1 text-xs text-ink-soft">
            Runs on members.parliament.uk — your postcode never touches our site.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Have your say on tax policy
          </p>
          <ul className="mt-2 space-y-2">
            <CompactRoleRow role={treasuryCommitteeChair} today={today} />
            <CompactRoleRow role={chancellor} today={today} />
          </ul>
          <Link
            href="/learn/gov/your-levers"
            className="mt-2 inline-block text-xs font-medium text-accent underline hover:text-accent-deep"
          >
            See every channel, with the honest odds →
          </Link>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Understand the system
          </p>
          <ul className="mt-2 space-y-2">
            {GUIDES.map((g) => (
              <li key={g.href}>
                <Link
                  href={g.href}
                  className="text-sm font-medium text-accent underline hover:text-accent-deep"
                >
                  {g.label}
                </Link>
                <p className="text-xs text-ink-soft">{g.teaser}</p>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
