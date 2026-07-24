import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadProfessionalOpportunityReviewPack,
  makePendingProfessionalOpportunityReviewPack,
  professionalOpportunityReviewPackApprovalFacts,
  professionalOpportunityReviewPackDigest,
  professionalOpportunityReviewPackJsonSchema,
  professionalOpportunityReviewPackSchema,
  sealProfessionalOpportunityReviewPack,
  validateProfessionalOpportunityReviewPackForCorpus,
} from "../uk-professional-opportunity-review.js";
import {
  evaluateProfessionalOpportunityPublicationApproval,
  loadProfessionalOpportunityPublicationApproval,
  loadUkProfessionalOpportunities,
  professionalOpportunityCorpusDigest,
  professionalOpportunityPublicationApprovalSchema,
  ukProfessionalOpportunities,
  ukProfessionalOpportunityPublicationApproval,
} from "../uk-professional-opportunities.js";
import { completeProfessionalOpportunityReviewPackFixture } from "./professional-opportunity-review-fixture.js";

const temporaryDirectories: string[] = [];
const reviewRoot = join(
  process.cwd(),
  "..",
  "research",
  "uk",
  "professional-opportunities",
  "review",
);
const checkedPackPath = join(
  reviewRoot,
  "qualified-review-pack.json",
);
const checkedSchemaPath = join(
  reviewRoot,
  "qualified-review-pack.schema.json",
);
const script = join(
  process.cwd(),
  "scripts",
  "review-professional-opportunities.ts",
);
const corpusDigest = professionalOpportunityCorpusDigest(
  ukProfessionalOpportunities,
);

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function temporaryDirectory() {
  const directory = mkdtempSync(
    join(tmpdir(), "taxsorted-qualified-review-"),
  );
  temporaryDirectories.push(directory);
  return directory;
}

function runCli(arguments_: string[]) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", script, ...arguments_],
    { cwd: process.cwd(), encoding: "utf8" },
  );
}

function approvalForCompletePack(
  pack: ReturnType<
    typeof completeProfessionalOpportunityReviewPackFixture
  >,
) {
  const facts = professionalOpportunityReviewPackApprovalFacts(pack);
  if (!facts) throw new Error("complete fixture needs approval facts");
  return professionalOpportunityPublicationApprovalSchema.parse({
    ...ukProfessionalOpportunityPublicationApproval,
    status: "approved-for-hosted-distribution",
    decisionRecordedOn: facts.completedOn,
    corpusVersion: pack.corpus.version,
    corpusDigest: pack.corpus.digest,
    opportunityIds: pack.corpus.opportunityIds,
    hostedDistributionDecision: {
      status: "approved",
      decisionMakerName: "Synthetic accountable publisher",
      decisionMakerCapacity: "Synthetic hosted-distribution test authority",
      decisionEvidenceReference:
        "https://example.test/hosted-distribution-decision",
      reviewPackReference: facts.reference,
      exactCorpusAndPackReviewed: true,
      activationRemainsSeparate: true,
    },
    qualifiedReview: {
      status: "complete",
      reviewerName: facts.reviewerName,
      reviewerCapacity: facts.reviewerCapacity,
      completedOn: facts.completedOn,
      evidenceReference: facts.reference,
      institutionalRightOfReply: {
        status: "completed",
        basis:
          "Synthetic complete pack resolves every record and institution.",
        evidenceReference: facts.rightOfReplyReference,
      },
      confirmations: {
        currentLawTerritoryDeadlineAndRoute: true,
        privacySecurityAndThreatReview: true,
        noIntakeMarketplaceOrSubmission: true,
        emergencyStopExercised: true,
        correctionAndWithdrawalOwnersAssigned: true,
      },
    },
  });
}

