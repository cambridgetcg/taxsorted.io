import { describe, expect, it } from "vitest";
import caseCommonsJson from "../../../../research/uk/case-commons/data/uk-case-commons.json";
import publicationApprovalJson from "../../../../research/uk/case-commons/data/publication-approval.json";
import {
  evaluateUkCaseStaticPublication,
  isUkCaseStaticallyPublished,
  ukCaseStaticPublication,
} from "../uk-case-publication";

describe("UK case static publication approval", () => {
  it("opens only the case IDs bound to the exact reviewed corpus", () => {
    expect(ukCaseStaticPublication.exactCorpusApproved).toBe(true);
    expect(ukCaseStaticPublication.computedCorpusDigest).toBe(
      publicationApprovalJson.corpusDigest,
    );
    expect(isUkCaseStaticallyPublished("haworth-v-hmrc-2021")).toBe(true);
    expect(isUkCaseStaticallyPublished("not-reviewed")).toBe(false);
  });

  it("fails closed after an unapproved corpus edit or case-list change", () => {
    const changedCorpus = structuredClone(caseCommonsJson);
    changedCorpus.cases[0].whyItMatters = "Changed without a new approval";
    expect(
      evaluateUkCaseStaticPublication(
        changedCorpus,
        publicationApprovalJson,
      ).approved,
    ).toBe(false);

    const changedApproval = {
      ...publicationApprovalJson,
      caseIds: [...publicationApprovalJson.caseIds, "not-in-corpus"],
    };
    expect(
      evaluateUkCaseStaticPublication(caseCommonsJson, changedApproval)
        .approved,
    ).toBe(false);
  });
});
