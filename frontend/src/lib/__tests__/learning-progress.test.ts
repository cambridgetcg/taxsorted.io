import { describe, expect, it } from "vitest";
import {
  LEARNING_PROGRESS_SCHEMA,
  parseLearningProgress,
  serializeLearningProgress,
} from "@/lib/learning-progress";

describe("learning progress envelope", () => {
  it("keeps only known round IDs in the canonical round order", () => {
    const raw = JSON.stringify({
      schema: LEARNING_PROGRESS_SCHEMA,
      completedIds: ["mileage-move", "unknown", "payout-puzzle", "mileage-move"],
    });

    expect(parseLearningProgress(raw)).toEqual(["payout-puzzle", "mileage-move"]);
  });

  it("fails open to empty progress for malformed or unknown envelopes", () => {
    expect(parseLearningProgress("{")).toEqual([]);
    expect(parseLearningProgress(JSON.stringify({ schema: "future/2", completedIds: [] })))
      .toEqual([]);
    expect(parseLearningProgress(JSON.stringify({
      schema: LEARNING_PROGRESS_SCHEMA,
      completedIds: "payout-puzzle",
    }))).toEqual([]);
  });

  it("serializes only the schema and allowlisted stable IDs", () => {
    expect(JSON.parse(serializeLearningProgress([
      "unknown",
      "allowance-choice",
      "payout-puzzle",
    ]))).toEqual({
      schema: LEARNING_PROGRESS_SCHEMA,
      completedIds: ["payout-puzzle", "allowance-choice"],
    });
  });
});
