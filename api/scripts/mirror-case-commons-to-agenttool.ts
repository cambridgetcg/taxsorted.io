// Optional, bounded bridge from one public TaxSorted case packet to a
// caller-operated local agent-data/v1 node. It never sends claimant facts to
// TaxSorted or writes to the hosted AgentTool API.

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { DataClient } from "@agenttool/sdk";
import { caseCommonsPacketSchema } from "../src/uk-case-commons.js";

const DEFAULT_API_BASE = "https://api.taxsorted.io";
const DEFAULT_CASE_ID = "haworth-v-hmrc-2021";
const DEFAULT_NODE_URL = "http://127.0.0.1:7742";
const DEFAULT_COLLECTION = "taxsorted-case-commons";
const MAX_PACKET_BYTES = 2_000_000;

type JsonObject = Record<string, unknown>;

export interface MirrorOptions {
  write: boolean;
  caseId: string;
  apiBase: string;
  nodeUrl: string;
  collectionId: string;
}

export interface VerifiedCasePacket {
  body: string;
  caseId: string;
  corpusVersion: string;
  packetDigest: string;
  responseChecksum: string;
  sourceUrl: string;
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** TaxSorted deterministic JSON for parsed JSON values. */
export function canonicalPacketJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalPacketJson).join(",")}]`;
  }
  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalPacketJson(value[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function assertLoopbackDataNode(nodeUrl: string): URL {
  const parsed = new URL(nodeUrl);
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !loopbackHosts.has(parsed.hostname) ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.href !== `${parsed.origin}/`
  ) {
    throw new Error(
      "The AgentTool bridge accepts only a credential-free loopback agent-data origin, without a path, query or fragment. Fork and review the bridge before choosing a remote custody boundary.",
    );
  }
  return new URL(parsed.origin);
}

export function assertTrustedCaseApi(apiBase: string): URL {
  const parsed = new URL(apiBase);
  const isOfficialOrigin = parsed.origin === DEFAULT_API_BASE;
  const isLoopback =
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname) &&
    ["http:", "https:"].includes(parsed.protocol);
  if (
    (!isOfficialOrigin && !isLoopback) ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.href !== `${parsed.origin}/`
  ) {
    throw new Error(
      "The case API must be the official TaxSorted origin or a credential-free loopback development origin, without a path, query or fragment. External forks need their own reviewed bridge.",
    );
  }
  return new URL(parsed.origin);
}

export function verifyCasePacketBody(
  body: string,
  responseChecksum: string | null,
  sourceUrl = `${DEFAULT_API_BASE}/v1/case-commons/uk/cases/${DEFAULT_CASE_ID}`,
  requestedCaseId = DEFAULT_CASE_ID,
): VerifiedCasePacket {
  if (Buffer.byteLength(body, "utf8") > MAX_PACKET_BYTES) {
    throw new Error(`Case packet exceeds the ${MAX_PACKET_BYTES}-byte bound.`);
  }

  const exactChecksum = sha256(body);
  if (
    responseChecksum === null ||
    !/^[0-9a-f]{64}$/.test(responseChecksum) ||
    responseChecksum !== exactChecksum
  ) {
    throw new Error("The response-byte checksum is absent or does not match.");
  }

  const parsedJson: unknown = JSON.parse(body);
  let parsed: ReturnType<typeof caseCommonsPacketSchema.parse>;
  try {
    parsed = caseCommonsPacketSchema.parse(parsedJson);
  } catch {
    throw new Error(
      "The response does not match the strict TaxSorted case-packet schema.",
    );
  }

  if (
    requestedCaseId !== parsed.case.id &&
    requestedCaseId !== parsed.case.slug
  ) {
    throw new Error(
      "The returned case identity does not match the requested ID or slug.",
    );
  }
  const canonicalIdentity =
    `/v1/case-commons/uk/cases/${parsed.case.id}`;
  if (parsed.links.self !== canonicalIdentity) {
    throw new Error(
      "The returned case packet does not carry its canonical case identity.",
    );
  }

  const preimage = { ...(parsedJson as JsonObject) };
  delete preimage.integrity;
  delete preimage.links;
  const calculatedPacketDigest = `sha256:${sha256(
    canonicalPacketJson(preimage),
  )}`;
  if (calculatedPacketDigest !== parsed.integrity.digest) {
    throw new Error("The case-packet content identifier does not match.");
  }

  return {
    body,
    caseId: parsed.case.id,
    corpusVersion: parsed.corpusVersion,
    packetDigest: parsed.integrity.digest,
    responseChecksum: exactChecksum,
    sourceUrl,
  };
}

function takeValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

export function parseMirrorArgs(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): MirrorOptions {
  const options: MirrorOptions = {
    write: false,
    caseId: DEFAULT_CASE_ID,
    apiBase: DEFAULT_API_BASE,
    nodeUrl: env.AGENT_DATA_NODE_URL || DEFAULT_NODE_URL,
    collectionId: env.AGENT_DATA_COLLECTION || DEFAULT_COLLECTION,
  };

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index]!;
    if (flag === "--write") {
      options.write = true;
    } else if (flag === "--case") {
      options.caseId = takeValue(args, index, flag);
      index += 1;
    } else if (flag === "--api-base") {
      options.apiBase = takeValue(args, index, flag);
      index += 1;
    } else if (flag === "--node") {
      options.nodeUrl = takeValue(args, index, flag);
      index += 1;
    } else if (flag === "--collection") {
      options.collectionId = takeValue(args, index, flag);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${flag}`);
    }
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(options.caseId)) {
    throw new Error("--case must be a stable lowercase case ID or slug.");
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(options.collectionId)) {
    throw new Error("--collection is not a bounded collection ID.");
  }
  options.apiBase = assertTrustedCaseApi(options.apiBase).origin;
  options.nodeUrl = assertLoopbackDataNode(options.nodeUrl).origin;
  return options;
}

