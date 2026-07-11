"use client";

import Link from "next/link";
import { configFor } from "@taxsorted/engine/uk/itsa";
import { TaxPlayground } from "@/components/TaxPlayground";
import { useI18n } from "@/i18n/I18nProvider";
import { gbpCompact, formatUkDate } from "@/lib/format";

// The lowest-income phase of the MTD IT rollout — cited here so the homepage
// headline can never drift from the engine's own SI 2026/336 threshold table.
const [MTD_FIRST_PHASE] = configFor("2026-27").mtdThresholds.value;

export function HomeClient() {
  const { t } = useI18n();

  const places = [
    { name: t("home.place.uk"), status: "open" as const, href: "/dashboard" },
    { name: "UK tax expert", status: "open" as const, href: "/uk/tax-expert" },
    { name: t("home.place.personal"), status: "open" as const, href: "/uk/personal-tax" },
    { name: t("home.place.ireland"), status: "drawing" as const },
    { name: t("home.place.germany"), status: "drawing" as const },
    { name: t("home.place.us"), status: "drawing" as const },
  ];

  const pillars = [
    {
      name: t("home.pillar.learn.name"),
      status: t("home.pillar.learn.status"),
      heading: t("home.pillar.learn.heading"),
      body: t("home.pillar.learn.body"),
    },
    {
      name: t("home.pillar.file.name"),
      status: t("home.pillar.file.status"),
      heading: t("home.pillar.file.heading"),
      body: t("home.pillar.file.body"),
    },
    {
      name: t("home.pillar.connect.name"),
      status: t("home.pillar.connect.status"),
      heading: t("home.pillar.connect.heading"),
      body: t("home.pillar.connect.body"),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        {t("home.title.line1")}
        <br />
        {t("home.title.line2")}
      </h1>
      <p className="mt-5 text-lg text-ink-soft">{t("home.intro")}</p>

      {/* i18n: deferred to M2 — plain English for launch */}
      <section
        aria-label="MTD Income Tax"
        className="mt-10 rounded-lg border border-accent/30 bg-accent-soft p-6 sm:p-8"
      >
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          MTD Income Tax is here — are you in?
        </h2>
        <p className="mt-2 text-ink-soft">
          Mandatory since {formatUkDate(MTD_FIRST_PHASE.mandatedFrom)} for sole traders and
          landlords with income over {gbpCompact(MTD_FIRST_PHASE.qualifyingIncomeOver)}.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/itsa/am-i-in"
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-8 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
          >
            Am I in? 60-second check
          </Link>
          <Link
            href="/learn/mtd-income-tax"
            className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-6 text-sm font-medium text-ink transition-colors hover:bg-accent-soft"
          >
            Don&apos;t panic — what&apos;s actually true
          </Link>
          <Link
            href="/itsa"
            className="inline-flex h-11 items-center px-2 text-sm font-medium text-accent hover:text-accent-deep"
          >
            Explore the toolkit →
          </Link>
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          Free &amp; open-source (AGPL) · working towards HMRC recognition · no account — your
          records stay in your browser
        </p>
      </section>

      <section
        aria-label="Find your path"
        className="mt-12 rounded-lg border border-line bg-white p-6 sm:p-8"
      >
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-soft">
          {t("home.where")}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {places.map((place) =>
            place.status === "open" ? (
              <li key={place.name}>
                <Link
                  href={place.href!}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
                >
                  {place.name}
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ) : (
              <li key={place.name}>
                <span className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-sm text-ink-soft">
                  {place.name}
                  <span className="text-xs">· {t("home.status.drawing")}</span>
                </span>
              </li>
            ),
          )}
        </ul>

        <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-ink-soft">
          {t("home.who")}
        </h2>
        <p className="mt-3 text-ink">{t("home.who.body")}</p>
      </section>

      <section aria-label="What TaxSorted is" className="mt-16 space-y-10">
        {pillars.map((pillar) => (
          <div key={pillar.name}>
            <h2 className="text-xl font-semibold text-ink">
              <span className="text-accent">{pillar.name}</span> — {pillar.heading}
              <span className="ml-3 align-middle rounded-full border border-line px-2.5 py-0.5 text-xs font-normal text-ink-soft">
                {pillar.status}
              </span>
            </h2>
            <p className="mt-2 text-ink-soft">{pillar.body}</p>
          </div>
        ))}
      </section>

      <div className="mt-14 flex flex-wrap gap-3">
        <Link
          href="/uk/tax-expert"
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-8 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
        >
          Understand my UK tax position
        </Link>
        <Link
          href="/uk/personal-tax"
          className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-8 text-sm font-medium text-ink transition-colors hover:bg-accent-soft"
        >
          {t("home.cta.playbook")}
        </Link>
        <Link
          href="/uk/politics"
          className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-8 text-sm font-medium text-ink transition-colors hover:bg-accent-soft"
        >
          {t("home.cta.politics")}
        </Link>
      </div>

      <TaxPlayground />

      <p className="mt-6 text-sm text-ink-soft">{t("home.honest")}</p>
      <p className="mt-10 text-ink">{t("home.lastline")}</p>
    </div>
  );
}
