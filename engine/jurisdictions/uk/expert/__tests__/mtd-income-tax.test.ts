import { describe, expect, it } from "vitest";
import {
  canonicaliseWhyGraph,
  whyGraphEdge,
} from "../../../../core/why-graph";
import {
  assertAdmittedWhyGraph,
  canonicalAdmissionJson,
} from "../../../../core/why-graph-adopter";
import { runWhyGraphAdopterContract } from "../../../../core/testing/why-graph-adopter-contract";
import {
  assessMtdIncomeTax,
  assertTaxAnswerInvariants,
  type MtdIncomeTaxExpertRequest,
} from "../index";
import {
  mtdWhyGraphAdopter,
  type MtdWhyGraphInput,
  type MtdWhyGraphNative,
} from "../mtd-why-graph";

const EVALUATED_ON = "2026-07-11";

function request(): MtdIncomeTaxExpertRequest {
  return {
    schema: "taxsorted.uk.mtd-income-tax.request/1",
    asOfDate: "2026-07-11",
    person: {
      relevantReturnPosition: "required-and-submitted",
      hadNationalInsuranceNumberAtStartOf2026To27: true,
    },
    income: {
      taxYears: {
        "2024-25": {
          basis: "submitted-return",
          residence: "uk-resident",
          selfEmploymentGrossPence: 5_000_001,
          ukPropertyGrossPence: 0,
          foreignPropertyGrossPence: 0,
        },
        "2025-26": {
          basis: "working-estimate",
          residence: "uk-resident",
          selfEmploymentGrossPence: 0,
          ukPropertyGrossPence: 0,
          foreignPropertyGrossPence: 0,
        },
        "2026-27": {
          basis: "working-estimate",
          residence: "uk-resident",
          selfEmploymentGrossPence: 0,
          ukPropertyGrossPence: 0,
          foreignPropertyGrossPence: 0,
        },
      },
      atLeastOneRelevantReturnActivityContinuedAtEntry: true,
      lastRelevantActivityCessationDate: "at-least-one-continues",
      relevantReturnWasAmended: false,
      annualisationOrOtherSpecialRulesMayApply: false,
    },
    exemption: {
      returnIndicators: [],
      digitalExclusion: "not-approved-or-pending",
      otherExemptionApplication: "none",
    },
    reporting: { updatePeriod: "standard" },
  };
}

function assess(input = request(), evaluatedOn = EVALUATED_ON) {
  return assessMtdIncomeTax(input, { evaluatedOn });
}

function mtdAdopterFixture(): { graph: ReturnType<typeof assess>["reasoning"]["whyGraph"]; native: MtdWhyGraphNative } {
  const requestBody = request();
  const answer = assess(requestBody);
  if (!answer.answer) throw new Error("MTD contract fixture needs an answer");
  const input: MtdWhyGraphInput = {
    capabilityVersion: answer.capability.version,
    status: answer.status,
    decision: answer.answer.decision,
    headline: answer.answer.headline,
    reasonCodes: answer.answer.reasonCodes,
    effectiveDate: answer.applicability.effectiveDate,
    evaluatedOn: answer.applicability.evaluatedOn,
    knowledgeAsOf: answer.applicability.knowledgeAsOf,
    facts: {
      provided: answer.facts.provided,
      derived: answer.facts.derived,
      unknown: answer.facts.unknown,
    },
    steps: answer.reasoning.steps,
    claims: answer.evidence.claims,
    sources: answer.evidence.sources,
    obligations: answer.answer.obligations,
    penaltyPosition: answer.answer.penaltyPosition,
    nextActions: answer.escalation.nextActions,
    returnIndicators: requestBody.exemption.returnIndicators,
    updatePeriod: requestBody.reporting.updatePeriod,
  };
  return {
    graph: structuredClone(answer.reasoning.whyGraph),
    native: {
      input,
      ruleIds: [...answer.applicability.ruleIds],
      steps: structuredClone(answer.reasoning.steps),
    },
  };
}

