import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { databaseUrl } from "./runtime-environment.js";

export const sql = postgres(databaseUrl, {
  max: 5,
  onnotice: () => {},
});

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

export interface MigrationTransaction {
  (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<readonly Record<string, unknown>[]>;
  unsafe(query: string): Promise<unknown>;
}

export interface MigrationSql {
  begin<T>(callback: (tx: MigrationTransaction) => Promise<T>): Promise<T>;
}

export async function migrate(
  database: MigrationSql = sql as unknown as MigrationSql,
) {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const migrations = await Promise.all(files.map(async (file) => ({
    file,
    body: await readFile(join(MIGRATIONS_DIR, file), "utf8"),
  })));

  const appliedFiles = await database.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtextextended('taxsorted-api-migrations', 0))`;
    await tx`create table if not exists _migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`;

    const applied: string[] = [];
    for (const { file, body } of migrations) {
      const [done] = await tx`select 1 from _migrations where name = ${file}`;
      if (done) continue;
      await tx.unsafe(body);
      await tx`insert into _migrations (name) values (${file})`;
      applied.push(file);
    }
    return applied;
  });

  for (const file of appliedFiles) {
    console.log(`migrated: ${file}`);
  }
}
