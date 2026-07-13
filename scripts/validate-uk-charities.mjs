// Independent safety check for the public charity-system corpus. This script
// intentionally does not import the runtime loader: CI gets a second parser and
// graph walk before any organisation data is ever considered for publication.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path =
  process.argv[2] ??
  fileURLToPath(new URL("../research/uk/charities/data/uk-charities.json", import.meta.url));
const corpus = JSON.parse(readFileSync(path, "utf8"));
const issues = [];
const collectionNames = [
  "sources",
  "regulators",
  "registers",
  "legalForms",
  "taxTreatments",
  "taxRules",
  "obligations",
  "fundingMechanisms",
  "financeDisclosures",
  "controlModels",
  "helpRoutes",
  "officialProcedures",
  "pipelineStages",
  "transparencyGaps",
];
const admittedTaxRuleIds = new Set([
  "rule-ita-2007-s539", "rule-ita-2007-s540", "rule-ita-2007-s541",
  "rule-ita-2007-s542", "rule-ita-2007-s543", "rule-ita-2007-s562",
  "rule-ita-2007-s563", "rule-ita-2007-s564", "rule-cta-2010-s492",
  "rule-cta-2010-s493", "rule-cta-2010-s494", "rule-cta-2010-s495",
  "rule-cta-2010-s496", "rule-cta-2010-s515", "rule-cta-2010-s516",
  "rule-cta-2010-s517",
]);
const admittedOfficialProcedureIds = new Set([
  "procedure-ita-2007-s542-attribution-specification",
  "procedure-cta-2010-s495-attribution-specification",
]);
const expectedTopLevel = new Set(["schema", "meta", ...collectionNames]);
const idPattern = /^[a-z0-9][a-z0-9-]*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function fail(message) {
  issues.push(message);
}

function isCalendarDate(value) {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function unique(owner, values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`${owner} repeats ${label}: ${value}`);
    seen.add(value);
  }
}

function pointerExists(item, pointer) {
  let current = item;
  for (const raw of pointer.slice(1).split("/")) {
    const part = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(current)) {
      if (!/^\d+$/.test(part) || Number(part) >= current.length) return false;
      current = current[Number(part)];
    } else if (current && typeof current === "object" && Object.hasOwn(current, part)) {
      current = current[part];
    } else {
      return false;
    }
  }
  return true;
}

function expandJurisdictions(values) {
  const expanded = new Set();
  for (const value of values) {
    if (value === "United Kingdom") {
      for (const nation of ["England", "Wales", "Scotland", "Northern Ireland"]) {
        expanded.add(nation);
      }
    } else if (value === "England and Wales") {
      expanded.add("England");
      expanded.add("Wales");
    } else {
      expanded.add(value);
    }
  }
  return expanded;
}

if (corpus.schema !== "taxsorted.uk.charities/2") fail("unexpected schema identifier");
if (!corpus.meta || corpus.meta.reviewedOn !== "2026-07-13") {
  fail("meta.reviewedOn must be the reviewed snapshot date 2026-07-13");
}
for (const key of Object.keys(corpus)) {
  if (!expectedTopLevel.has(key)) fail(`unexpected top-level key: ${key}`);
}
for (const key of expectedTopLevel) {
  if (!Object.hasOwn(corpus, key)) fail(`missing top-level key: ${key}`);
}
for (const name of collectionNames) {
  if (!Array.isArray(corpus[name]) || corpus[name].length === 0) {
    fail(`${name} must be a non-empty array`);
  }
}
for (const forbidden of ["organisations", "people", "trustees", "grantRecipients"]) {
  if (Object.hasOwn(corpus, forbidden)) fail(`forbidden top-level collection: ${forbidden}`);
}

const allItems = collectionNames.flatMap((name) => corpus[name] ?? []);
const allIds = new Set();
for (const item of allItems) {
  if (!idPattern.test(item.id ?? "")) fail(`invalid id: ${item.id ?? "(missing)"}`);
  if (allIds.has(item.id)) fail(`duplicate id: ${item.id}`);
  allIds.add(item.id);
}

