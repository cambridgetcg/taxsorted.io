import { describe, expect, it } from "vitest";
import {
  assertTaxPositionPassportInvariants,
  buildTaxPositionPassport,
  TAX_POSITION_PASSPORT_EXAMPLE,
  TAX_POSITION_PASSPORT_SCHEMA,
  type TaxPositionPassport,
} from "../tax-position-passport";

function employmentOnly() {
  return buildTaxPositionPassport({
    createdAt: "2026-07-16T15:00:00.000Z",
    storedInBrowser: true,
    incomeSources: {
      employment: "yes",
      "self-employment": "no",
      "uk-property": "no",
      "foreign-property": "no",
      "other-or-complex": "unknown",
    },
    evidence: {
      "employment-pay-and-tax": "held",
      "self-employment-return": "not-checked",
      "self-employment-records": "not-checked",
      "uk-property-return": "not-checked",
      "uk-property-records": "not-checked",
      "foreign-property-return": "not-checked",
      "foreign-property-records": "not-checked",
      "mtd-exemption-evidence": "not-checked",
    },
  });
}

describe("Tax Position Passport contract", () => {
  it("builds a facts-only employment passport without inventing a tax calculation", () => {
    const passport = employmentOnly();

    expect(passport.schema).toBe(TAX_POSITION_PASSPORT_SCHEMA);
    expect(passport.positions).toEqual([]);
    expect(passport.assurance).toEqual({
      identityVerified: false,
      signed: false,
      professionallyReviewed: false,
      filed: false,
    });
    expect(passport.profile.incomeSources).toContainEqual({
      id: "employment",
      answer: "yes",
      origin: "user",
    });
    expect(
      passport.profile.evidence.find(
        (item) => item.id === "self-employment-records",
      )?.state,
    ).toBe("not-expected");
  });

  it("keeps the complete replayable MTD request, TaxAnswer and source receipts", () => {
    const [position] = TAX_POSITION_PASSPORT_EXAMPLE.positions;

    expect(position.request.schema).toBe(
      "taxsorted.uk.mtd-income-tax.request/1",
    );
    expect(position.answer).toMatchObject({
      schema: "taxsorted.tax-answer/1",
      capability: { id: "uk.mtd-income-tax.readiness" },
      dataUse: { stored: false, usedForTraining: false },
    });
    expect(position.answer.evidence.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "uksi-2026-336",
          legalForce: "binding-law",
        }),
      ]),
    );
    expect(TAX_POSITION_PASSPORT_EXAMPLE.dataHandling).toMatchObject({
      generationMode: "browser-local",
      sentToTaxSorted: false,
      rawDocumentsIncluded: false,
    });
  });

  it("keeps foreign-property evidence and exemption evidence live for a foreign-property source", () => {
    const passport = buildTaxPositionPassport({
      createdAt: "2026-07-16T15:00:00.000Z",
      storedInBrowser: false,
      incomeSources: {
        employment: "no",
        "self-employment": "no",
        "uk-property": "no",
        "foreign-property": "yes",
        "other-or-complex": "no",
      },
      evidence: {
        "employment-pay-and-tax": "not-checked",
        "self-employment-return": "not-checked",
        "self-employment-records": "not-checked",
        "uk-property-return": "not-checked",
        "uk-property-records": "not-checked",
        "foreign-property-return": "held",
        "foreign-property-records": "held",
        "mtd-exemption-evidence": "not-checked",
      },
    });

    expect(
      passport.profile.evidence.find(
        (item) => item.id === "foreign-property-records",
      )?.state,
    ).toBe("held");
    expect(
      passport.profile.evidence.find(
        (item) => item.id === "mtd-exemption-evidence",
      )?.state,
    ).toBe("not-checked");
    expect(
      passport.profile.evidence.find(
        (item) => item.id === "self-employment-records",
      )?.state,
    ).toBe("not-expected");
    expect(
      passport.profile.evidence.find(
        (item) => item.id === "uk-property-records",
      )?.state,
    ).toBe("not-expected");
  });

  it("rejects a request and answer whose capabilities do not match", () => {
    const broken = structuredClone(TAX_POSITION_PASSPORT_EXAMPLE);
    broken.positions[0].answer.capability.id = "uk.other";

    expect(() => assertTaxPositionPassportInvariants(broken)).toThrow(
      /request and answer capability do not match/i,
    );
  });

  it("rejects exact forbidden personal-data fields", () => {
    const broken = structuredClone(employmentOnly()) as TaxPositionPassport & {
      nino?: string;
    };
    broken.nino = "QQ123456C";

    expect(() => assertTaxPositionPassportInvariants(broken)).toThrow(
      /forbids personal-data key/i,
    );
  });

  it("rejects inflated assurance claims", () => {
    const broken = structuredClone(employmentOnly());
    (broken.assurance as { identityVerified: boolean }).identityVerified = true;

    expect(() => assertTaxPositionPassportInvariants(broken)).toThrow(
      /assurance must remain/i,
    );
  });

  it("contains no stable identity, contact or tax-reference fields", () => {
    const json = JSON.stringify(TAX_POSITION_PASSPORT_EXAMPLE);

    for (const key of [
      "name",
      "nino",
      "utr",
      "address",
      "email",
      "phone",
      "ownerEntityId",
      "hmrcBusinessId",
      "workspaceId",
      "apiKey",
    ]) {
      expect(json).not.toContain(`"${key}"`);
    }
  });
});
