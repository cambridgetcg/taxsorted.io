import { createCipheriv, createDecipheriv, pbkdf2Sync } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CHECKLIST_SCHEMA, emptyChecklistProgress } from "@/app/checkup/checklist-state";
import { createRecordsStore } from "../records";
import { createEmptyPassportDraft } from "../passport-store";
import { createEmploymentSource, createPreparationDraft } from "../return-preparation";
import { decryptBooksBackup, encryptBooksBackup, inspectBooksBackupFile } from "../books-backup-encryption";
import { WORKSPACE_BACKUP_MAX_BYTES, exportWorkspaceBackup, parseWorkspaceBackup } from "../workspace-backup";
import {
  WORKSPACE_BACKUP_FILE_MAX_BYTES, WORKSPACE_BACKUP_PASSWORD_MAX_BYTES, WORKSPACE_BACKUP_PASSWORD_MIN_LENGTH,
  WORKSPACE_ENCRYPTED_BACKUP_SCHEMA, decryptWorkspaceBackup, encryptWorkspaceBackup,
  inspectWorkspaceBackupFile, validateWorkspaceBackupPassword,
} from "../workspace-backup-encryption";

const PASSWORD = "Synthetic private passphrase 🌱";
const UNLOCK_ERROR = /Unable to unlock this backup/;
type Envelope = {
  schema: string;
  kdf: { name: string; hash: string; iterations: number; salt: string };
  cipher: { name: string; keyLength: number; tagLength: number; iv: string };
  ciphertext: string;
};
let plain: string;
let encrypted: string;
let booksPlain: string;
let booksEncrypted: string;

// Independent non-WebCrypto implementation. Public fixed test salt/nonce and
// the documented member order prove interoperability beyond our own roundtrip.
function nodeSeal(payload: Uint8Array, aadOverride?: Buffer): string {
  const salt = Buffer.from("00112233445566778899aabbccddeeff", "hex");
  const iv = Buffer.from("000102030405060708090a0b", "hex");
  const header = {
    schema: "taxsorted.encrypted-workspace-backup/1",
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: 600000, salt: salt.toString("base64") },
    cipher: { name: "AES-GCM", keyLength: 256, tagLength: 128, iv: iv.toString("base64") },
  };
  const key = pbkdf2Sync(Buffer.from(PASSWORD, "utf8"), salt, 600000, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  cipher.setAAD(aadOverride ?? Buffer.from(JSON.stringify(header), "utf8"));
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final(), cipher.getAuthTag()]).toString("base64");
  key.fill(0);
  return JSON.stringify({ ciphertext, cipher: header.cipher, kdf: header.kdf, schema: header.schema });
}

function nodeOpen(json: string): string {
  const value = JSON.parse(json) as Envelope;
  const header = {
    schema: value.schema,
    kdf: { name: value.kdf.name, hash: value.kdf.hash, iterations: value.kdf.iterations, salt: value.kdf.salt },
    cipher: { name: value.cipher.name, keyLength: value.cipher.keyLength, tagLength: value.cipher.tagLength, iv: value.cipher.iv },
  };
  const key = pbkdf2Sync(Buffer.from(PASSWORD, "utf8"), Buffer.from(value.kdf.salt, "base64"), 600000, 32, "sha256");
  const bytes = Buffer.from(value.ciphertext, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.cipher.iv, "base64"), { authTagLength: 16 });
  decipher.setAAD(Buffer.from(JSON.stringify(header), "utf8"));
  decipher.setAuthTag(bytes.subarray(-16));
  const result = Buffer.concat([decipher.update(bytes.subarray(0, -16)), decipher.final()]).toString("utf8");
  key.fill(0);
  return result;
}
function changed(change: (value: Envelope) => void): string {
  const value = JSON.parse(encrypted) as Envelope;
  change(value);
  return JSON.stringify(value);
}
function flip(value: string): string {
  const bytes = Buffer.from(value, "base64");
  bytes[0] ^= 1;
  return bytes.toString("base64");
}

