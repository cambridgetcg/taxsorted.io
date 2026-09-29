import { createCipheriv, createDecipheriv, pbkdf2Sync } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { BOOKS_BACKUP_MAX_BYTES, BOOKS_BACKUP_SCHEMA, parseBooksBackup } from "../books-backup";
import {
  BOOKS_BACKUP_FILE_MAX_BYTES, BOOKS_BACKUP_PASSWORD_MAX_BYTES, BOOKS_BACKUP_PASSWORD_MIN_LENGTH,
  BOOKS_ENCRYPTED_BACKUP_SCHEMA, decryptBooksBackup, encryptBooksBackup, inspectBooksBackupFile, validateBackupPassword,
} from "../books-backup-encryption";
import { createRecordsStore } from "../records";

const PASSWORD = "A long private passphrase 🌱";
const UNLOCK_ERROR = /Unable to unlock this backup/;
let plain: string;
let encrypted: string;

type Envelope = {
  schema: string;
  kdf: { name: string; hash: string; iterations: number; salt: string };
  cipher: { name: string; keyLength: number; tagLength: number; iv: string };
  ciphertext: string;
};

// Independent implementation using Node's non-WebCrypto primitives, fixed
// public test salt/nonce, and the documented wire representation. This verifies
// both directions without sharing production serialization or crypto helpers.
function nodeSeal(payload: Uint8Array, password = PASSWORD, aadOverride?: Buffer): string {
  const salt = Buffer.from("00112233445566778899aabbccddeeff", "hex");
  const iv = Buffer.from("000102030405060708090a0b", "hex");
  const header = {
    schema: "taxsorted.encrypted-books-backup/1",
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: 600000, salt: salt.toString("base64") },
    cipher: { name: "AES-GCM", keyLength: 256, tagLength: 128, iv: iv.toString("base64") },
  };
  const key = pbkdf2Sync(Buffer.from(password, "utf8"), salt, 600000, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  cipher.setAAD(aadOverride ?? Buffer.from(JSON.stringify(header), "utf8"));
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final(), cipher.getAuthTag()]).toString("base64");
  key.fill(0);
  // Input member order is intentionally different from canonical AAD order.
  return JSON.stringify({ ciphertext, cipher: header.cipher, kdf: header.kdf, schema: header.schema });
}

function nodeOpen(json: string): string {
  const envelope = JSON.parse(json) as Envelope;
  const salt = Buffer.from(envelope.kdf.salt, "base64");
  const iv = Buffer.from(envelope.cipher.iv, "base64");
  const bytes = Buffer.from(envelope.ciphertext, "base64");
  const header = {
    schema: envelope.schema,
    kdf: { name: envelope.kdf.name, hash: envelope.kdf.hash, iterations: envelope.kdf.iterations, salt: envelope.kdf.salt },
    cipher: { name: envelope.cipher.name, keyLength: envelope.cipher.keyLength, tagLength: envelope.cipher.tagLength, iv: envelope.cipher.iv },
  };
  const key = pbkdf2Sync(Buffer.from(PASSWORD, "utf8"), salt, 600000, 32, "sha256");
  const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  decipher.setAAD(Buffer.from(JSON.stringify(header), "utf8"));
  decipher.setAuthTag(bytes.subarray(-16));
  const result = Buffer.concat([decipher.update(bytes.subarray(0, -16)), decipher.final()]).toString("utf8");
  key.fill(0);
  return result;
}

function changed(change: (envelope: Envelope) => void): string {
  const envelope = JSON.parse(encrypted) as Envelope;
  change(envelope);
  return JSON.stringify(envelope);
}

function flipBase64(value: string, offset = 0): string {
  const bytes = Buffer.from(value, "base64");
  bytes[offset] ^= 1;
  return bytes.toString("base64");
}