runWhyGraphAdopterContract({
  name: "MTD why-graph adopter mutation contract",
  adopter: mtdWhyGraphAdopter,
  makeFixture: mtdAdopterFixture,
  cases: [
    {
      name: "root state cannot drift from the result",
      layer: "domain",
      mutate(fixture) {
        fixture.graph.nodes.find(
          (node) => node.id === fixture.graph.rootNodeId,
        )!.state = "blocking";
      },
      error: /exact adopter-owned semantic projection/i,
    },
    {
      name: "binding source selector collection cannot drift",
      layer: "domain",
      mutate(fixture) {
        const source = fixture.graph.nodes.find(
          (node) => node.id === "source:uksi-2026-336",
        )!;
        if (source.record?.kind !== "response-record") throw new Error("fixture");
        source.record.collection = "evidence.claims";
        source.record.key = "id";
      },
      error: /exact adopter-owned semantic projection/i,
    },
    {
      name: "a duty holder cannot become the inferred actual performer",
      layer: "domain",
      mutate(fixture) {
        const obligation = fixture.graph.nodes.find(
          (node) => node.id.startsWith("consequence:obligation:"),
        )!;
        fixture.graph.edges.push(whyGraphEdge(
          obligation.id,
          "performed-by",
          "party-role:relevant-person",
          "The legal role does not prove who actually performs the task.",
        ));
        fixture.graph = canonicaliseWhyGraph(fixture.graph);
      },
      error: /exact adopter-owned semantic projection/i,
    },
    {
      name: "the official enforcement and review gap cannot disappear",
      layer: "domain",
      mutate(fixture) {
        const gapId = "gap:official-enforcement-and-review-route";
        fixture.graph.nodes = fixture.graph.nodes.filter((node) => node.id !== gapId);
        fixture.graph.edges = fixture.graph.edges.filter(
          (edge) => edge.from !== gapId && edge.to !== gapId,
        );
        fixture.graph.coverage.gapNodeIds =
          fixture.graph.coverage.gapNodeIds.filter((id) => id !== gapId);
      },
      error: /exact adopter-owned semantic projection/i,
    },
    {
      name: "case identity cannot be inserted into protected root text",
      layer: "domain",
      mutate(fixture) {
        fixture.graph.nodes.find(
          (node) => node.id === fixture.graph.rootNodeId,
        )!.description += " Taxpayer identity: Example Person.";
      },
      error: /exact adopter-owned semantic projection/i,
    },
    {
      name: "an unrelated real-shaped provision cannot become considered law",
      layer: "domain",
      mutate(fixture) {
        fixture.graph.nodes.push({
          id: "rule:si-2026-336-reg-10",
          kind: "rule",
          label: "Unadmitted regulation 10",
          description: "SI 2026/336, regulation 10",
          state: "checked-not-decisive",
          record: {
            kind: "dataset-record",
            dataset: "legislation.gov.uk",
            collection: "uksi-2026-336.regulations",
            recordId: "SI-2026-336-reg-10",
            href: "https://www.legislation.gov.uk/uksi/2026/336/regulation/10/made",
          },
        });
        fixture.graph.edges.push(
          whyGraphEdge(
            "reasoning:exemptions",
            "considers-rule",
            "rule:si-2026-336-reg-10",
            "This real-shaped provision is outside the admitted scenario map.",
          ),
          whyGraphEdge(
            "rule:si-2026-336-reg-10",
            "legal-authority-from",
            "source:uksi-2026-336",
            "The instrument exists, but that does not make this provision relevant.",
          ),
        );
        fixture.graph = canonicaliseWhyGraph(fixture.graph);
      },
      error: /outside the exact statutory admission map|semantic projection/i,
    },
    {
      name: "a reasoning node cannot select another existing step",
      layer: "domain",
      mutate(fixture) {
        const reasoning = fixture.graph.nodes.find(
          (node) => node.id === "reasoning:entry-conditions",
        )!;
        if (reasoning.record?.kind !== "response-record") throw new Error("fixture");
        reasoning.record.value = "qualifying-income";
      },
      error: /exact adopter-owned semantic projection/i,
    },
  ],
});

