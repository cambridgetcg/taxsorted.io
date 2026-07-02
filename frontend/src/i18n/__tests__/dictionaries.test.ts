import { describe, expect, test } from "vitest";
import { DEFAULT_LOCALE, LOCALES, dictionaries, isLocale, localeDir } from "../dictionaries";

// The whole site (nav, home, playbook UI, politics UI) reads from these
// dictionaries. If a key exists in English but is missing in another locale,
// that locale silently falls back to English with no visible failure. This
// test makes such drift a hard build failure, protecting the multi-language
// promise across every page — not just the playground content.
describe("site i18n dictionaries", () => {
  const enKeys = Object.keys(dictionaries[DEFAULT_LOCALE]).sort();

  test("ships at least the six advertised locales", () => {
    expect(LOCALES.length).toBeGreaterThanOrEqual(6);
    for (const locale of LOCALES) {
      expect(dictionaries[locale], `dictionary missing for ${locale}`).toBeTruthy();
    }
  });

  test("every locale has exactly the English key set (no missing/extra keys)", () => {
    for (const locale of LOCALES) {
      const keys = Object.keys(dictionaries[locale]).sort();
      const missing = enKeys.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !enKeys.includes(k));
      expect(missing, `${locale} is missing keys`).toEqual([]);
      expect(extra, `${locale} has stray keys`).toEqual([]);
    }
  });

  test("no value is left blank in any locale", () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        expect(value.trim().length, `${locale}.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });

  test("legal/advice guardrail strings survive translation in every locale", () => {
    // The optimisation-not-evasion boundary must reach every reader, so the
    // not-advice disclaimer must be present and non-empty in all locales.
    for (const locale of LOCALES) {
      expect(dictionaries[locale]["common.notAdvice"]?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  test("locale helpers agree with the shipped locale set", () => {
    for (const locale of LOCALES) expect(isLocale(locale)).toBe(true);
    expect(isLocale("not-a-locale")).toBe(false);
    expect(isLocale(null)).toBe(false);
    // Urdu is the one right-to-left script we ship.
    expect(localeDir("ur")).toBe("rtl");
    expect(localeDir(DEFAULT_LOCALE)).toBe("ltr");
  });
});
