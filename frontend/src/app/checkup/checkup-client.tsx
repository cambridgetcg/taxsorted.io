"use client";

import { useState } from "react";
import Link from "next/link";

type PathId =
  | "mtd"
  | "thresholds"
  | "records"
  | "passport"
  | "vat"
  | "understand";

interface CheckupPath {
  id: PathId;
  label: string;
  hint: string;
  title: string;
  status: string;
  boundary: string;
  steps: readonly {
    href: string;
    title: string;
    detail: string;
  }[];
}

const PATHS: readonly CheckupPath[] = [
  {
    id: "mtd",
    label: "I work for myself or rent out property",
    hint: "Check whether Making Tax Digital for Income Tax may apply.",
    title: "Start with your MTD position",
    status: "Checks available now",
    boundary:
      "The quick check covers the main income threshold. The deeper check asks about returns, residence, exemptions and special cases, and keeps unknown facts visible.",
    steps: [
      {
        href: "/itsa/am-i-in",
        title: "Run the 60-second MTD check",
        detail: "A short first pass using the main qualifying-income rules.",
      },
      {
        href: "/uk/tax-expert#first-deep-path",
        title: "Use the deeper MTD expert",
        detail: "For return history, residence, exemptions or facts you are unsure about.",
      },
      {
        href: "/itsa",
        title: "See the full MTD journey",
        detail: "Understand the dates, keep records and prepare each quarter.",
      },
    ],
  },
  {
    id: "thresholds",
    label: "My income may be near £60,000 or £100,000",
    hint: "Map Child Benefit, Personal Allowance and Tax-Free Childcare interactions.",
    title: "Map the income thresholds that interact",
    status: "Browser-only check available now",
    boundary:
      "This check models a bounded 2026/27 path. It shows missing partner or claimant facts instead of treating them as zero, and points to HMRC for cases outside its boundary.",
    steps: [
      {
        href: "/uk/personal-tax#threshold-check",
        title: "Check my £60k and £100k lines",
        detail: "Calculate adjusted net income once and see three separate consequences.",
      },
      {
        href: "/uk/tax-expert#ani-deep-path",
        title: "Understand what this path covers",
        detail: "See the evidence model, exclusions and current capability status.",
      },
    ],
  },
  {
    id: "records",
    label: "I need to organise records or a quarter",
    hint: "Keep evidence once, derive the totals and see what is still missing.",
    title: "Build the record trail before the return",
    status: "Local preparation tools available now",
    boundary:
      "The income and expense records stay in this browser. Account details and any HMRC sandbox connection are separate. Prepared does not mean filed, and the site says which state you are in.",
    steps: [
      {
        href: "/itsa/records",
        title: "Add or import income and expenses",
        detail: "Keep the underlying records and let TaxSorted derive the figures.",
      },
      {
        href: "/tools/mileage",
        title: "Calculate a mileage deduction",
        detail: "Enter the year’s business miles; keep the trip evidence separately.",
      },
      {
        href: "/itsa/quarter",
        title: "Review the quarter figures",
        detail: "See the cited calculation before anything could be submitted.",
      },
      {
        href: "/dashboard",
        title: "Open the ITSA cockpit",
        detail: "See the whole position together; starting the optional HMRC sandbox is explicit.",
      },
    ],
  },
  {
    id: "passport",
    label: "I need one tax picture I can keep or hand over",
    hint:
      "Map facts, unknowns and evidence, then carry a checked position into JSON or a printable report.",
    title: "Build your Tax Position Passport",
    status: "Browser-local handoff available now",
    boundary:
      "The Passport asks for no name, address, NINO value or UTR. Evidence is named by you, not inspected. The first live position is MTD Income Tax; PAYE and full liability calculations remain outside this version.",
    steps: [
      {
        href: "/passport",
        title: "Start or resume my Passport",
        detail:
          "Nothing is saved until you choose Save this Passport. Unknown facts stay unknown.",
      },
      {
        href: "/uk/tax-expert#coverage-map",
        title: "Check the wider capability boundary",
        detail:
          "See which UK tax positions are available, limited or still planned.",
      },
    ],
  },
  {
    id: "vat",
    label: "I run a VAT-registered business",
    hint: "Build a VAT return from records and inspect every derived figure.",
    title: "Use the VAT workbench",
    status: "Preparation and HMRC sandbox journey",
    boundary:
      "TaxSorted is not yet recognised for production filing. The VAT journey keeps preparation, approval and sandbox submission separate from any future production filing or receipt.",
    steps: [
      {
        href: "/vat",
        title: "Open the VAT workbench",
        detail: "Create or open a business, review records and build a return.",
      },
    ],
  },
  {
    id: "understand",
    label: "I am not sure — I want to understand first",
    hint: "Start with plain guides, then see who writes and administers the rules.",
    title: "Begin with the map, not a form",
    status: "Public and free, with no account",
    boundary:
      "The guides explain the covered rules and link their sources. They are educational; a guide does not silently become a personal calculation or professional advice.",
    steps: [
      {
        href: "/learn",
        title: "Learn tax in plain words",
        detail: "Choose Income Tax, self-employment, landlords, MTD or the government guides.",
      },
      {
        href: "/uk/tax-expert#coverage-map",
        title: "See what the tax expert can actually do",
        detail: "Available, bounded and planned capabilities are labelled separately.",
      },
      {
        href: "/uk",
        title: "Follow the wider UK tax system",
        detail: "Explore public money, power, accountability, charities and the tax industry.",
      },
    ],
  },
] as const;

export function CheckupClient() {
  const [selected, setSelected] = useState<PathId | null>(null);
  const path = PATHS.find((candidate) => candidate.id === selected) ?? null;

  return (
    <section className="mt-10" aria-labelledby="checkup-question">
      <fieldset>
        <legend id="checkup-question" className="text-2xl font-semibold tracking-tight text-ink">
          What do you need to do today?
        </legend>
        <p className="mt-2 max-w-3xl text-ink-soft">
          Choose the closest starting point. This routing step asks for no name, address, National
          Insurance number or tax reference, and it does not calculate your tax.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {PATHS.map((candidate) => (
            <label
              key={candidate.id}
              className={`block min-h-11 cursor-pointer rounded-2xl border p-5 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                selected === candidate.id
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-white hover:border-accent/60"
              }`}
            >
              <input
                type="radio"
                name="checkup-path"
                value={candidate.id}
                checked={selected === candidate.id}
                onChange={() => setSelected(candidate.id)}
                className="mr-3 h-4 w-4 accent-[var(--color-accent)]"
              />
              <span className="font-semibold text-ink">{candidate.label}</span>
              <span className="mt-2 block pl-7 text-sm text-ink-soft">{candidate.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-8" aria-live="polite">
        {path ? (
          <article className="rounded-3xl border border-accent/30 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                  Your next path
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {path.title}
                </h2>
              </div>
              <span className="rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-ink">
                {path.status}
              </span>
            </div>

            <ol className="mt-6 space-y-4">
              {path.steps.map((step, index) => (
                <li key={step.href} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <Link
                      href={step.href}
                      className="font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
                    >
                      {step.title}
                    </Link>
                    <p className="mt-1 text-sm text-ink-soft">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-6 rounded-2xl bg-paper p-4 text-sm text-ink-soft">
              <strong className="text-ink">Boundary:</strong> {path.boundary}
            </p>
          </article>
        ) : (
          <p className="rounded-2xl border border-dashed border-line bg-paper p-5 text-sm text-ink-soft">
            Choose one starting point and TaxSorted will put the relevant checks and actions in
            order. You can change the choice at any time.
          </p>
        )}
      </div>
    </section>
  );
}