describe("MTD Income Tax expert", () => {
  it("treats exactly £50,000 as not over the April 2026 threshold", () => {
    const input = request();
    input.income.taxYears["2024-25"].selfEmploymentGrossPence = 5_000_000;
    const result = assess(input);
    expect(result.status).toBe("determined");
    expect(result.answer?.decision).toBe("out_of_scope");
    expect(result.answer?.currentPhase.assessment).toBe("at-or-below-threshold");
    expect(result.answer?.obligations).toEqual([]);
    expect(result.answer?.penaltyPosition).toMatchObject({ applies: false, quarterlyUpdatesStillRequired: false });
  });

  it("treats one penny over £50,000 as in scope", () => {
    const result = assess();
    expect(result.status).toBe("determined");
    expect(result.answer?.decision).toBe("in_scope");
    expect(result.answer?.currentPhase.qualifyingIncomePence).toBe(5_000_001);
    expect(result.answer?.obligations.map((item) => item.dueDate)).toContain("2026-08-07");
  });

  it("emits a canonical why graph without copying supplied financial values", () => {
    const input = request();
    input.income.taxYears["2024-25"].selfEmploymentGrossPence = 987_654_321;
    const result = assess(input);
    const graph = result.reasoning.whyGraph;

    expect(graph.schema).toBe("taxsorted.why-graph/1");
    expect(graph.context).toMatchObject({
      authority: "taxsorted-analysis",
      effect: "advisory",
      externalStateChange: false,
    });
    expect(JSON.stringify(graph)).not.toContain("987654321");
    expect(graph.nodes.map((node) => node.id)).toEqual(
      [...graph.nodes.map((node) => node.id)].sort(),
    );
    expect(graph.edges.map((edge) => edge.id)).toEqual(
      [...graph.edges.map((edge) => edge.id)].sort(),
    );
    expect(result.applicability.ruleIds).not.toContain("HMRC-MTD-exemptions");
    expect(graph.coverage.gapNodeIds).toContain(
      "gap:official-enforcement-and-review-route",
    );
    expect(graph.nodes.find((node) => node.id === "route:taxsorted-correction")?.description)
      .toMatch(/GitHub account.*Never paste financial.*confidential client material/i);
  });

  it("admits the same MTD graph after canonical wire key ordering", () => {
    const fixture = mtdAdopterFixture();
    const wireGraph = JSON.parse(canonicalAdmissionJson(fixture.graph));
    expect(() => assertAdmittedWhyGraph(
      wireGraph,
      fixture.native,
      mtdWhyGraphAdopter,
    )).not.toThrow();
  });

  it("does not make unreached threshold, exemption or obligation steps look applied", () => {
    const input = request();
    input.person.relevantReturnPosition = "not-required";
    const result = assess(input);
    const graph = result.reasoning.whyGraph;

    expect(
      graph.nodes
        .filter((node) => node.kind === "reasoning-step")
        .map((node) => node.id),
    ).toEqual(["reasoning:entry-conditions"]);
    expect(result.applicability.ruleIds).toEqual(["SI-2026-336-reg-5"]);
    expect(graph.nodes.some((node) => node.id === "rule:si-2026-336-reg-25")).toBe(false);
    expect(result.reasoning.steps).toEqual([
      expect.objectContaining({
        id: "entry-conditions",
        factPaths: ["person.relevantReturnPosition"],
        claimIds: ["mtd-entry-law"],
      }),
    ]);
    expect(graph.nodes.some((node) => node.id === "claim:mtd-cessation-law")).toBe(false);
  });

  it("puts the exact no-NINO provision on the decisive exemption path", () => {
    const input = request();
    input.person.hadNationalInsuranceNumberAtStartOf2026To27 = false;
    const result = assess(input);
    const graph = result.reasoning.whyGraph;

    expect(result.answer?.decision).toBe("exempt");
    expect(result.applicability.ruleIds).toContain("SI-2026-336-reg-35");
    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "rule:si-2026-336-reg-35",
        kind: "rule",
        state: "decisive",
      }),
    ]));
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: "rule:si-2026-336-reg-35",
        relation: "legal-authority-from",
        to: "source:uksi-2026-336",
      }),
    ]));
  });

  it("separates the caller's exemption action from HMRC's decision authority", () => {
    const input = request();
    input.exemption.digitalExclusion = "application-pending";
    const result = assess(input);
    const graph = result.reasoning.whyGraph;

    expect(result.answer?.decision).toBe("hmrc_decision_needed");
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: "route:check-exemptions",
        relation: "performed-by",
        to: "party-role:caller",
      }),
      expect.objectContaining({
        from: "route:check-exemptions",
        relation: "decision-made-by",
        to: "institution:hmrc",
      }),
    ]));
    expect(graph.nodes.some((node) => node.id === "route:official-decision-review")).toBe(false);
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: graph.rootNodeId,
        relation: "limited-by",
        to: "gap:official-enforcement-and-review-route",
      }),
    ]));
    expect(
      graph.edges
        .filter((edge) => (
          edge.from === "gap:exemption_application_pending"
          && edge.relation === "addressed-by"
        ))
        .map((edge) => edge.to),
    ).toEqual(["route:check-exemptions"]);
    expect(result.applicability.ruleIds).toEqual(expect.arrayContaining([
      "SI-2026-336-reg-5",
      "SI-2026-336-reg-21",
      "SI-2026-336-reg-22",
      "SI-2026-336-reg-25",
      "SI-2026-336-reg-26",
      "SI-2026-336-reg-27",
    ]));
    for (const ruleId of [
      "SI-2026-336-reg-18",
      "SI-2026-336-reg-19",
      "SI-2026-336-reg-20",
    ]) expect(result.applicability.ruleIds).not.toContain(ruleId);
  });

  it("keeps applied rules separate from considered rules and grounds actual obligations", () => {
    const result = assess();
    const graph = result.reasoning.whyGraph;
    expect(result.applicability.ruleIds).toEqual([
      "SI-2026-336-reg-12",
      "SI-2026-336-reg-15",
      "SI-2026-336-reg-21",
      "SI-2026-336-reg-22",
      "SI-2026-336-reg-25",
      "SI-2026-336-reg-26",
      "SI-2026-336-reg-27",
      "SI-2026-336-reg-5",
      "SI-2026-336-reg-7",
      "SI-2026-336-reg-8",
      "SI-2026-336-reg-9",
    ]);
    expect(result.applicability.ruleIds).not.toContain("SI-2026-336-reg-18");
    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "rule:si-2026-336-reg-18", state: "checked-not-decisive" }),
      expect.objectContaining({ id: "rule:si-2026-336-reg-7", state: "decisive" }),
      expect.objectContaining({ id: "rule:si-2026-336-reg-8", state: "decisive" }),
      expect.objectContaining({ id: "rule:si-2026-336-reg-9", state: "decisive" }),
      expect.objectContaining({ id: "rule:si-2026-336-reg-15", state: "decisive" }),
    ]));
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: "consequence:obligation:keep-digital-records",
        relation: "grounded-in",
        to: "rule:si-2026-336-reg-15",
      }),
      expect.objectContaining({
        from: "consequence:obligation:quarterly-update-1",
        relation: "grounded-in",
        to: "rule:si-2026-336-reg-9",
      }),
      expect.objectContaining({
        from: "consequence:obligation:submit-mtd-tax-return",
        relation: "grounded-in",
        to: "rule:si-2026-336-reg-8",
      }),
      expect.objectContaining({
        from: "consequence:obligation:quarterly-update-1",
        relation: "responsibility-held-by",
        to: "party-role:relevant-person",
      }),
      expect.objectContaining({
        from: "consequence:obligation:quarterly-update-1",
        relation: "limited-by",
        to: "gap:actual-performer-and-agent-authority",
      }),
    ]));
    expect(graph.edges).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: "consequence:obligation:quarterly-update-1",
        relation: "performed-by",
        to: "party-role:caller",
      }),
    ]));
  });

  it("does not attach MTD obligation rules to an exempt answer", () => {
    const input = request();
    input.person.hadNationalInsuranceNumberAtStartOf2026To27 = false;
    const result = assess(input);
    expect(result.answer?.decision).toBe("exempt");
    expect(result.applicability.ruleIds).toContain("SI-2026-336-reg-35");
    for (const ruleId of [
      "SI-2026-336-reg-8",
      "SI-2026-336-reg-9",
      "SI-2026-336-reg-7",
      "SI-2026-336-reg-14",
      "SI-2026-336-reg-15",
    ]) expect(result.applicability.ruleIds).not.toContain(ruleId);
    expect(result.reasoning.whyGraph.nodes.some((node) => (
      [
        "rule:si-2026-336-reg-7",
        "rule:si-2026-336-reg-8",
        "rule:si-2026-336-reg-9",
        "rule:si-2026-336-reg-14",
        "rule:si-2026-336-reg-15",
      ].includes(node.id)
    ))).toBe(false);
  });

  it("keeps alternative SA109 provisions considered behind an exact-basis gap", () => {
    const input = request();
    input.exemption.returnIndicators = ["sa109-residence"];
    const result = assess(input);
    const graph = result.reasoning.whyGraph;
    expect(result.answer?.decision).toBe("exempt");
    expect(result.applicability.ruleIds).toContain("SI-2026-336-reg-39");
    expect(result.applicability.ruleIds).not.toContain("SI-2026-336-reg-41");
    expect(result.applicability.ruleIds).not.toContain("SI-2026-336-reg-43");
    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "rule:si-2026-336-reg-39", state: "decisive" }),
      expect.objectContaining({ id: "rule:si-2026-336-reg-41", state: "checked-not-decisive" }),
      expect.objectContaining({ id: "rule:si-2026-336-reg-43", state: "checked-not-decisive" }),
      expect.objectContaining({ id: "gap:exact-exemption-provision", state: "not-mapped" }),
    ]));
  });

  it("attributes the instrument to its real publisher and does not infer Parliament", () => {
    const graph = assess().reasoning.whyGraph;
    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "institution:kings-printer",
        label: "King's Printer of Acts of Parliament",
      }),
    ]));
    expect(graph.nodes.some((node) => node.id === "institution:uk-parliament")).toBe(false);
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: "source:uksi-2026-336",
        relation: "published-by",
        to: "institution:kings-printer",
      }),
    ]));
  });

  it("includes foreign property for a UK resident", () => {
    const input = request();
    input.income.taxYears["2024-25"] = {
      basis: "submitted-return",
      residence: "uk-resident",
      selfEmploymentGrossPence: 3_000_000,
      ukPropertyGrossPence: 500_000,
      foreignPropertyGrossPence: 1_600_001,
    };
    const result = assess(input);
    expect(result.answer?.currentPhase.qualifyingIncomePence).toBe(5_100_001);
    expect(result.answer?.decision).toBe("in_scope");
  });

  it("generally excludes foreign property for a non-UK resident", () => {
    const input = request();
    input.income.taxYears["2024-25"] = {
      basis: "submitted-return",
      residence: "non-uk-resident",
      selfEmploymentGrossPence: 3_000_000,
      ukPropertyGrossPence: 1_000_000,
      foreignPropertyGrossPence: 9_000_000,
    };
    input.exemption.returnIndicators = ["sa109-residence"];
    const result = assess(input);
    expect(result.answer?.currentPhase.qualifyingIncomePence).toBe(4_000_000);
    expect(result.answer?.decision).toBe("out_of_scope");
  });

  it("does not guess residence or turn an unknown amount into zero", () => {
    const input = request();
    input.income.taxYears["2024-25"].residence = "unknown";
    input.income.taxYears["2024-25"].foreignPropertyGrossPence = "unknown";
    const result = assess(input);
    expect(result.status).toBe("needs_facts");
    expect(result.answer?.currentPhase.qualifyingIncomePence).toBeNull();
    expect(result.escalation.factsNeeded).toContain("income.taxYears.2024-25.residence");
  });

  it("does not turn a working estimate into a final current-phase decision", () => {
    const input = request();
    input.income.taxYears["2024-25"].basis = "working-estimate";
    const result = assess(input);
    expect(result.status).toBe("needs_facts");
    expect(result.answer?.currentPhase.assessment).toBe("forecast-above-threshold");
    expect(result.escalation.factsNeeded).toContain("income.taxYears.2024-25.basis");
  });

  it("never treats a required but unsubmitted return as an escape", () => {
    const input = request();
    input.person.relevantReturnPosition = "required-not-submitted";
    input.income.taxYears["2024-25"].basis = "working-estimate";
    const result = assess(input);
    expect(result.status).toBe("needs_professional_review");
    expect(result.answer?.decision).toBe("professional_review_needed");
    expect(result.answer?.reasonCodes).toContain("REQUIRED_RETURN_NOT_SUBMITTED");
    expect(result.escalation.nextActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "resolve-unsubmitted-return" }),
    ]));
  });

  it("can determine that the relevant return was not required", () => {
    const input = request();
    input.person.relevantReturnPosition = "not-required";
    const result = assess(input);
    expect(result.status).toBe("determined");
    expect(result.answer?.decision).toBe("out_of_scope");
  });

  it("requires the relevant-return activity continuation fact", () => {
    const input = request();
    input.income.atLeastOneRelevantReturnActivityContinuedAtEntry = "unknown";
    const result = assess(input);
    expect(result.status).toBe("needs_facts");
    expect(result.escalation.factsNeeded).toContain("income.atLeastOneRelevantReturnActivityContinuedAtEntry");
  });

  it("rejects contradictory entry and cessation lifecycle facts", () => {
    const input = request();
    input.income.atLeastOneRelevantReturnActivityContinuedAtEntry = false;
    input.income.lastRelevantActivityCessationDate = "at-least-one-continues";
    const result = assess(input);
    expect(result.status).toBe("needs_professional_review");
    expect(result.answer?.reasonCodes).toContain("ENTRY_CESSATION_FACT_CONFLICT");
  });

  it("stops for a return amendment before declaring either side of the threshold", () => {
    const input = request();
    input.income.taxYears["2024-25"].selfEmploymentGrossPence = 4_000_000;
    input.income.relevantReturnWasAmended = true;
    const result = assess(input);
    expect(result.status).toBe("needs_professional_review");
    expect(result.answer?.reasonCodes).toContain("RETURN_AMENDMENT_REVIEW");
    expect(result.applicability.ruleIds).toEqual(expect.arrayContaining([
      "SI-2026-336-reg-5",
      "SI-2026-336-reg-25",
      "SI-2026-336-reg-26",
      "SI-2026-336-reg-27",
    ]));
    expect(result.applicability.ruleIds).not.toContain("SI-2026-336-reg-21");
    expect(result.applicability.ruleIds).not.toContain("SI-2026-336-reg-22");
  });

  it("stops for annualisation or another special rule before a below-threshold conclusion", () => {
    const input = request();
    input.income.taxYears["2024-25"].selfEmploymentGrossPence = 4_000_000;
    input.income.annualisationOrOtherSpecialRulesMayApply = true;
    const result = assess(input);
    expect(result.status).toBe("needs_professional_review");
    expect(result.applicability.covered).toBe(false);
  });

  it("makes unchecked return indicators a named gap and keeps obligations conditional", () => {
    const input = request();
    input.exemption.returnIndicators = "not-checked";
    const result = assess(input);
    expect(result.status).toBe("needs_facts");
    expect(result.answer?.decision).toBe("exemption_possible");
    expect(result.escalation.factsNeeded).toContain("exemption.returnIndicators");
    expect(result.answer?.obligations.filter((item) => item.appliesPerBusiness).every((item) => item.conditional)).toBe(true);
    expect(result.answer?.obligations.find((item) => item.id === "pay-self-assessment-tax")?.conditional).toBe(false);
    expect(result.answer?.penaltyPosition).toMatchObject({ applies: true, conditional: true });
  });

  it("lets a definitive no-NINO exemption win over a pending application", () => {
    const input = request();
    input.person.hadNationalInsuranceNumberAtStartOf2026To27 = false;
    input.exemption.digitalExclusion = "application-pending";
    const result = assess(input);
    expect(result.status).toBe("determined");
    expect(result.answer?.decision).toBe("exempt");
    expect(result.answer?.reasonCodes).toContain("NO_NINO_AT_TAX_YEAR_START");
    expect(result.answer?.obligations.map((item) => item.id)).toEqual([
      "submit-paper-self-assessment-return",
      "submit-online-self-assessment-return",
      "pay-self-assessment-tax",
    ]);
    expect(result.answer?.obligations.find((item) => item.id === "submit-paper-self-assessment-return")?.dueDate).toBe("2027-10-31");
    expect(result.answer?.penaltyPosition.applies).toBe(false);
  });

  it("derives the 2026/27 automatic exemption from concrete return evidence", () => {
    const input = request();
    input.person.hadNationalInsuranceNumberAtStartOf2026To27 = "unknown";
    input.exemption.returnIndicators = ["sa107-trusts-or-estates"];
    const result = assess(input);
    expect(result.status).toBe("determined");
    expect(result.answer?.decision).toBe("exempt");
    expect(result.answer?.reasonCodes).toContain("RETURN_EVIDENCE_TEMPORARY_EXEMPTION");
    expect(result.escalation.factsNeeded).not.toContain("person.hadNationalInsuranceNumberAtStartOf2026To27");
  });

  it("fails closed for a complex return indicator", () => {
    const input = request();
    input.exemption.returnIndicators = ["sa103l-lloyds"];
    const result = assess(input);
    expect(result.status).toBe("needs_professional_review");
    expect(result.answer?.reasonCodes).toContain("COMPLEX_RETURN_EXEMPTION_INDICATOR");
  });

  it("leaves a digital-exclusion application decision with HMRC", () => {
    const input = request();
    input.exemption.digitalExclusion = "application-pending";
    const result = assess(input);
    expect(result.answer?.decision).toBe("hmrc_decision_needed");
    expect(result.escalation.nextActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "check-exemptions", responsibleParty: "caller" }),
    ]));
  });

  it("does not overlook another exemption application based on a future return indicator", () => {
    const unchecked = request();
    unchecked.exemption.otherExemptionApplication = "not-checked";
    const gap = assess(unchecked);
    expect(gap.answer?.decision).toBe("exemption_possible");
    expect(gap.facts.unknown).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "exemption.otherExemptionApplication", material: true }),
    ]));
    expect(gap.escalation.factsNeeded).toContain("exemption.otherExemptionApplication");

    const approved = request();
    approved.exemption.otherExemptionApplication = "hmrc-approved-for-2026-27";
    const exempt = assess(approved);
    expect(exempt.status).toBe("determined");
    expect(exempt.answer?.decision).toBe("exempt");
    expect(exempt.facts.provided).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "exemption.otherExemptionApplication", value: "hmrc-approved-for-2026-27" }),
    ]));
    expect(exempt.applicability.ruleIds).not.toContain("SI-2026-336-reg-39");
    expect(exempt.applicability.ruleIds).not.toContain("SI-2026-336-reg-45");
    expect(exempt.applicability.ruleIds).not.toContain("SI-2026-336-reg-31");
    expect(exempt.applicability.ruleIds).not.toContain("SI-2026-336-reg-36");
    expect(exempt.reasoning.whyGraph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "rule:si-2026-336-reg-31", state: "checked-not-decisive" }),
      expect.objectContaining({ id: "rule:si-2026-336-reg-36", state: "checked-not-decisive" }),
      expect.objectContaining({ id: "rule:si-2026-336-reg-39", state: "checked-not-decisive" }),
      expect.objectContaining({ id: "rule:si-2026-336-reg-45", state: "checked-not-decisive" }),
      expect.objectContaining({ id: "gap:exact-exemption-provision", state: "not-mapped" }),
    ]));
  });

  it("does not let a different new source replace the relevant-return activity at entry", () => {
    const input = request();
    input.income.atLeastOneRelevantReturnActivityContinuedAtEntry = false;
    input.income.lastRelevantActivityCessationDate = "2026-03-31";
    const result = assess(input);
    expect(result.status).toBe("determined");
    expect(result.answer?.decision).toBe("out_of_scope");
    expect(result.answer?.obligations).toEqual([]);
  });

  it("retains the final update, cessation notice and annual return after mid-year cessation", () => {
    const input = request();
    input.income.lastRelevantActivityCessationDate = "2026-05-12";
    const result = assess(input);
    const obligationIds = result.answer?.obligations.map((item) => item.id);
    expect(result.answer?.decision).toBe("in_scope");
    expect(obligationIds).toContain("quarterly-update-1");
    expect(obligationIds).not.toContain("quarterly-update-2");
    expect(obligationIds).toContain("notify-hmrc-of-cessation");
    expect(obligationIds).toContain("submit-mtd-tax-return");
    expect(obligationIds).toContain("pay-self-assessment-tax");
    expect(result.answer?.obligations.find((item) => item.id === "quarterly-update-1")?.periodEnd).toBe("2026-05-12");
  });

  it("uses the chosen period to map a cessation near a quarter boundary", () => {
    const standardInput = request();
    standardInput.income.lastRelevantActivityCessationDate = "2026-07-02";
    const calendarInput = structuredClone(standardInput);
    calendarInput.reporting.updatePeriod = "calendar";
    const standard = assess(standardInput);
    const calendar = assess(calendarInput);
    expect(standard.answer?.obligations.find((item) => item.id === "notify-hmrc-of-cessation")?.dueDate).toBe("2026-08-07");
    expect(calendar.answer?.obligations.find((item) => item.id === "notify-hmrc-of-cessation")?.dueDate).toBe("2026-11-07");
  });

  it("asks for the period choice when it changes a cessation deadline", () => {
    const input = request();
    input.income.lastRelevantActivityCessationDate = "2026-07-02";
    input.reporting.updatePeriod = "unknown";
    const result = assess(input);
    expect(result.status).toBe("needs_facts");
    expect(result.escalation.factsNeeded).toContain("reporting.updatePeriod");
    expect(result.answer?.obligations).toEqual([]);
    expect(result.reasoning.steps.find((step) => step.id === "obligations")).toMatchObject({
      factPaths: ["income.lastRelevantActivityCessationDate", "reporting.updatePeriod"],
      claimIds: expect.arrayContaining([
        "mtd-annual-return-obligation",
        "mtd-cessation-law",
        "mtd-quarterly-obligations",
      ]),
    });
    expect(result.applicability.ruleIds).toEqual(expect.arrayContaining([
      "SI-2026-336-reg-6",
      "SI-2026-336-reg-7",
      "SI-2026-336-reg-8",
      "SI-2026-336-reg-9",
      "SI-2026-336-reg-14",
      "SI-2026-336-reg-15",
    ]));
    expect(result.applicability.ruleIds).not.toContain("SI-2026-336-reg-12");
    expect(result.applicability.ruleIds).not.toContain("SI-2026-336-reg-13");
    expect(result.reasoning.whyGraph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "rule:si-2026-336-reg-12", state: "checked-not-decisive" }),
      expect.objectContaining({ id: "rule:si-2026-336-reg-13", state: "checked-not-decisive" }),
    ]));
  });

  it("does not invent an exact per-source workload from a simple business count", () => {
    const result = assess();
    const quarters = result.answer?.obligations.filter((item) => item.id.startsWith("quarterly-update"));
    expect(quarters).toHaveLength(4);
    expect(quarters?.every((item) => item.expectedSubmissions === null)).toBe(true);
    expect(result.answer?.boundaries).toEqual(expect.arrayContaining([
      expect.stringMatching(/per-source workload/i),
    ]));
  });

  it("keeps later phase forecasts visible in fixed tax-year order", () => {
    const input = request();
    input.income.taxYears["2025-26"].selfEmploymentGrossPence = 3_000_001;
    const rows = input.income.taxYears;
    input.income.taxYears = {
      "2026-27": rows["2026-27"],
      "2024-25": rows["2024-25"],
      "2025-26": rows["2025-26"],
    };
    const result = assess(input);
    expect(result.answer?.phases.map((phase) => phase.incomeTaxYear)).toEqual(["2024-25", "2025-26", "2026-27"]);
    expect(result.answer?.phases[1].assessment).toBe("forecast-above-threshold");
  });

  it("checks source freshness on a trusted evaluation date, not caller asOfDate", () => {
    const input = request();
    input.asOfDate = "2026-07-01";
    const result = assess(input, "2026-08-12");
    expect(result.status).toBe("needs_professional_review");
    expect(result.answer?.decision).toBe("source_review_required");
    const graph = result.reasoning.whyGraph;
    expect(graph.edges.some((edge) => (
      edge.from === "gap:source_review_overdue" && edge.relation === "supported-by"
    ))).toBe(true);
  });

  it("does not use the current ruleset for a caller-selected future date", () => {
    const input = request();
    input.asOfDate = "2030-07-11";
    const result = assess(input);
    expect(result.status).toBe("unsupported");
    expect(result.answer?.decision).toBe("outside_supported_date");
    expect(result.answer?.reasonCodes).toContain("AS_OF_DATE_IN_FUTURE");
    expect(result.reasoning.whyGraph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: "gap:as_of_date_in_future",
        relation: "uses-fact",
        to: "fact:provided:asOfDate",
      }),
    ]));
  });

  it("rejects invalid engine-boundary values", () => {
    const negative = request();
    negative.income.taxYears["2024-25"].selfEmploymentGrossPence = -1;
    expect(() => assess(negative)).toThrow(/non-negative integer pence/i);

    const impossible = request();
    impossible.asOfDate = "2026-02-30";
    expect(() => assess(impossible)).toThrow(/real ISO date/i);

    const futureCessation = request();
    futureCessation.income.lastRelevantActivityCessationDate = "2026-07-12";
    expect(() => assess(futureCessation)).toThrow(/cannot be after asOfDate/i);

    const duplicateIndicator = request();
    duplicateIndicator.exemption.returnIndicators = ["sa109-residence", "sa109-residence"];
    expect(() => assess(duplicateIndicator)).toThrow(/must not contain duplicates/i);
  });

  it("prevents guidance from being relabelled as binding law", () => {
    const result = assess();
    const unsafe = structuredClone(result);
    const lawClaim = unsafe.evidence.claims.find((claim) => claim.kind === "law");
    expect(lawClaim).toBeDefined();
    lawClaim!.sourceIds = ["hmrc-mtd-before-you-start"];
    expect(() => assertTaxAnswerInvariants(unsafe)).toThrow(/non-binding source as law/i);
  });

  it("requires binding authority for every applied rule", () => {
    const unsafe = structuredClone(assess());
    const authority = unsafe.reasoning.whyGraph.edges.find((edge) => (
      edge.from === "rule:si-2026-336-reg-25"
      && edge.relation === "legal-authority-from"
    ));
    expect(authority).toBeDefined();
    authority!.to = "source:hmrc-mtd-before-you-start";
    authority!.id = `edge:${authority!.from}:${authority!.relation}:${authority!.to}`;
    unsafe.reasoning.whyGraph.edges.sort((left, right) => left.id < right.id ? -1 : 1);
    expect(() => assertTaxAnswerInvariants(unsafe)).toThrow(/non-binding material/i);
  });

  it("resolves native obligations, applied rules and consequence grounding", () => {
    const missingObligation = structuredClone(assess());
    missingObligation.answer!.obligations = missingObligation.answer!.obligations.filter(
      (obligation) => obligation.id !== "quarterly-update-1",
    );
    expect(() => assertTaxAnswerInvariants(missingObligation)).toThrow(/missing obligation/i);

    const consideredAsApplied = structuredClone(assess());
    consideredAsApplied.applicability.ruleIds.push("SI-2026-336-reg-18");
    consideredAsApplied.applicability.ruleIds.sort();
    expect(() => assertTaxAnswerInvariants(consideredAsApplied)).toThrow(/must equal.*applied/i);

    const ungrounded = structuredClone(assess());
    ungrounded.reasoning.whyGraph.edges = ungrounded.reasoning.whyGraph.edges.filter((edge) => !(
      edge.from === "consequence:obligation:keep-digital-records"
      && edge.relation === "grounded-in"
    ));
    expect(() => assertTaxAnswerInvariants(ungrounded)).toThrow(/needs claim or rule grounding/i);

    const relabelledFact = structuredClone(assess());
    const providedFact = relabelledFact.reasoning.whyGraph.nodes.find((node) => (
      node.id === "fact:provided:person.relevantReturnPosition"
    ));
    expect(providedFact?.record?.kind).toBe("response-record");
    if (providedFact?.record?.kind === "response-record") {
      providedFact.record.collection = "facts.derived";
    }
    expect(() => assertTaxAnswerInvariants(relabelledFact)).toThrow(/references missing fact/i);

    const contradictoryRule = structuredClone(assess());
    const considered = contradictoryRule.reasoning.whyGraph.nodes.find((node) => (
      node.id === "rule:si-2026-336-reg-18"
    ));
    expect(considered).toBeDefined();
    considered!.state = "decisive";
    expect(() => assertTaxAnswerInvariants(contradictoryRule)).toThrow(/considers-rule.*checked-not-decisive/i);
  });

  it("rejects ambiguous native selectors and a null penalty target", () => {
    const duplicateStep = structuredClone(assess());
    duplicateStep.reasoning.steps.push(structuredClone(duplicateStep.reasoning.steps[0]));
    expect(() => assertTaxAnswerInvariants(duplicateStep)).toThrow(/reasoning step IDs must be unique/i);

    const pendingInput = request();
    pendingInput.exemption.digitalExclusion = "application-pending";
    const duplicateAction = structuredClone(assess(pendingInput));
    duplicateAction.escalation.nextActions.push(structuredClone(duplicateAction.escalation.nextActions[0]));
    expect(() => assertTaxAnswerInvariants(duplicateAction)).toThrow(/next-action IDs must be unique/i);

    const duplicateObligation = structuredClone(assess());
    duplicateObligation.answer!.obligations.push(structuredClone(duplicateObligation.answer!.obligations[0]));
    expect(() => assertTaxAnswerInvariants(duplicateObligation)).toThrow(/native obligation IDs must be unique/i);

    const duplicateReason = structuredClone(assess());
    duplicateReason.answer!.reasonCodes.push(duplicateReason.answer!.reasonCodes[0]);
    expect(() => assertTaxAnswerInvariants(duplicateReason)).toThrow(/native reason codes must be unique/i);

    const nullPenalty = structuredClone(assess());
    (nullPenalty.answer as unknown as { penaltyPosition: unknown }).penaltyPosition = null;
    expect(() => assertTaxAnswerInvariants(nullPenalty)).toThrow(/invalid penalty selector/i);
  });

  it("does not turn a TaxSorted conclusion into an official HMRC decision", () => {
    const unsafe = structuredClone(assess());
    unsafe.reasoning.whyGraph.edges.push({
      id: "edge:conclusion:mtd-income-tax-readiness:decision-made-by:institution:hmrc",
      from: unsafe.reasoning.whyGraph.rootNodeId,
      relation: "decision-made-by",
      to: "institution:hmrc",
      explanation: "Invalid official-decision claim.",
    });
    unsafe.reasoning.whyGraph.edges.sort((left, right) => left.id < right.id ? -1 : 1);
    expect(() => assertTaxAnswerInvariants(unsafe)).toThrow(/cannot name an official decision-maker/i);
  });

  it("rejects determined envelopes without coverage, evidence or reasoning", () => {
    const unsafe = structuredClone(assess());
    unsafe.applicability.covered = false;
    expect(() => assertTaxAnswerInvariants(unsafe)).toThrow(/declared coverage/i);

    const noEvidence = structuredClone(assess());
    noEvidence.evidence.claims = noEvidence.evidence.claims.map((claim) => ({
      ...claim,
      kind: "calculation" as const,
      sourceIds: [],
    }));
    noEvidence.evidence.sources = [];
    expect(() => assertTaxAnswerInvariants(noEvidence)).toThrow(/authoritative evidence/i);

    const noReasoning = structuredClone(assess());
    noReasoning.reasoning.steps = [];
    expect(() => assertTaxAnswerInvariants(noReasoning)).toThrow(/show its reasoning/i);
  });

  it("requires reasoning fact paths and unknown sentinels to reconcile", () => {
    const missingFact = structuredClone(assess());
    missingFact.reasoning.steps[0].factPaths.push("facts.not.present");
    expect(() => assertTaxAnswerInvariants(missingFact)).toThrow(/missing fact/i);

    const unreconciled = structuredClone(assess());
    unreconciled.facts.provided[0].value = "unknown";
    expect(() => assertTaxAnswerInvariants(unreconciled)).toThrow(/reconciled/i);
  });
});
