import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ukCharities,
  ukCharitiesSchema,
  validateUkCharitiesGraph,
  type UkCharities,
} from "../uk-charities.js";

describe("UK charities corpus integrity", () => {
  it("stores the reviewed base corpus as native v3 data without a loader migration", () => {
    const raw = JSON.parse(
      readFileSync(
        new URL(
          "../../../research/uk/charities/data/uk-charities.json",
          import.meta.url
        ),
        "utf8"
      )
    );
    const parsed = ukCharitiesSchema.parse(raw);
    expect(parsed.taxRules).toHaveLength(16);
    expect(parsed.taxRules.every((rule) => (
      rule.authoritySelector.kind === "section"
      && rule.taxTypes.length > 0
      && rule.explanationScope === "treatment-core"
      && rule.temporalApplicability.transitionAuthoritySourceIds.length === 0
    ))).toBe(true);
    expect(parsed.officialProcedures).toHaveLength(2);
    expect(parsed.officialProcedures.every((procedure) => (
      procedure.requiredCaseSelectors.includes("tax-type")
      && procedure.requiredCaseSelectors.includes("document-or-decision-type")
      && procedure.nextProcedureMeaning === "possible-not-mandatory"
    ))).toBe(true);
  });

  it("loads a substantive UK-wide system map without organisation or people records", () => {
    expect(ukCharities.schema).toBe("taxsorted.uk.charities/3");
    expect(ukCharities.meta.reviewedOn).toBe("2026-07-13");
    expect(ukCharities.sources.length).toBeGreaterThanOrEqual(25);
    expect(ukCharities.regulators.length).toBeGreaterThanOrEqual(7);
    expect(ukCharities.registers.length).toBeGreaterThanOrEqual(6);
    expect(ukCharities.taxTreatments.length).toBeGreaterThanOrEqual(9);
    expect(ukCharities.taxRules.length).toBeGreaterThanOrEqual(47);
    expect(ukCharities.officialProcedures.length).toBeGreaterThanOrEqual(25);
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

    const uncoveredProcedureField = structuredClone(ukCharities) as UkCharities;
    for (const entry of uncoveredProcedureField.officialProcedures[0].evidence) {
      entry.fields = entry.fields.filter((field) => field !== "/taxTreatmentId");
    }
    expect(() => validateUkCharitiesGraph(uncoveredProcedureField)).toThrow(
      /no evidence pointer for public field: taxTreatmentId/
    );

    const misclassifiedMapping = structuredClone(ukCharities) as UkCharities;
    misclassifiedMapping.taxRules[0].evidence.find((entry) =>
      entry.fields.includes("/authoritySelector")
    )!.method = "manual-review";
    expect(() => validateUkCharitiesGraph(misclassifiedMapping)).toThrow(
      /must evidence \/authoritySelector with derived-exact-id-mapping/
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
    expect([...new Set(targetRules.map((rule) => rule.taxpayerClass))]).toEqual(
      expect.arrayContaining([
        "charitable-trust-income-tax",
        "charitable-trust-capital-gains-tax",
        "charitable-trust-income-and-capital-gains-tax",
        "charitable-company-corporation-tax",
      ])
    );
    expect(targetRules.every((rule) => (
      rule.summaryAuthority === "taxsorted-analysis-of-primary-law"
      && rule.doesNotProve.length >= 2
      && rule.doesNotProve.every((boundary) => boundary.trim().length > 0)
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
        "document-or-decision-type",
        "taxpayer-class",
        "tax-type",
        "tax-period",
        "jurisdiction",
      ]));
      expect(procedure.nextProcedureMeaning).toBe("possible-not-mandatory");
      expect(procedure.taxTypes.length).toBeGreaterThan(0);
      expect(procedure.performedByRoles.length).toBeGreaterThan(0);
    }

    const determinations = ukCharities.officialProcedures.filter(
      (procedure) =>
        procedure.procedureType === "no-return-determination-and-superseding-return"
    );
    expect(determinations).toHaveLength(2);
    expect(determinations.every((procedure) => (
      procedure.challengeMode === "superseding-return"
      && /not an appeal provision/i.test(procedure.doesNotProve.join(" "))
      && !/express(?:ly)? (?:has )?no appeal/i.test(
        `${procedure.steps.join(" ")} ${procedure.doesNotProve.join(" ")}`
      )
    ))).toBe(true);
  });

  it("keeps the 2026 investment gate and legacy donor transition machine-readable", () => {
    const eventGated = ukCharities.taxRules.filter(
      (rule) => rule.temporalApplicability.startsOnOrAfter === "2026-04-06"
    );
    expect(eventGated).toHaveLength(6);
    expect(eventGated.every((rule) => (
      rule.temporalApplicability.basis === "event-date"
      && rule.temporalApplicability.eventType === "investment-made"
      && rule.temporalApplicability.transitionAuthoritySourceIds.includes(
        "src-finance-act-2026-s55"
      )
      && rule.sourceIds.includes("src-finance-act-2026-s55")
    ))).toBe(true);

    expect(ukCharities.taxRules.some((rule) =>
      /^rule-(?:ita-2007-s(?:549|55[0-7])|cta-2010-s(?:50[2-9]|510))(?:-|$)/.test(rule.id)
    )).toBe(false);
    const legacy = ukCharities.transparencyGaps.find(
      (gap) => gap.id === "gap-substantial-donor-legacy-contract-transition"
    );
    expect(legacy?.temporalApplicability).toMatchObject({
      basis: "legacy-contract-transition",
      startsOnOrAfter: "2013-04-01",
      legacyContractSignedBefore: "2013-04-01",
      legacyContractMustNotBeVariedOnOrAfter: "2013-04-01",
    });
  });

  it("applies temporal semantics to transparency gaps as well as tax rules", () => {
    const reversed = structuredClone(ukCharities) as UkCharities;
    const reversedLegacy = reversed.transparencyGaps.find(
      (gap) => gap.id === "gap-substantial-donor-legacy-contract-transition"
    )!;
    reversedLegacy.temporalApplicability!.endsBefore = "2010-01-01";
    expect(() => validateUkCharitiesGraph(reversed)).toThrow(/empty or reversed interval/);

    const wrongBasis = structuredClone(ukCharities) as UkCharities;
    const wrongBasisLegacy = wrongBasis.transparencyGaps.find(
      (gap) => gap.id === "gap-substantial-donor-legacy-contract-transition"
    )!;
    wrongBasisLegacy.temporalApplicability!.basis = "accounting-period";
    expect(() => validateUkCharitiesGraph(wrongBasis)).toThrow(
      /legacy-contract dates outside a legacy transition/
    );

    const hollowLegacy = structuredClone(ukCharities) as UkCharities;
    const hollowLegacyGap = hollowLegacy.transparencyGaps.find(
      (gap) => gap.id === "gap-substantial-donor-legacy-contract-transition"
    )!;
    hollowLegacyGap.temporalApplicability!.legacyContractSignedBefore = null;
    hollowLegacyGap.temporalApplicability!.transitionAuthoritySourceIds = [];
    expect(() => validateUkCharitiesGraph(hollowLegacy)).toThrow(
      /needs both cutoff dates and transition authority/
    );
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

    const fakeCitation = structuredClone(ukCharities) as UkCharities;
    fakeCitation.taxRules[0].citation = "Fake Act 9999 s 539";
    expect(() => validateUkCharitiesGraph(fakeCitation)).toThrow(
      /authority does not match its admitted rule identity/
    );

    const coordinatedRuleSwap = structuredClone(ukCharities) as UkCharities;
    const coordinatedRule = coordinatedRuleSwap.taxRules.find(
      (rule) => rule.id === "rule-ita-2007-s539"
    )!;
    coordinatedRule.authoritySourceId = "src-ita-2007-s540";
    if (coordinatedRule.authoritySelector.kind === "section") {
      coordinatedRule.authoritySelector.section = "540";
    }
    coordinatedRule.citation = "Income Tax Act 2007 s 540";
    coordinatedRule.sourceIds = coordinatedRule.sourceIds.map((sourceId) =>
      sourceId === "src-ita-2007-s539" ? "src-ita-2007-s540" : sourceId
    );
    coordinatedRule.evidence = coordinatedRule.evidence.map((entry) => ({
      ...entry,
      sourceId: entry.sourceId === "src-ita-2007-s539"
        ? "src-ita-2007-s540"
        : entry.sourceId,
    }));
    expect(() => validateUkCharitiesGraph(coordinatedRuleSwap)).toThrow(
      /authority does not match its admitted rule identity/
    );

    const relabelled = structuredClone(ukCharities) as UkCharities;
    relabelled.taxRules[0].taxpayerClass = "charitable-company-corporation-tax";
    expect(() => validateUkCharitiesGraph(relabelled)).toThrow(/taxpayer class conflicts/);

    const missingNoticeSelector = structuredClone(ukCharities) as UkCharities;
    missingNoticeSelector.officialProcedures[0].requiredCaseSelectors = [
      "document-or-decision-type",
      "specification-notice-status",
      "specification-notice-date-if-given",
      "taxpayer-class",
      "tax-type",
      "tax-period",
      "jurisdiction",
    ];
    expect(() => validateUkCharitiesGraph(missingNoticeSelector)).toThrow(
      /omits (?:required case|procedure-specific) selector: hmrc-requirement-made-date/
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

    const coordinatedProcedureSwap = structuredClone(ukCharities) as UkCharities;
    const coordinatedProcedure = coordinatedProcedureSwap.officialProcedures.find(
      (procedure) => procedure.id === "procedure-trust-tma-1970-s7-chargeability-notification"
    )!;
    coordinatedProcedure.legalBasisSourceIds = ["src-tma-1970-s9za"];
    coordinatedProcedure.sourceIds = ["src-tma-1970-s9za"];
    coordinatedProcedure.evidence = coordinatedProcedure.evidence.map((entry) => ({
      ...entry,
      sourceId: "src-tma-1970-s9za",
    }));
    expect(() => validateUkCharitiesGraph(coordinatedProcedureSwap)).toThrow(
      /legal bases do not match its admitted procedure identity/
    );

    const wrongProcedurePublisher = structuredClone(ukCharities) as UkCharities;
    wrongProcedurePublisher.sources.find(
      (source) => source.id === "src-tma-1970-s7"
    )!.publisher = "UK Parliament";
    expect(() => validateUkCharitiesGraph(wrongProcedurePublisher)).toThrow(
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
    actorless.officialProcedures[0].administeredByRegulatorIds = [];
    expect(() => validateUkCharitiesGraph(actorless)).toThrow(
      /has no administering regulator/
    );

    const missingLinkedLaw = structuredClone(ukCharities) as UkCharities;
    missingLinkedLaw.officialProcedures[0].legalBasisSourceIds = [];
    expect(() => validateUkCharitiesGraph(missingLinkedLaw)).toThrow(
      /omits a linked tax rule authority/
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
      /decision regulator is not a tax authority or tribunal/
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