beforeAll(async () => {
  const records = createRecordsStore(new Map());
  await records.add({ date: "2026-05-01", amount: 12345, kind: "income", category: "turnover", source: "self-employment", description: "Synthetic private receipt" });
  booksPlain = await records.exportBackup();
  booksEncrypted = await encryptBooksBackup(booksPlain, PASSWORD);
  const passport = createEmptyPassportDraft("2026-09-30T12:00:00.000Z");
  passport.revision = 1;
  const preparation = createPreparationDraft("2025-26", "prepare-return", "2026-09-30T12:00:00.000Z");
  preparation.revision = 1;
  preparation.employmentSources = [{ ...createEmploymentSource("synthetic-employment"), employerName: "Synthetic private employer", notes: "Synthetic private notes", tax: "-12.34" }];
  plain = await exportWorkspaceBackup({ books: await records.state(), passport, preparations: { "2025-26": preparation, "2026-27": null }, checklist: { schema: CHECKLIST_SCHEMA, audience: "individuals", checked: emptyChecklistProgress() } });
  encrypted = await encryptWorkspaceBackup(plain, PASSWORD);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("encrypted whole-workspace format", () => {
  it("roundtrips all saved domains without changing plaintext bytes or absent-year meaning", async () => {
    expect(inspectWorkspaceBackupFile(encrypted)).toBe("encrypted");
    const opened = await decryptWorkspaceBackup(encrypted, PASSWORD);
    expect(opened).toBe(plain);
    expect(await parseWorkspaceBackup(opened)).toEqual(await parseWorkspaceBackup(plain));
  });

  it("uses fresh salt/nonce and exposes only format/crypto parameters outside encryption", async () => {
    const first = JSON.parse(encrypted) as Envelope;
    const second = JSON.parse(await encryptWorkspaceBackup(plain, PASSWORD)) as Envelope;
    expect(Object.keys(first).sort()).toEqual(["cipher", "ciphertext", "kdf", "schema"]);
    expect(first.schema).toBe(WORKSPACE_ENCRYPTED_BACKUP_SCHEMA);
    expect(first.kdf).toMatchObject({ name: "PBKDF2", hash: "SHA-256", iterations: 600000 });
    expect(first.cipher).toMatchObject({ name: "AES-GCM", keyLength: 256, tagLength: 128 });
    expect(Buffer.from(first.kdf.salt, "base64")).toHaveLength(16);
    expect(Buffer.from(first.cipher.iv, "base64")).toHaveLength(12);
    expect(Buffer.from(first.ciphertext, "base64")).toHaveLength(Buffer.byteLength(plain) + 16);
    expect(second.kdf.salt).not.toBe(first.kdf.salt);
    expect(second.cipher.iv).not.toBe(first.cipher.iv);
    expect(second.ciphertext).not.toBe(first.ciphertext);
    for (const marker of ["exportedAt", "preparations", "Synthetic private", "employerName"]) expect(encrypted).not.toContain(marker);
  });

  it("opens an independent Node vector with reordered envelope members", async () => {
    await expect(decryptWorkspaceBackup(nodeSeal(Buffer.from(plain)), PASSWORD)).resolves.toBe(plain);
    expect(nodeOpen(encrypted)).toBe(plain);
  });

  it("rejects plain workspace and every Books file before asking for a password or deriving a key", async () => {
    const derive = vi.spyOn(crypto.subtle, "deriveKey");
    for (const json of [plain, booksPlain, booksEncrypted, '{"schema":"unknown"}']) {
      expect(() => inspectWorkspaceBackupFile(json)).toThrow(/encrypted TaxSorted workspace backup/);
      await expect(decryptWorkspaceBackup(json, PASSWORD)).rejects.toThrow(/encrypted TaxSorted workspace backup/);
    }
    expect(derive).not.toHaveBeenCalled();
    expect(inspectBooksBackupFile(booksPlain)).toBe("plain");
    expect(inspectBooksBackupFile(booksEncrypted)).toBe("encrypted");
    expect(() => inspectBooksBackupFile(encrypted)).toThrow(/Books backup/);
  });

  it("authenticates the format domain so relabelled Books and workspace headers cannot cross", async () => {
    const booksAsWorkspace = JSON.parse(booksEncrypted) as Envelope;
    booksAsWorkspace.schema = WORKSPACE_ENCRYPTED_BACKUP_SCHEMA;
    await expect(decryptWorkspaceBackup(JSON.stringify(booksAsWorkspace), PASSWORD)).rejects.toThrow(UNLOCK_ERROR);
    const workspaceAsBooks = JSON.parse(encrypted) as Envelope;
    workspaceAsBooks.schema = "taxsorted.encrypted-books-backup/1";
    await expect(decryptBooksBackup(JSON.stringify(workspaceAsBooks), PASSWORD)).rejects.toThrow(UNLOCK_ERROR);
    await expect(decryptWorkspaceBackup(nodeSeal(Buffer.from(plain), Buffer.from("different authenticated header")), PASSWORD)).rejects.toThrow(UNLOCK_ERROR);
  });

  it("uses nonextractable keys with only the usage needed for each operation", async () => {
    const imported = vi.spyOn(crypto.subtle, "importKey");
    const derived = vi.spyOn(crypto.subtle, "deriveKey");
    await encryptWorkspaceBackup(plain, PASSWORD);
    await decryptWorkspaceBackup(encrypted, PASSWORD);
    for (const call of imported.mock.calls) expect(call.slice(2)).toEqual(["PBKDF2", false, ["deriveKey"]]);
    expect(derived.mock.calls.map(call => call.slice(2))).toEqual([
      [{ name: "AES-GCM", length: 256 }, false, ["encrypt"]],
      [{ name: "AES-GCM", length: 256 }, false, ["decrypt"]],
    ]);
  });

  // Each case keeps the real 600,000-iteration KDF, with its own test deadline.
  // Grouping all eight unlock attempts under one deadline starves slower runners.
  it.each<{ label: string; file: () => string; password?: string }>([
    { label: "a wrong password", file: () => encrypted, password: "Another synthetic password" },
    { label: "a changed salt", file: () => changed(v => { v.kdf.salt = flip(v.kdf.salt); }) },
    { label: "a changed nonce", file: () => changed(v => { v.cipher.iv = flip(v.cipher.iv); }) },
    { label: "changed ciphertext", file: () => changed(v => { v.ciphertext = flip(v.ciphertext); }) },
    { label: "truncated ciphertext", file: () => changed(v => { v.ciphertext = v.ciphertext.slice(0, -4); }) },
    { label: "an authenticated Books payload", file: () => nodeSeal(Buffer.from(booksPlain)) },
    { label: "authenticated invalid UTF-8", file: () => nodeSeal(Buffer.from([0xff, 0xfe])) },
    { label: "an authenticated invalid revision", file: () => nodeSeal(Buffer.from(plain.replace('"revision": 1', '"revision": 0'))) },
  ])("gives one generic unlock error for $label", async ({ file, password = PASSWORD }) => {
    await expect(decryptWorkspaceBackup(file(), password)).rejects.toThrow(UNLOCK_ERROR);
  });

  it.each([
    ["unknown root key", (v: Envelope) => { Object.assign(v, { records: 1 }); }],
    ["missing ciphertext", (v: Envelope) => { delete (v as Partial<Envelope>).ciphertext; }],
    ["unknown KDF key", (v: Envelope) => { Object.assign(v.kdf, { parallelism: 2 }); }],
    ["unknown cipher key", (v: Envelope) => { Object.assign(v.cipher, { counter: 1 }); }],
    ["hostile iterations", (v: Envelope) => { v.kdf.iterations = 2147483647; }],
    ["weakened iterations", (v: Envelope) => { v.kdf.iterations = 1; }],
    ["different hash", (v: Envelope) => { v.kdf.hash = "SHA-1"; }],
    ["different KDF", (v: Envelope) => { v.kdf.name = "scrypt"; }],
    ["different cipher", (v: Envelope) => { v.cipher.name = "AES-CBC"; }],
    ["weaker key", (v: Envelope) => { v.cipher.keyLength = 128; }],
    ["shorter tag", (v: Envelope) => { v.cipher.tagLength = 96; }],
    ["short salt", (v: Envelope) => { v.kdf.salt = Buffer.alloc(15).toString("base64"); }],
    ["long IV", (v: Envelope) => { v.cipher.iv = Buffer.alloc(13).toString("base64"); }],
    ["noncanonical base64", (v: Envelope) => { v.kdf.salt = "AAAAAAAAAAAAAAAAAAAAAB=="; }],
    ["base64 whitespace", (v: Envelope) => { v.ciphertext = ` ${v.ciphertext.slice(1)}`; }],
    ["ciphertext without payload", (v: Envelope) => { v.ciphertext = Buffer.alloc(16).toString("base64"); }],
  ])("rejects %s before expensive cryptography", async (_label, change) => {
    const derive = vi.spyOn(crypto.subtle, "deriveKey");
    const json = changed(change);
    expect(() => inspectWorkspaceBackupFile(json)).toThrow(/invalid or unsupported/);
    await expect(decryptWorkspaceBackup(json, PASSWORD)).rejects.toThrow(/invalid or unsupported/);
    expect(derive).not.toHaveBeenCalled();
  });

  it("rejects duplicate, escaped duplicate and hidden deep envelope members before KDF", async () => {
    const derive = vi.spyOn(crypto.subtle, "deriveKey");
    for (const json of [encrypted.replace('"schema":', '"schema":"ignored","schema":'), encrypted.replace('"schema":', '"sch\\u0065ma":"ignored","schema":'), encrypted.replace('"cipher":', '"cipher":{"nested":{}},"cipher":')]) {
      expect(() => inspectWorkspaceBackupFile(json)).toThrow();
      await expect(decryptWorkspaceBackup(json, PASSWORD)).rejects.toThrow();
    }
    expect(derive).not.toHaveBeenCalled();
  });

  it("bounds UTF-8 file size and decoded ciphertext before KDF", async () => {
    const derive = vi.spyOn(crypto.subtle, "deriveKey");
    for (const json of [" ".repeat(WORKSPACE_BACKUP_FILE_MAX_BYTES + 1), "é".repeat(WORKSPACE_BACKUP_FILE_MAX_BYTES / 2 + 1), changed(v => { v.ciphertext = Buffer.alloc(WORKSPACE_BACKUP_MAX_BYTES + 17).toString("base64"); })]) {
      expect(() => inspectWorkspaceBackupFile(json)).toThrow();
      await expect(decryptWorkspaceBackup(json, PASSWORD)).rejects.toThrow();
    }
    expect(derive).not.toHaveBeenCalled();
  });

  it("validates the full plaintext before encryption and fails explicitly without Web Crypto", async () => {
    const derive = vi.spyOn(crypto.subtle, "deriveKey");
    await expect(encryptWorkspaceBackup(booksPlain, PASSWORD)).rejects.toThrow();
    expect(derive).not.toHaveBeenCalled();
    vi.stubGlobal("crypto", undefined);
    await expect(encryptWorkspaceBackup(plain, PASSWORD)).rejects.toThrow(/Web Crypto/);
    await expect(decryptWorkspaceBackup(encrypted, PASSWORD)).rejects.toThrow(/Web Crypto/);
  });

  it("uses the unchanged exact Unicode password contract", async () => {
    expect(WORKSPACE_BACKUP_PASSWORD_MIN_LENGTH).toBe(12);
    expect(WORKSPACE_BACKUP_PASSWORD_MAX_BYTES).toBe(1024);
    for (const password of ["🌱".repeat(11), " ".repeat(12), "a".repeat(1025), "a".repeat(12) + "\ud800"]) expect(() => validateWorkspaceBackupPassword(password)).toThrow();
    expect(() => validateWorkspaceBackupPassword("🌱".repeat(12))).not.toThrow();
    const exact = "  Synthetic café passphrase  ";
    const file = await encryptWorkspaceBackup(plain, exact);
    await expect(decryptWorkspaceBackup(file, exact)).resolves.toBe(plain);
    await expect(decryptWorkspaceBackup(file, exact.trim())).rejects.toThrow(UNLOCK_ERROR);
    await expect(decryptWorkspaceBackup(file, exact.normalize("NFD"))).rejects.toThrow(UNLOCK_ERROR);
  });
});
