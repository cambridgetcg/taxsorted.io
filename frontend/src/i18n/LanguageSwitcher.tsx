"use client";

import { LOCALES, LOCALE_LABELS, type Locale } from "./dictionaries";
import { useI18n } from "./I18nProvider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="flex items-center gap-1.5 text-sm text-ink-soft">
      <span className="sr-only">{t("lang.label")}</span>
      <span aria-hidden="true">🌐</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="rounded-md border border-line bg-white px-2 py-1 text-sm text-ink"
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
