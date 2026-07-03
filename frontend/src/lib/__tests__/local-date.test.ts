import { describe, it, expect } from "vitest";
import { todayIsoLocal } from "../local-date";

describe("todayIsoLocal", () => {
  it("returns an ISO yyyy-mm-dd string", () => {
    expect(todayIsoLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches a manual local-parts construction (not the UTC day)", () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    expect(todayIsoLocal()).toBe(`${y}-${m}-${d}`);
  });
});
