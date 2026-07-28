import { describe, expect, it } from "vitest";
import {
  taxDisputeInterpretationBySlug,
  ukCaseCommons,
} from "../uk-case-commons";

describe("UK tax-dispute human projection", () => {
  it("exposes only the case bound to the exact approved derived release", () => {
    const interpretation = taxDisputeInterpretationBySlug("haworth-v-hmrc");

    expect(ukCaseCommons.cases.map((caseRecord) => caseRecord.id)).toEqual([
      "haworth-v-hmrc-2021",
    ]);
    expect(interpretation).toMatchObject({
      schema: "taxsorted.uk.tax-dispute-interpretation/1",
      frameworkVersion: "2026-07-28.2",
      case: {
        id: "haworth-v-hmrc-2021",
        slug: "haworth-v-hmrc",
      },
      review: {
        qualifiedLegalReviewAsserted: false,
      },
    });
    expect(taxDisputeInterpretationBySlug("not-published")).toBeUndefined();
  });
});