beforeAll(async () => {
  const store = createRecordsStore(new Map());
  const record = await store.add({ date: "2026-05-01", amount: 12345, kind: "income", category: "turnover", source: "self-employment", description: "Private test receipt café 🌱" });
  await store.review(record.id, { expectedRevision: 1, reviewState: "ready", amount: 12300, description: "Corrected synthetic receipt" });
  await store.add({ date: "2026-05-02", amount: 2500, kind: "expense", category: "other", source: "uk-property" });
  plain = await store.exportBackup();
  encrypted = await encryptBooksBackup(plain, PASSWORD);
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("password-protected Books file format", () => {
  it("roundtrips real Books and preserves the original plaintext bytes and existing restore semantics", async () => {
    expect(inspectBooksBackupFile(plain)).toBe("plain");
    expect(inspectBooksBackupFile(encrypted)).toBe("encrypted");
    const unlocked = await decryptBooksBackup(encrypted, PASSWORD);
    expect(unlocked).toBe(plain);
    const original = await parseBooksBackup(plain);
    const target = createRecordsStore(new Map());
    await target.restoreBackup(unlocked, await target.previewRestore(unlocked));
    const restored = await target.state();
    expect(restored.events).toEqual(original.books.events);
    expect(restored.history).toEqual(original.books.history);
    expect(restored.replica.id).not.toBe(original.books.replica.id);
    expect(restored.ledgers.every(ledger => ledger.scopeState === "needs-confirmation")).toBe(true);
  });

  it("uses fresh independent salts and nonces without exposing tax metadata", async () => {
    const first = JSON.parse(encrypted) as Envelope;
    const second = JSON.parse(await encryptBooksBackup(plain, PASSWORD)) as Envelope;
    expect(second.kdf.salt).not.toBe(first.kdf.salt);
    expect(second.cipher.iv).not.toBe(first.cipher.iv);
    expect(second.ciphertext).not.toBe(first.ciphertext);
    expect(Object.keys(first).sort()).toEqual(["cipher", "ciphertext", "kdf", "schema"]);
    expect(first).toMatchObject({ schema: BOOKS_ENCRYPTED_BACKUP_SCHEMA, kdf: { name: "PBKDF2", hash: "SHA-256", iterations: 600000 }, cipher: { name: "AES-GCM", keyLength: 256, tagLength: 128 } });
    expect(Buffer.from(first.kdf.salt, "base64")).toHaveLength(16);
    expect(Buffer.from(first.cipher.iv, "base64")).toHaveLength(12);
    expect(Buffer.from(first.ciphertext, "base64")).toHaveLength(Buffer.byteLength(plain, "utf8") + 16);
    expect(encrypted).not.toContain("exportedAt");
    expect(encrypted).not.toContain("Private test receipt");
  });

  it("opens an independent Node PBKDF2/AES-GCM vector despite input member reordering", async () => {
    await expect(decryptBooksBackup(nodeSeal(Buffer.from(plain, "utf8")), PASSWORD)).resolves.toBe(plain);
  });

  it("produces ciphertext independently readable with Node crypto and the documented AAD", () => {
    expect(nodeOpen(encrypted)).toBe(plain);
  });

  it("authenticates the documented header as additional data", async () => {
    await expect(decryptBooksBackup(nodeSeal(Buffer.from(plain, "utf8"), PASSWORD, Buffer.from("different header")), PASSWORD)).rejects.toThrow(UNLOCK_ERROR);
  });

  it("uses nonextractable keys and limits each key to the operation required", async () => {
    const importKey = vi.spyOn(crypto.subtle, "importKey");
    const deriveKey = vi.spyOn(crypto.subtle, "deriveKey");
    const encrypt = vi.spyOn(crypto.subtle, "encrypt");
    const decrypt = vi.spyOn(crypto.subtle, "decrypt");
    const result = await encryptBooksBackup(plain, PASSWORD);
    await decryptBooksBackup(result, PASSWORD);
    for (const call of importKey.mock.calls) expect(call.slice(2)).toEqual(["PBKDF2", false, ["deriveKey"]]);
    expect(deriveKey.mock.calls.map(call => call.slice(2))).toEqual([[{ name: "AES-GCM", length: 256 }, false, ["encrypt"]], [{ name: "AES-GCM", length: 256 }, false, ["decrypt"]]]);
    expect(encrypt.mock.calls[0][1]).toMatchObject({ extractable: false, usages: ["encrypt"] });
    expect(decrypt.mock.calls[0][1]).toMatchObject({ extractable: false, usages: ["decrypt"] });
  });

  it.each([
    ["wrong password", () => encrypted, "Another unrelated passphrase"],
    ["changed salt", () => changed(e => { e.kdf.salt = flipBase64(e.kdf.salt); }), PASSWORD],
    ["changed nonce", () => changed(e => { e.cipher.iv = flipBase64(e.cipher.iv); }), PASSWORD],
    ["changed ciphertext", () => changed(e => { e.ciphertext = flipBase64(e.ciphertext); }), PASSWORD],
    ["changed authentication tag", () => changed(e => { e.ciphertext = flipBase64(e.ciphertext, Buffer.from(e.ciphertext, "base64").length - 1); }), PASSWORD],
    ["truncated ciphertext", () => changed(e => { e.ciphertext = Buffer.from(e.ciphertext, "base64").subarray(0, -1).toString("base64"); }), PASSWORD],
  ] as const)("reports %s without revealing the cause or any decrypted content", async (_name, value, password) => {
    await expect(decryptBooksBackup(value(), password)).rejects.toThrow(UNLOCK_ERROR);
  });

  it.each([
    ["authenticated invalid UTF-8", () => Buffer.concat([Buffer.from(plain, "utf8"), Buffer.from([0xff])])],
    ["authenticated JSON with a leading BOM", () => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(plain, "utf8")])],
    ["authenticated invalid Books", () => Buffer.from(JSON.stringify({ schema: BOOKS_BACKUP_SCHEMA, books: { privateText: "Never expose this" } }))],
    ["authenticated malformed JSON", () => Buffer.from("{private contents")],
  ] as const)("rejects %s through the same safe unlock error", async (_name, payload) => {
    await expect(decryptBooksBackup(nodeSeal(payload()), PASSWORD)).rejects.toThrow(UNLOCK_ERROR);
  });

  const malformed: [string, (e: Envelope) => void][] = [
    ["future schema", e => { e.schema = "taxsorted.encrypted-books-backup/2"; }],
    ["extra envelope field", e => { Object.assign(e, { exportedAt: "2026-01-01" }); }],
    ["extra KDF field", e => { Object.assign(e.kdf, { memory: 1 }); }],
    ["extra cipher field", e => { Object.assign(e.cipher, { mode: "CBC" }); }],
    ["missing field", e => { delete (e as Partial<Envelope>).ciphertext; }],
    ["array in place of KDF", e => { Object.assign(e, { kdf: [] }); }],
    ["null in place of cipher", e => { Object.assign(e, { cipher: null }); }],
    ["different KDF", e => { e.kdf.name = "scrypt"; }],
    ["different digest", e => { e.kdf.hash = "SHA-1"; }],
    ["hostile high iterations", e => { e.kdf.iterations = Number.MAX_SAFE_INTEGER; }],
    ["weakened iterations", e => { e.kdf.iterations = 1; }],
    ["fractional iterations", e => { e.kdf.iterations = 600000.5; }],
    ["iterations encoded as string", e => { Object.assign(e.kdf, { iterations: "600000" }); }],
    ["different cipher", e => { e.cipher.name = "AES-CBC"; }],
    ["weakened key", e => { e.cipher.keyLength = 128; }],
    ["short authentication tag", e => { e.cipher.tagLength = 96; }],
    ["short salt", e => { e.kdf.salt = Buffer.alloc(15).toString("base64"); }],
    ["long salt", e => { e.kdf.salt = Buffer.alloc(17).toString("base64"); }],
    ["short nonce", e => { e.cipher.iv = Buffer.alloc(11).toString("base64"); }],
    ["long nonce", e => { e.cipher.iv = Buffer.alloc(13).toString("base64"); }],
    ["noncanonical padding bits", e => { e.kdf.salt = "AAAAAAAAAAAAAAAAAAAAAB=="; }],
    ["missing base64 padding", e => { e.kdf.salt = e.kdf.salt.replace(/=+$/, ""); }],
    ["extra base64 padding", e => { e.cipher.iv += "===="; }],
    ["base64 whitespace", e => { e.ciphertext = "\n" + e.ciphertext; }],
    ["base64 URL alphabet", e => { e.cipher.iv = "----------------"; }],
    ["interior base64 padding", e => { e.cipher.iv = "AAAA=AAAAAAAAAAA"; }],
    ["ciphertext without payload", e => { e.ciphertext = Buffer.alloc(16).toString("base64"); }],
    ["empty ciphertext", e => { e.ciphertext = ""; }],
    ["ciphertext beyond plaintext limit", e => { e.ciphertext = Buffer.alloc(BOOKS_BACKUP_MAX_BYTES + 17).toString("base64"); }],
  ];
  it.each(malformed)("rejects %s before deriving any key", async (_name, change) => {
    const deriveKey = vi.spyOn(crypto.subtle, "deriveKey");
    const json = changed(change);
    expect(() => inspectBooksBackupFile(json)).toThrow();
    await expect(decryptBooksBackup(json, PASSWORD)).rejects.toThrow();
    expect(deriveKey).not.toHaveBeenCalled();
  });

  it.each([
    () => encrypted.replace('"schema":', '"schema":"ignored duplicate","schema":'),
    () => encrypted.replace('"name": "PBKDF2"', '"name":"ignored duplicate","na\\u006de":"PBKDF2"'),
    () => encrypted.replace('"kdf":', '"kdf":' + '{"nested":'.repeat(40) + 'null' + '}'.repeat(40) + ',"kdf":'),
    () => encrypted.replace('"kdf":', '"kdf":[[[null]]],"kdf":'),
  ])("rejects duplicate members including escaped names before deriving a key", async makeDuplicate => {
    const deriveKey = vi.spyOn(crypto.subtle, "deriveKey");
    expect(() => inspectBooksBackupFile(makeDuplicate())).toThrow(/format/);
    await expect(decryptBooksBackup(makeDuplicate(), PASSWORD)).rejects.toThrow(/format/);
    expect(deriveKey).not.toHaveBeenCalled();
  });

  it("accepts the exact ciphertext byte boundary without deriving a key during inspection", () => {
    const deriveKey = vi.spyOn(crypto.subtle, "deriveKey");
    expect(inspectBooksBackupFile(changed(e => { e.ciphertext = Buffer.alloc(BOOKS_BACKUP_MAX_BYTES + 16).toString("base64"); }))).toBe("encrypted");
    expect(deriveKey).not.toHaveBeenCalled();
  });

  it("roundtrips a valid plaintext at the 10 MiB limit inside the 14 MiB file limit", async () => {
    const json = plain + " ".repeat(BOOKS_BACKUP_MAX_BYTES - Buffer.byteLength(plain, "utf8"));
    const result = await encryptBooksBackup(json, PASSWORD);
    expect(Buffer.byteLength(result, "utf8")).toBeLessThanOrEqual(BOOKS_BACKUP_FILE_MAX_BYTES);
    expect(inspectBooksBackupFile(result)).toBe("encrypted");
    await expect(decryptBooksBackup(result, PASSWORD)).resolves.toBe(json);
  });

  it("bounds complete files and legacy files by UTF-8 bytes before deriving a key", async () => {
    const deriveKey = vi.spyOn(crypto.subtle, "deriveKey");
    for (const value of [" ".repeat(BOOKS_BACKUP_FILE_MAX_BYTES + 1), "🌱".repeat(BOOKS_BACKUP_FILE_MAX_BYTES / 4 + 1)]) {
      expect(() => inspectBooksBackupFile(value)).toThrow(/14 MB/);
      await expect(decryptBooksBackup(value, PASSWORD)).rejects.toThrow(/14 MB/);
    }
    const oversizedPlain = JSON.stringify({ schema: BOOKS_BACKUP_SCHEMA, value: "é".repeat(BOOKS_BACKUP_MAX_BYTES / 2) });
    expect(() => inspectBooksBackupFile(oversizedPlain)).toThrow(/10 MB/);
    await expect(encryptBooksBackup(oversizedPlain, PASSWORD)).rejects.toThrow(/10 MB/);
    expect(deriveKey).not.toHaveBeenCalled();
  });

  it("retains legacy detection without claiming a detected payload is valid Books", async () => {
    const json = JSON.stringify({ schema: BOOKS_BACKUP_SCHEMA });
    expect(inspectBooksBackupFile(json)).toBe("plain");
    await expect(encryptBooksBackup(json, PASSWORD)).rejects.toThrow();
    await expect(decryptBooksBackup(plain, PASSWORD)).rejects.toThrow(/not password-protected/);
  });

  it("rejects raw unpaired plaintext surrogates before encoding could change the data", async () => {
    const deriveKey = vi.spyOn(crypto.subtle, "deriveKey");
    for (const value of ["\ud800", "\udfff"]) {
      const json = plain.replace("Corrected synthetic receipt", `Corrected ${value} receipt`);
      // This specifically protects the encoding boundary, beyond the existing
      // parser. Standard JSON.stringify writes these characters as escapes.
      await expect(parseBooksBackup(json)).resolves.toBeDefined();
      await expect(encryptBooksBackup(json, PASSWORD)).rejects.toThrow(/invalid Unicode text/);
    }
    expect(deriveKey).not.toHaveBeenCalled();
  });

  it.each(["{", "null", "[]", "{}", '{"schema":"unknown"}'])("rejects malformed or unrecognized input %s without deriving a key", async json => {
    const deriveKey = vi.spyOn(crypto.subtle, "deriveKey");
    expect(() => inspectBooksBackupFile(json)).toThrow();
    await expect(encryptBooksBackup(json, PASSWORD)).rejects.toThrow();
    await expect(decryptBooksBackup(json, PASSWORD)).rejects.toThrow();
    expect(deriveKey).not.toHaveBeenCalled();
  });

  it.each([undefined, { getRandomValues: () => {}, subtle: undefined }])("reports unavailable Web Crypto without a fallback or affecting file inspection", async available => {
    vi.stubGlobal("crypto", available);
    expect(inspectBooksBackupFile(encrypted)).toBe("encrypted");
    expect(inspectBooksBackupFile(plain)).toBe("plain");
    await expect(encryptBooksBackup(plain, PASSWORD)).rejects.toThrow(/need Web Crypto/);
    await expect(decryptBooksBackup(encrypted, PASSWORD)).rejects.toThrow(/need Web Crypto/);
  });
});

