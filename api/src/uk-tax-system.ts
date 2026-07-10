// Provenance-first map of the UK tax system. The JSON is the public record;
// this module makes broken citations and graph links fail at boot, not in a
// reader's hands.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "invalid calendar date");
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const nonEmptyStrings = z.array(z.string().min(1)).min(1);
const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

const evidenceSchema = z.array(
  strictObject({
    sourceId: id,
    fields: z.array(z.string().regex(/^\//)).min(1),
    locator: z.string().min(1),
    observedOn: date,
    method: z.enum(["manual-review", "derived-join"]),
  })
).min(1);

const contactSchema = strictObject({
  label: z.string().min(1),
  kind: z.enum(["contact-page", "email", "phone", "postal-address", "register"]),
  value: z.string().min(1),
});

const sourceSchema = strictObject({
  id,
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.string().url(),
  authorityLevel: z.enum([
    "primary-law",
    "judgment",
    "official-policy",
    "official-guidance",
    "official-manual",
    "official-register",
    "public-audit",
    "parliamentary-scrutiny",
    "professional-regulator",
  ]),
  reviewedOn: date,
  reviewAfter: date,
  lastUpdated: date.optional(),
  status: z.enum(["current", "historical", "pending", "partly-current"]),
  reuseStatus: z.enum(["confirmed", "link-only", "unknown"]),
  publicationMode: z.enum(["normalised-summary", "metadata-only", "link-only"]),
  supports: nonEmptyStrings,
  doesNotProve: nonEmptyStrings,
  licence: z
    .object({ name: z.string().min(1), url: z.string().url().optional() })
    .strict()
    .nullable(),
});

const actorSchema = strictObject({
  id,
  name: z.string().min(1),
  sector: z.enum(["public", "private", "professional", "judicial", "parliamentary"]),
  kind: z.string().min(1),
  jurisdictions: nonEmptyStrings,
  roles: nonEmptyStrings,
  explanation: z.string().min(1),
  whyItExists: z.string().min(1),
  website: z.string().url(),
  contacts: z.array(contactSchema),
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
  transparencyNotes: z.array(z.string().min(1)),
  activeFrom: date.optional(),
  activeTo: date.optional(),
});

const relationshipSchema = strictObject({
  id,
  fromActorId: id,
  toActorId: id,
  type: z.enum([
    "creates-rules-for",
    "appoints",
    "administers",
    "oversees",
    "audits",
    "hears-appeals-from",
    "investigates-for",
    "prosecutes-cases-from",
    "supplies-data-to",
    "collects-for",
    "contracts-with",
    "regulates",
    "authorises",
    "recognises",
    "complaints-escalate-to",
  ]),
  explanation: z.string().min(1),
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
  validFrom: date.optional(),
  validTo: date.optional(),
});

const frameworkSchema = strictObject({
  id,
  name: z.string().min(1),
  publicRationale: z.string().min(1),
  howItWorks: z.string().min(1),
  tension: z.string().min(1),
  ruleIds: z.array(id),
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
});

const ruleSchema = strictObject({
  id,
  title: z.string().min(1),
  kind: z.enum(["act", "regulations", "code", "charter", "internal-framework"]),
  explanation: z.string().min(1),
  madeByActorIds: z.array(id),
  administeredByActorIds: z.array(id),
  enforcedByActorIds: z.array(id),
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
  effectiveFrom: date.optional(),
  volatile: z.boolean(),
});

const accountSchema = strictObject({
  id,
  name: z.string().min(1),
  category: z.enum(["identity", "taxpayer-view", "agent", "tax-ledger", "payment-reference", "developer"]),
  holder: z.string().min(1),
  operatorActorIds: nonEmptyStrings,
  purpose: z.string().min(1),
  identifiers: z.array(z.string().min(1)),
  accessAndAuthority: z.string().min(1),
  accountEffects: z.string().min(1),
  notTheSameAs: z.array(z.string().min(1)),
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
  transparencyNotes: z.array(z.string().min(1)),
});

const systemSchema = strictObject({
  id,
  name: z.string().min(1),
  layer: z.enum(["identity", "filing", "ledger", "payment", "debt", "risk", "integration"]),
  operatorActorIds: nonEmptyStrings,
  purpose: z.string().min(1),
  inputs: nonEmptyStrings,
  outputs: nonEmptyStrings,
  connectedSystemIds: z.array(id),
  privatePartnerActorIds: z.array(id),
  publicVisibility: z.enum(["public-service", "documented-in-manuals", "partly-disclosed", "historical-disclosure"]),
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
  transparencyNotes: z.array(z.string().min(1)),
});

const permissionSchema = strictObject({
  id,
  name: z.string().min(1),
  category: z.enum(["licence", "authorisation", "registration", "supervision", "certificate", "recognition", "access"]),
  requiredFor: z.string().min(1),
  holderTypes: nonEmptyStrings,
  grantedByActorIds: nonEmptyStrings,
  overseenByActorIds: z.array(id),
  publicRegister: z.string().url().nullable(),
  enforcement: z.string().min(1),
  notEquivalentTo: nonEmptyStrings,
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
  effectiveFrom: date.optional(),
});

const stageSchema = strictObject({
  id,
  lane: z.enum(["hmrc-main", "local-tax", "devolved-tax", "criminal-tax"]),
  order: z.number().int().nonnegative(),
  name: z.string().min(1),
  trigger: z.string().min(1),
  collectorActorIds: z.array(id),
  otherActorIds: z.array(id),
  whatHappens: z.string().min(1),
  whyItExists: z.string().min(1),
  inputs: nonEmptyStrings,
  outputs: nonEmptyStrings,
  accountEffects: z.string().min(1),
  rightsAndSafeguards: nonEmptyStrings,
  ruleIds: z.array(id),
  systemIds: z.array(id),
  nextStageIds: z.array(id),
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
});

const caseSchema = strictObject({
  id,
  name: z.string().min(1),
  citation: z.string().min(1),
  date: date,
  status: z.enum(["decided", "pending"]),
  courtActorId: id,
  issue: z.string().min(1),
  outcome: z.string().min(1),
  whyItMatters: z.string().min(1),
  stageIds: z.array(id),
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
});

const gapSchema = strictObject({
  id,
  title: z.string().min(1),
  detail: z.string().min(1),
  consequence: z.string().min(1),
  status: z.enum(["open", "source-conflict", "time-sensitive", "bounded-by-design"]),
  affectedIds: nonEmptyStrings,
  sourceIds: nonEmptyStrings,
  evidence: evidenceSchema,
});

export const ukTaxSystemSchema = strictObject({
  schema: z.literal("taxsorted.uk.tax-system/1"),
  meta: strictObject({
    title: z.string().min(1),
    version: z.string().min(1),
    reviewedOn: date,
    jurisdiction: z.literal("United Kingdom"),
    coverage: nonEmptyStrings,
    exclusions: nonEmptyStrings,
    editorialRules: nonEmptyStrings,
    contentLicence: strictObject({ name: z.string().min(1), url: z.string().url() }),
    warning: z.string().min(1),
  }),
  sources: z.array(sourceSchema).min(1),
  actors: z.array(actorSchema).min(1),
  relationships: z.array(relationshipSchema),
  frameworks: z.array(frameworkSchema).min(1),
  rules: z.array(ruleSchema).min(1),
  accountTypes: z.array(accountSchema).min(1),
  systems: z.array(systemSchema).min(1),
  permissions: z.array(permissionSchema).min(1),
  pipelineStages: z.array(stageSchema).min(1),
  cases: z.array(caseSchema).min(1),
  transparencyGaps: z.array(gapSchema).min(1),
});

export type UkTaxSystem = z.infer<typeof ukTaxSystemSchema>;

const defaultDataPath = fileURLToPath(
  new URL("../../research/uk/tax-system/data/uk-tax-system.json", import.meta.url)
);

function collectIds(corpus: UkTaxSystem) {
  return new Set(
    [
      ...corpus.sources,
      ...corpus.actors,
      ...corpus.relationships,
      ...corpus.frameworks,
      ...corpus.rules,
      ...corpus.accountTypes,
      ...corpus.systems,
      ...corpus.permissions,
      ...corpus.pipelineStages,
      ...corpus.cases,
      ...corpus.transparencyGaps,
    ].map((item) => item.id)
  );
}

type EvidenceItem = { id: string; sourceIds: string[]; evidence: Array<{ sourceId: string }> };

function jsonPointerExists(item: unknown, pointer: string) {
  if (pointer === "") return true;
  let current: unknown = item;
  for (const raw of pointer.slice(1).split("/")) {
    const part = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(current)) {
      if (!/^\d+$/.test(part) || Number(part) >= current.length) return false;
      current = current[Number(part)];
      continue;
    }
    if (typeof current !== "object" || current === null || !Object.hasOwn(current, part)) {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return true;
}

function checkEvidence(
  issues: string[],
  item: EvidenceItem & { evidence: Array<{ sourceId: string; fields: string[]; observedOn: string }> },
  sourceIds: Set<string>,
  reviewedOn: string
) {
  for (const entry of item.evidence) {
    if (!sourceIds.has(entry.sourceId)) {
      issues.push(`${item.id} evidence refers to unknown source: ${entry.sourceId}`);
    }
    if (!item.sourceIds.includes(entry.sourceId)) {
      issues.push(`${item.id} evidence source is missing from sourceIds: ${entry.sourceId}`);
    }
    if (entry.observedOn > reviewedOn) {
      issues.push(`${item.id} evidence is observed after corpus review date: ${entry.observedOn}`);
    }
    for (const field of entry.fields) {
      if (!jsonPointerExists(item, field)) {
        issues.push(`${item.id} evidence points to a missing field: ${field}`);
      }
    }
  }
  for (const sourceId of item.sourceIds) {
    if (!item.evidence.some((entry) => entry.sourceId === sourceId)) {
      issues.push(`${item.id} source has no field evidence: ${sourceId}`);
    }
  }
}

export function validateUkTaxSystemGraph(corpus: UkTaxSystem) {
  const issues: string[] = [];
  const collections = [
    corpus.sources,
    corpus.actors,
    corpus.relationships,
    corpus.frameworks,
    corpus.rules,
    corpus.accountTypes,
    corpus.systems,
    corpus.permissions,
    corpus.pipelineStages,
    corpus.cases,
    corpus.transparencyGaps,
  ];
  const allIds = collections.flatMap((items) => items.map((item) => item.id));
  const seen = new Set<string>();
  for (const itemId of allIds) {
    if (seen.has(itemId)) issues.push(`duplicate id: ${itemId}`);
    seen.add(itemId);
  }

  const sourceIds = new Set(corpus.sources.map((source) => source.id));
  const actorIds = new Set(corpus.actors.map((actor) => actor.id));
  const ruleIds = new Set(corpus.rules.map((rule) => rule.id));
  const systemIds = new Set(corpus.systems.map((system) => system.id));
  const stageIds = new Set(corpus.pipelineStages.map((stage) => stage.id));
  const allKnownIds = collectIds(corpus);
  const check = (owner: string, values: string[], known: Set<string>, kind: string) => {
    for (const value of values) {
      if (!known.has(value)) issues.push(`${owner} refers to unknown ${kind}: ${value}`);
    }
  };
  const checkSources = (owner: string, values: string[]) =>
    check(owner, values, sourceIds, "source");
  const checkActors = (owner: string, values: string[]) =>
    check(owner, values, actorIds, "actor");

  for (const source of corpus.sources) {
    if (!source.url.startsWith("https://")) issues.push(`${source.id} source URL is not HTTPS`);
    if (source.reviewAfter < source.reviewedOn) {
      issues.push(`${source.id} reviewAfter precedes reviewedOn`);
    }
  }

  for (const item of [
    ...corpus.actors,
    ...corpus.relationships,
    ...corpus.frameworks,
    ...corpus.rules,
    ...corpus.accountTypes,
    ...corpus.systems,
    ...corpus.permissions,
    ...corpus.pipelineStages,
    ...corpus.cases,
    ...corpus.transparencyGaps,
  ]) {
    checkEvidence(issues, item, sourceIds, corpus.meta.reviewedOn);
  }
  for (const actor of corpus.actors) {
    if (actor.activeFrom && actor.activeTo && actor.activeFrom > actor.activeTo) {
      issues.push(`${actor.id} activeFrom is after activeTo`);
    }
  }
  for (const relation of corpus.relationships) {
    if (relation.validFrom && relation.validTo && relation.validFrom > relation.validTo) {
      issues.push(`${relation.id} validFrom is after validTo`);
    }
  }
  const laneOrders = new Set<string>();
  for (const stage of corpus.pipelineStages) {
    const key = `${stage.lane}:${stage.order}`;
    if (laneOrders.has(key)) issues.push(`duplicate pipeline order: ${key}`);
    laneOrders.add(key);
    if (stage.nextStageIds.includes(stage.id)) issues.push(`${stage.id} points to itself`);
  }
  for (const actor of corpus.actors) checkSources(actor.id, actor.sourceIds);
  for (const relation of corpus.relationships) {
    checkActors(relation.id, [relation.fromActorId, relation.toActorId]);
    checkSources(relation.id, relation.sourceIds);
  }
  for (const framework of corpus.frameworks) {
    check(framework.id, framework.ruleIds, ruleIds, "rule");
    checkSources(framework.id, framework.sourceIds);
  }
  for (const rule of corpus.rules) {
    checkActors(rule.id, [
      ...rule.madeByActorIds,
      ...rule.administeredByActorIds,
      ...rule.enforcedByActorIds,
    ]);
    checkSources(rule.id, rule.sourceIds);
  }
  for (const account of corpus.accountTypes) {
    checkActors(account.id, account.operatorActorIds);
    checkSources(account.id, account.sourceIds);
  }
  for (const system of corpus.systems) {
    checkActors(system.id, [...system.operatorActorIds, ...system.privatePartnerActorIds]);
    check(system.id, system.connectedSystemIds, systemIds, "system");
    checkSources(system.id, system.sourceIds);
  }
  for (const permission of corpus.permissions) {
    checkActors(permission.id, [
      ...permission.grantedByActorIds,
      ...permission.overseenByActorIds,
    ]);
    checkSources(permission.id, permission.sourceIds);
  }
  for (const stage of corpus.pipelineStages) {
    checkActors(stage.id, [...stage.collectorActorIds, ...stage.otherActorIds]);
    check(stage.id, stage.ruleIds, ruleIds, "rule");
    check(stage.id, stage.systemIds, systemIds, "system");
    check(stage.id, stage.nextStageIds, stageIds, "pipeline stage");
    checkSources(stage.id, stage.sourceIds);
  }
  for (const study of corpus.cases) {
    checkActors(study.id, [study.courtActorId]);
    check(study.id, study.stageIds, stageIds, "pipeline stage");
    checkSources(study.id, study.sourceIds);
  }
  for (const gap of corpus.transparencyGaps) {
    check(gap.id, gap.affectedIds, allKnownIds, "graph item");
    checkSources(gap.id, gap.sourceIds);
  }

  if (issues.length) {
    throw new Error(`UK tax-system graph is invalid:\n- ${issues.join("\n- ")}`);
  }
  return corpus;
}

export function loadUkTaxSystem(path = defaultDataPath): UkTaxSystem {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  return validateUkTaxSystemGraph(ukTaxSystemSchema.parse(raw));
}

export const ukTaxSystem = loadUkTaxSystem();
