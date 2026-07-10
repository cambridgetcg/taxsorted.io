"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { PoliticsNav } from "@/components/politics/politics-nav";
import politics from "../../../../../research/uk/politics/politics.json";

const sourceById = new Map(politics.sources.map((source) => [source.id, source]));

export default function UkPoliticsPage() {
  const { locale, t } = useI18n();
  const showCantoneseFirst = locale === "zh-Hant";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <PoliticsNav />

      <section className="mt-8 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">{t("politics.kicker")}</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          {t("politics.title")}
        </h1>
        <p className="mt-5 max-w-4xl text-lg text-ink-soft">{t("politics.blurb")}</p>
        <p className="mt-5 rounded-2xl bg-accent-soft p-4 text-sm text-ink">
          <strong>{t("politics.neutral")}:</strong> {t("politics.neutral.body")}
        </p>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="UK politics public record">
        <Link
          href="/uk/politics/system"
          className="rounded-3xl border border-line bg-accent p-6 text-white shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-white">The machinery</p>
          <h2 className="mt-3 text-2xl font-semibold">How power works</h2>
          <p className="mt-3 text-sm text-white/85">
            Elections, formal office powers, campaign rules, public money, relationship evidence and enforcement boundaries.
          </p>
          <p className="mt-5 text-sm font-semibold">Open the system map →</p>
        </Link>
        <Link
          href="/uk/politics/integrity"
          className="rounded-3xl border border-ink bg-ink p-6 text-white shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-white/65">Evidence before inference</p>
          <h2 className="mt-3 text-2xl font-semibold">Money & enforcement</h2>
          <p className="mt-3 text-sm text-white/75">
            Contract awards, finance-source gates, law-enforcement accountability and seven-dimension office power cards.
          </p>
          <p className="mt-5 text-sm font-semibold">Inspect the integrity map →</p>
        </Link>
        <Link
          href="/uk/politics/people"
          className="rounded-3xl border border-line bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Source-safe preview</p>
          <h2 className="mt-3 text-2xl font-semibold">People & offices</h2>
          <p className="mt-3 text-sm text-ink-soft">
            Prepared around current Parliament-published members and offices. Production people records,
            interests and staff remain behind their separate publication decisions.
          </p>
          <p className="mt-5 text-sm font-semibold text-accent">Open the directory →</p>
        </Link>
        <Link
          href="/uk/politics/funding"
          className="rounded-3xl border border-line bg-paper p-6 shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Money</p>
          <h2 className="mt-3 text-2xl font-semibold text-ink">Party funding</h2>
          <p className="mt-3 text-sm text-ink-soft">
            Understand the official Electoral Commission record and its limits. TaxSorted&apos;s
            normalized donation mirror remains licence- and privacy-gated.
          </p>
          <p className="mt-5 text-sm font-semibold text-accent">Follow the money →</p>
        </Link>
        <Link
          href="/uk/politics/api"
          className="rounded-3xl border border-line bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Build with it</p>
          <h2 className="mt-3 text-2xl font-semibold text-ink">Public data API</h2>
          <p className="mt-3 text-sm text-ink-soft">
            The prepared catalogue, rights and schemas need no key or account once deployed.
            Screened record bodies also await a human publication decision, shown plainly by the API.
          </p>
          <p className="mt-5 text-sm font-semibold text-accent">See the API →</p>
        </Link>
      </section>

      <section className="mt-10" aria-labelledby="who-decides">
        <h2 id="who-decides" className="text-2xl font-semibold text-ink">{t("politics.who.title")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          This is a plain first map of institutions and roles. Formal power belongs to an office, not
          a person, and is assessed separately in the sourced system method.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {politics.deciders.map((decider) => (
            <article key={decider.id} className="rounded-3xl border border-line bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-ink">{decider.role}</h3>
              <p className="mt-3 text-sm text-ink-soft">{decider.what}</p>
              <p className="mt-4 rounded-2xl bg-paper p-3 text-sm text-ink">
                <strong>{t("politics.checkedBy")}:</strong> {decider.checkedBy}
              </p>
            </article>
          ))}
        </div>
        <Link href="/uk/politics/system#formal-power" className="mt-5 inline-flex text-sm font-semibold text-accent underline underline-offset-4">
          Read the six-dimension formal office-power method →
        </Link>
      </section>

      <section className="mt-12 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8" aria-labelledby="how-law-works">
        <h2 id="how-law-works" className="text-2xl font-semibold text-ink">{t("politics.how.title")}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-5">
          {politics.howLawWorks.map((step) => (
            <li key={step.step} className="rounded-3xl border border-line bg-paper p-4">
              <p className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                {step.step}
              </p>
              <h3 className="mt-4 font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12" aria-labelledby="live-debates">
        <h2 id="live-debates" className="text-2xl font-semibold text-ink">{t("politics.debates.title")}</h2>
        <div className="mt-5 grid gap-5">
          {politics.debates.map((debate) => {
            const sources = debate.sourceIds.map((id) => sourceById.get(id)).filter(Boolean);
            return (
              <article key={debate.id} className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-semibold text-accent">{debate.cantonese}</p>
                <h3 className="mt-2 text-2xl font-semibold text-ink">{debate.title}</h3>
                <p className="mt-3 text-ink-soft">{showCantoneseFirst ? debate.cantonese : debate.plain}</p>
                {showCantoneseFirst ? <p className="mt-3 text-sm text-ink-soft">{debate.plain}</p> : null}
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <p className="rounded-2xl bg-paper p-4 text-sm text-ink">
                    <strong>{t("politics.forWhom")}:</strong> {debate.whoItHits}
                  </p>
                  <p className="rounded-2xl bg-accent-soft p-4 text-sm text-ink">
                    <strong>{t("politics.forWatch")}:</strong> {debate.whatToWatch}
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {sources.map((source) => source ? (
                    <a
                      key={source.id}
                      href={source.url}
                      className="rounded-full border border-line px-3 py-1 text-xs text-accent hover:text-accent-deep"
                    >
                      {source.authority}: {source.name}
                    </a>
                  ) : null)}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-12 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8" aria-labelledby="politics-sources">
        <h2 id="politics-sources" className="text-2xl font-semibold text-ink">{t("politics.sources")}</h2>
        <p className="mt-2 text-ink-soft">{t("common.notAdvice")}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {politics.sources.map((source) => (
            <article key={source.id} className="rounded-2xl border border-line p-4">
              <a href={source.url} className="font-medium text-accent hover:text-accent-deep">{source.name}</a>
              <p className="mt-2 text-xs uppercase tracking-wide text-ink-soft">{source.authority}</p>
              <p className="mt-2 text-sm text-ink-soft">{source.supports}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
