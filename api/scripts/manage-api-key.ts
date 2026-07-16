import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import {
  ApiKeyLifecycleError,
  inspectApiKey,
  issueApiKey,
  normaliseOperatorLabel,
  normaliseRequestedScopes,
  parseZonedRfc3339,
  requireApiKeyPrefix,
  requireApiKeyUuid,
  revokeApiKey,
  rotateApiKey,
  type ApiKeyMode,
  type IssuedApiKey,
  type LifecycleSql,
} from "../src/api-key-lifecycle.js";

const HELP = `TaxSorted workspace-key operations

Usage:
  npm run manage:api-key --workspace api -- inspect --key-id=<uuid>
  npm run manage:api-key --workspace api -- issue --workspace-id=<uuid> --mode=test|live --scope=<scope> [--scope=<scope>] --expires-at=<zoned-rfc3339> [--name=<label>]
  npm run manage:api-key --workspace api -- rotate --key-id=<uuid> --expires-at=<zoned-rfc3339> [--name=<label>]
  npm run manage:api-key --workspace api -- revoke --key-id=<uuid> --confirm-prefix=<prefix> [--allow-last-key]

Key lifetimes must end in the future, use an explicit zone, and cannot exceed 400 days.
Issue and rotate print the new plaintext key exactly once. Keep that terminal private.

Safe rotation order:
  1. Rotate the active key. The old key remains active.
  2. Deliver and verify the new key through an independently agreed private channel.
  3. Revoke the old key by its UUID and exact safe prefix.

Revoke requires a same-mode scope-superset replacement with more than five minutes remaining,
unless --allow-last-key is given as an explicit off-switch.
If every key is expired or revoked, use issue with the active workspace UUID.
`;

type Command = "inspect" | "issue" | "rotate" | "revoke";

interface ParsedArguments {
  command: Command;
  values: Map<string, string[]>;
  booleans: Set<string>;
}

type Operation =
  | { command: "inspect"; keyId: string }
  | {
      command: "issue";
      workspaceId: string;
      mode: ApiKeyMode;
      scopes: string[];
      expiresAt: string;
      name?: string;
    }
  | {
      command: "rotate";
      keyId: string;
      expiresAt: string;
      name?: string;
    }
  | {
      command: "revoke";
      keyId: string;
      confirmPrefix: string;
      allowLastKey: boolean;
    };

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

function parseArguments(argv: readonly string[]): ParsedArguments | "help" {
  if (argv.length === 0 || argv[0] === "help" || argv.includes("--help")) {
    return "help";
  }
  const command = argv[0];
  if (
    command !== "inspect" &&
    command !== "issue" &&
    command !== "rotate" &&
    command !== "revoke"
  ) {
    throw new ApiKeyLifecycleError(
      "unknown_command",
      `Unknown command: ${command ?? ""}. Run with --help.`,
    );
  }

  const values = new Map<string, string[]>();
  const booleans = new Set<string>();
  for (const argument of argv.slice(1)) {
    if (!argument.startsWith("--")) {
      throw new ApiKeyLifecycleError(
        "invalid_argument",
        `Unexpected argument: ${argument}. Use named --flag=value arguments.`,
      );
    }
    const equals = argument.indexOf("=");
    if (equals === -1) {
      if (argument !== "--allow-last-key") {
        throw new ApiKeyLifecycleError(
          "invalid_argument",
          `${argument} needs an explicit value.`,
        );
      }
      const name = argument.slice(2);
      if (booleans.has(name)) {
        throw new ApiKeyLifecycleError(
          "duplicate_flag",
          `Give ${argument} at most once.`,
        );
      }
      booleans.add(name);
      continue;
    }
    const name = argument.slice(2, equals);
    const value = argument.slice(equals + 1);
    if (!name || !value) {
      throw new ApiKeyLifecycleError(
        "invalid_argument",
        `${argument} must have a non-empty name and value.`,
      );
    }
    values.set(name, [...(values.get(name) ?? []), value]);
  }
  return { command, values, booleans };
}

function assertAllowedFlags(
  parsed: ParsedArguments,
  valueNames: readonly string[],
  booleanNames: readonly string[] = [],
): void {
  const allowedValues = new Set(valueNames);
  const allowedBooleans = new Set(booleanNames);
  for (const name of parsed.values.keys()) {
    if (!allowedValues.has(name)) {
      throw new ApiKeyLifecycleError(
        "unknown_flag",
        `--${name} is not valid for ${parsed.command}.`,
      );
    }
  }
  for (const name of parsed.booleans) {
    if (!allowedBooleans.has(name)) {
      throw new ApiKeyLifecycleError(
        "unknown_flag",
        `--${name} is not valid for ${parsed.command}.`,
      );
    }
  }
}

