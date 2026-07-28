import { describe, expect, it } from "vitest";
import {
  interpretTaxIdentity,
  type TaxIdentityAssertion,
  type TaxIdentityExample,
  type TaxIdentityOverlapRule,
  type TaxIdentityScope,
} from "../index.js";

const dimensions = [
  { id: "legal-form", label: "Legal form", cardinality: "one" as const },
  { id: "tax-unit", label: "Tax unit", cardinality: "many" as const },
  { id: "nexus", label: "Territorial nexus", cardinality: "many" as const },
];

const subjects = [
  { id: "llp", label: "Example LLP", kind: "legal-person" },
  { id: "member", label: "Example member", kind: "natural-person" },
];

function scope(
  subjectRef: string,
  overrides: Partial<TaxIdentityScope> = {},
): TaxIdentityScope {
  return {
    subjectRef,
    jurisdiction: "United Kingdom",
    taxOrRegime: "Income Tax",
    activityOrContext: "Example trade",
    ruleset: "UK domestic law for 2026-27",
    ...overrides,
  };
}

function assertion(
  dimensionId: string,
  classificationId: string,
  status: TaxIdentityAssertion["status"],
  assertionScope: TaxIdentityScope,
  overrides: Partial<TaxIdentityAssertion> = {},
): TaxIdentityAssertion {
  return {
    dimensionId,
    classificationId,
    status,
    scope: assertionScope,
    effectiveDateBasis:
      status === "not-applicable"
        ? "not-applicable"
        : "current-at-corpus-review",
    basis: "Synthetic assumption.",
    sourceIds: ["source"],
    effectiveFrom: null,
    effectiveTo: null,
    ...overrides,
  };
}

function example(
  assertions: TaxIdentityAssertion[],
  overrides: Partial<TaxIdentityExample> = {},
): TaxIdentityExample {
  return {
    id: "llp-example",
    label: "Trading LLP",
    summary: "A synthetic LLP and member.",
    jurisdiction: "United Kingdom",
    asOf: "2026-07-28",
    archetypeIds: ["llp"],
    subjects,
    assertions,
    reviewTriggers: [],
    notDetermined: [],
    ...overrides,
  };
}

const transparentBodyRule: TaxIdentityOverlapRule = {
  id: "separate-but-transparent",
  label: "Separate in general law, looked through for this tax",
  archetypeIds: ["llp"],
  requires: [
    {
      id: "legal-body",
      dimensionId: "legal-form",
      classificationId: "body-corporate",
    },
    {
      id: "member-charge",
      dimensionId: "tax-unit",
      classificationId: "member-level",
    },
  ],
  relations: [
    {
      leftRequirementId: "legal-body",
      rightRequirementId: "member-charge",
      field: "subjectRef",
      operator: "different",
    },
    {
      leftRequirementId: "legal-body",
      rightRequirementId: "member-charge",
      field: "jurisdiction",
      operator: "same",
    },
    {
      leftRequirementId: "legal-body",
      rightRequirementId: "member-charge",
      field: "taxOrRegime",
      operator: "same",
    },
  ],
  meaning: "Legal personality and the person charged to tax differ.",
  dangerousShortcut: "Calling the body corporate a company taxpayer.",
  reviewTriggers: [],
  sourceIds: ["src-llp-tax"],
};

const noNexus = assertion(
  "nexus",
  "not-applicable-to-example",
  "not-applicable",
  scope("llp"),
);