describe("UK professional-opportunity qualified-review pack", () => {
  it("checks in the exact deterministic pending template and schema", () => {
    const expected = makePendingProfessionalOpportunityReviewPack(
      ukProfessionalOpportunities,
      corpusDigest,
    );
    const checked = loadProfessionalOpportunityReviewPack(checkedPackPath);
    expect(checked).toEqual(expected);
    expect(checked).toMatchObject({
      status: "pending",
      reviewers: [],
      corpus: {
        digest: corpusDigest,
        opportunityIds: ukProfessionalOpportunities.opportunities.map(
          (opportunity) => opportunity.id,
        ),
        scrutinyIds: ukProfessionalOpportunities.scrutiny.map(
          (scrutiny) => scrutiny.id,
        ),
        sourceIds: ukProfessionalOpportunities.sources.map(
          (source) => source.id,
        ),
      },
    });
    expect(checked?.sourceChecks).toHaveLength(67);
    expect(checked?.opportunityReviews).toHaveLength(9);
    expect(checked?.scrutinyReviews).toHaveLength(5);
    expect(
      checked?.scrutinyReviews.flatMap(
        (review) => review.rightOfReply,
      ),
    ).toHaveLength(
      ukProfessionalOpportunities.scrutiny.reduce(
        (sum, scrutiny) =>
          sum + scrutiny.affectedInstitutions.length,
        0,
      ),
    );
    expect(
      JSON.parse(readFileSync(checkedSchemaPath, "utf8")),
    ).toEqual(professionalOpportunityReviewPackJsonSchema);
  });

  it("accepts a fully scoped synthetic pack but does not treat it as approval", () => {
    const pack =
      completeProfessionalOpportunityReviewPackFixture(
        ukProfessionalOpportunities,
      );
    expect(
      validateProfessionalOpportunityReviewPackForCorpus(
        pack,
        ukProfessionalOpportunities,
        corpusDigest,
        ukProfessionalOpportunities.meta.retrievedAt,
      ),
    ).toEqual(pack);
    expect(pack.declaration.packDoesNotApproveHostedDistribution).toBe(
      true,
    );
    expect(pack.controls.emergencyStopDrill).toMatchObject({
      environment: "production-closed-release",
      apiProtectedRoutesReturned503: true,
      frontendContainedOnlyClosedShells: true,
    });
    expect(
      professionalOpportunityReviewPackSchema.parse(pack).integrity
        .digest,
    ).toBe(professionalOpportunityReviewPackDigest(pack));
  });

  it("requires the exact pack before an approved decision can open", () => {
    const pack =
      completeProfessionalOpportunityReviewPackFixture(
        ukProfessionalOpportunities,
      );
    const approval = approvalForCompletePack(pack);
    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        ukProfessionalOpportunities,
        approval,
        pack,
        ukProfessionalOpportunities.meta.retrievedAt,
      ),
    ).toMatchObject({ approved: true, reason: "approved" });

    const arbitrary = structuredClone(approval);
    arbitrary.qualifiedReview.reviewerName = "Mickey Mouse";
    arbitrary.qualifiedReview.reviewerCapacity =
      "qualified UK reviewer";
    arbitrary.qualifiedReview.evidenceReference =
      `qualified-review-pack@sha256:${"0".repeat(64)}`;
    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        ukProfessionalOpportunities,
        arbitrary,
        pack,
        ukProfessionalOpportunities.meta.retrievedAt,
      ),
    ).toMatchObject({
      approved: false,
      reason: "review-pack-mismatch",
    });

    const wrongDecisionPack = structuredClone(approval);
    wrongDecisionPack.hostedDistributionDecision.reviewPackReference =
      `qualified-review-pack@sha256:${"0".repeat(64)}`;
    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        ukProfessionalOpportunities,
        wrongDecisionPack,
        pack,
        ukProfessionalOpportunities.meta.retrievedAt,
      ),
    ).toMatchObject({
      approved: false,
      reason: "review-pack-mismatch",
    });

    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        ukProfessionalOpportunities,
        approval,
        null,
        ukProfessionalOpportunities.meta.retrievedAt,
      ),
    ).toMatchObject({
      approved: false,
      reason: "review-pack-missing",
    });

    const futureDated = structuredClone(approval);
    futureDated.decisionRecordedOn = "2099-01-01";
    futureDated.qualifiedReview.completedOn = "2099-01-01";
    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        ukProfessionalOpportunities,
        futureDated,
        pack,
        ukProfessionalOpportunities.meta.retrievedAt,
      ),
    ).toMatchObject({
      approved: false,
      reason: "approval-invalid",
    });
  });

  it("fails closed on pack mutation, incomplete coverage and expiry", () => {
    const complete =
      completeProfessionalOpportunityReviewPackFixture(
        ukProfessionalOpportunities,
      );

    const tampered = structuredClone(complete);
    tampered.sourceChecks[0].pinpointOrScope =
      "Changed after the digest";
    expect(
      professionalOpportunityReviewPackSchema.safeParse(tampered)
        .success,
    ).toBe(false);

    const missingSource = structuredClone(complete);
    missingSource.sourceChecks.pop();
    missingSource.integrity.digest =
      professionalOpportunityReviewPackDigest(missingSource);
    expect(() =>
      validateProfessionalOpportunityReviewPackForCorpus(
        missingSource,
        ukProfessionalOpportunities,
        corpusDigest,
        ukProfessionalOpportunities.meta.retrievedAt,
      ),
    ).toThrow();

    const missingInstitution = structuredClone(complete);
    missingInstitution.scrutinyReviews[0].rightOfReply.pop();
    missingInstitution.integrity.digest =
      professionalOpportunityReviewPackDigest(missingInstitution);
    expect(() =>
      validateProfessionalOpportunityReviewPackForCorpus(
        missingInstitution,
        ukProfessionalOpportunities,
        corpusDigest,
        ukProfessionalOpportunities.meta.retrievedAt,
      ),
    ).toThrow();

    expect(() =>
      validateProfessionalOpportunityReviewPackForCorpus(
        complete,
        ukProfessionalOpportunities,
        corpusDigest,
        "2026-10-25",
      ),
    ).toThrow();
  });

  it("rejects one-sided drills, missing scope and unsafe private references", () => {
    for (const mutate of [
      (pack: any) => {
        pack.controls.emergencyStopDrill
          .frontendContainedOnlyClosedShells = false;
      },
      (pack: any) => {
        pack.reviewers[0].scope.opportunityIds.shift();
      },
      (pack: any) => {
        pack.evidenceIndex.push({
          id: "unsafe-private-evidence",
          purpose: "reviewer-independence",
          visibility: "private-custodian-record",
          custodianRole: "Reviewer",
          opaqueRecordId: "not-a-uuid",
          path: "/private/client/alice",
        });
      },
    ]) {
      const pack =
        completeProfessionalOpportunityReviewPackFixture(
          ukProfessionalOpportunities,
        ) as any;
      mutate(pack);
      pack.integrity.digest =
        professionalOpportunityReviewPackDigest(pack);
      expect(
        professionalOpportunityReviewPackSchema.safeParse(pack)
          .success,
      ).toBe(false);
    }
  });

  it("rejects stale renewal, inert roles, conflicts and contradictory evidence", () => {
    const mutations: Array<(pack: any) => void> = [
      (pack) => {
        pack.declaration.completedOn = "2030-01-01";
        pack.declaration.reviewBy = "2030-03-01";
      },
      (pack) => {
        pack.reviewers[0].scope.opportunityIds.push(
          "unknown-opportunity",
        );
      },
      (pack) => {
        pack.reviewers[0].independence.noUndisclosedRelevantInterest =
          false;
      },
      (pack) => {
        pack.reviewers[0].capacityVerification.verifierPublicLabel =
          pack.reviewers[0].publicName;
      },
      (pack) => {
        pack.reviewers[0].roles =
          pack.reviewers[0].roles.filter(
            (role: string) => role !== "legal-procedure",
          );
        pack.reviewers[1].roles.push("legal-procedure");
      },
      (pack) => {
        pack.reviewers[1].publicName = pack.reviewers[0].publicName;
      },
      (pack) => {
        pack.reviewers[0].publicName = "/private/reviewer/alice";
      },
      (pack) => {
        pack.reviewers[0].capacityBasis =
          "Private verification at /Users/alice/matter; alice@example.test";
      },
      (pack) => {
        pack.reviewers[0].capacityBasis =
          " Synthetic test-only capacity ";
      },
      (pack) => {
        pack.opportunityReviews[0].evidenceIds = [
          pack.sourceChecks[0].evidenceIds[0],
        ];
      },
      (pack) => {
        const ids = Array.from(
          { length: 21 },
          (_, index) => `extra-qualification-${index}`,
        );
        pack.evidenceIndex.push(
          ...ids.map((id) => ({
            id,
            purpose: "reviewer-qualification",
            visibility: "public-https",
            url: `https://example.test/${id}`,
          })),
        );
        pack.reviewers[0].qualificationEvidenceIds = ids;
      },
      (pack) => {
        const evidenceId =
          pack.opportunityReviews[0].evidenceIds[0];
        pack.opportunityReviews[0].evidenceIds = [
          evidenceId,
          evidenceId,
        ];
      },
      (pack) => {
        pack.evidenceIndex.push({
          id: "private-path-role",
          purpose: "reviewer-independence",
          visibility: "private-custodian-record",
          custodianRole: "/private/reviewer/alice",
          opaqueRecordId: "123e4567-e89b-42d3-a456-426614174000",
        });
      },
      (pack) => {
        pack.evidenceIndex.push({
          id: "nil-private-evidence",
          purpose: "reviewer-independence",
          visibility: "private-custodian-record",
          custodianRole: "Independent review custodian",
          opaqueRecordId: "00000000-0000-0000-0000-000000000000",
        });
      },
      (pack) => {
        pack.evidenceIndex.push({
          id: "credential-bearing-url",
          purpose: "reviewer-independence",
          visibility: "public-https",
          url: "https://alice:secret@example.test/private",
        });
      },
      (pack) => {
        const reply =
          pack.scrutinyReviews[0].rightOfReply[0];
        Object.assign(reply, {
          disposition: "fresh-reply-completed",
          sentOn: "2026-07-24",
          replyDueOn: "2026-07-24",
          receivedOn: "2026-07-25",
          resolvedOn: "2026-07-24",
        });
      },
      (pack) => {
        pack.controls.emergencyStopDrill.startedAt = "2026-07-24";
      },
    ];

    for (const mutate of mutations) {
      const pack =
        completeProfessionalOpportunityReviewPackFixture(
          ukProfessionalOpportunities,
        ) as any;
      mutate(pack);
      pack.integrity.digest =
        professionalOpportunityReviewPackDigest(pack);
      expect(
        professionalOpportunityReviewPackSchema.safeParse(pack)
          .success,
      ).toBe(false);
    }
  });

  it("prepares and checks without overwriting or echoing paths", () => {
    const directory = temporaryDirectory();
    const output = join(directory, "pending-pack.json");
    const prepared = runCli(["prepare", output]);
    expect(prepared.status, prepared.stderr).toBe(0);
    expect(JSON.parse(prepared.stdout)).toMatchObject({
      ok: true,
      status: "pending",
      hostedDistributionApproved: false,
      networkUsed: false,
    });
    expect(`${prepared.stdout}${prepared.stderr}`).not.toContain(output);

    const editedDraft = JSON.parse(readFileSync(output, "utf8"));
    editedDraft.sourceChecks[0].pinpointOrScope =
      "Public-safe draft scope note";
    writeFileSync(output, JSON.stringify(editedDraft));
    const checked = runCli(["check", output, "--allow-pending"]);
    expect(checked.status, checked.stderr).toBe(0);
    expect(JSON.parse(checked.stdout)).toMatchObject({
      ok: true,
      status: "pending",
      digestCheck: "candidate-in-memory",
      privateValuesEchoed: false,
    });

    const original = readFileSync(output, "utf8");
    const repeated = runCli(["prepare", output]);
    expect(repeated.status).toBe(1);
    expect(readFileSync(output, "utf8")).toBe(original);
    expect(`${repeated.stdout}${repeated.stderr}`).not.toContain(output);
  });

  it("rejects duplicate keys and private values without logging them", () => {
    const directory = temporaryDirectory();
    const invalidPath = join(directory, "PRIVATE-ALICE-pack.json");
    const body = readFileSync(checkedPackPath, "utf8").replace(
      '"status": "pending"',
      '"status": "pending", "status": "complete"',
    );
    writeFileSync(invalidPath, body);
    const result = runCli([
      "check",
      invalidPath,
      "--allow-pending",
    ]);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).not.toContain(
      "PRIVATE-ALICE",
    );
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      inputPathEchoed: false,
      privateValuesEchoed: false,
    });
  });

  it("seals evidence without writing a hosted-distribution decision", () => {
    const directory = temporaryDirectory();
    const input = join(directory, "complete-pack.json");
    const output = join(directory, "sealed");
    const pack =
      completeProfessionalOpportunityReviewPackFixture(
        ukProfessionalOpportunities,
      );
    writeFileSync(input, JSON.stringify(pack));
    const result = runCli([
      "seal",
      input,
      output,
    ]);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      status: "complete",
      reviewPackSealed: true,
      hostedDistributionDecisionWritten: false,
      deploymentChanged: false,
      switchesChanged: false,
    });
    const finalizedPack = loadProfessionalOpportunityReviewPack(
      join(output, "qualified-review-pack.json"),
    );
    expect(finalizedPack).not.toBeNull();
    expect(
      existsSync(join(output, "publication-approval.candidate.json")),
    ).toBe(false);
    expect(
      ukProfessionalOpportunityPublicationApproval?.status,
    ).toBe("pending-qualified-review");

    const legacy = runCli([
      "finalize",
      input,
      join(directory, "legacy-finalized"),
      "--decision-on",
      ukProfessionalOpportunities.meta.retrievedAt,
    ]);
    expect(legacy.status).not.toBe(0);
  });

  it("strictly rejects duplicate authority keys in corpus and approval files", () => {
    const directory = temporaryDirectory();
    const corpusPath = join(directory, "corpus.json");
    const approvalPath = join(directory, "approval.json");
    const corpusBody = readFileSync(
      join(
        reviewRoot,
        "..",
        "data",
        "uk-professional-opportunities.json",
      ),
      "utf8",
    ).replace(
      '"schema": "taxsorted.uk.professional-opportunities.v1"',
      '"schema": "taxsorted.uk.professional-opportunities.v1", "schema": "duplicate"',
    );
    const approvalBody = readFileSync(
      join(reviewRoot, "..", "data", "publication-approval.json"),
      "utf8",
    ).replace(
      '"status": "pending-qualified-review"',
      '"status": "pending-qualified-review", "status": "approved-for-hosted-distribution"',
    );
    writeFileSync(corpusPath, corpusBody);
    writeFileSync(approvalPath, approvalBody);
    expect(() => loadUkProfessionalOpportunities(corpusPath)).toThrow(
      /duplicate/i,
    );
    expect(() =>
      loadProfessionalOpportunityPublicationApproval(approvalPath),
    ).toThrow(/duplicate/i);
  });

  it("sealing repairs an edited digest but never permits a pending pack", () => {
    const complete =
      completeProfessionalOpportunityReviewPackFixture(
        ukProfessionalOpportunities,
      ) as any;
    complete.integrity.digest = `sha256:${"0".repeat(64)}`;
    expect(
      sealProfessionalOpportunityReviewPack(
        complete,
        ukProfessionalOpportunities,
        corpusDigest,
        ukProfessionalOpportunities.meta.retrievedAt,
      ).integrity.digest,
    ).not.toBe(`sha256:${"0".repeat(64)}`);

    const pending = JSON.parse(
      readFileSync(checkedPackPath, "utf8"),
    );
    expect(() =>
      sealProfessionalOpportunityReviewPack(
        pending,
        ukProfessionalOpportunities,
        corpusDigest,
        ukProfessionalOpportunities.meta.retrievedAt,
      ),
    ).toThrow();
  });
});
