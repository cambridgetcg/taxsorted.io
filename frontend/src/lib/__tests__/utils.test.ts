import { describe, expect, it } from "vitest";
import { formatDate, formatPeriod } from "../utils";

describe("UTC date presentation", () => {
  it("keeps a YYYY-MM-DD calendar date stable", () => {
    expect(formatDate("2026-08-07")).toBe("7 Aug 2026");
    expect(formatPeriod("2026-04-01", "2026-06-30")).toBe("Apr – Jun 2026");
  });

  it("renders timestamps against one deterministic UTC clock", () => {
    expect(formatDate("2026-08-07T23:30:00-07:00")).toBe("8 Aug 2026");
    expect(formatDate("2026-08-07T00:30:00+10:00")).toBe("6 Aug 2026");
  });
});
