import { stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  makeProfessionalOpportunityEdgeWorker,
  professionalOpportunityEdgeRoutes,
} from "../src/lib/uk-professional-opportunity-edge-guard.js";
import { professionalOpportunityEdgeGateManifest } from "../src/lib/uk-professional-opportunity-publication.js";

const outputDirectory = resolve(process.cwd(), "out");

async function main() {
  const output = await stat(outputDirectory);
  if (!output.isDirectory()) {
    throw new Error("frontend output directory is missing");
  }

  await Promise.all([
    writeFile(
      resolve(outputDirectory, "_worker.js"),
      makeProfessionalOpportunityEdgeWorker(
        professionalOpportunityEdgeGateManifest,
      ),
      { encoding: "utf8", flag: "wx", mode: 0o644 },
    ),
    writeFile(
      resolve(outputDirectory, "_routes.json"),
      `${JSON.stringify(professionalOpportunityEdgeRoutes, null, 2)}\n`,
      { encoding: "utf8", flag: "wx", mode: 0o644 },
    ),
  ]);

  console.log(
    JSON.stringify({
      ok: true,
      state: professionalOpportunityEdgeGateManifest.state,
      reviewBy: professionalOpportunityEdgeGateManifest.reviewBy,
      guardedRoots: 2,
      failClosedWorkerWritten: true,
    }),
  );
}

void main();
