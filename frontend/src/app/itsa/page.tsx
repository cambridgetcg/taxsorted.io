import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EducationNotice } from "@/components/prep/education-notice";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Income Tax (MTD) — TaxSorted",
  description:
    "Making Tax Digital for Income Tax: check if you're in, keep records, see your quarterly figures, and work out mileage — free, cited, open-source.",
};

const CARDS = [
  {
    href: "/learn/mtd-income-tax",
    tag: "Start here",
    title: "Don't panic — the plain-words guide",
    desc: "What's actually true about MTD: who's in, what you send, the real deadlines and the real penalty position.",
  },
  {
    href: "/itsa/am-i-in",
    tag: "Step 1",
    title: "Am I in?",
    desc: "Check whether the rules apply to you, and from when, using your gross income.",
  },
  {
    href: "/itsa/records",
    tag: "Step 2",
    title: "Your records",
    desc: "Keep your income and costs in this browser, sorted into HMRC's own categories. Nothing leaves your device.",
  },
  {
    href: "/itsa/quarter",
    tag: "Step 3",
    title: "Quarterly figures & estimate",
    desc: "Your running totals for each quarter, ready to copy into any MTD software, plus a cited estimate of your bill.",
  },
  {
    href: "/dashboard",
    tag: "Step 4",
    title: "Your ITSA cockpit",
    desc: "See your records, estimate and quarter timing together. HMRC sandbox setup starts only when you choose it.",
  },
  {
    href: "/tools/mileage",
    tag: "Tool",
    title: "Mileage",
    desc: "Work out your flat-rate mileage deduction for a car, van or motorcycle, cited to gov.uk's current rates.",
  },
  {
    href: "/learn/gov/your-levers",
    tag: "Bigger picture",
    title: "Angry about MTD? Here's who decided — and how to say so",
    desc: "MTD went through committees and consultations. See who moved it, and the real channels for having your say.",
  },
] as const;

export default function ItsaHubPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ href: "/tools", label: "Do my tax" }]} current="Income Tax" />

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Income Tax (MTD)</h1>
      <p className="mt-3 text-base text-ink-soft">
        Making Tax Digital (MTD) is the government&apos;s new way to report Income Tax Self
        Assessment (ITSA). Work through it in order: understand it, check if it applies to you,
        keep your records, then see your figures.
      </p>

      <div className="mt-6">
        <EducationNotice />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block rounded-2xl border border-line bg-white p-5 transition hover:border-accent sm:p-6"
          >
            <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-deep">
              {card.tag}
            </span>
            <h2 className="mt-3 text-lg font-semibold text-ink">{card.title}</h2>
            <p className="mt-1.5 text-base text-ink-soft">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
