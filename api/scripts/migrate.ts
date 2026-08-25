import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

interface MigrationCliDependencies {
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}

async function loadDefaultDependencies(): Promise<MigrationCliDependencies> {
  const { migrate, sql } = await import("../src/db.js");
  return {
    migrate,
    close: async () => {
      await sql.end({ timeout: 5 });
    },
  };
}

export async function main(
  dependencies?: MigrationCliDependencies,
): Promise<void> {
  const activeDependencies = dependencies ?? (await loadDefaultDependencies());
  try {
    await activeDependencies.migrate();
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
