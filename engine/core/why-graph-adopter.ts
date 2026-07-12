import {
  assertWhyGraphInvariants,
  WHY_GRAPH_SCHEMA,
  type WhyGraph,
} from "./why-graph";

function encodeAdmissionJson(
  value: unknown,
  seen: Set<object>,
): string {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Non-finite numbers cannot be used in WhyGraph admission data");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "bigint") {
    throw new TypeError("BigInt cannot be used in WhyGraph admission data");
  }
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") {
    throw new TypeError(`${typeof value} cannot be used in WhyGraph admission data`);
  }

  const object = value as Record<string, unknown>;
  if (seen.has(object)) {
    throw new TypeError("Circular values cannot be used in WhyGraph admission data");
  }
  seen.add(object);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) => encodeAdmissionJson(item, seen)).join(",")}]`;
    }
    const prototype = Object.getPrototypeOf(object);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Only plain JSON objects can be used in WhyGraph admission data");
    }
    const properties = Object.keys(object)
      .sort()
      .map((property) => (
        `${JSON.stringify(property)}:${encodeAdmissionJson(object[property], seen)}`
      ));
    return `{${properties.join(",")}}`;
  } finally {
    seen.delete(object);
  }
}

/** Object key order is transport detail; arrays and values remain exact. */
export function canonicalAdmissionJson(value: unknown): string {
  return encodeAdmissionJson(value, new Set());
}

/**
 * A domain owns the meaning of its selectors, authorities and consequences.
 * The shared graph contract owns only the shape and graph-wide invariants.
 */
export interface WhyGraphAdopter<TNative> {
  readonly id: string;
  readonly graphSchema: typeof WHY_GRAPH_SCHEMA;
  readonly assertDomainInvariants: (
    graph: Readonly<WhyGraph>,
    native: Readonly<TNative>,
  ) => void;
}

export function assertAdmittedWhyGraph<TNative>(
  graph: WhyGraph,
  native: TNative,
  adopter: WhyGraphAdopter<TNative>,
): void {
  if (adopter.graphSchema !== WHY_GRAPH_SCHEMA) {
    throw new Error(`WhyGraph adopter ${adopter.id} does not support ${WHY_GRAPH_SCHEMA}`);
  }
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(adopter.id)) {
    throw new Error("WhyGraph adopter ID must be a lowercase semantic identifier");
  }
  assertWhyGraphInvariants(graph);
  const domainGraph = structuredClone(graph);
  const domainNative = structuredClone(native);
  const graphBefore = canonicalAdmissionJson(domainGraph);
  const nativeBefore = canonicalAdmissionJson(domainNative);
  adopter.assertDomainInvariants(domainGraph, domainNative);
  if (canonicalAdmissionJson(domainGraph) !== graphBefore) {
    throw new Error(`WhyGraph adopter ${adopter.id} mutated the graph during validation`);
  }
  if (canonicalAdmissionJson(domainNative) !== nativeBefore) {
    throw new Error(`WhyGraph adopter ${adopter.id} mutated its native input during validation`);
  }
}
