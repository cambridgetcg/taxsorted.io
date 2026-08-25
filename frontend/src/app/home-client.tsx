"use client";

import Link from "next/link";
import { configFor } from "@taxsorted/engine/uk/itsa";
import { useI18n } from "@/i18n/I18nProvider";
import { gbpCompact, formatUkDate } from "@/lib/format";

// Keep the urgent MTD statement pinned to the same effective-dated table as
// the calculator. The homepage is navigation, never a second rules engine.
const [MTD_FIRST_PHASE] = configFor("2026-27").mtdThresholds.value;

export function HomeClient() {
  const { locale, t } = useI18n();
  // This front page is fully translated only in English and Cantonese today.
  // Keep fallback paragraphs explicitly English so selecting Urdu (for
  // example) never makes a screen reader pronounce English as Urdu or flips
  // the fallback layout to RTL. The translated lead keeps its own language.
  const bodyLanguage = locale === "zh-Hant" ? "zh-Hant" : "en";
  const introLanguage = locale === "zh-Hans" || locale === "pl" ? locale : bodyLanguage;
  const mtdBody = t("home.mtd.body")
    .replace("{date}", formatUkDate(MTD_FIRST_PHASE.mandatedFrom))
    .replace("{amount}", gbpCompact(MTD_FIRST_PHASE.qualifyingIncomeOver));

  const stages = [
    {
      number: "1",
      status: t("home.journey.check.status"),
      title: t("home.journey.check.title"),
      body: t("home.journey.check.body"),
      href: "/checkup",
      action: t("home.journey.check.action"),
    },
    {
      number: "2",
      status: t("home.journey.plan.status"),
      title: t("home.journey.plan.title"),
      body: t("home.journey.plan.body"),
      href: "/plan",
      action: t("home.journey.plan.action"),
    },
    {
      number: "3",
      status: t("home.journey.books.status"),
      title: t("home.journey.books.title"),
      body: t("home.journey.books.body"),
      href: "/books",
      action: t("home.journey.books.action"),
    },
    {
      number: "4",
      status: t("home.journey.file.status"),
      title: t("home.journey.file.title"),
      body: t("home.journey.file.body"),
      href: "/file",
      action: t("home.journey.file.action"),
    },
    {
      number: "5",
      status: t("home.journey.correct.status"),
      title: t("home.journey.correct.title"),
      body: t("home.journey.correct.body"),
      href: "/put-it-right",
      action: t("home.journey.correct.action"),
    },
    {
      number: "6",
      status: t("home.journey.understand.status"),
      title: t("home.journey.understand.title"),
      body: t("home.journey.understand.body"),
      href: "/learn",
      action: t("home.journey.understand.action"),
    },
  ];

  return (
    <div lang={bodyLanguage} dir="ltr" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(21rem,0.85fr)] lg:gap-14">
        <div className="max-w-4xl">
          <p className="section-label">01 · TaxSorted</p>
          <h1
            lang={locale}
            dir={locale === "ur" ? "rtl" : "ltr"}
            className="hero-title mt-5 text-ink"
          >
            {t("home.title.line1")}
            <br />
            {t("home.title.line2")}
          </h1>
          <p lang={introLanguage} className="mt-7 max-w-3xl text-lg leading-8 text-ink-soft">
            {t("home.intro")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/checkup"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-accent-deep"
            >
              {t("home.primary")}
            </Link>
            <Link
              href="/plan"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-line-strong bg-surface px-6 text-base font-medium text-ink transition-colors hover:border-accent hover:bg-accent-soft"
            >
              {t("home.secondary")}
            </Link>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-soft">
            {t("home.start.smallprint")}
          </p>
        </div>

        <section
          aria-labelledby="mtd-heading"
          className="soft-shadow relative overflow-hidden rounded-[2rem] border border-line bg-surface p-6 sm:p-8"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 420 180"
            className="pointer-events-none absolute -end-12 -top-8 w-[25rem] text-accent opacity-[0.09]"
          >
            <path d="M10 140C92 18 180 202 274 74S390 28 430 72" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M-10 164C86 62 168 210 262 103S366 42 438 91" fill="none" stroke="currentColor" />
            <circle cx="274" cy="74" r="9" fill="currentColor" />
          </svg>
          <div className="relative">
            <p className="section-label">{t("home.mtd.eyebrow")}</p>
            <h2 id="mtd-heading" className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight text-ink">
              {t("home.mtd.title")}
            </h2>
            <p className="mt-4 leading-7 text-ink-soft">{mtdBody}</p>
            <div className="mt-6 grid gap-2">
              <Link
                href="/itsa/am-i-in"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-center text-base font-semibold text-white transition-colors hover:bg-accent-deep"
              >
                {t("home.mtd.check")}
              </Link>
              <Link
                href="/learn/mtd-income-tax"
                className="inline-flex min-h-11 items-center justify-center px-2 text-center text-base font-medium text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep"
              >
                {t("home.mtd.truth")} →
              </Link>
            </div>
            <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-ink-soft">
              {t("home.mtd.smallprint")}
            </p>
          </div>
        </section>
      </header>

      <section className="mt-24" aria-labelledby="journey-title">
        <p className="section-label">02 · {t("home.journey.eyebrow")}</p>
        <h2 id="journey-title" className="section-title mt-4 text-ink">
          {t("home.journey.title")}
        </h2>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ink-soft">{t("home.journey.body")}</p>
        <div className="hairline-grid mt-8 grid overflow-hidden rounded-[2rem] border border-line sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((stage) => (
            <article key={stage.number} className="bg-surface p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <span
                  aria-hidden="true"
                  className="font-display text-4xl text-accent"
                >
                  0{stage.number}
                </span>
                <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                  {stage.status}
                </span>
              </div>
              <h3 className="mt-5 font-display text-2xl font-semibold leading-tight text-ink">{stage.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{stage.body}</p>
              <Link
                href={stage.href}
                className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep"
              >
                {stage.action} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-24" aria-label={t("home.deeper.label")}>
        <p className="section-label">03 · {t("home.deeper.label")}</p>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
        <Link
          href="/uk"
          className="group block min-h-11 rounded-[2rem] border border-line bg-accent-soft p-7 transition hover:border-accent"
        >
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            {t("home.system.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-ink">{t("home.system.title")}</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-ink-soft">{t("home.system.body")}</p>
          <p className="mt-5 font-semibold text-accent">{t("home.system.action")} →</p>
        </Link>
        <a
          href="https://api.taxsorted.io/v1/uk/tax-expert"
          target="_blank"
          rel="noreferrer noopener"
          className="group block min-h-11 rounded-[2rem] border border-line bg-surface p-7 transition hover:border-accent"
        >
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            {t("home.api.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-ink">{t("home.api.title")}</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-ink-soft">{t("home.api.body")}</p>
          <p className="mt-5 font-semibold text-accent">{t("home.api.action")} ↗</p>
        </a>
        </div>
      </section>

      <div className="mt-16 border-s-2 border-warm/50 ps-5">
        <p className="max-w-4xl text-sm leading-6 text-ink-soft">{t("home.honest")}</p>
        <p className="mt-3 font-display text-xl text-ink">{t("home.lastline")}</p>
      </div>
    </div>
  );
}
