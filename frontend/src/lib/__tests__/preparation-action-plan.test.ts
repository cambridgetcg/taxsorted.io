import { afterEach, describe, expect, it, vi } from "vitest";
import {
  derivePreparationActionPlan,
  formatPreparationActionPlan,
  PREPARATION_EVIDENCE_HELP,
  PREPARATION_QUESTIONS,
} from "../preparation-action-plan";
import {
  createEmploymentSource,
  createPreparationDraft,
  PREPARATION_CIRCUMSTANCES,
  type EmploymentSource,
  type PreparationYear,
} from "../return-preparation";

const TODAY = "2026-09-30";
const NOW = `${TODAY}T12:00:00.000Z`;

function draft(year: PreparationYear = "2025-26") {
  const value = createPreparationDraft(year, "prepare-return", NOW);
  for (const { id } of PREPARATION_CIRCUMSTANCES) value.circumstances[id] = "no";
  return value;
}

function employment(patch: Partial<EmploymentSource> = {}): EmploymentSource {
  return {
    ...createEmploymentSource("private-employment-identifier"),
    employerName: "Private employer name",
    sourceLabel: "Private source label",
    notes: "Private notes and questions",
    documentYear: "2025-26", pay: "123456.78", tax: "9876.54",
    ...patch,
  };
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const member of Object.values(value)) freeze(member);
    Object.freeze(value);
  }
  return value;
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("preparation actions from current draft facts", () => {
  it("keeps all unanswered circumstances visible instead of inferring No", () => {
    const value = createPreparationDraft("2025-26", "prepare-return", NOW);
    const plan = derivePreparationActionPlan(value, TODAY);
    expect(plan.year).toBe("2025-26");
    expect(plan.actions).toHaveLength(8);
    expect(plan.actions.filter(action => action.kind === "answer").map(action => action.target.circumstance))
      .toEqual(PREPARATION_CIRCUMSTANCES.map(item => item.id));
    for (const action of plan.actions.filter(item => item.kind === "answer")) {
      expect(action.target.step).toBe("circumstances");
      expect(action.next).toContain(PREPARATION_QUESTIONS[action.target.circumstance]);
      expect(action.why).toContain("does not mean No");
    }
  });

  it("turns Not sure into a concrete question, while an explicit No removes the question", () => {
    const value = draft();
    value.circumstances.property = "unknown";
    value.evidence.property = "reviewed";
    expect(derivePreparationActionPlan(value, TODAY).actions).toEqual([
      expect.objectContaining({
        id: "property-clarify", kind: "question",
        question: "Which rental income, cost and ownership records should I check for this tax year?",
        target: { step: "circumstances", circumstance: "property" },
      }),
    ]);
    value.circumstances.property = "no";
    expect(derivePreparationActionPlan(value, TODAY).actions).toEqual([]);
  });

  it("changes a property's next step as records move from missing to collected, reviewed or unresolved", () => {
    const value = draft();
    value.circumstances.property = "yes";
    const gather = derivePreparationActionPlan(value, TODAY).actions;
    expect(gather).toEqual([expect.objectContaining({ kind: "gather", target: { step: "evidence", circumstance: "property" } })]);
    expect(gather[0].where).toBe(PREPARATION_EVIDENCE_HELP.property.where);
    value.evidence.property = "collected";
    expect(derivePreparationActionPlan(value, TODAY).actions).toEqual([expect.objectContaining({ kind: "review" })]);
    value.evidence.property = "reviewed";
    expect(derivePreparationActionPlan(value, TODAY).actions).toEqual([]);
    value.evidence.property = "unresolved";
    expect(derivePreparationActionPlan(value, TODAY).actions).toEqual([
      expect.objectContaining({ kind: "question", question: expect.stringContaining("rental income") }),
    ]);
    value.circumstances.property = "no";
    expect(derivePreparationActionPlan(value, TODAY).actions).toEqual([]);
  });

  it.each(["unknown", "yes"] as const)("retains an other-income tax-treatment question when its answer is %j, even with reviewed evidence", answer => {
    const value = draft();
    value.circumstances["other-income"] = answer;
    value.evidence["other-income"] = "reviewed";
    const plan = derivePreparationActionPlan(value, TODAY);
    const questions = plan.actions.filter(action => action.question);
    expect(questions).toHaveLength(1);
    expect(questions[0].question).toContain("assess their tax treatment");
    expect(questions[0].target).toEqual({
      step: answer === "yes" ? "evidence" : "circumstances", circumstance: "other-income",
    });
    expect(plan.actions.some(action => action.kind === "answer")).toBe(false);
    value.circumstances["other-income"] = "no";
    expect(derivePreparationActionPlan(value, TODAY).actions).toEqual([]);
  });

  it("starts with one unanswered other-income task and adds the tax question when answered Yes, including reviewed evidence", () => {
    const value = draft();
    value.circumstances["other-income"] = null;
    value.evidence["other-income"] = "reviewed";
    expect(derivePreparationActionPlan(value, TODAY).actions).toEqual([
      expect.objectContaining({ id: "other-income-answer", kind: "answer", target: { step: "circumstances", circumstance: "other-income" } }),
    ]);
    value.circumstances["other-income"] = "yes";
    expect(derivePreparationActionPlan(value, TODAY).actions).toEqual([
      expect.objectContaining({ id: "other-income-tax-question", kind: "question", question: expect.stringContaining("tax treatment") }),
    ]);
  });

  it("keeps gathering and the other-income tax question separate, without duplicating an unresolved question", () => {
    const value = draft();
    value.circumstances["other-income"] = "yes";
    expect(derivePreparationActionPlan(value, TODAY).actions.map(action => action.kind)).toEqual(["gather", "question"]);
    value.evidence["other-income"] = "unresolved";
    expect(derivePreparationActionPlan(value, TODAY).actions).toHaveLength(1);
    expect(derivePreparationActionPlan(value, TODAY).actions[0].question).toContain("tax treatment");
  });

  it("uses the existing explanation and document locations for active evidence topics", () => {
    const value = draft();
    for (const { id } of PREPARATION_CIRCUMSTANCES) {
      if (id === "employment") continue;
      value.circumstances[id] = "yes";
    }
    const actions = derivePreparationActionPlan(value, TODAY).actions.filter(action => action.kind === "gather");
    expect(actions).toHaveLength(7);
    for (const action of actions) {
      const id = action.target.circumstance as keyof typeof PREPARATION_EVIDENCE_HELP;
      expect(action.why).toBe(PREPARATION_EVIDENCE_HELP[id].why);
      expect(action.where).toBe(PREPARATION_EVIDENCE_HELP[id].where);
    }
    expect(PREPARATION_EVIDENCE_HELP.pension.where).toBe("Look for pension-provider statements, pension P60s and contribution records.");
  });

  it("asks for employment documents when employment is active and none are entered", () => {
    const value = draft();
    value.circumstances.employment = "yes";
    expect(derivePreparationActionPlan(value, TODAY).actions).toEqual([
      expect.objectContaining({ id: "employment-gather", kind: "gather", target: { step: "evidence", circumstance: "employment" } }),
    ]);
  });

  it.each([
    { pay: "" }, { tax: "" }, { employerName: "" }, { sourceLabel: "" },
    { documentYear: "unknown" }, { documentYear: "2026-27" }, { pay: "1,000" },
  ] as Partial<EmploymentSource>[])("keeps an incomplete or unfinished P60 actionable: %j", patch => {
    const value = draft();
    value.circumstances.employment = "yes";
    value.employmentSources = [employment(patch)];
    expect(derivePreparationActionPlan(value, TODAY).actions).toEqual([
      expect.objectContaining({ id: "employment-p60-review", kind: "review", why: expect.stringContaining("1 P60 entry") }),
    ]);
  });

  it("removes the P60 review action only after its details and review match", () => {
    const value = draft();
    value.circumstances.employment = "yes";
    value.employmentSources = [employment()];
    expect(derivePreparationActionPlan(value, TODAY).actions.map(action => action.id)).toEqual(["employment-p60-review"]);
    value.employmentSources[0].reviewed = true;
    expect(derivePreparationActionPlan(value, TODAY).actions).toEqual([]);
    value.employmentSources[0].documentYear = "unknown";
    expect(derivePreparationActionPlan(value, TODAY).actions.map(action => action.id)).toEqual(["employment-p60-review"]);
  });

  it.each(["2025-26", "2026-27"] as const)("retains the %s year without copying another year's source facts", year => {
    const value = draft(year);
    value.circumstances.employment = "yes";
    value.employmentSources = [employment({ documentYear: year, reviewed: true })];
    expect(derivePreparationActionPlan(value, "2027-04-06")).toEqual({ year, actions: [] });
  });

  it("keeps current-year P60 flags unresolved through the final day and recalculates after the year ends", () => {
    const value = draft("2026-27");
    value.circumstances.employment = "yes";
    value.employmentSources = [employment({ documentYear: "2026-27", reviewed: true })];
    for (const date of [TODAY, "2027-04-05"]) {
      expect(derivePreparationActionPlan(value, date).actions.map(action => action.id))
        .toEqual(["employment-p60-review", "employment-year-in-progress"]);
    }
    expect(derivePreparationActionPlan(value, "2027-04-06").actions).toEqual([]);
    expect(value.employmentSources[0].reviewed).toBe(true);
  });

  it("uses the current date when no explicit review date is supplied", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
    const value = draft("2026-27");
    value.circumstances.employment = "yes";
    expect(derivePreparationActionPlan(value)).toEqual(derivePreparationActionPlan(value, TODAY));
    expect(derivePreparationActionPlan(value).actions.find(action => action.id === "employment-gather")?.next).toContain("current payslips");
  });

  it.each(["P45", "other"] as const)("keeps %s entries as questions beyond the P60 review route", documentType => {
    const value = draft();
    value.circumstances.employment = "yes";
    value.employmentSources = [employment({ documentType })];
    const actions = derivePreparationActionPlan(value, TODAY).actions;
    expect(actions).toEqual([
      expect.objectContaining({ id: "employment-other-documents", kind: "question", question: expect.stringContaining("avoid counting figures again") }),
    ]);
    expect(actions[0].why).toContain("1 employment document");
  });

  it.each(["no", null, "unknown"] as const)("keeps retained employment entries visible but inactive for answer %j", answer => {
    const value = draft();
    value.circumstances.employment = answer;
    value.employmentSources = [employment({ documentType: "P45" })];
    const actions = derivePreparationActionPlan(value, TODAY).actions;
    expect(actions).toContainEqual(expect.objectContaining({
      id: "employment-inactive", kind: "review", why: expect.stringContaining("1 retained employment entry"),
      target: { step: "circumstances", circumstance: "employment" },
    }));
    expect(actions.some(action => ["employment-gather", "employment-p60-review", "employment-other-documents"].includes(action.id))).toBe(false);
  });

  it.each(["yes", "no", null, "unknown"] as const)("keeps overlap checks visible for %j and targets a visible place", answer => {
    const value = draft();
    value.circumstances.employment = answer;
    value.employmentSources = [employment({ reviewed: true }), employment({ id: "private-second-id", reviewed: true })];
    const overlap = derivePreparationActionPlan(value, TODAY).actions.find(action => action.id === "employment-overlap");
    expect(overlap).toMatchObject({
      kind: "review", question: expect.stringContaining("without counting"),
      target: { step: answer === "yes" || answer === "unknown" ? "evidence" : "circumstances", circumstance: "employment" },
    });
    value.employmentSources[1].employerName = "Distinct employer";
    value.employmentSources[1].sourceLabel = "Distinct document";
    expect(derivePreparationActionPlan(value, TODAY).actions.some(action => action.id === "employment-overlap")).toBe(false);
    expect(value.employmentSources).toHaveLength(2);
  });

  it("aggregates fifty employment entries into bounded topic actions and leaks no private source content", () => {
    const value = draft("2026-27");
    value.circumstances.employment = "yes";
    value.employmentSources = Array.from({ length: 50 }, (_, index) => employment({
      id: `private-id-${index}`, documentYear: "2026-27", documentType: index % 2 ? "P45" : "P60",
    }));
    const before = structuredClone(value);
    freeze(value);
    const plan = derivePreparationActionPlan(value, TODAY);
    expect(plan.actions.map(action => action.id)).toEqual([
      "employment-p60-review", "employment-year-in-progress", "employment-other-documents", "employment-overlap",
    ]);
    expect(plan.actions[0].why).toContain("25 P60 entries");
    expect(plan.actions[2].why).toContain("25 employment documents");
    expect(JSON.stringify(plan)).not.toMatch(/Private|private-|123456\.78|9876\.54|employerName|sourceLabel|notes|employmentSources/);
    expect(value).toEqual(before);
  });

  it("performs no storage or network operation and returns independent action objects", () => {
    const forbidden = vi.fn(() => { throw new Error("Unexpected I/O"); });
    vi.stubGlobal("fetch", forbidden);
    vi.stubGlobal("indexedDB", { open: forbidden });
    vi.stubGlobal("localStorage", { getItem: forbidden, setItem: forbidden });
    const value = freeze(createPreparationDraft("2025-26", "organise-records", NOW));
    const first = derivePreparationActionPlan(value, TODAY);
    const second = derivePreparationActionPlan(value, TODAY);
    expect(first).toEqual(second);
    expect(first.actions[0]).not.toBe(second.actions[0]);
    expect(forbidden).not.toHaveBeenCalled();
  });

  it("puts known employment work ahead of unanswered topics while retaining familiar topic order", () => {
    const value = createPreparationDraft("2025-26", "prepare-return", NOW);
    value.circumstances.employment = "yes";
    value.employmentSources = [employment({ documentType: "P45" })];
    value.circumstances.property = "yes";
    value.circumstances["life-changes"] = "unknown";
    const actions = derivePreparationActionPlan(value, TODAY).actions;
    expect(actions.slice(0, 3).map(action => action.id)).toEqual([
      "employment-other-documents", "property-evidence", "life-changes-clarify",
    ]);
    expect(actions.slice(3).every(action => action.kind === "answer")).toBe(true);
    expect(actions.slice(3).map(action => action.target.circumstance)).toEqual([
      "trading", "pension", "savings-investments", "other-income", "hmrc-letter",
    ]);
  });
});

describe("plain-text preparation action plan", () => {
  it.each(["2025-26", "2026-27"] as const)("includes the %s year, document locations and a useful question without source data", year => {
    const value = draft(year);
    value.circumstances.property = "unknown";
    value.circumstances.employment = "yes";
    value.employmentSources = [employment({ documentYear: year, documentType: "other" })];
    const text = formatPreparationActionPlan(value, TODAY);
    expect(text).toContain(`Tax year: ${year.replace("-", "–")}`);
    expect(text).toContain("Why:");
    expect(text).toContain(`Where to look: ${PREPARATION_EVIDENCE_HELP.property.where}`);
    expect(text).toContain("Next:");
    expect(text).toContain("Question for HMRC or an adviser: Which rental income, cost and ownership records");
    expect(text).toContain("may include unsaved changes");
    expect(text).not.toMatch(/Private|private-|123456\.78|9876\.54|Draft revision/);
  });

  it("does not turn an empty action plan into a filing-readiness claim", () => {
    const text = formatPreparationActionPlan(draft(), TODAY);
    expect(text).toContain("No actions are derived from these draft answers.");
    expect(text).toContain("This does not establish completeness or readiness to file.");
    expect(text).not.toContain("Question for HMRC");
  });
});
