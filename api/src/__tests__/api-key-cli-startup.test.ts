import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseModuleLoaded = vi.hoisted(() => vi.fn());

vi.mock("../db.js", () => {
  databaseModuleLoaded();
  return {
    migrate: vi.fn(async () => {}),
    sql: Object.assign(vi.fn(), { end: vi.fn(async () => {}) }),
  };
});

beforeEach(() => {
  vi.resetModules();
  databaseModuleLoaded.mockClear();
});

describe("workspace-key CLI startup", () => {
  it("keeps manage-key help and invalid input independent of the database module", async () => {
    const { main } = await import("../../scripts/manage-api-key.js");
    expect(databaseModuleLoaded).not.toHaveBeenCalled();

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await main(["--help"]);
      await expect(
        main(["inspect", "--not-a-real-flag=value"]),
      ).rejects.toMatchObject({ code: "unknown_flag" });
    } finally {
      log.mockRestore();
    }

    expect(databaseModuleLoaded).not.toHaveBeenCalled();
  });

  it("keeps create-key help and invalid input independent of the database module", async () => {
    const { main } = await import("../../scripts/create-api-key.js");
    expect(databaseModuleLoaded).not.toHaveBeenCalled();

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await main(["--help"]);
      await expect(main(["Firm"])).rejects.toMatchObject({
        code: "expiry_count",
      });
    } finally {
      log.mockRestore();
    }

    expect(databaseModuleLoaded).not.toHaveBeenCalled();
  });
});
