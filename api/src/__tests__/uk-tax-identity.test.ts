import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  interpretUkTaxIdentityExample,
  loadUkTaxIdentity,
  makeUkTaxIdentityExampleDetail,
  taxIdentityInterpretationSchema,
  ukTaxIdentity,
  ukTaxIdentityJsonSchemaDocument,
  ukTaxIdentitySchema,
  validateUkTaxIdentity,
} from "../uk-tax-identity.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

describe("UK tax-identity corpus", () => {
  it("loads a strict, frozen and source-backed framework", () => {
    expect(ukTaxIdentity.schema).toBe("taxsorted.uk.tax-identity/1");
    expect(ukTaxIdentity.meta).toMatchObject({
      title: "UK tax identity framework",
      version: "2026-07-28.2",
      reviewedOn: "2026-07-28",
      lawAsAt: "2026-07-28",
      jurisdiction: "United Kingdom",
    });
    expect(ukTaxIdentity.sources).toHaveLength(36);
    expect(ukTaxIdentity.dimensions).toHaveLength(8);
    expect(ukTaxIdentity.archetypes).toHaveLength(10);
    expect(ukTaxIdentity.overlaps).toHaveLength(8);
    expect(ukTaxIdentity.milestones).toHaveLength(13);
    expect(ukTaxIdentity.exampleProfiles).toHaveLength(7);
    expect(ukTaxIdentity.gaps).toHaveLength(13);
    expect(ukTaxIdentity).not.toHaveProperty("examples");
    expect(Object.isFrozen(ukTaxIdentity)).toBe(true);
    expect(Object.isFrozen(ukTaxIdentity.dimensions)).toBe(true);
    expect(Object.isFrozen(ukTaxIdentity.dimensions[0])).toBe(true);
    expect(() =>
      ukTaxIdentitySchema.parse(structuredClone(ukTaxIdentity)),
    ).not.toThrow();

    expect(
      ukTaxIdentity.milestones.find(
        (milestone) =>
          milestone.id === "milestone-2025-crs-consolidation",
      )?.date,
    ).toBe("2025-04");
    expect(
      ukTaxIdentity.meta.boundaries.join(" "),
    ).toMatch(/No endpoint accepts/i);
    expect(
      ukTaxIdentity.meta.editorialRules.join(" "),
    ).toMatch(/Never collapse legal form.*taxable person/i);
    expect(
      ukTaxIdentity.dimensions.map((dimension) => dimension.id),
    ).not.toContain("time-evidence");
    expect(
      ukTaxIdentity.dimensions
        .flatMap((dimension) => dimension.classificationValues)
        .some((classification) =>
          /(?:unknown|unresolved)$/u.test(classification.id),
        ),
    ).toBe(false);
    for (const assertion of ukTaxIdentity.exampleProfiles.flatMap(
      (example) => example.assertions,
    )) {
      if (assertion.status === "unknown") {
        expect(assertion.classificationId).not.toMatch(
          /(?:unknown|unresolved)$/u,
        );
      }
    }
  });

  it("interprets every synthetic profile deterministically through all dimensions", () => {
    for (const example of ukTaxIdentity.exampleProfiles) {
      const first = interpretUkTaxIdentityExample(example.id);
      const second = interpretUkTaxIdentityExample(example.id);
      expect(first).toEqual(second);
      expect(() =>
        taxIdentityInterpretationSchema.parse(first),
      ).not.toThrow();
      expect(first?.identityVector).toHaveLength(
        ukTaxIdentity.dimensions.length,
      );
      expect(first?.example.id).toBe(example.id);
      expect(first?.example.archetypeIds).toEqual(
        [...example.archetypeIds].sort(),
      );
      expect(first?.example.subjects).toHaveLength(
        example.subjects.length,
      );
      expect(first?.boundary).toEqual({
        syntheticExample: true,
        personalFactsAccepted: false,
        legalAdvice: false,
        filingOrSubmission: false,
        singleLabelSufficient: false,
      });
      const detail = makeUkTaxIdentityExampleDetail(example.id)!;
      expect(detail.exampleProfile).toEqual(example);
      expect(detail.interpretation).toEqual(first);
      expect(detail.sources.map((source) => source.id)).toEqual(
        ukTaxIdentity.sources
          .filter((source) => first?.sourceIds.includes(source.id))
          .map((source) => source.id),
      );
    }

    expect(
      interpretUkTaxIdentityExample("example-trading-llp")?.overlaps,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "overlap-body-corporate-and-member-taxation",
          status: expect.stringMatching(
            /^(established|conditional|disputed)$/,
          ),
          matchedAssertions: expect.objectContaining({
            "llp-body": expect.objectContaining({
              scope: expect.objectContaining({
                subjectRef: expect.any(String),
                jurisdiction: expect.any(String),
                taxOrRegime: expect.any(String),
                activityOrContext: expect.any(String),
                ruleset: expect.any(String),
              }),
            }),
          }),
        }),
      ]),
    );
    expect(
      interpretUkTaxIdentityExample("example-trading-llp")?.review.status,
    ).toBe("needs-review");
    expect(interpretUkTaxIdentityExample("not-an-example")).toBeUndefined();
    expect(makeUkTaxIdentityExampleDetail("not-an-example")).toBeUndefined();
  });

  it("fails closed on broken references, mismatched dimensions and incomplete vectors", () => {
    const unknownSource = structuredClone(ukTaxIdentity);
    unknownSource.dimensions[0]!.sourceIds[0] = "src-not-real";
    expect(() => validateUkTaxIdentity(unknownSource)).toThrow(
      /unknown source: src-not-real/i,
    );

    const mismatchedClassification = structuredClone(ukTaxIdentity);
    mismatchedClassification.exampleProfiles[0]!.assertions[0]!
      .classificationId = "capacity:employee";
    expect(() =>
      validateUkTaxIdentity(mismatchedClassification),
    ).toThrow(/belongs to capacity-activity/i);

    const incompleteVector = structuredClone(ukTaxIdentity);
    incompleteVector.exampleProfiles[0]!.assertions =
      incompleteVector.exampleProfiles[0]!.assertions.filter(
        (assertion) => assertion.dimensionId !== "legal-existence",
      );
    expect(() => validateUkTaxIdentity(incompleteVector)).toThrow(
      /no assertion for dimension legal-existence/i,
    );

    const invertedInterval = structuredClone(ukTaxIdentity);
    invertedInterval.exampleProfiles[0]!.assertions[0]!.effectiveFrom =
      "2026-12-31";
    invertedInterval.exampleProfiles[0]!.assertions[0]!.effectiveTo =
      "2026-01-01";
    expect(() => validateUkTaxIdentity(invertedInterval)).toThrow(
      /inverted effective interval/i,
    );

    const duplicateRecord = structuredClone(ukTaxIdentity);
    duplicateRecord.gaps[0]!.id = duplicateRecord.sources[0]!.id;
    expect(() => validateUkTaxIdentity(duplicateRecord)).toThrow(
      /duplicate corpus record ID/i,
    );

    const unknownClassificationSource = structuredClone(ukTaxIdentity);
    unknownClassificationSource.dimensions[0]!.classificationValues[0]!
      .sourceIds[0] = "src-not-real";
    expect(() =>
      validateUkTaxIdentity(unknownClassificationSource),
    ).toThrow(/unknown source: src-not-real/i);

    const unknownSubject = structuredClone(ukTaxIdentity);
    unknownSubject.exampleProfiles[0]!.assertions[0]!.scope.subjectRef =
      "not-a-subject";
    expect(() => validateUkTaxIdentity(unknownSubject)).toThrow(
      /unknown subject: not-a-subject/i,
    );

    const unknownArchetype = structuredClone(ukTaxIdentity);
    unknownArchetype.exampleProfiles[0]!.archetypeIds[0] =
      "archetype-not-real";
    expect(() => validateUkTaxIdentity(unknownArchetype)).toThrow(
      /unknown archetype: archetype-not-real/i,
    );

    const brokenRelation = structuredClone(ukTaxIdentity);
    brokenRelation.overlaps[0]!.relations[0]!.leftRequirementId =
      "requirement-not-real";
    expect(() => validateUkTaxIdentity(brokenRelation)).toThrow(
      /unknown requirement: requirement-not-real/i,
    );

    const unboundedStatedInterval = structuredClone(ukTaxIdentity);
    unboundedStatedInterval.exampleProfiles[0]!.assertions[0]!
      .effectiveDateBasis = "stated-interval";
    unboundedStatedInterval.exampleProfiles[0]!.assertions[0]!.effectiveFrom =
      null;
    unboundedStatedInterval.exampleProfiles[0]!.assertions[0]!.effectiveTo =
      null;
    expect(() =>
      validateUkTaxIdentity(unboundedStatedInterval),
    ).toThrow(/states an interval without a date bound/i);

    const unpairedNotApplicable = structuredClone(ukTaxIdentity);
    unpairedNotApplicable.exampleProfiles[0]!.assertions[0]!.status =
      "not-applicable";
    expect(() =>
      validateUkTaxIdentity(unpairedNotApplicable),
    ).toThrow(/must pair not-applicable status and effective-date basis/i);
  });

  it("rejects unknown object fields and duplicate JSON keys", async () => {
    const extraField = {
      ...structuredClone(ukTaxIdentity),
      taxpayerRows: [],
    };
    expect(ukTaxIdentitySchema.safeParse(extraField).success).toBe(false);

    const extraNestedField = structuredClone(ukTaxIdentity) as unknown as {
      dimensions: Array<Record<string, unknown>>;
    };
    extraNestedField.dimensions[0]!.surprise = true;
    expect(ukTaxIdentitySchema.safeParse(extraNestedField).success).toBe(
      false,
    );

    const directory = await mkdtemp(
      join(tmpdir(), "taxsorted-tax-identity-"),
    );
    temporaryDirectories.push(directory);
    const file = join(directory, "duplicate.json");
    await writeFile(
      file,
      '{"schema":"taxsorted.uk.tax-identity/1","schema":"taxsorted.uk.tax-identity/1"}',
      "utf8",
    );
    expect(() => loadUkTaxIdentity(file)).toThrow(/duplicate/i);
  });

  it("publishes structural JSON Schema with explicit runtime limits", () => {
    expect(ukTaxIdentityJsonSchemaDocument.$id).toBe(
      "https://api.taxsorted.io/v1/tax-identity/uk/schema",
    );
    expect(ukTaxIdentityJsonSchemaDocument.additionalProperties).toBe(
      false,
    );
    expect(
      ukTaxIdentityJsonSchemaDocument["x-taxsorted-validation-scope"],
    ).toMatchObject({
      jsonSchema: "structural-shape-only",
      runtimeSemanticValidationRequired: true,
      personalFactsAccepted: false,
      externalStateChanged: false,
    });
    expect(
      ukTaxIdentityJsonSchemaDocument[
        "x-taxsorted-runtime-invariants"
      ],
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/source.*resolves/i),
        expect.stringMatching(/synthetic example.*every declared/i),
      ]),
    );
  });
});
