"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  dictionaries,
  isLocale,
  localeDir,
  type Locale,
} from "./dictionaries";

const STORAGE_KEY = "taxsorted.locale";

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate the saved choice (or the browser's preference) after mount, so the
  // static HTML stays deterministic and there is no hydration mismatch.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(saved)) {
        setLocaleState(saved);
        return;
      }
      const nav = navigator.language.toLowerCase();
      if (nav.startsWith("zh")) {
        setLocaleState(nav.includes("hant") || nav.includes("tw") || nav.includes("hk") ? "zh-Hant" : "zh-Hans");
        return;
      }
      if (nav.startsWith("pl")) setLocaleState("pl");
      if (nav.startsWith("hi")) setLocaleState("hi");
      if (nav.startsWith("ur")) setLocaleState("ur");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = localeDir(locale);
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const t = useCallback(
    (key: string) => {
      return dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback so a component used outside the provider still renders English.
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key: string) => dictionaries[DEFAULT_LOCALE][key] ?? key,
    };
  }
  return ctx;
}
