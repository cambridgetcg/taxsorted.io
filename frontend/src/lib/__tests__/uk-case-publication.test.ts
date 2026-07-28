import { describe, expect, it } from "vitest";
import { TAX_DISPUTE_FRAMEWORK } from "@taxsorted/engine/uk/disputes";
import caseCommonsJson from "../../../../research/uk/case-commons/data/uk-case-commons.json";
import interpretationPublicationApprovalJson from "../../../../research/uk/case-commons/data/interpretation-publication-approval.json";
import publicationApprovalJson from "../../../../research/uk/case-commons/data/publication-approval.json";
import {
  evaluateUkTaxDisputeInterpretationStaticPublication,
  evaluateUkCaseStaticPublication,
  isUkCaseStaticallyPublished,
  isUkTaxDisputeInterpretationStaticallyPublished,
  ukCaseStaticPublication,
  ukTaxDisputeInterpretationStaticPublication,
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

  it("opens the derived interpretation only for the checked-in exact release", () => {
    expect(ukTaxDisputeInterpretationStaticPublication).toMatchObject({
      status: "approved-for-publication",
      exactReleaseApproved: true,
      computedReleaseDigest:
        interpretationPublicationApprovalJson.releaseDigest,
      emergencyStop: false,
    });
    expect(
      isUkTaxDisputeInterpretationStaticallyPublished(
        "haworth-v-hmrc-2021",
      ),
    ).toBe(true);

    const decision = evaluateUkTaxDisputeInterpretationStaticPublication(
      caseCommonsJson,
      interpretationPublicationApprovalJson,
      publicationApprovalJson.caseIds,
    );
    expect(decision).toMatchObject({
      approved: true,
      releaseDigest: interpretationPublicationApprovalJson.releaseDigest,
      approvedCaseIds: ["haworth-v-hmrc-2021"],
    });
    expect(decision.interpretations.size).toBe(1);
  });

  it("keeps the derived interpretation closed for an explicit pending decision", () => {
    const decision = evaluateUkTaxDisputeInterpretationStaticPublication(
      caseCommonsJson,
      {
        ...interpretationPublicationApprovalJson,
        status: "pending-review",
        decisionRecordedOn: null,
        releaseDigest: null,
        effects: "Test-only pending decision.",
      },
      publicationApprovalJson.caseIds,
    );
    expect(decision).toMatchObject({
      approved: false,
      releaseDigest: null,
      approvedCaseIds: [],
    });
    expect(decision.interpretations.size).toBe(0);
  });

  it("requires the exact deterministic derived release digest", () => {
    const candidateApproval = {
      ...interpretationPublicationApprovalJson,
      status: "approved-for-publication",
      decisionRecordedOn: "2026-07-28",
      frameworkVersion: TAX_DISPUTE_FRAMEWORK.version,
      corpusVersion: caseCommonsJson.meta.version,
      releaseDigest: `sha256:${"0".repeat(64)}`,
      caseIds: ["haworth-v-hmrc-2021"],
    };
    const mismatched = evaluateUkTaxDisputeInterpretationStaticPublication(
      caseCommonsJson,
      candidateApproval,
      publicationApprovalJson.caseIds,
    );
    expect(mismatched.approved).toBe(false);
    expect(mismatched.releaseDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(mismatched.interpretations.size).toBe(0);

    const matching = evaluateUkTaxDisputeInterpretationStaticPublication(
      caseCommonsJson,
      {
        ...candidateApproval,
        releaseDigest: mismatched.releaseDigest,
      },
      publicationApprovalJson.caseIds,
    );
    expect(matching.approved).toBe(true);
    expect(matching.approvedCaseIds).toEqual(["haworth-v-hmrc-2021"]);
    expect(matching.interpretations.get("haworth-v-hmrc-2021")).toMatchObject({
      frameworkVersion:
        TAX_DISPUTE_FRAMEWORK.version,
      packet: {
        schema: "taxsorted.uk.case-packet/1",
        digest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      },
    });
  });
});
