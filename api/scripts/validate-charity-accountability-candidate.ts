import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ukCharityAccountabilityFramework,
  ukCharityAccountabilitySchema,
} from "../src/uk-charity-accountability.js";

const input = process.argv[2];
const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
const absolutePath = input ? resolve(invocationDirectory, input) : null;

if (!input) {
  console.error(
    "Usage: npm run validate:charity-accountability-candidate --workspace api -- <candidate.json>"
  );
  process.exitCode = 2;
} else {
  try {
    const candidate = JSON.parse(await readFile(absolutePath!, "utf8"));
    const result = ukCharityAccountabilitySchema.safeParse(candidate);
    if (!result.success) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            file: absolutePath,
            issues: result.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
          null,
          2
        )
      );
      process.exitCode = 1;
    } else {
      const currentRelease = result.data.releases.find(
        (release) => release.id === result.data.meta.currentReleaseId
      )!;
      console.log(
        JSON.stringify(
          {
            ok: true,
            file: absolutePath,
            schemaId: result.data.meta.schemaId,
            publicationStatus: result.data.meta.publicationStatus,
            currentReleaseId: currentRelease.id,
            datasetDigest: currentRelease.datasetDigest,
            recordCounts: currentRelease.recordCounts,
            publicationAdmission: "not-granted-by-validation",
            next: ukCharityAccountabilityFramework.validationLayers.requirement,
          },
          null,
          2
        )
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          file: absolutePath,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }
}
