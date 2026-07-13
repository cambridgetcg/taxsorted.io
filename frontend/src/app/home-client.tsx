"use client";

import Link from "next/link";
import { configFor } from "@taxsorted/engine/uk/itsa";
import { useI18n } from "@/i18n/I18nProvider";
import { gbpCompact, formatUkDate } from "@/lib/format";

// The lowest-income phase of the MTD IT rollout — cited here so the homepage
// headline can never drift from the engine's own SI 2026/336 threshold table.
const [MTD_FIRST_PHASE] = configFor("2026-27").mtdThresholds.value;

export function HomeClient() {
  const { t } = useI18n();

  // The date and threshold come from the engine, never from copy.
  const mtdBody = t("home.mtd.body")
    .replace("{date}", formatUkDate(MTD_FIRST_PHASE.mandatedFrom))
    .replace("{amount}", gbpCompact(MTD_FIRST_PHASE.qualifyingIncomeOver));

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

  // The same four doors as the top nav — the homepage repeats the map, it
  // does not invent a second one.
  const doors = [
    { href: "/learn", label: t("nav.learn"), line: t("home.door.learn") },
    { href: "/tools", label: t("nav.tools"), line: t("home.door.tools") },
    { href: "/uk/money", label: t("nav.money"), line: t("home.door.money") },
    { href: "/about", label: t("nav.about"), line: t("home.door.about") },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        {t("home.title.line1")}
        <br />
        {t("home.title.line2")}
      </h1>
      <p className="mt-5 text-lg text-ink-soft">{t("home.intro")}</p>

      <section
        aria-labelledby="mtd-heading"
        className="mt-10 rounded-lg border border-accent/30 bg-accent-soft p-6 sm:p-8"
      >
        <h2
          id="mtd-heading"
          className="text-2xl font-bold tracking-tight text-ink sm:text-3xl"
        >
          {t("home.mtd.title")}
        </h2>
        <p className="mt-2 text-base text-ink-soft">{mtdBody}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/itsa/am-i-in"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-8 text-base font-medium text-white transition-colors hover:bg-accent-deep"
          >
            {t("home.mtd.check")}
          </Link>
          <Link
            href="/learn/mtd-income-tax"
            className="inline-flex min-h-11 items-center gap-1.5 px-2 text-base font-medium text-accent underline hover:text-accent-deep"
          >
            {t("home.mtd.truth")} <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className="mt-4 text-sm text-ink-soft">{t("home.mtd.smallprint")}</p>
      </section>

      <section className="mt-16 space-y-10">
        {pillars.map((pillar) => (
          <div key={pillar.name}>
            <h2 className="text-xl font-semibold text-ink">
              <span className="text-accent">{pillar.name}</span> — {pillar.heading}
              <span className="ml-3 align-middle rounded-full border border-line px-2.5 py-0.5 text-xs font-normal text-ink-soft">
                {pillar.status}
              </span>
            </h2>
            <p className="mt-2 text-base text-ink-soft">{pillar.body}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="doors-heading" className="mt-16">
        <h2 id="doors-heading" className="text-xl font-semibold text-ink">
          {t("home.doors")}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {doors.map((door) => (
            <Link
              key={door.href}
              href={door.href}
              className="block min-h-11 rounded-2xl border border-line bg-paper p-5 transition hover:border-accent"
            >
              <h3 className="text-lg font-semibold text-ink">{door.label}</h3>
              <p className="mt-1.5 text-base text-ink-soft">{door.line}</p>
            </Link>
          ))}
        </div>
        {/* The playground lives on its own page now — one teaser, not 450 words. */}
        <Link
          href="/uk/personal-tax#playground"
          className="mt-4 flex min-h-11 items-center justify-between rounded-2xl border border-line bg-paper p-5 transition hover:border-accent"
        >
          <span className="text-base font-medium text-ink">
            {t("home.playground.teaser")}
          </span>
          <span aria-hidden="true" className="text-accent">
            →
          </span>
        </Link>
      </section>

      <p className="mt-10 text-base text-ink-soft">{t("home.world")}</p>
      <p className="mt-4 text-base text-ink-soft">{t("home.honest")}</p>
      <p className="mt-10 text-base text-ink">{t("home.lastline")}</p>
    </div>
  );
}