describe("interpretTaxIdentity", () => {
  it("chooses a requirement combination that satisfies same and different scope relations", () => {
    const result = interpretTaxIdentity(
      dimensions,
      [transparentBodyRule],
      example([
        assertion(
          "legal-form",
          "body-corporate",
          "established",
          scope("llp"),
        ),
        assertion(
          "tax-unit",
          "member-level",
          "established",
          scope("llp"),
        ),
        assertion(
          "tax-unit",
          "member-level",
          "conditional",
          scope("member"),
        ),
        noNexus,
      ]),
    );

    expect(result.overlaps).toEqual([
      expect.objectContaining({
        id: "separate-but-transparent",
        status: "conditional",
        matchedAssertions: {
          "legal-body": expect.objectContaining({
            status: "established",
            scope: expect.objectContaining({ subjectRef: "llp" }),
          }),
          "member-charge": expect.objectContaining({
            status: "conditional",
            scope: expect.objectContaining({ subjectRef: "member" }),
          }),
        },
      }),
    ]);
    expect(result.review.status).toBe("review-before-use");
    expect(result.review.reasons).toContain(
      "Overlap separate-but-transparent is conditional on at least one assertion.",
    );
    expect(result.unresolvedDimensionIds).toEqual([]);
    expect(result.example.subjects).toEqual(subjects);
    expect(result.boundary.singleLabelSufficient).toBe(false);
  });

  it("keeps disputed overlap evidence explicit and requires review", () => {
    const result = interpretTaxIdentity(
      dimensions,
      [transparentBodyRule],
      example([
        assertion(
          "legal-form",
          "body-corporate",
          "established",
          scope("llp"),
        ),
        assertion(
          "tax-unit",
          "member-level",
          "disputed",
          scope("member"),
        ),
        noNexus,
      ]),
    );

    expect(result.overlaps[0]).toEqual(
      expect.objectContaining({ status: "disputed" }),
    );
    expect(
      result.overlaps[0]?.matchedAssertions["member-charge"]?.status,
    ).toBe("disputed");
    expect(result.review.status).toBe("needs-review");
    expect(result.review.reasons).toContain(
      "Overlap separate-but-transparent is matched by at least one disputed assertion.",
    );
  });

  it("does not match unknown evidence and treats in-period not-applicable as resolved", () => {
    const result = interpretTaxIdentity(
      dimensions,
      [transparentBodyRule],
      example([
        assertion(
          "legal-form",
          "body-corporate",
          "unknown",
          scope("llp"),
          { effectiveDateBasis: "unknown" },
        ),
        assertion(
          "tax-unit",
          "member-level",
          "established",
          scope("member"),
        ),
        noNexus,
      ]),
    );

    expect(result.overlaps).toEqual([]);
    expect(result.unresolvedDimensionIds).toEqual(["legal-form"]);
    expect(result.unresolvedDimensionIds).not.toContain("nexus");
    expect(result.review.status).toBe("needs-review");
  });

  it("gates overlap rules by the example's declared archetypes", () => {
    const result = interpretTaxIdentity(
      dimensions,
      [transparentBodyRule],
      example(
        [
          assertion(
            "legal-form",
            "body-corporate",
            "established",
            scope("llp"),
          ),
          assertion(
            "tax-unit",
            "member-level",
            "established",
            scope("member"),
          ),
          noNexus,
        ],
        { archetypeIds: ["company"] },
      ),
    );

    expect(result.overlaps).toEqual([]);
    expect(result.review.status).toBe("worked-example");
  });

  it("checks one-value conflicts within a full scope, not across subjects", () => {
    const acrossSubjects = interpretTaxIdentity(
      dimensions,
      [],
      example([
        assertion(
          "legal-form",
          "body-corporate",
          "established",
          scope("llp"),
        ),
        assertion(
          "legal-form",
          "natural-person",
          "established",
          scope("member"),
        ),
        assertion(
          "tax-unit",
          "member-level",
          "established",
          scope("member"),
        ),
        noNexus,
      ]),
    );
    expect(acrossSubjects.review.conflictingDimensionIds).toEqual([]);

    const withinOneScope = interpretTaxIdentity(
      dimensions,
      [],
      example([
        assertion(
          "legal-form",
          "body-corporate",
          "established",
          scope("llp"),
        ),
        assertion(
          "legal-form",
          "partnership-without-personality",
          "established",
          scope("llp"),
        ),
        assertion(
          "tax-unit",
          "member-level",
          "established",
          scope("member"),
        ),
        noNexus,
      ]),
    );
    expect(withinOneScope.review.conflictingDimensionIds).toEqual([
      "legal-form",
    ]);
    expect(withinOneScope.review.status).toBe("needs-review");
  });

  it("preserves effective-date checks with an explicit date basis", () => {
    const result = interpretTaxIdentity(
      dimensions,
      [],
      example([
        assertion(
          "legal-form",
          "body-corporate",
          "established",
          scope("llp"),
        ),
        assertion(
          "tax-unit",
          "member-level",
          "established",
          scope("member"),
          {
            effectiveDateBasis: "stated-interval",
            effectiveTo: "2024-12-31",
          },
        ),
        noNexus,
      ]),
    );

    expect(result.unresolvedDimensionIds).toEqual(["tax-unit"]);
    expect(result.review.inactiveAssertionIds).toEqual([
      "tax-unit:member-level@member|United Kingdom|Income Tax|Example trade|UK domestic law for 2026-27",
    ]);
    expect(result.review.status).toBe("needs-review");
  });

  it("rejects inverted intervals and bounds attached to another date basis", () => {
    expect(() =>
      interpretTaxIdentity(
        dimensions,
        [],
        example([
          assertion(
            "legal-form",
            "body-corporate",
            "established",
            scope("llp"),
            {
              effectiveDateBasis: "stated-interval",
              effectiveFrom: "2027-01-01",
              effectiveTo: "2026-01-01",
            },
          ),
        ]),
      ),
    ).toThrow(/inverted effective interval/);

    expect(() =>
      interpretTaxIdentity(
        dimensions,
        [],
        example([
          assertion(
            "legal-form",
            "body-corporate",
            "established",
            scope("llp"),
            {
              effectiveDateBasis: "current-at-corpus-review",
              effectiveFrom: "2026-01-01",
            },
          ),
        ]),
      ),
    ).toThrow(/date bounds without a stated-interval basis/);
  });

  it("validates subject references and pairwise relation references", () => {
    expect(() =>
      interpretTaxIdentity(
        dimensions,
        [],
        example([
          assertion(
            "legal-form",
            "body-corporate",
            "established",
            scope("missing"),
          ),
          assertion(
            "tax-unit",
            "member-level",
            "established",
            scope("member"),
          ),
          noNexus,
        ]),
      ),
    ).toThrow(/unknown subject missing/);

    expect(() =>
      interpretTaxIdentity(
        dimensions,
        [
          {
            ...transparentBodyRule,
            relations: [
              {
                leftRequirementId: "legal-body",
                rightRequirementId: "missing-requirement",
                field: "subjectRef",
                operator: "different",
              },
            ],
          },
        ],
        example([
          assertion(
            "legal-form",
            "body-corporate",
            "established",
            scope("llp"),
          ),
          assertion(
            "tax-unit",
            "member-level",
            "established",
            scope("member"),
          ),
          noNexus,
        ]),
      ),
    ).toThrow(/unknown requirement missing-requirement/);
  });
});
