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
  "obligations",
  "fundingMechanisms",
  "financeDisclosures",
  "controlModels",
  "helpRoutes",
  "pipelineStages",
  "transparencyGaps",
];
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

if (corpus.schema !== "taxsorted.uk.charities/1") fail("unexpected schema identifier");
if (!corpus.meta || corpus.meta.reviewedOn !== "2026-07-12") {
  fail("meta.reviewedOn must be the reviewed snapshot date 2026-07-12");
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
  pipelineStage: new Set(corpus.pipelineStages.map((item) => item.id)),
  corpusItem: allIds,
};
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
for (const item of corpus.financeDisclosures) refs(item.id, item.registerIds, known.register, "register");
for (const item of corpus.controlModels) refs(item.id, item.legalFormIds, known.legalForm, "legal form");
for (const item of corpus.helpRoutes) {
  refs(item.id, item.registerIds, known.register, "register");
  refs(item.id, item.regulatorIds, known.regulator, "regulator");
  if (!item.serviceUrl?.startsWith("https://")) fail(`${item.id} serviceUrl must use HTTPS`);
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
