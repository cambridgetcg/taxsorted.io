import { createHash } from "node:crypto";
import { canonicalJson } from "../src/open-data.js";
import { ukTaxIndustry } from "../src/uk-tax-industry.js";

const counts = {
  sources: ukTaxIndustry.sources.length,
  institutions: ukTaxIndustry.institutions.length,
  roles: ukTaxIndustry.roles.length,
  qualifications: ukTaxIndustry.qualifications.length,
  gates: ukTaxIndustry.gates.length,
  pathways: ukTaxIndustry.pathways.length,
  studyResources: ukTaxIndustry.studyResources.length,
  compensation: ukTaxIndustry.compensation.length,
  barriers: ukTaxIndustry.barriers.length,
  transparencyGaps: ukTaxIndustry.transparencyGaps.length,
};

const datasetHash = createHash("sha256")
  .update(canonicalJson(ukTaxIndustry))
  .digest("hex");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: ukTaxIndustry.schema,
      version: ukTaxIndustry.meta.version,
      reviewedOn: ukTaxIndustry.meta.reviewedOn,
      datasetHash: `sha256:${datasetHash}`,
      datasetHashAlgorithm: "sha256(taxsorted-deterministic-json-utf8)",
      counts,
    },
    null,
    2
  )
);
