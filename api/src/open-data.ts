// Small, dependency-free building blocks for public data downloads. TaxSorted's
// deterministic JSON sorts object keys recursively, preserves array order and
// uses compact JSON.stringify scalar rules. It is not RFC 8785/JCS. JSON and
// JSON Lines are lossless; CSV only mitigates common spreadsheet formula triggers.

import { createHash } from "node:crypto";

function compareKeys(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function encodeJson(
  value: unknown,
  seen: Set<object>,
  key: string
): string | undefined {
  if (value === null) return "null";

  switch (typeof value) {
    case "string":
    case "boolean":
    case "number":
      // JSON.stringify deliberately turns NaN and infinities into null.
      return JSON.stringify(value);
    case "bigint":
      throw new TypeError("BigInt values cannot be represented as JSON");
    case "undefined":
    case "function":
    case "symbol":
      return undefined;
  }

  if (seen.has(value)) throw new TypeError("Circular values cannot be represented as JSON");
  seen.add(value);

  try {
    const candidate = value as Record<string, unknown>;
    const toJSON = candidate.toJSON;
    if (typeof toJSON === "function") {
      const replacement = (toJSON as (key: string) => unknown).call(value, key);
      if (replacement !== value) return encodeJson(replacement, seen, key);
    }

    if (Array.isArray(value)) {
      const items = Array.from(
        { length: value.length },
        (_, index) => encodeJson(value[index], seen, String(index)) ?? "null"
      );
      return `[${items.join(",")}]`;
    }

    const properties: string[] = [];
    for (const property of Object.keys(candidate).sort(compareKeys)) {
      const encoded = encodeJson(candidate[property], seen, property);
      if (encoded !== undefined) properties.push(`${JSON.stringify(property)}:${encoded}`);
    }
    return `{${properties.join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

/** Serialize TaxSorted deterministic JSON; this is not RFC 8785/JCS. */
export function canonicalJson(value: unknown): string {
  const encoded = encodeJson(value, new Set(), "");
  if (encoded === undefined) {
    throw new TypeError("The top-level value cannot be represented as JSON");
  }
  return encoded;
}

/** Serialize one TaxSorted deterministic JSON value per line, including a final newline. */
export function serializeNdjson(rows: readonly unknown[]): string {
  if (!Array.isArray(rows)) throw new TypeError("JSON Lines input must be an array");
  return rows.length === 0 ? "" : `${Array.from(rows, canonicalJson).join("\n")}\n`;
}

export interface CsvOptions {
  /** Explicit output order. When omitted, the union of row keys is sorted. */
  columns?: readonly string[];
}

function csvCell(value: unknown): string {
  let text: string;
  if (value === null || value === undefined) {
    text = "";
  } else if (typeof value === "string") {
    // A leading apostrophe mitigates common formula interpretation. Importers
    // differ, so callers must not treat CSV as a universal security boundary.
    // Numeric values are left untouched.
    text = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
  } else if (typeof value === "object") {
    text = canonicalJson(value);
  } else {
    text = canonicalJson(value);
  }

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvColumns(
  rows: readonly Record<string, unknown>[],
  requested: readonly string[] | undefined
) {
  if (requested) {
    const columns = [...requested];
    if (new Set(columns).size !== columns.length) {
      throw new TypeError("CSV columns must be unique");
    }
    return columns;
  }

  const columns = new Set<string>();
  for (const row of rows) Object.keys(row).forEach((column) => columns.add(column));
  return [...columns].sort(compareKeys);
}

/**
 * Serialize object rows as RFC 4180-style CSV with CRLF line endings.
 * Objects and arrays inside cells use TaxSorted deterministic JSON.
 */
export function serializeCsv(
  rows: readonly Record<string, unknown>[],
  options: CsvOptions = {}
): string {
  if (!Array.isArray(rows)) throw new TypeError("CSV input must be an array");
  if (rows.some((row) => row === null || typeof row !== "object" || Array.isArray(row))) {
    throw new TypeError("Every CSV row must be an object");
  }

  const columns = csvColumns(rows, options.columns);
  if (columns.length === 0) return "";

  const lines = [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

/** Create a strong validator for the exact bytes of a serialized response. */
export function representationEtag(representation: string | Uint8Array): string {
  const hash = createHash("sha256");
  if (typeof representation === "string") hash.update(representation, "utf8");
  else hash.update(representation);
  return `"sha256-${hash.digest("hex")}"`;
}

interface ParsedEntityTag {
  opaque: string;
  end: number;
}

function skipOptionalWhitespace(value: string, start: number) {
  let position = start;
  while (value[position] === " " || value[position] === "\t") position++;
  return position;
}

function parseEntityTag(value: string, start: number): ParsedEntityTag | undefined {
  let position = start;
  if (value.startsWith("W/", position)) position += 2;
  if (value[position] !== '"') return undefined;

  const openingQuote = position;
  position++;
  while (position < value.length && value[position] !== '"') {
    const code = value.charCodeAt(position);
    // etagc is !, # through ~, or an observed byte from 0x80 through 0xff.
    if (code !== 0x21 && !(code >= 0x23 && code <= 0x7e) && !(code >= 0x80 && code <= 0xff)) {
      return undefined;
    }
    position++;
  }
  if (value[position] !== '"') return undefined;

  return { opaque: value.slice(openingQuote, position + 1), end: position + 1 };
}

function parseEntityTagList(value: string): ParsedEntityTag[] | undefined {
  const parsed: ParsedEntityTag[] = [];
  let position = skipOptionalWhitespace(value, 0);

  while (position < value.length) {
    const tag = parseEntityTag(value, position);
    if (!tag) return undefined;
    parsed.push(tag);
    position = skipOptionalWhitespace(value, tag.end);
    if (position === value.length) return parsed;
    if (value[position] !== ",") return undefined;
    position = skipOptionalWhitespace(value, position + 1);
    if (position === value.length) return undefined;
  }

  return parsed.length > 0 ? parsed : undefined;
}

/** Apply the weak comparison required for GET and HEAD If-None-Match checks. */
export function ifNoneMatchMatches(
  header: string | null | undefined,
  currentEtag: string
): boolean {
  const current = currentEtag.trim();
  const currentTag = parseEntityTag(current, 0);
  if (!currentTag || currentTag.end !== current.length || !header) return false;

  const requested = header.trim();
  if (requested === "*") return true;
  const candidates = parseEntityTagList(requested);
  return candidates?.some((candidate) => candidate.opaque === currentTag.opaque) ?? false;
}

function replaceUnpairedSurrogates(value: string) {
  let result = "";
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        result += value[index] + value[index + 1];
        index++;
      } else {
        result += "\ufffd";
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      result += "\ufffd";
    } else {
      result += value[index];
    }
  }
  return result;
}

function encodeExtendedFilename(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/** Build a safe attachment header with ASCII and UTF-8 filename forms. */
export function attachmentContentDisposition(filename: string): string {
  const wellFormed = replaceUnpairedSurrogates(filename);
  const cleaned = wellFormed.replace(/[\u0000-\u001f\u007f-\u009f\\/]/g, "_");
  const safe = cleaned.length === 0 || /^\.+$/.test(cleaned) ? "download" : cleaned;
  const fallback = safe.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeExtendedFilename(safe)}`;
}
