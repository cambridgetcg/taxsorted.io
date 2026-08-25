import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  migrate: vi.fn<() => Promise<void>>(),
  end: vi.fn<() => Promise<void>>(),
}));

vi.mock("../db.js", () => ({
  migrate: mocks.migrate,
  sql: { end: mocks.end },
}));

import { main } from "../../scripts/migrate.js";

const flyConfig = await readFile(new URL("../../fly.toml", import.meta.url), "utf8");
const apiPackage = JSON.parse(
  await readFile(new URL("../../package.json", import.meta.url), "utf8"),
) as { scripts?: Record<string, string> };

beforeEach(() => {
  mocks.migrate.mockReset();
  mocks.end.mockReset();
});

describe("migration release command", () => {
  it("runs migrations and always closes the default database client", async () => {
    const events: string[] = [];
    mocks.migrate.mockImplementation(async () => {
      events.push("migrate");
    });
    mocks.end.mockImplementation(async () => {
      events.push("close");
    });

    await main();

    expect(events).toEqual(["migrate", "close"]);
    expect(mocks.end).toHaveBeenCalledWith({ timeout: 5 });
  });

  it("closes the database client when migration fails", async () => {
    mocks.migrate.mockRejectedValue(new Error("migration failed"));
    mocks.end.mockResolvedValue();

    await expect(main()).rejects.toThrow("migration failed");

    expect(mocks.end).toHaveBeenCalledOnce();
    expect(mocks.end).toHaveBeenCalledWith({ timeout: 5 });
  });

  it("is wired as the Fly release command", () => {
    expect(apiPackage.scripts?.migrate).toBe("tsx scripts/migrate.ts");
    expect(flyConfig).toMatch(
      /\[deploy\]\s+release_command = "npm run migrate --workspace api"/u,
    );
    expect(flyConfig.match(/\brelease_command\s*=/gu)).toHaveLength(1);
  });
});
