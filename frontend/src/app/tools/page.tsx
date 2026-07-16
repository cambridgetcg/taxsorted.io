import type { Metadata } from "next";
import Link from "next/link";

// i18n: deferred to M2 — plain English for launch (same as the other hub pages)

export const metadata: Metadata = {
  title: "Do my tax — TaxSorted",
  description:
    "Check if you're in, keep records, and build your returns — Income Tax, VAT and mileage.",
};

const TOOLS = [
  {
    href: "/checkup",
    title: "Tax Checkup",
    line: "Start here — find the right check for you.",
  },
  {
    href: "/passport",
    title: "Tax Position Passport",
    line: "Keep facts, unknowns, evidence states and checked positions together.",
  },
  {
    href: "/itsa",
    title: "Income Tax",
    line: "Check if you're in, keep records, see deadlines.",
  },
  {
    href: "/vat",
    title: "VAT",
    line: "Build your return from your records.",
  },
  {
    href: "/tools/mileage",
    title: "Mileage log",
    line: "Record business miles.",
  },
  {
    href: "/uk/tax-expert",
    title: "Check my tax position",
    line: "See which rules apply to you.",
  },
  {
    href: "/dashboard",
    title: "Dashboard",
    line: "Your saved businesses.",
  },
] as const;

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">Do my tax</h1>
      <p className="mt-3 text-base text-ink-soft">
        Pick the job. No account — your records stay in your browser.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="block min-h-11 rounded-2xl border border-line bg-paper p-5 transition hover:border-accent"
          >
            <h2 className="text-lg font-semibold text-ink">{tool.title}</h2>
            <p className="mt-1.5 text-base text-ink-soft">{tool.line}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
