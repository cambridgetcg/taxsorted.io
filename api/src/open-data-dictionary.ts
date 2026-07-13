// Turn the structural JSON Schema into a field guide. Graph-wide and custom
// cross-field invariants remain part of the boot validator, not JSON Schema.

type SchemaNode = {
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  anyOf?: SchemaNode[];
  oneOf?: SchemaNode[];
  items?: SchemaNode;
  properties?: Record<string, SchemaNode>;
  required?: string[];
};

const commonMeanings: Record<string, string> = {
  id: "Stable identity for this record within the dataset.",
  name: "Human-readable name; use id, not this label, when joining data.",
  title: "Human-readable title; use id, not this label, when joining data.",
  sourceId: "Source record ID supporting the named field or claim.",
  sourceIds: "Source record IDs supporting the substantive claims in this record.",
  evidence:
    "Field-level support entries: source ID, JSON Pointer fields, source locator, observation date and review method.",
  status: "The record's stated current, historical, review or gap status.",
  reviewedOn: "Date TaxSorted last reviewed this source or record.",
  reviewAfter: "Date by which the source should be reviewed again.",
  lastUpdated: "Update date published by the source, when one is available.",
  volatile: "True when the fact is expected to change and needs closer freshness checks.",
  website: "Public website for the institution or actor.",
  contacts: "Public role-based contact routes; never private contact details.",
  url: "Canonical public page reviewed for this record.",
  explanation: "Plain-language account of what the record means in the wider system.",
  whyItExists: "The public or institutional reason given for this actor, rule or structure.",
  transparencyNotes: "Limits, cautions or missing disclosures that should travel with the record.",
  supports: "Claims this source is strong enough to support.",
  doesNotProve: "Stronger inferences this source must not be used to make.",
  licence: "The source's stated reuse licence, or null when no reusable licence was confirmed.",
  reuseStatus: "Whether reuse terms were confirmed, remain unknown, or permit links only.",
  publicationMode: "How TaxSorted may represent the source: normalised summary, metadata only or link only.",
  authorityLevel: "Kind of authority the source carries; it is not a general quality score.",
  taxSystemRefs: "Stable IDs linking this industry record to the separate UK tax-system dataset.",
  notEquivalentTo: "Nearby permissions or claims that this record must not be confused with.",
  feeItems: "Dated fee components; tuition, travel, resits or lost work are absent unless named.",
  amountGbp: "A dated amount in pounds; it is not a transaction amount in minor units.",
  rangeGbp: "Low and high dated pound values where the source publishes a range.",
  steps: "Ordered actions or nested stages belonging to this record.",
  affectedIds: "Dataset record IDs whose interpretation is affected by this gap.",
  fields: "JSON Pointer paths, relative to the substantive record, supported by this evidence entry.",
  locator: "Human-readable place in the source where the supporting material was found.",
  observedOn: "Date TaxSorted observed the cited source material.",
  method: "How the evidence link was reviewed or derived.",
  order: "Position inside this record's stated sequence; it is not a global ranking.",
  low: "Lower bound of the stated range.",
  high: "Upper bound of the stated range.",
};

function wordsFor(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/Ids\b/g, "IDs")
    .replace(/Id\b/g, "ID")
    .replaceAll("_", " ")
    .toLocaleLowerCase("en-GB");
}

function variants(node: SchemaNode): SchemaNode[] {
  return node.anyOf ?? node.oneOf ?? [node];
}

function nodeTypes(node: SchemaNode): string[] {
  const types = variants(node).flatMap((variant) => {
    const type = variant.type;
    if (Array.isArray(type)) return type;
    if (type === "array") {
      const itemTypes = variant.items ? nodeTypes(variant.items).filter((item) => item !== "null") : [];
      return [`array${itemTypes.length ? `<${[...new Set(itemTypes)].join(" | ")}>` : ""}`];
    }
    return type ? [type] : variant.enum ? ["enum"] : ["unknown"];
  });
  return [...new Set(types)];
}

function allowedValues(node: SchemaNode) {
  const values = variants(node).flatMap((variant) => (
    variant.enum
    ?? (Object.hasOwn(variant, "const") ? [variant.const] : [])
  ));
  return values.length ? [...new Set(values)] : undefined;
}

function collectionItem(document: unknown, corpusKey: string) {
  const root = document as SchemaNode;
  return root.properties?.[corpusKey]?.items;
}

/** Read an enum from a collection field when the structural schema declares one. */
export function allowedValuesFromJsonSchema(
  document: unknown,
  corpusKey: string,
  fieldName: string
) {
  const node = collectionItem(document, corpusKey)?.properties?.[fieldName];
  if (!node) return undefined;
  return allowedValues(node) ?? (node.items ? allowedValues(node.items) : undefined);
}

function nestedObjects(node: SchemaNode) {
  return variants(node).flatMap((variant) => {
    if (variant.type === "array" && variant.items) {
      return variants(variant.items)
        .filter((item) => item.properties !== undefined)
        .map((item) => ({ node: item, suffix: "[]" }));
    }
    return variant.properties ? [{ node: variant, suffix: "" }] : [];
  });
}

export function fieldsFromJsonSchema(
  document: unknown,
  corpusKey: string,
  recordName: string,
  references: Record<string, string | string[]>,
  meanings: Record<string, string> = {}
) {
  const item = collectionItem(document, corpusKey);
  const fields: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  function walk(object: SchemaNode | undefined, prefix = "") {
    const required = new Set(object?.required ?? []);
    for (const [fieldName, node] of Object.entries(object?.properties ?? {})) {
      const path = prefix ? `${prefix}.${fieldName}` : fieldName;
      if (seen.has(path)) continue;
      seen.add(path);
      const targets = references[path] ?? references[fieldName];
      const types = nodeTypes(node);
      const values = allowedValues(node) ?? (node.items ? allowedValues(node.items) : undefined);
      const commonMeaning =
        prefix && ["id", "name", "title"].includes(fieldName)
          ? undefined
          : commonMeanings[fieldName];
      fields.push({
        name: path,
        field: fieldName,
        type: types.filter((type) => type !== "null").join(" | "),
        required: required.has(fieldName),
        requiredWithin: prefix || "record",
        nullable: types.includes("null"),
        meaning:
          meanings[path] ??
          meanings[fieldName] ??
          commonMeaning ??
          (targets
            ? `Stable reference${fieldName.endsWith("s") ? "s" : ""} to ${Array.isArray(targets) ? targets.join(", ") : targets}.`
            : `The ${wordsFor(fieldName)} recorded for this ${recordName}.`),
        ...(values ? { allowedValues: values } : {}),
      });

      for (const nested of nestedObjects(node)) {
        walk(nested.node, `${path}${nested.suffix}`);
      }
    }
  }

  walk(item);
  return fields;
}
