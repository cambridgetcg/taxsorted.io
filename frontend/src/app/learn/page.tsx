import type { Metadata } from "next";
import Link from "next/link";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Learn — TaxSorted",
  description:
    "Plain-words UK tax guides, every figure cited to its source. Free, open, no account.",
};

const GUIDES = [
  {
    slug: "mtd-income-tax",
    tag: "Start here",
    title: "MTD Income Tax: don't panic",
    desc: "What's actually true about Making Tax Digital for Income Tax — who's in, what you send, the real deadlines and penalties.",
  },
  {
    slug: "income-tax",
    tag: "Direct Tax",
    title: "Income Tax",
    desc: "Personal Allowance, bands and rates, the taper trap, and National Insurance for the self-employed.",
  },
  {
    slug: "for-landlords",
    tag: "Property",
    title: "For landlords",
    desc: "Property Allowance, Rent-a-Room, the Section 24 finance-cost credit, and what changed with Furnished Holiday Lettings.",
  },
  {
    slug: "self-employed",
    tag: "Self-employment",
    title: "Self-employed",
    desc: "Trading Allowance, Class 4 and Class 2 National Insurance, cash basis, simplified expenses, and the MTD timeline.",
  },
] as const;

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">Learn</h1>
      <p className="mt-3 text-ink-soft">
        Plain-words UK tax guides. Each one tells you what it means, what you must do, what you
        can safely skip, and how to optimise — every figure cited to its source, nothing
        hardcoded. Free, open, no account.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/learn/${g.slug}`}
            className="block rounded-2xl border border-line bg-white p-5 transition hover:border-accent sm:p-6"
          >
            <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-deep">
              {g.tag}
            </span>
            <h2 className="mt-3 text-lg font-semibold text-ink">{g.title}</h2>
            <p className="mt-1.5 text-sm text-ink-soft">{g.desc}</p>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-sm text-ink-soft">
        More guides are coming — VAT, Corporation Tax, PAYE/RTI and Capital Gains Tax are next.
        This list is honestly short today because every figure on it has to be cited before it
        ships.
      </p>
    </div>
  );
}
