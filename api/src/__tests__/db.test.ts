import { readdir } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  migrate,
  type MigrationSql,
  type MigrationTransaction,
} from "../db.js";

const migrationFiles = (await readdir(
  new URL("../../migrations", import.meta.url),
))
  .filter((file) => file.endsWith(".sql"))
  .sort();

function normaliseSql(strings: TemplateStringsArray): string {
  return strings.join("$").replace(/\s+/gu, " ").trim();
}

class FakeMigrationSql implements MigrationSql {
  readonly applied = new Set<string>();
  readonly events: string[] = [];
  beginCalls = 0;
  unsafeCalls = 0;
  failUnsafeAt: number | null = null;

  private lockTail = Promise.resolve();

  private async acquireLock(): Promise<() => void> {
    const previous = this.lockTail;
    let release = () => {};
    this.lockTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    return release;
  }

  async begin<T>(
    callback: (tx: MigrationTransaction) => Promise<T>,
  ): Promise<T> {
    const transaction = ++this.beginCalls;
    const staged = new Set<string>();
    let releaseLock: (() => void) | undefined;

    const query = async (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<readonly Record<string, unknown>[]> => {
      const text = normaliseSql(strings);
      if (
        text ===
        "select pg_advisory_xact_lock(hashtextextended('taxsorted-api-migrations', 0))"
      ) {
        this.events.push(`${transaction}:lock-wait`);
        releaseLock = await this.acquireLock();
        this.events.push(`${transaction}:lock`);
        return [];
      }
      if (text.startsWith("create table if not exists _migrations")) {
        this.events.push(`${transaction}:create-ledger`);
        return [];
      }
      if (text.startsWith("select 1 from _migrations")) {
        const file = String(values[0]);
        this.events.push(`${transaction}:check:${file}`);
        return this.applied.has(file) ? [{ applied: 1 }] : [];
      }
      if (text.startsWith("insert into _migrations")) {
        const file = String(values[0]);
        this.events.push(`${transaction}:record:${file}`);
        staged.add(file);
        return [];
      }
      throw new Error(`Unexpected migration query: ${text}`);
    };

    const tx = Object.assign(query, {
      unsafe: async (): Promise<void> => {
        this.unsafeCalls += 1;
        this.events.push(`${transaction}:apply:${this.unsafeCalls}`);
        if (this.failUnsafeAt === this.unsafeCalls) {
          throw new Error("migration body failed");
        }
      },
    }) satisfies MigrationTransaction;

    try {
      const result = await callback(tx);
      for (const file of staged) this.applied.add(file);
      this.events.push(`${transaction}:commit`);
      return result;
    } catch (error) {
      this.events.push(`${transaction}:rollback`);
      throw error;
    } finally {
      releaseLock?.();
    }
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("database migrations", () => {
  it("locks first, uses one transaction, and logs only after commit", async () => {
    const database = new FakeMigrationSql();
    const log = vi.spyOn(console, "log").mockImplementation((message) => {
      database.events.push(`log:${String(message)}`);
    });

    await migrate(database);

    expect(database.beginCalls).toBe(1);
    expect(database.events[0]).toBe("1:lock-wait");
    expect(database.events[1]).toBe("1:lock");
    expect(database.events[2]).toBe("1:create-ledger");
    expect(database.unsafeCalls).toBe(migrationFiles.length);
    expect([...database.applied].sort()).toEqual(migrationFiles);
    expect(log).toHaveBeenCalledTimes(migrationFiles.length);

    const commitIndex = database.events.indexOf("1:commit");
    const firstLogIndex = database.events.findIndex((event) =>
      event.startsWith("log:migrated:"),
    );
    expect(commitIndex).toBeGreaterThan(-1);
    expect(firstLogIndex).toBeGreaterThan(commitIndex);
  });

  it("rolls every ledger change back and does not log when a migration fails", async () => {
    const database = new FakeMigrationSql();
    database.failUnsafeAt = 2;
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(migrate(database)).rejects.toThrow("migration body failed");

    expect(database.beginCalls).toBe(1);
    expect(database.events).toContain("1:rollback");
    expect(database.events).not.toContain("1:commit");
    expect(database.applied.size).toBe(0);
    expect(log).not.toHaveBeenCalled();
  });

  it("serialises concurrent runners so each migration is applied once", async () => {
    const database = new FakeMigrationSql();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await Promise.all([migrate(database), migrate(database)]);

    expect(database.beginCalls).toBe(2);
    expect(database.events.filter((event) => event.endsWith(":lock"))).toHaveLength(2);
    expect(database.events.filter((event) => event.endsWith(":commit"))).toHaveLength(2);
    expect(database.unsafeCalls).toBe(migrationFiles.length);
    expect([...database.applied].sort()).toEqual(migrationFiles);
    expect(log).toHaveBeenCalledTimes(migrationFiles.length);
  });
});
