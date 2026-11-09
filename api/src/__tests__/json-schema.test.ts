import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  offsetDateTime,
  publishedJsonSchema,
  trimmedUrl,
} from "../json-schema.js";

const example = z
  .object({
    condition: z.string().nullable(),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    pair: z.tuple([z.string(), z.number()]),
    at: offsetDateTime,
    source: trimmedUrl,
  })
  .strict();

describe("published JSON Schema", () => {
  it("keeps the shape published under zod 4.4", () => {
    expect(publishedJsonSchema(example)).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        condition: { anyOf: [{ type: "string" }, { type: "null" }] },
        value: {
          anyOf: [
            { type: "string" },
            { type: "number" },
            { type: "boolean" },
            { type: "null" },
          ],
        },
        pair: {
          type: "array",
          prefixItems: [{ type: "string" }, { type: "number" }],
        },
        at: {
          type: "string",
          format: "date-time",
          pattern: expect.any(String),
        },
        source: { type: "string", format: "uri" },
      },
      required: ["condition", "value", "pair", "at", "source"],
      additionalProperties: false,
    });
  });

  it("refuses a tuple whose own length checks it would drop", () => {
    const bounded = z.tuple([z.string()], z.string()).check(z.maxLength(4));

    expect(() => publishedJsonSchema(bounded)).toThrow("length checks");
  });

  it("publishes the date-time pattern that the runtime enforces", () => {
    // Ajv strict mode refuses `type: [...]` unions, so compiling here also
    // guards the anyOf shape. Published tuples stay open, which strictTuples
    // refuses. Formats stay annotations; the pattern decides.
    const validate = new Ajv2020({
      strict: true,
      strictTuples: false,
      validateFormats: false,
    }).compile(publishedJsonSchema(example));
    const valid = {
      condition: null,
      value: 1,
      pair: ["a", 1],
      source: "https://example.com",
    };

    for (const [at, accepted] of [
      ["2026-10-28T10:15Z", true],
      ["2026-10-28T10:15+01:00", true],
      ["2026-10-28T10:15:30.25-05:30", true],
      ["2026-10-28T10:15", false],
      ["2026-02-29T10:15:00Z", false],
    ] as const) {
      expect(offsetDateTime.safeParse(at).success, at).toBe(accepted);
      expect(validate({ ...valid, at }), at).toBe(accepted);
    }
  });

  it("keeps a URL as written apart from surrounding whitespace", () => {
    // The URL parser ignores tabs and line breaks. Zod 4.6's url() deletes
    // them from the value too, so "ht\ttps://" would pass an HTTPS check and
    // a sealed digest would no longer match the file.
    const httpsUrl = trimmedUrl.refine((value) => value.startsWith("https://"));

    expect(trimmedUrl.parse(" https://exa\tmple.com/a\nb\n")).toBe(
      "https://exa\tmple.com/a\nb",
    );
    expect(httpsUrl.safeParse("ht\ttps://example.com").success).toBe(false);
    expect(httpsUrl.safeParse("https:/\t/example.com").success).toBe(false);
    expect(trimmedUrl.safeParse("not a url").success).toBe(false);
  });
});
