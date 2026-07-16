import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Learn — TaxSorted",
  description:
    "Plain-words UK tax guides. Every figure links to the official rule it comes from. Free, open, no account.",
};

const GUIDES = [
  {
    slug: "mtd-income-tax",
    tag: "Start here",
    title: "Making Tax Digital: don’t panic",
    desc: "Heard you must send HMRC updates four times a year? Who’s actually in, what you send, the real deadlines and penalties.",
  },
  {
    slug: "income-tax",
    tag: "Income Tax",
    title: "Income Tax",
    desc: "How much of your income is tax-free, how the bands work, the high-income trap, and what self-employed people pay on top.",
  },
  {
    slug: "for-landlords",
    tag: "Property",
    title: "For landlords",
    desc: "Rent out a property, or a room? What’s tax-free, what’s not, and what to track.",
  },
  {
    slug: "self-employed",
    tag: "Self-employment",
    title: "Self-employed",
    desc: "Work for yourself? What’s tax-free, what National Insurance you owe, and the flat rates that save you keeping every receipt.",
  },
] as const;

const GOV_GUIDES = [
  {
    slug: "gov/how-tax-law-is-made",
    tag: "Mechanism",
    title: "How a tax law is born",
    desc: "Where do tax rules actually come from? The real pipeline from Budget speech to law — including why you can owe money before the law is passed.",
  },
  {
    slug: "gov/who-runs-your-taxes",
    tag: "Who’s who",
    title: "Who runs your taxes",
    desc: "HMRC got your case wrong? Who’s actually in charge, and the step-by-step complaints ladder that exists for exactly this.",
  },
  {
    slug: "gov/your-levers",
    tag: "Take action",
    title: "Your levers on tax policy",
    desc: "Want a tax rule changed? Every official way to push — your MP, committees, petitions and more — with honest odds for each.",
  },
  {
    slug: "gov/receipts",
    tag: "Receipts",
    title: "Receipts: when pressure worked",
    desc: "When pressure on tax policy actually worked — four real cases, with sources.",
  },
] as const;

const HISTORY_GUIDES = [
  {
    slug: "history/window-tax",
    tag: "Tax history",
    title: "Window Tax: what the evidence actually shows",
    desc: "Why it began, how sharp bands created incentives, what later records document, and why repeal was also a redesign.",
  },
] as const;

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs current="Learn" />
      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Learn</h1>
      <p className="mt-3 text-base text-ink-soft">
        Plain-words UK tax guides and sourced tax history. Current-law guides explain what a
        rule means, what you must do, and what you can safely skip. Rules, figures and historical
        materials link to their sources. Free, open, no account.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-ink">Your taxes, explained</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/learn/${g.slug}`}
            className="block rounded-2xl border border-line bg-white p-5 transition hover:border-accent sm:p-6"
          >
            <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-deep">
              {g.tag}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-ink">{g.title}</h3>
            <p className="mt-1.5 text-base text-ink-soft">{g.desc}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-bold text-ink">Taxes leave marks</h2>
      <p className="mt-3 text-base text-ink-soft">
        Historical tax stories told from laws, records, buildings and contemporary images.
        The evidence limit and reuse terms stay beside every material.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {HISTORY_GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/learn/${g.slug}`}
            className="block rounded-2xl border border-line bg-white p-5 transition hover:border-accent sm:p-6"
          >
            <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-deep">
              {g.tag}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-ink">{g.title}</h3>
            <p className="mt-1.5 text-base text-ink-soft">{g.desc}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-bold text-ink">The tax state, explained</h2>
      <p className="mt-3 text-base text-ink-soft">
        Not just the rules — who makes them, who runs them day to day, and the real, official
        channels for having your own say. Same discipline: plain words, every fact cited.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {GOV_GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/learn/${g.slug}`}
            className="block rounded-2xl border border-line bg-white p-5 transition hover:border-accent sm:p-6"
          >
            <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-deep">
              {g.tag}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-ink">{g.title}</h3>
            <p className="mt-1.5 text-base text-ink-soft">{g.desc}</p>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-base text-ink-soft">
        More guides are coming — VAT, Corporation Tax, PAYE (tax taken from pay) and Capital
        Gains Tax, then the taxes Scotland and Wales set themselves (devolved taxes in full),
        Northern Ireland, and Welsh-language versions. The list is honestly short today because
        every figure has to be cited before a guide ships.
      </p>
    </div>
  );
}