const sourceIds = new Set(corpus.sources.map((item) => item.id));
const sourcesById = new Map(corpus.sources.map((item) => [item.id, item]));
const sourceUrls = new Set();
for (const source of corpus.sources) {
  if (!source.url?.startsWith("https://")) fail(`${source.id} source URL must use HTTPS`);
  if (sourceUrls.has(source.url)) fail(`duplicate source URL: ${source.url}`);
  sourceUrls.add(source.url);
  for (const field of ["reviewedOn", "reviewAfter"]) {
    if (!isCalendarDate(source[field])) fail(`${source.id} has invalid ${field}`);
  }
  if (source.lastUpdated && !isCalendarDate(source.lastUpdated)) {
    fail(`${source.id} has invalid lastUpdated`);
  }
  if (source.reviewAfter < source.reviewedOn) fail(`${source.id} reviewAfter precedes reviewedOn`);
  if (source.reviewedOn > corpus.meta.reviewedOn) fail(`${source.id} reviewed after corpus`);
  if (source.lastUpdated && source.lastUpdated > corpus.meta.reviewedOn) {
    fail(`${source.id} lastUpdated after corpus review date`);
  }
  unique(source.id, source.jurisdictions ?? [], "jurisdiction");
}

const contentItems = collectionNames.slice(1).flatMap((name) => corpus[name] ?? []);
for (const item of contentItems) {
  if (!Array.isArray(item.sourceIds) || item.sourceIds.length === 0) {
    fail(`${item.id} needs sourceIds`);
    continue;
  }
  if (!Array.isArray(item.evidence) || item.evidence.length === 0) {
    fail(`${item.id} needs evidence`);
    continue;
  }
  unique(item.id, item.sourceIds, "sourceId");
  unique(item.id, item.jurisdictions ?? [], "jurisdiction");
  for (const sourceId of item.sourceIds) {
    if (!sourceIds.has(sourceId)) fail(`${item.id} refers to unknown source: ${sourceId}`);
    if (!item.evidence.some((entry) => entry.sourceId === sourceId)) {
      fail(`${item.id} source has no field evidence: ${sourceId}`);
    }
  }
  for (const entry of item.evidence) {
    if (!sourceIds.has(entry.sourceId)) {
      fail(`${item.id} evidence refers to unknown source: ${entry.sourceId}`);
    }
    if (!item.sourceIds.includes(entry.sourceId)) {
      fail(`${item.id} evidence source missing from sourceIds: ${entry.sourceId}`);
    }
    if (!isCalendarDate(entry.observedOn) || entry.observedOn > corpus.meta.reviewedOn) {
      fail(`${item.id} has invalid or future evidence observedOn: ${entry.observedOn}`);
    }
    const evidenceSource = sourcesById.get(entry.sourceId);
    if (evidenceSource && entry.observedOn > evidenceSource.reviewedOn) {
      fail(`${item.id} evidence observed after source review: ${entry.sourceId} ${entry.observedOn}`);
    }
    unique(item.id, entry.fields ?? [], "evidence field pointer");
    for (const pointer of entry.fields ?? []) {
      if (!pointer.startsWith("/")) fail(`${item.id} has invalid JSON pointer: ${pointer}`);
      const root = pointer.slice(1).split("/", 1)[0];
      if (root === "sourceIds" || root === "evidence") {
        fail(`${item.id} evidence points into provenance metadata: ${pointer}`);
      }
      if (!pointerExists(item, pointer)) fail(`${item.id} pointer does not exist: ${pointer}`);
    }
  }
  const declared = expandJurisdictions(item.jurisdictions ?? []);
  const supported = expandJurisdictions(
    item.sourceIds.flatMap((sourceId) => sourcesById.get(sourceId)?.jurisdictions ?? [])
  );
  for (const jurisdiction of declared) {
    if (!supported.has(jurisdiction)) {
      fail(`${item.id} lacks source coverage for jurisdiction: ${jurisdiction}`);
    }
  }
}

