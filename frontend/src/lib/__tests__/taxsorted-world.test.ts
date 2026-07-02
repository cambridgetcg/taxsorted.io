import { describe, expect, test } from "vitest";
import {
  funTaxCards,
  getSources,
  localeLabels,
  locales,
  playgroundCopy,
  politicsCards,
  sourceKindLabels,
  taxSources,
} from "../taxsorted-world";

describe("taxsorted-world multilingual content", () => {
  test("all locale labels exist and include at least six languages", () => {
    expect(locales.length).toBeGreaterThanOrEqual(6);
    for (const locale of locales) {
      expect(localeLabels[locale].native.length).toBeGreaterThan(0);
      expect(localeLabels[locale].english.length).toBeGreaterThan(0);
    }
  });

  test("top-level playground copy is translated for every locale", () => {
    for (const copy of Object.values(playgroundCopy)) {
      for (const locale of locales) {
        expect(copy[locale], `${locale} translation missing`).toBeTruthy();
      }
    }
  });

  test("fun cards and politics cards carry all locales and safe boundaries", () => {
    expect(funTaxCards.length).toBeGreaterThanOrEqual(3);
    expect(politicsCards.length).toBeGreaterThanOrEqual(3);

    for (const card of funTaxCards) {
      expect(card.legalBoundary.en.toLowerCase()).not.toContain("hide income");
      for (const field of [card.title, card.body, card.play, card.legalBoundary]) {
        for (const locale of locales) expect(field[locale]).toBeTruthy();
      }
    }

    for (const card of politicsCards) {
      for (const field of [card.title, card.plain, card.whyItMatters, card.action]) {
        for (const locale of locales) expect(field[locale]).toBeTruthy();
      }
    }
  });

  test("every source id used by cards resolves to a receipt URL", () => {
    const sourceIds = new Set(taxSources.map((source) => source.id));
    for (const card of [...funTaxCards, ...politicsCards]) {
      expect(card.sourceIds.length).toBeGreaterThan(0);
      for (const sourceId of card.sourceIds) expect(sourceIds.has(sourceId)).toBe(true);
      expect(getSources(card.sourceIds)).toHaveLength(card.sourceIds.length);
    }
    for (const source of taxSources) expect(source.url).toMatch(/^https:\/\//);
  });

  test("every source kind used has a label translated for every locale", () => {
    const usedKinds = new Set(taxSources.map((source) => source.kind));
    for (const kind of usedKinds) {
      expect(sourceKindLabels[kind], `missing label for kind ${kind}`).toBeTruthy();
      for (const locale of locales) {
        expect(sourceKindLabels[kind][locale], `${kind}/${locale} missing`).toBeTruthy();
      }
    }
  });
});
