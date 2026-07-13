import { describe, expect, it } from "vitest";
import {
  ukCharities,
  ukCharitiesSchema,
  validateUkCharitiesGraph,
  type UkCharities,
} from "../uk-charities.js";

describe("UK charities corpus integrity", () => {
  it("loads a substantive UK-wide system map without organisation or people records", () => {
    expect(ukCharities.schema).toBe("taxsorted.uk.charities/2");
    expect(ukCharities.meta.reviewedOn).toBe("2026-07-13");
    expect(ukCharities.sources.length).toBeGreaterThanOrEqual(25);
    expect(ukCharities.regulators.length).toBeGreaterThanOrEqual(7);
    expect(ukCharities.registers.length).toBeGreaterThanOrEqual(6);
    expect(ukCharities.taxTreatments.length).toBeGreaterThanOrEqual(9);
    expect(ukCharities.taxRules).toHaveLength(16);
    expect(ukCharities.officialProcedures).toHaveLength(2);
    expect(ukCharities.pipelineStages.length).toBeGreaterThanOrEqual(12);
    expect(ukCharities.transparencyGaps.length).toBeGreaterThanOrEqual(12);
    expect(Object.hasOwn(ukCharities, "organisations")).toBe(false);
    expect(Object.hasOwn(ukCharities, "people")).toBe(false);
    expect(Object.hasOwn(ukCharities, "trustees")).toBe(false);
  });

  it("keeps the most important tax and ownership boundaries explicit", () => {
    const vat = ukCharities.taxTreatments.find(
      (item) => item.id === "tax-vat-no-blanket-exemption"
    );
    expect(vat?.position).toBe("no-blanket-exemption");
    expect(vat?.notEquivalentTo).toContain("All purchases being zero-rated.");

    const analysis = ukCharities.taxTreatments.find(
      (item) => item.id === "tax-public-benefit-bargain-analysis"
    );
    expect(analysis?.reasoningStatus).toBe("taxsorted-analysis");
    expect(analysis?.jurisdictions).toEqual(["England and Wales"]);
    expect(analysis?.reasoning).toMatch(/^TaxSorted analysis:/);
    expect(analysis?.notEquivalentTo).toContain(
      "Automatic relief because an organisation is religious."
    );

    const stewardship = ukCharities.controlModels.find(
      (item) => item.id === "control-trustee-stewardship"
    );
    expect(stewardship?.misleadingLabel).toMatch(/false idea/i);
  });

  it("rejects dangling references and evidence pointers into provenance", () => {
    const dangling = structuredClone(ukCharities) as UkCharities;
    dangling.registers[0].regulatorIds = ["regulator-not-real"];
    expect(() => validateUkCharitiesGraph(dangling)).toThrow(
      /unknown regulator: regulator-not-real/
    );

    const provenance = structuredClone(ukCharities) as UkCharities;
    provenance.regulators[0].evidence[0].fields = ["/sourceIds"];
    expect(() => validateUkCharitiesGraph(provenance)).toThrow(
      /evidence points into provenance metadata/
    );
  });

  it("rejects duplicate references and unsupported territorial overclaims", () => {
    const duplicate = structuredClone(ukCharities) as UkCharities;
    duplicate.helpRoutes[0].registerIds.push(duplicate.helpRoutes[0].registerIds[0]);
    expect(() => validateUkCharitiesGraph(duplicate)).toThrow(/repeats register reference/);

    const overclaim = structuredClone(ukCharities) as UkCharities;
    const englandOnly = overclaim.taxTreatments.find(
      (item) => item.id === "tax-charitable-rates-england"
    );
    expect(englandOnly).toBeDefined();
    englandOnly!.jurisdictions = ["United Kingdom"];
    expect(() => validateUkCharitiesGraph(overclaim)).toThrow(
      /lacks source coverage for jurisdiction: Wales/
    );
  });

  it("rejects impossible dates, future provenance and unknown fields", () => {
    const impossible = structuredClone(ukCharities) as unknown as Record<string, any>;
    impossible.sources[0].reviewedOn = "2026-13-40";
    expect(() => ukCharitiesSchema.parse(impossible)).toThrow(/invalid calendar date/);

    const future = structuredClone(ukCharities) as UkCharities;
    future.sources[0].lastUpdated = "2026-07-14";
    expect(() => validateUkCharitiesGraph(future)).toThrow(
      /lastUpdated is after corpus review date/
    );

    const afterSourceReview = structuredClone(ukCharities) as UkCharities;
    afterSourceReview.regulators[0].evidence[0].observedOn = "2026-07-12";
    expect(() => validateUkCharitiesGraph(afterSourceReview)).toThrow(
      /evidence is observed after source review date/
    );

    const unknown = structuredClone(ukCharities) as unknown as Record<string, any>;
    unknown.regulators[0].privateContact = "must never be silently stripped";
    expect(() => ukCharitiesSchema.parse(unknown)).toThrow(/Unrecognized key/);
  });

  it("admits exact trust and company law without turning it into a case finding", () => {
    const targetRules = ukCharities.taxRules.filter(
      (rule) => rule.taxTreatmentId === "tax-non-charitable-expenditure"
    );
    expect(new Set(targetRules.map((rule) => rule.taxpayerClass))).toEqual(
      new Set([
        "charitable-trust-income-tax",
        "charitable-company-corporation-tax",
      ])
    );
    expect(targetRules.every((rule) => (
      rule.summaryAuthority === "taxsorted-analysis-of-primary-law"
      && rule.doesNotProve.some((boundary) => /not a finding/i.test(boundary))
    ))).toBe(true);
    for (const rule of targetRules) {
      const authority = ukCharities.sources.find(
        (source) => source.id === rule.authoritySourceId
      );
      expect(authority).toMatchObject({
        authorityLevel: "primary-law",
        publicationMode: "metadata-only",
        reuseStatus: "confirmed",
      });
      expect(authority?.url).toMatch(/\/section\/[0-9A-Za-z]+$/);
    }

    for (const procedure of ukCharities.officialProcedures) {
      expect(procedure.summaryAuthority).toBe("taxsorted-analysis-of-primary-law");
      expect(procedure.requiredCaseSelectors).toEqual(expect.arrayContaining([
        "decision-type",
        "hmrc-requirement-made-date",
        "specification-notice-status",
        "specification-notice-date-if-given",
        "taxpayer-class",
        "tax-period",
        "jurisdiction",
      ]));
      expect(procedure.paymentEffect).toMatch(/does not itself/i);
      expect(procedure.doesNotProve.join(" ")).toMatch(/appeal|payable/i);
    }
  });

  it("rejects whole-Act authority, guidance promotion, valid-section swaps and taxpayer-class drift", () => {
    const wholeAct = structuredClone(ukCharities) as UkCharities;
    const wholeActRule = wholeAct.taxRules[0];
    const wholeActSource = wholeAct.sources.find(
      (source) => source.id === wholeActRule.authoritySourceId
    )!;
    wholeActSource.url = "https://www.legislation.gov.uk/ukpga/2007/3";
    expect(() => validateUkCharitiesGraph(wholeAct)).toThrow(/exact current primary-law/);

    const wrongPublisher = structuredClone(ukCharities) as UkCharities;
    const wrongPublisherRule = wrongPublisher.taxRules[0];
    wrongPublisher.sources.find(
      (source) => source.id === wrongPublisherRule.authoritySourceId
    )!.publisher = "UK Parliament";
    expect(() => validateUkCharitiesGraph(wrongPublisher)).toThrow(
      /exact current primary-law/
    );

    const guidance = structuredClone(ukCharities) as UkCharities;
    const guidanceRule = guidance.taxRules[0];
    const guidanceSource = guidance.sources.find(
      (source) => source.id === guidanceRule.authoritySourceId
    )!;
    guidanceSource.authorityLevel = "tax-authority-guidance";
    expect(() => validateUkCharitiesGraph(guidance)).toThrow(/exact current primary-law/);

    const swapped = structuredClone(ukCharities) as UkCharities;
    const swappedRule = swapped.taxRules.find((rule) => rule.id === "rule-ita-2007-s539")!;
    swappedRule.authoritySourceId = "src-ita-2007-s540";
    swappedRule.sourceIds = ["src-ita-2007-s540"];
    swappedRule.evidence = swappedRule.evidence.map((entry) => ({
      ...entry,
      sourceId: "src-ita-2007-s540",
    }));
    expect(() => validateUkCharitiesGraph(swapped)).toThrow(/citation does not identify/);

    const relabelled = structuredClone(ukCharities) as UkCharities;
    relabelled.taxRules[0].taxpayerClass = "charitable-company-corporation-tax";
    expect(() => validateUkCharitiesGraph(relabelled)).toThrow(/taxpayer class conflicts/);

    const missingNoticeSelector = structuredClone(ukCharities) as UkCharities;
    missingNoticeSelector.officialProcedures[0].requiredCaseSelectors = [
      "decision-type",
      "specification-notice-status",
      "specification-notice-date-if-given",
      "taxpayer-class",
      "tax-period",
      "jurisdiction",
    ];
    expect(() => validateUkCharitiesGraph(missingNoticeSelector)).toThrow(
      /omits required case selector: hmrc-requirement-made-date/
    );

    const crossClassRule = structuredClone(ukCharities) as UkCharities;
    crossClassRule.officialProcedures[0].taxRuleIds = ["rule-cta-2010-s495"];
    expect(() => validateUkCharitiesGraph(crossClassRule)).toThrow(
      /another treatment or taxpayer class/
    );

    const staleProcedureLaw = structuredClone(ukCharities) as UkCharities;
    const procedureLawId = staleProcedureLaw.officialProcedures[0].legalBasisSourceIds[0];
    staleProcedureLaw.sources.find((source) => source.id === procedureLawId)!.status = "historical";
    expect(() => validateUkCharitiesGraph(staleProcedureLaw)).toThrow(
      /legal basis is not an admitted exact primary-law provision/
    );

    const crossClassNext = structuredClone(ukCharities) as UkCharities;
    crossClassNext.officialProcedures[0].nextProcedureIds = [
      crossClassNext.officialProcedures[1].id,
    ];
    expect(() => validateUkCharitiesGraph(crossClassNext)).toThrow(
      /next procedure from another treatment or taxpayer class/
    );

    const actorless = structuredClone(ukCharities) as UkCharities;
    actorless.officialProcedures[0].decisionByRegulatorIds = [];
    expect(() => validateUkCharitiesGraph(actorless)).toThrow(
      /has no decision regulator/
    );

    const extraLegalBranch = structuredClone(ukCharities) as UkCharities;
    extraLegalBranch.officialProcedures[0].legalBasisSourceIds.push("src-cta-2010-s495");
    extraLegalBranch.officialProcedures[0].sourceIds.push("src-cta-2010-s495");
    extraLegalBranch.officialProcedures[0].evidence.push({
      sourceId: "src-cta-2010-s495",
      fields: ["/legalBasisSourceIds"],
      locator: "invalid cross-branch fixture",
      observedOn: "2026-07-13",
      method: "derived-exact-id-mapping",
    });
    expect(() => validateUkCharitiesGraph(extraLegalBranch)).toThrow(
      /legal bases do not exactly match linked tax rule authorities/
    );

    const fieldDrift = structuredClone(ukCharities) as UkCharities;
    fieldDrift.officialProcedures[0].treatmentFieldPointers = ["/benefit"];
    expect(() => validateUkCharitiesGraph(fieldDrift)).toThrow(
      /treatment fields do not exactly match linked tax rules/
    );

    const wrongRuleAdministrator = structuredClone(ukCharities) as UkCharities;
    wrongRuleAdministrator.taxRules[0].administeredByRegulatorIds = ["reg-ccew"];
    expect(() => validateUkCharitiesGraph(wrongRuleAdministrator)).toThrow(
      /administrator is not a tax authority/
    );

    const wrongProcedureActor = structuredClone(ukCharities) as UkCharities;
    wrongProcedureActor.officialProcedures[0].decisionByRegulatorIds = ["reg-ccew"];
    expect(() => validateUkCharitiesGraph(wrongProcedureActor)).toThrow(
      /decision regulators do not exactly match linked tax rule administrators/
    );

    const treatmentDrift = structuredClone(ukCharities) as UkCharities;
    treatmentDrift.taxRules[0].taxTreatmentId = "tax-gift-aid";
    expect(() => validateUkCharitiesGraph(treatmentDrift)).toThrow(
      /outside the admitted non-charitable-expenditure treatment/
    );
  });

  it("keeps unavailable or unsafe source doors fail closed", () => {
    expect(
      ukCharities.registers.find((item) => item.id === "register-scotland-charities")
        ?.ingestionStatus
    ).toBe("fail-closed");
    expect(
      ukCharities.registers.find((item) => item.id === "register-ni-charities")
        ?.ingestionStatus
    ).toBe("manual-only");
    expect(
      ukCharities.transparencyGaps.find(
        (item) => item.id === "gap-people-belief-layer-excluded"
      )?.status
    ).toBe("bounded-by-design");
  });
});
