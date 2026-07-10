import { createHash } from "node:crypto";
import { canonicalJson } from "../src/open-data.js";
import { ukTaxSystem } from "../src/uk-tax-system.js";

const counts = {
  sources: ukTaxSystem.sources.length,
  actors: ukTaxSystem.actors.length,
  relationships: ukTaxSystem.relationships.length,
  frameworks: ukTaxSystem.frameworks.length,
  rules: ukTaxSystem.rules.length,
  accountTypes: ukTaxSystem.accountTypes.length,
  systems: ukTaxSystem.systems.length,
  permissions: ukTaxSystem.permissions.length,
  pipelineStages: ukTaxSystem.pipelineStages.length,
  cases: ukTaxSystem.cases.length,
  transparencyGaps: ukTaxSystem.transparencyGaps.length,
};

const datasetHash = createHash("sha256")
  .update(canonicalJson(ukTaxSystem))
  .digest("hex");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: ukTaxSystem.schema,
      version: ukTaxSystem.meta.version,
      reviewedOn: ukTaxSystem.meta.reviewedOn,
      datasetHash: `sha256:${datasetHash}`,
      datasetHashAlgorithm: "sha256(taxsorted-deterministic-json-utf8)",
      counts,
    },
    null,
    2
  )
);
