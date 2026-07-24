// Validate one private assessment locally. This checks schema shape and
// internal state transitions only. It does not fetch a packet or verify that
// the caller-maintained packet reference belongs to one. The input path and
// private values are never printed.

import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { assertNoDuplicateJsonKeys } from "../src/strict-json.js";
import { professionalOpportunityAssessmentSchema } from "../src/uk-professional-opportunities.js";

const maxBytes = 2_000_000;
const input = process.argv[2];
const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
const absolutePath = input ? resolve(invocationDirectory, input) : null;

if (!absolutePath) {
  console.error(
    "Usage: npm run validate:professional-opportunity-assessment --workspace api -- <private-assessment.json>",
  );
  process.exitCode = 2;
} else {
  try {
    const file = await stat(absolutePath);
    if (!file.isFile() || file.size > maxBytes) {
      throw new Error(
        `Assessment must be one regular file no larger than ${maxBytes} bytes.`,
      );
    }

    const body = await readFile(absolutePath, "utf8");
    assertNoDuplicateJsonKeys(body);
    const result = professionalOpportunityAssessmentSchema.safeParse(
      JSON.parse(body),
    );
    if (!result.success) {
      const publicIssues = result.error.issues.slice(0, 100).map((issue) => ({
        category: "assessment-schema",
        code: issue.code,
      }));
      console.error(
        JSON.stringify(
          {
            ok: false,
            validationScope:
              "assessment-shape-and-internal-state-only",
            packetReferenceVerified: false,
            issueCount: result.error.issues.length,
            issuesTruncated:
              result.error.issues.length > publicIssues.length,
            issues: publicIssues,
            privateFactsEchoed: false,
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    } else {
      console.log(
        JSON.stringify(
          {
            ok: true,
            validationScope:
              "assessment-shape-and-internal-state-only",
            packetReferenceVerified: false,
            schema: result.data.schema,
            status: result.data.status,
            currentState: result.data.workflow.currentState,
            terminalDecision:
              result.data.decision.state === "not-assessed"
                ? null
                : result.data.decision.state,
            taxSortedSubmissionEndpoint:
              result.data.privacy.taxSortedSubmissionEndpoint,
            privateFactsEchoed: false,
          },
          null,
          2,
        ),
      );
    }
  } catch {
    console.error(
      JSON.stringify(
        {
          ok: false,
          validationScope:
            "assessment-shape-and-internal-state-only",
          packetReferenceVerified: false,
          error:
            "The assessment file could not be read or parsed safely.",
          privateFactsEchoed: false,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}
