import { z } from "zod";

const lengthChecks = new Set(["min_length", "max_length", "length_equals"]);

/**
 * Converts a zod schema into the JSON Schema shape TaxSorted publishes.
 * Published schemas are machine contracts, so upgrading zod must not quietly
 * change them. Zod 4.5 changed z.toJSONSchema output in several ways and offers
 * no option to turn them off. This override undoes the two that reach the
 * published schemas: closed tuples and `type: [...]` unions. Other changes
 * pass through, such as an intersection of objects folded into one object, a
 * rewritten email pattern and stock z.iso.datetime() requiring seconds, so new
 * date-time fields should use offsetDateTime. A deliberate contract change
 * belongs in the schema, not here.
 */
export function publishedJsonSchema(schema: z.ZodType) {
  return z.toJSONSchema(schema, {
    target: "draft-2020-12",
    override({ zodSchema, jsonSchema }) {
      // Zod now closes every tuple with items: false, minItems and maxItems.
      // The published tuples list prefixItems only, which is looser than the
      // runtime and which Ajv strict mode refuses. Closing them changes the
      // contract, so do it on purpose, as the Passport generator does. A
      // tuple's own length checks land in the same keys, so such a tuple is
      // refused rather than published without its bounds.
      if (zodSchema._zod.def.type === "tuple") {
        if (
          zodSchema._zod.def.checks?.some((check) =>
            lengthChecks.has(check._zod.def.check),
          )
        ) {
          throw new Error(
            "A published tuple with its own length checks needs a deliberate contract decision",
          );
        }
        delete jsonSchema.minItems;
        delete jsonSchema.maxItems;
        if (jsonSchema.items === false) delete jsonSchema.items;
      }
      // After this hook runs, zod folds an anyOf of bare types, such as a
      // nullable string, into `type: [...]`, which Ajv strict mode refuses.
      // Zod leaves a branch that carries a key of its own in anyOf, and an
      // undefined value never reaches the output.
      for (const branch of jsonSchema.anyOf ?? []) {
        branch["x-taxsorted-keep-any-of"] = undefined;
      }
    },
  });
}

/**
 * An ISO date-time with Z or a numeric offset; seconds are optional. This is
 * zod 4.4's datetime({ offset: true }) pattern, copied verbatim because it is
 * both the runtime check and the published `pattern`. Zod 4.5 began requiring
 * seconds, which would start rejecting reviewer and operator files that are
 * valid today.
 */
export const offsetDateTime = z.stringFormat(
  "datetime",
  /^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|([+-](?:[01]\d|2[0-3]):[0-5]\d)))$/,
);

/**
 * A URL checked as zod 4.4's url() checked it: surrounding whitespace is
 * trimmed and the rest is kept as written. Zod 4.6's url() also deletes every
 * tab, LF and CR inside the value, so HTTPS refinements and digests would check
 * a different string from the one in the file. That changes which reviewer and
 * operator files are accepted and breaks digests sealed before the upgrade.
 * Published as `format: "uri"`, like url().
 */
export const trimmedUrl = z
  .stringFormat("url", (value) => URL.canParse(value.trim()))
  .overwrite((value) => (URL.canParse(value.trim()) ? value.trim() : value));