const known = {
  regulator: new Set(corpus.regulators.map((item) => item.id)),
  register: new Set(corpus.registers.map((item) => item.id)),
  legalForm: new Set(corpus.legalForms.map((item) => item.id)),
  taxTreatment: new Set(corpus.taxTreatments.map((item) => item.id)),
  taxRule: new Set(corpus.taxRules.map((item) => item.id)),
  officialProcedure: new Set(corpus.officialProcedures.map((item) => item.id)),
  pipelineStage: new Set(corpus.pipelineStages.map((item) => item.id)),
  corpusItem: allIds,
};
for (const [label, actual, expected] of [
  ["tax rule", known.taxRule, admittedTaxRuleIds],
  ["official procedure", known.officialProcedure, admittedOfficialProcedureIds],
]) {
  for (const expectedId of expected) {
    if (!actual.has(expectedId)) fail(`missing admitted ${label}: ${expectedId}`);
  }
  for (const actualId of actual) {
    if (!expected.has(actualId)) fail(`unadmitted ${label}: ${actualId}`);
  }
}
function refs(owner, values, target, label) {
  unique(owner, values, `${label} reference`);
  for (const value of values) {
    if (!target.has(value)) fail(`${owner} refers to unknown ${label}: ${value}`);
  }
}
for (const item of corpus.registers) refs(item.id, item.regulatorIds, known.regulator, "regulator");
for (const item of corpus.legalForms) refs(item.id, item.regulatorIds, known.regulator, "regulator");
for (const item of corpus.obligations) refs(item.id, item.regulatorIds, known.regulator, "regulator");
for (const item of corpus.fundingMechanisms) {
  refs(item.id, item.taxTreatmentIds, known.taxTreatment, "tax treatment");
}
const exactPrimaryLawUrl = /^https:\/\/www\.legislation\.gov\.uk\/(?:ukpga|uksi|ukla|asp|asc|anaw|nia|nisi)\/[^?#]+\/(?:section|regulation|article|rule|schedule\/[^/]+\/paragraph)\/[^/?#]+(?:\/[^?#]+)*$/;
for (const item of corpus.taxRules) {
  if (item.taxTreatmentId !== "tax-non-charitable-expenditure") {
    fail(`${item.id} is outside the admitted non-charitable-expenditure treatment`);
  }
  refs(item.id, [item.taxTreatmentId], known.taxTreatment, "tax treatment");
  refs(item.id, item.administeredByRegulatorIds, known.regulator, "administering regulator");
  for (const regulatorId of item.administeredByRegulatorIds) {
    const regulator = corpus.regulators.find((candidate) => candidate.id === regulatorId);
    if (regulator && regulator.kind !== "tax-authority") {
      fail(`${item.id} administrator is not a tax authority: ${regulatorId}`);
    }
  }
  const treatment = corpus.taxTreatments.find((candidate) => candidate.id === item.taxTreatmentId);
  unique(item.id, item.treatmentFieldPointers ?? [], "treatment field pointer");
  unique(item.id, item.reasoningStepIds ?? [], "reasoning step");
  for (const pointer of item.treatmentFieldPointers ?? []) {
    if (!treatment || !pointerExists(treatment, pointer)) {
      fail(`${item.id} points to a missing treatment field: ${pointer}`);
    }
  }
  const authority = sourcesById.get(item.authoritySourceId);
  if (!item.sourceIds.includes(item.authoritySourceId)) {
    fail(`${item.id} authority source missing from sourceIds: ${item.authoritySourceId}`);
  }
  if (
    !authority || authority.authorityLevel !== "primary-law" ||
    authority.status !== "current" || authority.reuseStatus !== "confirmed" ||
    authority.publicationMode !== "metadata-only" ||
    authority.publisher !== "legislation.gov.uk" || !exactPrimaryLawUrl.test(authority.url)
  ) {
    fail(`${item.id} authority is not an exact current primary-law provision`);
  }
  const citation = /^(.*) (\d{4}) s ([0-9A-Za-z]+)$/.exec(item.citation ?? "");
  if (
    !citation || !authority?.title.startsWith(`${citation[1]} ${citation[2]}, section ${citation[3]} `) ||
    !authority.url.endsWith(`/section/${citation[3]}`)
  ) {
    fail(`${item.id} citation does not identify its exact authority source`);
  }
  if (
    (item.citation?.startsWith("Income Tax Act ") && item.taxpayerClass !== "charitable-trust-income-tax") ||
    (item.citation?.startsWith("Corporation Tax Act ") && item.taxpayerClass !== "charitable-company-corporation-tax")
  ) {
    fail(`${item.id} taxpayer class conflicts with its cited instrument`);
  }
  if (item.effectiveFrom && item.effectiveTo && item.effectiveFrom > item.effectiveTo) {
    fail(`${item.id} effectiveFrom is after effectiveTo`);
  }
}
for (const item of corpus.financeDisclosures) refs(item.id, item.registerIds, known.register, "register");
for (const item of corpus.controlModels) refs(item.id, item.legalFormIds, known.legalForm, "legal form");
for (const item of corpus.helpRoutes) {
  refs(item.id, item.registerIds, known.register, "register");
  refs(item.id, item.regulatorIds, known.regulator, "regulator");
  if (!item.serviceUrl?.startsWith("https://")) fail(`${item.id} serviceUrl must use HTTPS`);
}
for (const item of corpus.officialProcedures) {
  if (item.taxTreatmentId !== "tax-non-charitable-expenditure") {
    fail(`${item.id} is outside the admitted non-charitable-expenditure treatment`);
  }
  refs(item.id, [item.taxTreatmentId], known.taxTreatment, "tax treatment");
  refs(item.id, item.taxRuleIds, known.taxRule, "tax rule");
  refs(item.id, item.nextProcedureIds, known.officialProcedure, "official procedure");
  refs(item.id, item.administeredByRegulatorIds, known.regulator, "administering regulator");
  refs(item.id, item.handledByRegulatorIds, known.regulator, "handling regulator");
  refs(item.id, item.decisionByRegulatorIds, known.regulator, "decision regulator");
  for (const [role, regulatorIds] of [
    ["administering", item.administeredByRegulatorIds],
    ["handling", item.handledByRegulatorIds],
    ["decision", item.decisionByRegulatorIds],
  ]) {
    if (regulatorIds.length === 0) fail(`${item.id} has no ${role} regulator`);
  }
  const treatment = corpus.taxTreatments.find((candidate) => candidate.id === item.taxTreatmentId);
  unique(item.id, item.treatmentFieldPointers ?? [], "treatment field pointer");
  for (const pointer of item.treatmentFieldPointers ?? []) {
    if (!treatment || !pointerExists(treatment, pointer)) {
      fail(`${item.id} points to a missing treatment field: ${pointer}`);
    }
  }
  unique(item.id, item.requiredCaseSelectors ?? [], "required case selector");
  const minimumSelectors = [
    "decision-type",
    "hmrc-requirement-made-date",
    "specification-notice-status",
    "specification-notice-date-if-given",
    "taxpayer-class",
    "tax-period",
    "jurisdiction",
  ];
  for (const selector of minimumSelectors) {
    if (!item.requiredCaseSelectors.includes(selector)) {
      fail(`${item.id} omits required case selector: ${selector}`);
    }
  }
  const linkedRules = item.taxRuleIds
    .map((ruleId) => corpus.taxRules.find((candidate) => candidate.id === ruleId))
    .filter(Boolean);
  for (const rule of linkedRules) {
    if (rule.taxTreatmentId !== item.taxTreatmentId || rule.taxpayerClass !== item.taxpayerClass) {
      fail(`${item.id} links a tax rule from another treatment or taxpayer class: ${rule.id}`);
    }
  }
  for (const nextProcedureId of item.nextProcedureIds) {
    const nextProcedure = corpus.officialProcedures.find(
      (candidate) => candidate.id === nextProcedureId,
    );
    if (
      nextProcedure &&
      (nextProcedure.taxTreatmentId !== item.taxTreatmentId ||
        nextProcedure.taxpayerClass !== item.taxpayerClass)
    ) {
      fail(`${item.id} links a next procedure from another treatment or taxpayer class: ${nextProcedure.id}`);
    }
  }
  const linkedAuthoritySourceIds = [...new Set(
    linkedRules.map((rule) => rule.authoritySourceId),
  )].sort();
  const declaredLegalBasisSourceIds = [...item.legalBasisSourceIds].sort();
  if (linkedAuthoritySourceIds.join("\u0000") !== declaredLegalBasisSourceIds.join("\u0000")) {
    fail(`${item.id} legal bases do not exactly match linked tax rule authorities`);
  }
  const linkedTreatmentPointers = [...new Set(
    linkedRules.flatMap((rule) => rule.treatmentFieldPointers),
  )].sort();
  const declaredTreatmentPointers = [...item.treatmentFieldPointers].sort();
  if (linkedTreatmentPointers.join("\u0000") !== declaredTreatmentPointers.join("\u0000")) {
    fail(`${item.id} treatment fields do not exactly match linked tax rules`);
  }
  const linkedAdministratorIds = [...new Set(
    linkedRules.flatMap((rule) => rule.administeredByRegulatorIds),
  )].sort();
  for (const [role, regulatorIds] of [
    ["administering", item.administeredByRegulatorIds],
    ["handling", item.handledByRegulatorIds],
    ["decision", item.decisionByRegulatorIds],
  ]) {
    if ([...regulatorIds].sort().join("\u0000") !== linkedAdministratorIds.join("\u0000")) {
      fail(`${item.id} ${role} regulators do not exactly match linked tax rule administrators`);
    }
  }
  if (item.nextProcedureIds.includes(item.id)) fail(`${item.id} points to itself`);
  for (const sourceId of item.legalBasisSourceIds ?? []) {
    const source = sourcesById.get(sourceId);
    if (!item.sourceIds.includes(sourceId)) {
      fail(`${item.id} legal basis missing from sourceIds: ${sourceId}`);
    }
    if (
      !source || source.authorityLevel !== "primary-law" || source.status !== "current" ||
      source.reuseStatus !== "confirmed" || source.publicationMode !== "metadata-only" ||
      !exactPrimaryLawUrl.test(source.url)
    ) {
      fail(`${item.id} legal basis is not an exact primary-law provision: ${sourceId}`);
    }
  }
}
const laneOrders = new Set();
for (const item of corpus.pipelineStages) {
  refs(item.id, item.registerIds, known.register, "register");
  refs(item.id, item.nextStageIds, known.pipelineStage, "pipeline stage");
  const laneOrder = `${item.lane}:${item.order}`;
  if (laneOrders.has(laneOrder)) fail(`duplicate pipeline order: ${laneOrder}`);
  laneOrders.add(laneOrder);
  if (item.nextStageIds.includes(item.id)) fail(`${item.id} points to itself`);
}
for (const item of corpus.transparencyGaps) {
  refs(item.id, item.affectedIds, known.corpusItem, "corpus item");
}
for (const item of corpus.regulators) {
  if (!item.website?.startsWith("https://")) fail(`${item.id} website must use HTTPS`);
}
for (const item of corpus.registers) {
  if (!item.accessUrl?.startsWith("https://")) fail(`${item.id} accessUrl must use HTTPS`);
}

const exclusionText = corpus.meta.exclusions?.join(" ").toLowerCase() ?? "";
for (const phrase of ["no charity organisation records", "no people", "no inferred beliefs"]) {
  if (!exclusionText.includes(phrase)) fail(`meta exclusions must state: ${phrase}`);
}

if (issues.length) {
  console.error(`UK charities corpus invalid:\n- ${issues.join("\n- ")}`);
  process.exit(1);
}

const counts = collectionNames.map((name) => `${corpus[name].length} ${name}`).join(", ");
console.log(`UK charities corpus OK: ${counts}`);
