// Prepare, check or seal one public-safe qualified-review pack.
// The command is offline, bounded and refuses to overwrite output.

import {
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import {
  assertNoDuplicateJsonKeys,
  StrictJsonError,
} from "../src/strict-json.js";
import {
  makePendingProfessionalOpportunityReviewPack,
  professionalOpportunityReviewPackJsonSchema,
  ProfessionalOpportunityReviewPackBindingError,
  sealProfessionalOpportunityReviewPack,
  validateProfessionalOpportunityReviewPackDraftForCorpus,
  validateProfessionalOpportunityReviewPackForCorpus,
} from "../src/uk-professional-opportunity-review.js";
import {
  evaluateProfessionalOpportunityPublicationApproval,
  professionalOpportunityCorpusDigest,
  ukProfessionalOpportunities,
  ukProfessionalOpportunityPublicationApproval,
} from "../src/uk-professional-opportunities.js";

const maxBytes = 5_000_000;
const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
const [mode, ...arguments_] = process.argv.slice(2);
const allowPending = arguments_.includes("--allow-pending");
const cleanPositional = arguments_.filter(
  (value) => value !== "--allow-pending",
);
const corpusDigest = professionalOpportunityCorpusDigest(
  ukProfessionalOpportunities,
);
const canonicalReviewPackPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../research/uk/professional-opportunities/review/qualified-review-pack.json",
);

function absolute(path: string | undefined) {
  return path ? resolve(invocationDirectory, path) : null;
}

async function readStrictJson(path: string) {
  const file = await stat(path);
  if (!file.isFile() || file.size > maxBytes) {
    throw new Error("input-not-one-bounded-file");
  }
  const body = await readFile(path, "utf8");
  assertNoDuplicateJsonKeys(body);
  return JSON.parse(body) as unknown;
}

function publicSummary(
  pack: ReturnType<
    typeof validateProfessionalOpportunityReviewPackForCorpus
  >,
  digestCheck: "stored" | "candidate-in-memory" = "stored",
) {
  return {
    ok: true,
    status: pack.status,
    corpusVersion: pack.corpus.version,
    corpusDigest: pack.corpus.digest,
    packDigest: pack.integrity.digest,
    digestCheck,
    reviewerCount: pack.reviewers.length,
    sourceCheckCount: pack.sourceChecks.length,
    opportunityReviewCount: pack.opportunityReviews.length,
    scrutinyReviewCount: pack.scrutinyReviews.length,
    rightOfReplyRowCount: pack.scrutinyReviews.reduce(
      (sum, review) => sum + review.rightOfReply.length,
      0,
    ),
    hostedDistributionApproved: false,
    networkUsed: false,
    privateValuesEchoed: false,
  };
}

async function writeNewFile(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
}

async function prepare() {
  const outputPath = absolute(cleanPositional[0]);
  if (!outputPath || cleanPositional.length !== 1) {
    throw new Error("prepare-usage");
  }
  const pack = makePendingProfessionalOpportunityReviewPack(
    ukProfessionalOpportunities,
    corpusDigest,
  );
  await writeNewFile(outputPath, pack);
  console.log(JSON.stringify(publicSummary(pack), null, 2));
}

async function check() {
  const canonical = cleanPositional.length === 0;
  const inputPath = canonical
    ? canonicalReviewPackPath
    : absolute(cleanPositional[0]);
  if (!inputPath || cleanPositional.length > 1) {
    throw new Error("check-usage");
  }
  const value = await readStrictJson(inputPath);
  const pack = canonical
    ? validateProfessionalOpportunityReviewPackForCorpus(
        value,
        ukProfessionalOpportunities,
        corpusDigest,
      )
    : validateProfessionalOpportunityReviewPackDraftForCorpus(
        value,
        ukProfessionalOpportunities,
        corpusDigest,
      );
  console.log(
    JSON.stringify(
      publicSummary(
        pack,
        canonical ? "stored" : "candidate-in-memory",
      ),
      null,
      2,
    ),
  );
  if (
    ukProfessionalOpportunityPublicationApproval?.status ===
      "approved-for-hosted-distribution" &&
    !evaluateProfessionalOpportunityPublicationApproval(
      ukProfessionalOpportunities,
      ukProfessionalOpportunityPublicationApproval,
      pack,
    ).approved
  ) {
    process.exitCode = 1;
    return;
  }
  if (pack.status !== "complete" && !allowPending) {
    process.exitCode = 1;
  }
}

