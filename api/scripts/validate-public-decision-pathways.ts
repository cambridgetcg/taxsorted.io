#!/usr/bin/env -S npx tsx

import { createHash } from "node:crypto";
import {
  publicDecisionPathways,
  validatePublicDecisionPathwayReferences,
} from "../src/uk-public-decision-pathways.js";
import { canonicalJson } from "../src/open-data.js";

validatePublicDecisionPathwayReferences(publicDecisionPathways);

const counts = {
  sources: publicDecisionPathways.sources.length,
  decisionIntents: publicDecisionPathways.decisionIntents.length,
  actors: publicDecisionPathways.actors.length,
  participants: publicDecisionPathways.participants.length,
  pathways: publicDecisionPathways.pathways.length,
  publicDoors: publicDecisionPathways.publicDoors.length,
  personalRoutes: publicDecisionPathways.personalRoutes.length,
  officialHandoffs: publicDecisionPathways.officialHandoffs.length,
  eventWindows: publicDecisionPathways.eventWindows.length,
  barriers: publicDecisionPathways.barriers.length,
  coverageGaps: publicDecisionPathways.coverageGaps.length,
};

const datasetHash = createHash("sha256")
  .update(canonicalJson(publicDecisionPathways))
  .digest("hex");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: publicDecisionPathways.schema,
      version: publicDecisionPathways.meta.version,
      lawAsAt: publicDecisionPathways.meta.lawAsAt,
      datasetHash: `sha256:${datasetHash}`,
      datasetHashAlgorithm: "sha256(taxsorted-deterministic-json-utf8)",
      counts,
    },
    null,
    2,
  ),
);
