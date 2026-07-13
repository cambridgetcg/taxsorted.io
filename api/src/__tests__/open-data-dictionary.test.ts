import { describe, expect, it } from "vitest";
import { fieldsFromJsonSchema } from "../open-data-dictionary.js";

describe("plain field dictionary", () => {
  it("keeps schema types, required fields, nullability, enums and reference meaning visible", () => {
    const schema = {
      properties: {
        rows: {
          items: {
            type: "object",
            required: ["id", "actorIds", "status", "profile", "selectors", "steps"],
            properties: {
              id: { type: "string" },
              actorIds: { type: "array", items: { type: "string" } },
              status: { type: "string", enum: ["open", "closed"] },
              profile: { type: "string", const: "bounded" },
              selectors: {
                type: "array",
                items: { type: "string", enum: ["notice", "period"] },
              },
              note: { anyOf: [{ type: "string" }, { type: "null" }] },
              steps: {
                type: "array",
                items: {
                  type: "object",
                  required: ["name", "actorId"],
                  properties: {
                    name: { type: "string" },
                    actorId: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    };

    const fields = fieldsFromJsonSchema(schema, "rows", "row", {
      actorIds: "actors",
      "steps[].actorId": "actors",
    });
    expect(fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
        name: "id",
        field: "id",
        type: "string",
        required: true,
        requiredWithin: "record",
        nullable: false,
        meaning: "Stable identity for this record within the dataset.",
        }),
        expect.objectContaining({
        name: "actorIds",
        type: "array<string>",
        required: true,
        nullable: false,
        meaning: "Stable references to actors.",
        }),
        expect.objectContaining({
        name: "status",
        type: "string",
        required: true,
        nullable: false,
        meaning: "The record's stated current, historical, review or gap status.",
        allowedValues: ["open", "closed"],
        }),
        expect.objectContaining({
        name: "note",
        type: "string",
        required: false,
        nullable: true,
        meaning: "The note recorded for this row.",
        }),
        expect.objectContaining({
          name: "profile",
          allowedValues: ["bounded"],
        }),
        expect.objectContaining({
          name: "selectors",
          allowedValues: ["notice", "period"],
        }),
        expect.objectContaining({
          name: "steps[].actorId",
          field: "actorId",
          required: true,
          requiredWithin: "steps[]",
          meaning: "Stable reference to actors.",
        }),
      ])
    );
    expect(fields.find((field) => field.name === "steps[].name")?.meaning).toBe(
      "The name recorded for this row."
    );
  });
});
