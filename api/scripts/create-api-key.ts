// Create one workspace and its first finite-lived machine key. The secret is
// printed once; only its SHA-256 digest is stored.

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  ApiKeyLifecycleError,
  createWorkspaceWithFirstKey,
  normaliseOperatorLabel,
  normaliseRequestedScopes,
  parseZonedRfc3339,
  type ApiKeyMode,
  type LifecycleSql,
} from "../src/api-key-lifecycle.js";

const HELP = `Create a TaxSorted API workspace and its first key.

Usage:
  npm run create:api-key --workspace api -- "Firm name" --expires-at=<zoned-rfc3339> [--live] [--scope=sdlt:calculate] [--scope=tax-expert:assess]

The expiry must be a future zoned RFC3339 date-time, no more than 400 days away.
The plaintext key is shown exactly once. Keep that terminal private.`;

export interface CreateApiKeyArguments {
  workspaceName: string;
  mode: ApiKeyMode;
  scopes: string[];
  expiresAt: string;
}

interface MainDependencies {
  database: LifecycleSql;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
  output: (line: string) => void;
}

type LoadMainDependencies = () => Promise<MainDependencies>;

async function loadDefaultDependencies(): Promise<MainDependencies> {
  const { migrate, sql } = await import("../src/db.js");
  return {
    database: sql as unknown as LifecycleSql,
    migrate,
    close: async () => {
      await sql.end({ timeout: 5 });
    },
    output: console.log,
  };
}

export function parseCreateApiKeyArguments(
  argv: readonly string[],
): CreateApiKeyArguments | "help" {
  if (argv.includes("--help")) return "help";

  const workspaceParts: string[] = [];
  const scopes: string[] = [];
  const expiries: string[] = [];
  let liveCount = 0;

  for (const argument of argv) {
    if (argument === "--live") {
      liveCount += 1;
      continue;
    }
    if (argument.startsWith("--scope=")) {
      const scope = argument.slice("--scope=".length);
      if (!scope) {
        throw new ApiKeyLifecycleError(
          "empty_scope",
          "--scope must name a supported scope.",
        );
      }
      scopes.push(scope);
      continue;
    }
    if (argument.startsWith("--expires-at=")) {
      const expiry = argument.slice("--expires-at=".length);
      if (!expiry) {
        throw new ApiKeyLifecycleError(
          "empty_expiry",
          "--expires-at must have a zoned RFC3339 date-time.",
        );
      }
      expiries.push(expiry);
      continue;
    }
    if (argument.startsWith("--")) {
      throw new ApiKeyLifecycleError(
        "unknown_flag",
        `Unknown option: ${argument}. Run with --help.`,
      );
    }
    workspaceParts.push(argument);
  }

  if (liveCount > 1) {
    throw new ApiKeyLifecycleError(
      "duplicate_live_flag",
      "Give --live at most once.",
    );
  }
  if (expiries.length !== 1) {
    throw new ApiKeyLifecycleError(
      "expiry_count",
      "Give --expires-at exactly once as a future zoned RFC3339 date-time.",
    );
  }
  const workspaceName = workspaceParts.join(" ").trim();
  if (!workspaceName) {
    throw new ApiKeyLifecycleError(
      "workspace_name_required",
      'Give the workspace name, for example "North & Co".',
    );
  }
  normaliseOperatorLabel(workspaceName, "Workspace name");
  normaliseRequestedScopes(scopes, ["sdlt:calculate"]);
  parseZonedRfc3339(expiries[0]!);

  return {
    workspaceName,
    mode: liveCount === 1 ? "live" : "test",
    scopes,
    expiresAt: expiries[0]!,
  };
}

export async function main(
  argv: readonly string[] = process.argv.slice(2),
  dependencies?: MainDependencies,
  loadDependencies: LoadMainDependencies = loadDefaultDependencies,
): Promise<void> {
  const parsed = parseCreateApiKeyArguments(argv);
  if (parsed === "help") {
    (dependencies?.output ?? console.log)(HELP);
    return;
  }
  const activeDependencies = dependencies ?? (await loadDependencies());

  try {
    await activeDependencies.migrate();
    const result = await createWorkspaceWithFirstKey(
      activeDependencies.database,
      parsed,
    );
    activeDependencies.output(`Workspace: ${result.metadata.workspace.name}`);
    activeDependencies.output(`Workspace ID: ${result.metadata.workspace.id}`);
    activeDependencies.output(`Key ID: ${result.metadata.key.id}`);
    activeDependencies.output(
      `Scopes: ${result.metadata.key.scopes.join(", ")}`,
    );
    activeDependencies.output(`Expires at: ${result.metadata.key.expiresAt}`);
    activeDependencies.output("API key (shown once):");
    activeDependencies.output(result.plaintext);
  } finally {
    await activeDependencies.close();
  }
}

const entryPoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === entryPoint) {
  main().catch((error: unknown) => {
    const message =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