describe("backup password handling", () => {
  it("counts Unicode codepoints and enforces the UTF-8 byte limit", () => {
    expect(BOOKS_BACKUP_PASSWORD_MIN_LENGTH).toBe(12);
    expect(BOOKS_BACKUP_PASSWORD_MAX_BYTES).toBe(1024);
    expect(() => validateBackupPassword("🌱".repeat(12))).not.toThrow();
    expect(() => validateBackupPassword("🌱".repeat(11))).toThrow(/12 characters/);
    expect(() => validateBackupPassword("🌱".repeat(256))).not.toThrow();
    expect(() => validateBackupPassword("🌱".repeat(257))).toThrow(/1,024 UTF-8 bytes/);
    expect(() => validateBackupPassword("a".repeat(1024))).not.toThrow();
    expect(() => validateBackupPassword("a".repeat(1025))).toThrow(/1,024 UTF-8 bytes/);
  });

  it.each(["", "too short", " ".repeat(12), "\t\n\u2003".repeat(5), "abcdefghijk\ud800", "abcdefghijk\udfff"])("rejects an invalid password before deriving a key", async password => {
    const deriveKey = vi.spyOn(crypto.subtle, "deriveKey");
    expect(() => validateBackupPassword(password)).toThrow();
    await expect(encryptBooksBackup(plain, password)).rejects.toThrow();
    await expect(decryptBooksBackup(encrypted, password)).rejects.toThrow();
    expect(deriveKey).not.toHaveBeenCalled();
  });

  it("preserves leading/trailing spaces and Unicode normalization exactly", async () => {
    const exact = "  café passphrase  ";
    const json = nodeSeal(Buffer.from(plain, "utf8"), exact);
    await expect(decryptBooksBackup(json, exact)).resolves.toBe(plain);
    await expect(decryptBooksBackup(json, exact.trim())).rejects.toThrow(UNLOCK_ERROR);
    await expect(decryptBooksBackup(json, exact.normalize("NFD"))).rejects.toThrow(UNLOCK_ERROR);
  });
});
