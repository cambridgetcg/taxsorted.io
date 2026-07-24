import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalJson } from "../../src/open-data.js";
import { makeCaseCommonsPacket } from "../../src/uk-case-commons.js";
import {
  assertLoopbackDataNode,
  assertTrustedCaseApi,
  canonicalPacketJson,
  fetchVerifiedCasePacket,
  parseMirrorArgs,
  verifyCasePacketBody,
} from "../mirror-case-commons-to-agenttool.js";

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function bodyWithFreshContentIdentifier(
  packet: NonNullable<ReturnType<typeof makeCaseCommonsPacket>>,
) {
  const preimage = structuredClone(packet) as Record<string, unknown>;
  delete preimage.integrity;
  delete preimage.links;
  packet.integrity.digest =
    `sha256:${sha256(canonicalJson(preimage))}`;
  return canonicalJson(packet);
}

describe("AgentTool local case mirror", () => {
  it("verifies exact response bytes and the packet's separate content identifier", () => {
    const packet = makeCaseCommonsPacket("haworth-v-hmrc-2021")!;
    const body = canonicalJson(packet);
    const verified = verifyCasePacketBody(body, sha256(body));

    expect(verified.caseId).toBe("haworth-v-hmrc-2021");
    expect(verified.packetDigest).toBe(packet.integrity.digest);
    expect(canonicalPacketJson(JSON.parse(body))).toBe(body);
  });

  it("strictly rejects packet fields outside the public schema", () => {
    const packet = makeCaseCommonsPacket("haworth-v-hmrc-2021")! as
      NonNullable<ReturnType<typeof makeCaseCommonsPacket>> & {
        unexpected?: boolean;
      };
    packet.unexpected = true;
    const body = canonicalJson(packet);

    expect(() => verifyCasePacketBody(body, sha256(body))).toThrow(
      /strict TaxSorted case-packet schema/i,
    );
  });

  it("rejects a changed packet even when the response checksum matches the changed bytes", () => {
    const changed = structuredClone(
      makeCaseCommonsPacket("haworth-v-hmrc-2021")!,
    );
    changed.case.title = "Changed after the content identifier was made";
    const body = canonicalJson(changed);

    expect(() => verifyCasePacketBody(body, sha256(body))).toThrow(
      /content identifier does not match/i,
    );
  });

  it("accepts a requested slug but binds it to the returned canonical case ID", () => {
    const packet = makeCaseCommonsPacket("haworth-v-hmrc-2021")!;
    const body = canonicalJson(packet);
    const verified = verifyCasePacketBody(
      body,
      sha256(body),
      "https://api.taxsorted.io/v1/case-commons/uk/cases/haworth-v-hmrc",
      "haworth-v-hmrc",
    );

    expect(verified.caseId).toBe("haworth-v-hmrc-2021");
  });

  it("rejects a valid packet for a different requested case identity", () => {
    const packet = structuredClone(
      makeCaseCommonsPacket("haworth-v-hmrc-2021")!,
    );
    packet.case.id = "different-case-2021";
    packet.case.slug = "different-case";
    packet.links.self =
      "/v1/case-commons/uk/cases/different-case-2021";
    const body = bodyWithFreshContentIdentifier(packet);

    expect(() =>
      verifyCasePacketBody(
        body,
        sha256(body),
        "https://api.taxsorted.io/v1/case-commons/uk/cases/haworth-v-hmrc-2021",
        "haworth-v-hmrc-2021",
      ),
    ).toThrow(/does not match the requested ID or slug/i);
  });

  it("rejects a packet whose canonical identity disagrees with its case ID", () => {
    const packet = structuredClone(
      makeCaseCommonsPacket("haworth-v-hmrc-2021")!,
    );
    packet.links.self =
      "/v1/case-commons/uk/cases/not-the-returned-case";
    const body = canonicalJson(packet);

    expect(() => verifyCasePacketBody(body, sha256(body))).toThrow(
      /canonical case identity/i,
    );
  });

  it("is a bounded dry run by default and accepts only a normalized loopback origin", () => {
    const options = parseMirrorArgs([], {});
    expect(options).toMatchObject({
      write: false,
      caseId: "haworth-v-hmrc-2021",
      nodeUrl: "http://127.0.0.1:7742",
      collectionId: "taxsorted-case-commons",
    });
    expect(assertLoopbackDataNode("http://localhost:7742").hostname).toBe(
      "localhost",
    );
    expect(
      parseMirrorArgs(
        ["--node", "http://localhost:7742/"],
        {},
      ).nodeUrl,
    ).toBe("http://localhost:7742");
    expect(() =>
      assertLoopbackDataNode("https://agent-data.example"),
    ).toThrow(/loopback agent-data origin/i);
    for (const unsafeNode of [
      "http://name:secret@localhost:7742",
      "http://localhost:7742/private",
      "http://localhost:7742?token=secret",
      "http://localhost:7742?",
      "http://localhost:7742#private",
      "http://localhost:7742#",
    ]) {
      expect(() => assertLoopbackDataNode(unsafeNode)).toThrow(
        /loopback agent-data origin/i,
      );
    }
  });

  it("accepts only the official case API or a credential-free loopback origin", () => {
    expect(assertTrustedCaseApi("https://api.taxsorted.io").origin).toBe(
      "https://api.taxsorted.io",
    );
    expect(
      parseMirrorArgs(
        ["--api-base", "http://localhost:8787/"],
        {},
      ).apiBase,
    ).toBe("http://localhost:8787");
    for (const unsafeApi of [
      "https://case-fork.example",
      "https://name:secret@api.taxsorted.io",
      "https://api.taxsorted.io/private",
      "https://api.taxsorted.io?token=secret",
      "https://api.taxsorted.io#private",
    ]) {
      expect(() => assertTrustedCaseApi(unsafeApi)).toThrow(
        /official TaxSorted origin or a credential-free loopback/i,
      );
    }
  });

  it("cancels before reading a declared response larger than 2 MB", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const response = new Response(body, {
      status: 200,
      headers: {
        "content-length": "2000001",
        "x-checksum-sha256": "0".repeat(64),
      },
    });
    const fetchImpl = (async () => response) as typeof fetch;

    await expect(
      fetchVerifiedCasePacket(parseMirrorArgs([], {}), fetchImpl),
    ).rejects.toThrow(/over-bound Content-Length/i);
    expect(cancelled).toBe(true);
  });

  it("cancels a chunked response as soon as streamed bytes exceed 2 MB", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(2_000_001));
      },
      cancel() {
        cancelled = true;
      },
    });
    const response = new Response(body, {
      status: 200,
      headers: {
        "x-checksum-sha256": "0".repeat(64),
      },
    });
    const fetchImpl = (async () => response) as typeof fetch;

    await expect(
      fetchVerifiedCasePacket(parseMirrorArgs([], {}), fetchImpl),
    ).rejects.toThrow(/exceeds the 2000000-byte bound while streaming/i);
    expect(cancelled).toBe(true);
  });
});