async function writeSchema() {
  const outputPath = absolute(cleanPositional[0]);
  if (!outputPath || cleanPositional.length !== 1) {
    throw new Error("schema-usage");
  }
  await writeNewFile(
    outputPath,
    professionalOpportunityReviewPackJsonSchema,
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        schema:
          "taxsorted.uk.professional-opportunities-qualified-review-pack/1",
        hostedDistributionApproved: false,
        networkUsed: false,
      },
      null,
      2,
    ),
  );
}

async function seal() {
  const inputPath = absolute(cleanPositional[0]);
  const outputDirectory = absolute(cleanPositional[1]);
  if (
    !inputPath ||
    !outputDirectory ||
    cleanPositional.length !== 2
  ) {
    throw new Error("seal-usage");
  }
  const pack = sealProfessionalOpportunityReviewPack(
    await readStrictJson(inputPath),
    ukProfessionalOpportunities,
    corpusDigest,
  );

  await mkdir(outputDirectory, { recursive: false, mode: 0o700 });
  let completed = false;
  try {
    await Promise.all([
      writeFile(
        resolve(outputDirectory, "qualified-review-pack.json"),
        `${JSON.stringify(pack, null, 2)}\n`,
        { encoding: "utf8", flag: "wx", mode: 0o600 },
      ),
      writeFile(
        resolve(
          outputDirectory,
          "qualified-review-pack.schema.json",
        ),
        `${JSON.stringify(
          professionalOpportunityReviewPackJsonSchema,
          null,
          2,
        )}\n`,
        { encoding: "utf8", flag: "wx", mode: 0o600 },
      ),
    ]);
    completed = true;
  } finally {
    if (!completed) {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  }
  console.log(
    JSON.stringify(
      {
        ...publicSummary(pack),
        reviewPackSealed: true,
        hostedDistributionDecisionWritten: false,
        deploymentChanged: false,
        switchesChanged: false,
      },
      null,
      2,
    ),
  );
}

function usage() {
  return [
    "Usage:",
    "  npm run review:professional-opportunities --workspace api -- prepare <new-pack.json>",
    "  npm run review:professional-opportunities --workspace api -- schema <new-schema.json>",
    "  npm run review:professional-opportunities --workspace api -- check [pack.json] [--allow-pending]",
    "  npm run review:professional-opportunities --workspace api -- seal <pack.json> <new-output-directory>",
  ].join("\n");
}

const safeIssueSections = new Set([
  "schema",
  "status",
  "corpus",
  "reviewers",
  "evidenceIndex",
  "sourceChecks",
  "methodAndWorkflowReview",
  "opportunityReviews",
  "scrutinyReviews",
  "controls",
  "declaration",
  "boundaries",
  "integrity",
]);

function safeFailure(error: unknown) {
  if (error instanceof StrictJsonError) {
    return { errorCode: error.code, issueSections: ["json"] };
  }
  if (error instanceof ProfessionalOpportunityReviewPackBindingError) {
    return { errorCode: error.code, issueSections: ["binding"] };
  }
  if (error instanceof ZodError) {
    const issueSections = [
      ...new Set(
        error.issues.map((issue) => {
          const root = String(issue.path[0] ?? "");
          return safeIssueSections.has(root) ? root : "pack";
        }),
      ),
    ].slice(0, 12);
    return { errorCode: "invalid-review-pack", issueSections };
  }
  if (
    error instanceof Error &&
    [
      "prepare-usage",
      "schema-usage",
      "check-usage",
      "seal-usage",
    ].includes(error.message)
  ) {
    return { errorCode: error.message, issueSections: ["command"] };
  }
  return {
    errorCode: "safe-review-command-failed",
    issueSections: ["command"],
  };
}

try {
  if (mode === "prepare") {
    await prepare();
  } else if (mode === "schema") {
    await writeSchema();
  } else if (mode === "check") {
    await check();
  } else if (mode === "seal") {
    await seal();
  } else {
    console.error(usage());
    process.exitCode = 2;
  }
} catch (error) {
  const failure = safeFailure(error);
  console.error(
    JSON.stringify(
      {
        ok: false,
        ...failure,
        error:
          "The review command could not safely validate or write the requested artifact.",
        hostedDistributionApproved: false,
        networkUsed: false,
        inputPathEchoed: false,
        privateValuesEchoed: false,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
