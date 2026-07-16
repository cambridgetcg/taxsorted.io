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
      status: t("home.journey.prepare.status"),
      title: t("home.journey.prepare.title"),
      body: t("home.journey.prepare.body"),
      href: "/itsa",
      action: t("home.journey.prepare.action"),
    },
    {
      number: "3",
      status: t("home.journey.share.status"),
      title: t("home.journey.share.title"),
      body: t("home.journey.share.body"),
      href: "/passport",
      action: t("home.journey.share.action"),
    },
  ];

  return (
    <div lang={bodyLanguage} dir="ltr" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <header className="max-w-4xl">
        <h1
          lang={locale}
          dir={locale === "ur" ? "rtl" : "ltr"}
          className="text-4xl font-bold tracking-tight text-ink sm:text-6xl"
        >
          {t("home.title.line1")}
          <br />
          {t("home.title.line2")}
        </h1>
        <p lang={introLanguage} className="mt-5 max-w-3xl text-lg text-ink-soft">
          {t("home.intro")}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/checkup"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-7 text-base font-semibold text-white transition-colors hover:bg-accent-deep"
          >
            {t("home.primary")}
          </Link>
          <Link
            href="/uk/tax-expert#coverage-map"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-6 text-base font-medium text-ink transition-colors hover:bg-accent-soft"
          >
            {t("home.secondary")}
          </Link>
        </div>
        <p className="mt-4 text-sm text-ink-soft">{t("home.start.smallprint")}</p>
      </header>

      <section
        aria-labelledby="mtd-heading"
        className="mt-12 rounded-3xl border border-accent/30 bg-accent-soft p-6 sm:p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          {t("home.mtd.eyebrow")}
        </p>
        <h2 id="mtd-heading" className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("home.mtd.title")}
        </h2>
        <p className="mt-2 max-w-3xl text-ink-soft">{mtdBody}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/itsa/am-i-in"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-7 text-base font-medium text-white transition-colors hover:bg-accent-deep"
          >
            {t("home.mtd.check")}
          </Link>
          <Link
            href="/learn/mtd-income-tax"
            className="inline-flex min-h-11 items-center px-2 text-base font-medium text-accent underline underline-offset-4 hover:text-accent-deep"
          >
            {t("home.mtd.truth")} →
          </Link>
        </div>
        <p className="mt-4 text-sm text-ink-soft">{t("home.mtd.smallprint")}</p>
      </section>

      <section className="mt-16" aria-labelledby="journey-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          {t("home.journey.eyebrow")}
        </p>
        <h2 id="journey-title" className="mt-2 text-3xl font-bold tracking-tight text-ink">
          {t("home.journey.title")}
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">{t("home.journey.body")}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {stages.map((stage) => (
            <article key={stage.number} className="rounded-2xl border border-line bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
                >
                  {stage.number}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {stage.status}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-ink">{stage.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{stage.body}</p>
              <Link
                href={stage.href}
                className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
              >
                {stage.action} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-2" aria-label={t("home.deeper.label")}>
        <Link
          href="/uk"
          className="block min-h-11 rounded-3xl border border-line bg-paper p-6 transition hover:border-accent"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            {t("home.system.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">{t("home.system.title")}</h2>
          <p className="mt-3 text-sm text-ink-soft">{t("home.system.body")}</p>
          <p className="mt-5 font-semibold text-accent">{t("home.system.action")} →</p>
        </Link>
        <a
          href="https://api.taxsorted.io/v1/uk/tax-expert"
          target="_blank"
          rel="noreferrer noopener"
          className="block min-h-11 rounded-3xl border border-line bg-paper p-6 transition hover:border-accent"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            {t("home.api.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">{t("home.api.title")}</h2>
          <p className="mt-3 text-sm text-ink-soft">{t("home.api.body")}</p>
          <p className="mt-5 font-semibold text-accent">{t("home.api.action")} ↗</p>
        </a>
      </section>

      <p className="mt-10 text-sm text-ink-soft">{t("home.honest")}</p>
      <p className="mt-4 text-ink">{t("home.lastline")}</p>
    </div>
  );
}
