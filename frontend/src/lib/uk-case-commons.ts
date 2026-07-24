import caseCommonsJson from "../../../research/uk/case-commons/data/uk-case-commons.json";
import { isUkCaseStaticallyPublished } from "./uk-case-publication";

export const ukCaseCommons = {
  ...caseCommonsJson,
  cases: caseCommonsJson.cases.filter((caseRecord) =>
    isUkCaseStaticallyPublished(caseRecord.id),
  ),
};

export type UkCaseCommonsCase = (typeof ukCaseCommons.cases)[number];
export type UkCaseCommonsSource = (typeof ukCaseCommons.sources)[number];

export function caseBySlug(slug: string) {
  return ukCaseCommons.cases.find((caseRecord) => caseRecord.slug === slug);
}

export function formatGbp(amountPence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: amountPence % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountPence / 100);
}

export function sourcesById(sourceIds: readonly string[]) {
  const wanted = new Set(sourceIds);
  return ukCaseCommons.sources.filter((source) => wanted.has(source.id));
}
