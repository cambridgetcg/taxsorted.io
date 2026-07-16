"use client";

import { LOCALES, LOCALE_LABELS, type Locale } from "./dictionaries";
import { useI18n } from "./I18nProvider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-soft">
      <span className="sr-only">{t("lang.label")}</span>
      <span aria-hidden="true">🌐</span>
      {/* A native select is the most accessible language picker there is —
          restyled, never replaced. */}
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="min-h-11 cursor-pointer rounded-md border border-line bg-white px-2.5 text-base text-ink transition-colors hover:border-accent"
        aria-label={t("lang.label")}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