function oneValue(parsed: ParsedArguments, name: string): string;
function oneValue(
  parsed: ParsedArguments,
  name: string,
  required: false,
): string | undefined;
function oneValue(parsed: ParsedArguments, name: string, required = true) {
  const values = parsed.values.get(name) ?? [];
  if (values.length === 0) {
    if (!required) return undefined;
    throw new ApiKeyLifecycleError(
      "missing_flag",
      `--${name}=... is required for ${parsed.command}.`,
    );
  }
  if (values.length > 1) {
    throw new ApiKeyLifecycleError(
      "duplicate_flag",
      `Give --${name} exactly once.`,
    );
  }
  return values[0]!;
}

function modeValue(parsed: ParsedArguments): ApiKeyMode {
  const mode = oneValue(parsed, "mode");
  if (mode !== "test" && mode !== "live") {
    throw new ApiKeyLifecycleError(
      "invalid_mode",
      "--mode must be test or live.",
    );
  }
  return mode;
}

function buildOperation(parsed: ParsedArguments): Operation {
  if (parsed.command === "inspect") {
    assertAllowedFlags(parsed, ["key-id"]);
    return {
      command: "inspect",
      keyId: requireApiKeyUuid(oneValue(parsed, "key-id"), "--key-id"),
    };
  }

  if (parsed.command === "issue") {
    assertAllowedFlags(parsed, [
      "workspace-id",
      "mode",
      "scope",
      "expires-at",
      "name",
    ]);
    const expiresAt = oneValue(parsed, "expires-at");
    parseZonedRfc3339(expiresAt);
    const nameValue = oneValue(parsed, "name", false);
    return {
      command: "issue",
      workspaceId: requireApiKeyUuid(
        oneValue(parsed, "workspace-id"),
        "--workspace-id",
      ),
      mode: modeValue(parsed),
      scopes: normaliseRequestedScopes(parsed.values.get("scope") ?? []),
      expiresAt,
      ...(nameValue
        ? { name: normaliseOperatorLabel(nameValue, "--name") }
        : {}),
    };
  }

  if (parsed.command === "rotate") {
    assertAllowedFlags(parsed, ["key-id", "expires-at", "name"]);
    const expiresAt = oneValue(parsed, "expires-at");
    parseZonedRfc3339(expiresAt);
    const nameValue = oneValue(parsed, "name", false);
    return {
      command: "rotate",
      keyId: requireApiKeyUuid(oneValue(parsed, "key-id"), "--key-id"),
      expiresAt,
      ...(nameValue
        ? { name: normaliseOperatorLabel(nameValue, "--name") }
        : {}),
    };
  }

  assertAllowedFlags(
    parsed,
    ["key-id", "confirm-prefix"],
    ["allow-last-key"],
  );
  return {
    command: "revoke",
    keyId: requireApiKeyUuid(oneValue(parsed, "key-id"), "--key-id"),
    confirmPrefix: requireApiKeyPrefix(
      oneValue(parsed, "confirm-prefix"),
      "--confirm-prefix",
    ),
    allowLastKey: parsed.booleans.has("allow-last-key"),
  };
}

function printIssuedKey(
  issued: IssuedApiKey,
  output: (line: string) => void,
): void {
  output(JSON.stringify(issued.metadata, null, 2));
  output("API key (shown once):");
  output(issued.plaintext);
}

export async function main(
  argv: readonly string[] = process.argv.slice(2),
  dependencies?: MainDependencies,
  loadDependencies: LoadMainDependencies = loadDefaultDependencies,
): Promise<void> {
  const parsed = parseArguments(argv);
  if (parsed === "help") {
    (dependencies?.output ?? console.log)(HELP);
    return;
  }
  const operation = buildOperation(parsed);
  const activeDependencies = dependencies ?? (await loadDependencies());

  try {
    await activeDependencies.migrate();
    if (operation.command === "inspect") {
      const metadata = await inspectApiKey(
        activeDependencies.database,
        operation.keyId,
      );
      activeDependencies.output(JSON.stringify(metadata, null, 2));
      return;
    }

    if (operation.command === "issue") {
      const issued = await issueApiKey(activeDependencies.database, {
        workspaceId: operation.workspaceId,
        mode: operation.mode,
        scopes: operation.scopes,
        expiresAt: operation.expiresAt,
        name: operation.name,
      });
      printIssuedKey(issued, activeDependencies.output);
      return;
    }

    if (operation.command === "rotate") {
      const issued = await rotateApiKey(activeDependencies.database, {
        keyId: operation.keyId,
        expiresAt: operation.expiresAt,
        name: operation.name,
      });
      printIssuedKey(issued, activeDependencies.output);
      activeDependencies.output(
        `Old key ${operation.keyId} remains active. Verify the replacement before revoking it.`,
      );
      return;
    }

    const result = await revokeApiKey(activeDependencies.database, {
      keyId: operation.keyId,
      confirmPrefix: operation.confirmPrefix,
      allowLastKey: operation.allowLastKey,
    });
    activeDependencies.output(
      JSON.stringify(
        {
          ...result,
          status: result.changed ? "revoked" : "already-revoked",
        },
        null,
        2,
      ),
    );
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
