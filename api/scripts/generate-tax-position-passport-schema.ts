import { readFile, writeFile } from "node:fs/promises";
import { z as zod } from "zod";
import { TaxPositionPassportSchema } from "../src/routes/tax-expert.js";

const outputUrl = new URL(
  "../src/tax-position-passport.schema.json",
  import.meta.url,
);

const generated = zod.toJSONSchema(
  TaxPositionPassportSchema,
  { target: "draft-2020-12" },
) as Record<string, unknown>;

function closeTupleSchemas(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(closeTupleSchemas);
    return;
  }
  if (!value || typeof value !== "object") return;

  const schema = value as Record<string, unknown>;
  if (Array.isArray(schema.prefixItems)) {
    const length = schema.prefixItems.length;
    schema.minItems = length;
    schema.maxItems = length;
    schema.items = false;
  }
  Object.values(schema).forEach(closeTupleSchemas);
}

// Zod 4 currently emits prefixItems without closing Draft 2020-12 tuples.
// The runtime tuples are exact, so make that constraint explicit in the
// published snapshot as well.
closeTupleSchemas(generated);

function schemaAt(
  root: Record<string, unknown>,
  path: readonly string[],
): Record<string, unknown> {
  let current: unknown = root;
  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      throw new Error(
        `Passport schema generation could not find ${path.join(".")}`,
      );
    }
    current = (current as Record<string, unknown>)[segment];
  }
  if (!current || typeof current !== "object" || Array.isArray(current)) {
    throw new Error(
      `Passport schema generation could not find ${path.join(".")}`,
    );
  }
  return current as Record<string, unknown>;
}

const returnIndicators = schemaAt(generated, [
  "properties",
  "positions",
  "items",
  "properties",
  "request",
  "properties",
  "exemption",
  "properties",
  "returnIndicators",
]);
const returnIndicatorChoices = returnIndicators.anyOf;
if (!Array.isArray(returnIndicatorChoices)) {
  throw new Error("Passport returnIndicators schema must contain anyOf");
}
const returnIndicatorList = returnIndicatorChoices.find(
  (choice) =>
    choice
    && typeof choice === "object"
    && !Array.isArray(choice)
    && (choice as Record<string, unknown>).type === "array",
);
if (!returnIndicatorList || Array.isArray(returnIndicatorList)) {
  throw new Error("Passport returnIndicators schema must contain an array");
}
(returnIndicatorList as Record<string, unknown>).uniqueItems = true;

const document = {
  ...generated,
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id:
    "https://api.taxsorted.io/v1/uk/tax-expert/tax-position-passport/schema",
  title: "TaxSorted UK Tax Position Passport",
  description:
    "Portable browser-local UK tax-position handoff. It contains no identity verification, signature, professional approval or filing receipt.",
  "x-taxsorted-generation":
    "Committed build-time snapshot of TaxPositionPassportSchema; no runtime schema conversion.",
  "x-taxsorted-runtime-invariants": [
    "Income-source and evidence entries use the canonical order and exact definitions.",
    "Evidence marked not-expected must agree with the income-source map.",
    "The complete MTD request and TaxAnswer must match the same capability and pass their canonical runtime invariants, including cross-field cessation chronology.",
    "Forbidden identity, contact and tax-reference keys are rejected.",
  ],
};

const representation = `${JSON.stringify(document, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(outputUrl, "utf8");
  if (current !== representation) {
    throw new Error(
      "Tax Position Passport schema snapshot is stale. Run npm run generate:passport-schema --workspace api.",
    );
  }
  console.log("Tax Position Passport schema snapshot is current.");
} else {
  await writeFile(outputUrl, representation, "utf8");
  console.log("Wrote api/src/tax-position-passport.schema.json");
}
