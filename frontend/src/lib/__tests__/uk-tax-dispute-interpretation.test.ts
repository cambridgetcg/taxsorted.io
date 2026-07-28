import { describe, expect, it } from "vitest";
import {
  taxDisputeInterpretationBySlug,
  ukCaseCommons,
} from "../uk-case-commons";

describe("UK tax-dispute human projection", () => {
  it("does not build or expose a case interpretation before separate approval", () => {
    const interpretation = taxDisputeInterpretationBySlug("haworth-v-hmrc");

    expect(ukCaseCommons.cases.map((caseRecord) => caseRecord.id)).toEqual([
      "haworth-v-hmrc-2021",
    ]);
    expect(interpretation).toBeUndefined();
    expect(taxDisputeInterpretationBySlug("not-published")).toBeUndefined();
  });
});
