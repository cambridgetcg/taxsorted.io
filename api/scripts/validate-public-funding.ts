import { createHash } from "node:crypto";
import { canonicalJson } from "../src/open-data.js";
import { ukPublicFunding } from "../src/uk-public-funding.js";

const counts = {
  sources: ukPublicFunding.sources.length,
  institutions: ukPublicFunding.institutions.length,
  governanceUnits: ukPublicFunding.governanceUnits.length,
  offices: ukPublicFunding.offices.length,
  relationships: ukPublicFunding.relationships.length,
  funds: ukPublicFunding.funds.length,
  programmes: ukPublicFunding.programmes.length,
  fundingMechanisms: ukPublicFunding.fundingMechanisms.length,
  allocations: ukPublicFunding.allocations.length,
  contacts: ukPublicFunding.contacts.length,
  officeLocations: ukPublicFunding.officeLocations.length,
  pipelineStages: ukPublicFunding.pipelineStages.length,
  transparencyGaps: ukPublicFunding.transparencyGaps.length,
};

const datasetHash = createHash("sha256")
  .update(canonicalJson(ukPublicFunding))
  .digest("hex");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: ukPublicFunding.schema,
      version: ukPublicFunding.meta.version,
      reviewedOn: ukPublicFunding.meta.reviewedOn,
      datasetHash: `sha256:${datasetHash}`,
      datasetHashAlgorithm: "sha256(taxsorted-deterministic-json-utf8)",
      counts,
    },
    null,
    2
  )
);
