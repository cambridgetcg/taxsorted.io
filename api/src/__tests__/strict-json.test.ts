import { describe, expect, it } from "vitest";
import { assertNoDuplicateJsonKeys, StrictJsonError } from "../strict-json.js";

describe("strict JSON facts", () => {
  it("accepts ordinary nested JSON and the same key in separate objects", () => {
    expect(() => assertNoDuplicateJsonKeys('{"left":{"value":1},"right":{"value":2},"rows":[true,null,"ok"]}')).not.toThrow();
  });

  it("rejects a duplicate field at any object depth", () => {
    for (const body of ['{"amount":1,"amount":2}', '{"outer":{"known":true,"known":false}}']) {
      try {
        assertNoDuplicateJsonKeys(body);
        throw new Error("expected duplicate to fail");
      } catch (error) {
        expect(error).toBeInstanceOf(StrictJsonError);
        expect((error as StrictJsonError).code).toBe("duplicate_json_key");
      }
    }
  });

  it("recognises escaped and literal forms of the same key as duplicates", () => {
    expect(() => assertNoDuplicateJsonKeys('{"amount":1,"\\u0061mount":2}')).toThrow(/duplicate/i);
  });

  it("rejects malformed JSON instead of trying to repair it", () => {
    for (const body of [
      "",
      '{"amount":}',
      "[1,]",
      '{"amount":01}',
      '{"bad\\x":1}',
      '\u00a0{"amount":1}',
      '\ufeff{"amount":1}',
      '\u2028{"amount":1}',
    ]) {
      expect(() => assertNoDuplicateJsonKeys(body)).toThrow(StrictJsonError);
    }
  });
});
