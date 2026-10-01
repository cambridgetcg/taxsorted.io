import type { Metadata } from "next";
import Link from "next/link";

// i18n: deferred to M2 — plain English for launch (same as the other hub pages)

export const metadata: Metadata = {
  title: "Tax tools — TaxSorted",
  description:
    "Find your next tax task: review your tax year, prepare evidence, organise money records or build a handover.",
};

const TOOLS = [
  {
    href: "/checkup",
    title: "My tax year",
    line: "Choose your situation, see saved progress and find your next step.",
  },
  {
    href: "/prepare",
    title: "Prepare my tax return",
    line: "Choose a year, gather evidence and work through outstanding tasks and questions. Export a year-specific preparation summary.",
  },
  {
    href: "/books",
    title: "Money records",
    line: "Organise and review income and expenses for a sole trade or UK property business.",
  },
  {
    href: "/passport",
    title: "Tax summary and handover",
    line: "Keep a general Tax Position Passport of income sources, evidence and unknowns to discuss with an adviser.",
  },
  {
    href: "/itsa",
    title: "MTD Income Tax",
    line: "Check Making Tax Digital requirements and prepare quarterly figures from reviewed records.",
  },
  {
    href: "/vat",
    title: "VAT test return",
    line: "Review manually entered VAT figures and try an HMRC test submission. Money records do not yet derive a VAT return.",
  },
  {
    href: "/tools/mileage",
    title: "Mileage log",
    line: "Record business miles.",
  },
  {
    href: "/uk/tax-expert#first-deep-path",
    title: "Detailed MTD check",
    line: "Work through the supported MTD Income Tax rules, including unknown facts and exemptions.",
  },
  {
    href: "/dashboard",
    title: "Saved businesses",
    line: "Open the businesses saved in this browser and review their next steps.",
  },
] as const;

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">Tax tools</h1>
      <p className="mt-3 text-base text-ink-soft">
        Start with <Link href="/services" className="font-medium text-accent underline underline-offset-4">Services</Link>{" "}
        for your situation, or choose a task below. You can also <Link href="/plan" className="font-medium text-accent underline underline-offset-4">compare a choice</Link>{" "}
        or find <Link href="/file" className="font-medium text-accent underline underline-offset-4">filing and payment routes</Link>.
      </p>
      <p className="mt-3 text-sm leading-6 text-ink-soft">
        Saved money records and preparation drafts stay in this browser. Signing in does not back them up
        or encrypt them; use <Link href="/backups" className="font-medium text-accent underline underline-offset-4">Workspace backups</Link>{" "}
        to keep a protected copy. Preparation does not file a return, and HMRC submissions use the test system.
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
