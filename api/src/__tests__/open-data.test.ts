import { describe, expect, it } from "vitest";
import {
  attachmentContentDisposition,
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
  serializeCsv,
  serializeNdjson,
} from "../open-data.js";

describe("canonical open-data serialization", () => {
  it("sorts object keys recursively without changing array order", () => {
    const first = {
      z: 1,
      rows: [{ z: "last", a: "first" }, undefined],
      omitted: undefined,
      a: { y: Number.NaN, b: true },
    };
    const second = {
      a: { b: true, y: Number.NaN },
      omitted: undefined,
      rows: [{ a: "first", z: "last" }, undefined],
      z: 1,
    };

    const expected =
      '{"a":{"b":true,"y":null},"rows":[{"a":"first","z":"last"},null],"z":1}';
    expect(canonicalJson(first)).toBe(expected);
    expect(canonicalJson(second)).toBe(expected);
    expect(canonicalJson(Array(2))).toBe("[null,null]");
  });

  it("rejects values that JSON cannot safely represent", () => {
    expect(() => canonicalJson(undefined)).toThrow(/top-level value/);
    expect(() => canonicalJson(1n)).toThrow(/BigInt/);

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => canonicalJson(circular)).toThrow(/Circular/);
  });

  it("writes canonical JSON Lines with escaped line breaks and a final newline", () => {
    expect(serializeNdjson([{ z: 2, a: "one\ntwo" }, { name: "Zürich" }])).toBe(
      '{"a":"one\\ntwo","z":2}\n{"name":"Zürich"}\n'
    );
    expect(serializeNdjson([])).toBe("");
    expect(() => serializeNdjson(Array(1))).toThrow(/top-level value/);
    expect(() => serializeNdjson({} as never)).toThrow(/must be an array/);
  });
});

describe("spreadsheet-oriented CSV safeguards", () => {
  it("sorts inferred columns, JSON-encodes nested values and uses CRLF", () => {
    const csv = serializeCsv([
      {
        tags: ["tax", "law"],
        id: "role-1",
        detail: { z: 2, a: "é" },
        note: 'line one,\n"line two"',
      },
    ]);

    expect(csv).toBe(
      'detail,id,note,tags\r\n' +
        '"{""a"":""é"",""z"":2}",role-1,"line one,\n""line two""","[""tax"",""law""]"\r\n'
    );
  });

  it("neutralises formula-like strings but leaves negative numbers intact", () => {
    expect(
      serializeCsv(
        [
          {
            equals: "=1+1",
            plus: "+44123",
            minus: "-2",
            at: "@lookup",
            spaced: "  =1+1",
            tabbed: "\t@lookup",
            lineBreak: "\n=1+1",
            number: -2,
          },
        ],
        {
          columns: [
            "equals",
            "plus",
            "minus",
            "at",
            "spaced",
            "tabbed",
            "lineBreak",
            "number",
          ],
        }
      )
    ).toBe(
      "equals,plus,minus,at,spaced,tabbed,lineBreak,number\r\n" +
        "'=1+1,'+44123,'-2,'@lookup,'  =1+1,'\t@lookup,\"'\n=1+1\",-2\r\n"
    );
  });

  it("supports explicit headers for empty exports and rejects ambiguous input", () => {
    expect(serializeCsv([], { columns: ["id", "name"] })).toBe("id,name\r\n");
    expect(() => serializeCsv([], { columns: ["id", "id"] })).toThrow(/unique/);
    expect(() => serializeCsv([[]] as never)).toThrow(/row must be an object/);
  });
});

describe("HTTP distribution helpers", () => {
  it("hashes exact response bytes into strong, representation-specific ETags", () => {
    const json = canonicalJson({ a: 1 });
    const jsonEtag = representationEtag(json);
    expect(jsonEtag).toMatch(/^"sha256-[a-f0-9]{64}"$/);
    expect(representationEtag(new TextEncoder().encode(json))).toBe(jsonEtag);
    expect(representationEtag(`${json}\n`)).not.toBe(jsonEtag);
  });

  it("matches weak validators, lists and wildcard If-None-Match values", () => {
    const etag = representationEtag("roles");
    expect(ifNoneMatchMatches(etag, etag)).toBe(true);
    expect(ifNoneMatchMatches(`W/${etag}`, etag)).toBe(true);
    expect(ifNoneMatchMatches(`"somewhere-else", W/${etag}`, etag)).toBe(true);
    expect(ifNoneMatchMatches("*", etag)).toBe(true);
    expect(ifNoneMatchMatches('W/"tag,with,commas", "other"', '"tag,with,commas"')).toBe(true);
    expect(ifNoneMatchMatches('"somewhere-else"', etag)).toBe(false);
    expect(ifNoneMatchMatches(`${etag},`, etag)).toBe(false);
    expect(ifNoneMatchMatches(undefined, etag)).toBe(false);
  });

  it("builds an injection-safe UTF-8 attachment filename", () => {
    expect(attachmentContentDisposition("tax-industry-roles.csv")).toBe(
      "attachment; filename=\"tax-industry-roles.csv\"; filename*=UTF-8''tax-industry-roles.csv"
    );
    expect(attachmentContentDisposition("rôles.csv")).toBe(
      "attachment; filename=\"r_les.csv\"; filename*=UTF-8''r%C3%B4les.csv"
    );
    expect(attachmentContentDisposition('../bad\r\n"name.csv')).toBe(
      "attachment; filename=\".._bad___name.csv\"; filename*=UTF-8''.._bad__%22name.csv"
    );
  });
});
