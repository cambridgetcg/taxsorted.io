"use client";

import { useMemo } from "react";
import {
  funTaxCards,
  getSources,
  localeLabels,
  playgroundCopy,
  politicsCards,
  type TaxSortedLocale,
} from "@/lib/taxsorted-world";
import { useI18n } from "@/i18n/I18nProvider";
import { localeDir, type Locale } from "@/i18n/dictionaries";

function t(text: Record<TaxSortedLocale, string>, locale: TaxSortedLocale) {
  return text[locale] ?? text.en;
}

function toPlaygroundLocale(locale: Locale): TaxSortedLocale {
  if (locale === "zh-Hant") return "zh-HK";
  if (locale === "zh-Hans") return "zh-CN";
  return locale;
}

export function TaxPlayground() {
  const { locale: siteLocale, t: siteT } = useI18n();
  const locale = toPlaygroundLocale(siteLocale);
  const dir = localeDir(siteLocale);
  const allSourceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const card of [...funTaxCards, ...politicsCards]) {
      for (const id of card.sourceIds) ids.add(id);
    }
    return [...ids];
  }, []);

  return (
    <section className="mt-12 rounded-[2rem] border border-line bg-white p-5 shadow-sm sm:p-8" dir={dir}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            {t(playgroundCopy.eyebrow, locale)}
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t(playgroundCopy.headline, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-ink-soft">{t(playgroundCopy.subhead, locale)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink">
          <p className="font-medium">{siteT("lang.label")}</p>
          <p className="mt-1 text-ink-soft">{localeLabels[locale].native} · {localeLabels[locale].english}</p>
          <p className="mt-2 text-xs text-ink-soft">Use the globe switcher above to change the whole site.</p>
        </div>
      </div>

      <p className="mt-5 rounded-2xl bg-accent-soft p-4 text-sm font-medium text-ink">
        {t(playgroundCopy.boundary, locale)}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <h3 className="text-xl font-semibold text-ink">{t(playgroundCopy.funHeading, locale)}</h3>
          <div className="mt-4 grid gap-4">
            {funTaxCards.map((card) => (
              <article key={card.id} className="rounded-3xl border border-line bg-paper p-5">
                <p className="text-3xl" aria-hidden="true">{card.emoji}</p>
                <h4 className="mt-3 text-lg font-semibold text-ink">{t(card.title, locale)}</h4>
                <p className="mt-2 text-sm text-ink-soft">{t(card.body, locale)}</p>
                <p className="mt-3 text-sm text-ink"><strong>Play:</strong> {t(card.play, locale)}</p>
                <p className="mt-2 text-xs text-ink-soft"><strong>Clean line:</strong> {t(card.legalBoundary, locale)}</p>
              </article>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-ink">{t(playgroundCopy.politicsHeading, locale)}</h3>
          <div className="mt-4 grid gap-4">
            {politicsCards.map((card) => (
              <article key={card.id} className="rounded-3xl border border-line bg-white p-5 shadow-sm">
                <h4 className="text-lg font-semibold text-ink">{t(card.title, locale)}</h4>
                <p className="mt-2 text-sm text-ink-soft">{t(card.plain, locale)}</p>
                <p className="mt-3 text-sm text-ink"><strong>Why politics matters:</strong> {t(card.whyItMatters, locale)}</p>
                <p className="mt-2 text-sm text-ink"><strong>Move:</strong> {t(card.action, locale)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {getSources(card.sourceIds).map((source) => (
                    <a key={source.id} href={source.url} className="rounded-full border border-line px-3 py-1 text-xs text-accent hover:text-accent-deep">
                      {source.kind}: {source.name}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-line p-5">
        <h3 className="text-xl font-semibold text-ink">{t(playgroundCopy.receiptsHeading, locale)}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {getSources(allSourceIds).map((source) => (
            <a key={source.id} href={source.url} className="rounded-full bg-paper px-3 py-1 text-xs text-accent hover:text-accent-deep">
              {source.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