function hasNamedEntry(
  entries: unknown,
  names: string[],
  expected: string,
) {
  return (
    Array.isArray(entries) &&
    entries.some(
      (entry) =>
        isObject(entry) &&
        names.some((name) => entry[name] === expected),
    )
  );
}

export async function fetchVerifiedCasePacket(
  options: MirrorOptions,
  fetchImpl: typeof fetch = globalThis.fetch,
) {
  const sourceUrl = new URL(
    `/v1/case-commons/uk/cases/${encodeURIComponent(options.caseId)}`,
    options.apiBase,
  ).href;
  const response = await fetchImpl(sourceUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    await cancelResponseBody(response);
    throw new Error(
      `TaxSorted returned ${response.status}; publication may be closed or stopped.`,
    );
  }
  const body = await readBoundedResponseBody(response);
  return verifyCasePacketBody(
    body,
    response.headers.get("x-checksum-sha256"),
    sourceUrl,
    options.caseId,
  );
}

async function cancelResponseBody(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // The original validation error is the useful boundary to report.
  }
}

export async function readBoundedResponseBody(
  response: Response,
): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const declaredBytes = Number(contentLength);
    if (
      !/^\d+$/.test(contentLength) ||
      !Number.isSafeInteger(declaredBytes) ||
      declaredBytes > MAX_PACKET_BYTES
    ) {
      await cancelResponseBody(response);
      throw new Error(
        `Case packet has an invalid or over-bound Content-Length; the limit is ${MAX_PACKET_BYTES} bytes.`,
      );
    }
  }

  if (response.body === null) {
    throw new Error("TaxSorted returned no case-packet body.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_PACKET_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // Keep the size-bound error as the reason this operation stopped.
        }
        throw new Error(
          `Case packet exceeds the ${MAX_PACKET_BYTES}-byte bound while streaming.`,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Case packet is not valid UTF-8.");
  }
}

export async function writeVerifiedPacketToLocalNode(
  packet: VerifiedCasePacket,
  options: MirrorOptions,
  token = process.env.AGENT_DATA_NODE_TOKEN,
) {
  const nodeOrigin = assertLoopbackDataNode(options.nodeUrl).origin;
  const node = new DataClient({
    baseUrl: nodeOrigin,
    ...(token ? { token } : {}),
    timeout: 15,
  });
  const manifest = await node.manifest();
  if (!hasNamedEntry(manifest.collectors, ["collector_id", "id"], "text")) {
    throw new Error("The local agent-data node does not expose the text collector.");
  }
  const collections = await node.collections();
  if (
    !hasNamedEntry(
      collections.collections,
      ["collection_id", "id"],
      options.collectionId,
    )
  ) {
    throw new Error(
      `The local agent-data node has no '${options.collectionId}' collection.`,
    );
  }

  return node.collect({
    collection_id: options.collectionId,
    collector_id: "text",
    input: {
      text: packet.body,
      media_type: "application/json",
      source_uri: packet.sourceUrl,
      external_id: packet.packetDigest,
      key: packet.caseId,
      version: packet.corpusVersion,
      metadata: {
        schema: "taxsorted.uk.case-packet/1",
        case_id: packet.caseId,
        corpus_version: packet.corpusVersion,
        packet_digest: packet.packetDigest,
        public_packet_only: true,
      },
    },
  });
}

function usage() {
  return `TaxSorted → local AgentTool case mirror

Dry-run verification (default):
  npm run mirror:case-commons --workspace api

Run one collect operation for one verified public packet on a loopback agent-data/v1 node:
  npm run mirror:case-commons --workspace api -- --write

Options:
  --case <id-or-slug>
  --api-base <official-or-loopback-origin>
  --node <loopback-origin>
  --collection <id>

Environment:
  AGENT_DATA_NODE_URL
  AGENT_DATA_NODE_TOKEN
  AGENT_DATA_COLLECTION

No private case facts belong in this bridge. There is no polling loop.`;
}

async function main() {
  if (process.argv.slice(2).includes("--help")) {
    console.log(usage());
    return;
  }
  const options = parseMirrorArgs(process.argv.slice(2));
  const packet = await fetchVerifiedCasePacket(options);
  if (!options.write) {
    console.log(
      `Verified ${packet.caseId} ${packet.packetDigest}. Dry run only; no local write occurred.`,
    );
    return;
  }
  const result = await writeVerifiedPacketToLocalNode(packet, options);
  console.log(
    JSON.stringify({
      ok: true,
      localNode: new URL(options.nodeUrl).origin,
      collectionId: options.collectionId,
      caseId: packet.caseId,
      packetDigest: packet.packetDigest,
      inserted: result.inserted,
      existing: result.existing,
      recordIds: result.records?.map((record) => record.id).filter(Boolean),
    }),
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;
if (invokedPath === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Mirror failed.");
    process.exitCode = 1;
  });
}
