import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ukObserverAccountabilityCandidateSchema } from "../src/uk-observer-accountability.js";

const candidatePath = resolve(
  process.argv[2] ??
    "../research/uk/observer-accountability/examples/zero-row-candidate.json",
);
const candidate = JSON.parse(await readFile(candidatePath, "utf8"));
const parsed = ukObserverAccountabilityCandidateSchema.parse(candidate);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: parsed.schema,
      status: parsed.meta.status,
      baseDatasets: parsed.meta.baseDatasets.map((item) => item.datasetId),
      counts: {
        institutionalRelations: parsed.institutionalRelations.length,
        investigationEngagements: parsed.investigationEngagements.length,
        investigationActions: parsed.investigationActions.length,
        institutionalResponses: parsed.institutionalResponses.length,
        coverageGaps: parsed.coverageGaps.length,
      },
    },
    null,
    2,
  ),
);
