import { BOOKS_BACKUP_MAX_BYTES, BOOKS_BACKUP_SCHEMA, parseBooksBackup } from "@/lib/books-backup";

export const BOOKS_ENCRYPTED_BACKUP_SCHEMA = "taxsorted.encrypted-books-backup/1" as const;
export const BOOKS_BACKUP_FILE_MAX_BYTES = 14 * 1024 * 1024;
export const BOOKS_BACKUP_PASSWORD_MIN_LENGTH = 12;
export const BOOKS_BACKUP_PASSWORD_MAX_BYTES = 1024;

const ITERATIONS = 600_000;
const TAG_BYTES = 16;
const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const UNLOCK_ERROR = "Unable to unlock this backup. Check the password and try again, or choose another copy if the file is damaged.";

interface EncryptedHeader {
  schema: typeof BOOKS_ENCRYPTED_BACKUP_SCHEMA;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: typeof ITERATIONS; salt: string };
  cipher: { name: "AES-GCM"; keyLength: 256; tagLength: 128; iv: string };
}
interface EncryptedBackup extends EncryptedHeader { ciphertext: string }

function invalidEnvelope(): never {
  throw new Error("This password-protected backup has an invalid or unsupported format. Choose another TaxSorted Books backup.");
}

function exactObject(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidEnvelope();
  const object = value as Record<string, unknown>;
  if (Object.keys(object).length !== keys.length || keys.some(key => !Object.hasOwn(object, key))) invalidEnvelope();
  return object;
}

// Check alphabet, padding, unused bits and decoded size before allocating bytes or
// deriving a key. A flat character-class check also avoids recursive regex work on
// a file near the size limit.
function checkBase64(value: unknown, minBytes: number, maxBytes: number): asserts value is string {
  if (typeof value !== "string" || !value.length || value.length % 4 !== 0 || value.length > 4 * Math.ceil(maxBytes / 3)) invalidEnvelope();
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const body = value.slice(0, value.length - padding);
  if (/[^A-Za-z0-9+/]/.test(body)) invalidEnvelope();
  const bytes = value.length / 4 * 3 - padding;
  if (bytes < minBytes || bytes > maxBytes) invalidEnvelope();
  if (padding && (BASE64.indexOf(body.at(-1)!) & (padding === 2 ? 15 : 3)) !== 0) invalidEnvelope();
}

// JSON.parse accepts duplicate members. Refuse them in this new envelope so two
// implementations cannot disagree about the authenticated header. JSON syntax
// has already been checked; only quoted member names need decoding here.
function rejectDuplicateMembers(json: string): void {
  const objects: Set<string>[] = [];
  for (let index = 0; index < json.length; index++) {
    const character = json[index];
    if (character === "{") {
      // The supported structure is root -> kdf/cipher only. A duplicate key
      // could otherwise hide a deeply nested value from JSON.parse's result.
      if (objects.length >= 2) invalidEnvelope();
      objects.push(new Set());
    }
    else if (character === "[") invalidEnvelope();
    else if (character === "}") objects.pop();
    else if (character === '"') {
      const start = index++;
      while (json[index] !== '"') {
        if (json[index] === "\\") index++;
        index++;
      }
      let following = index + 1;
      while (/\s/.test(json[following] ?? "")) following++;
      if (json[following] === ":") {
        const key = JSON.parse(json.slice(start, index + 1)) as string;
        const keys = objects.at(-1)!;
        if (keys.has(key)) invalidEnvelope();
        keys.add(key);
      }
    }
  }
}

function readBackupFile(json: string): { kind: "plain" } | { kind: "encrypted"; envelope: EncryptedBackup } {
  if (typeof json !== "string" || json.length > BOOKS_BACKUP_FILE_MAX_BYTES) throw new Error("Choose a Books backup file no larger than 14 MB.");
  const bytes = new TextEncoder().encode(json).byteLength;
  if (bytes > BOOKS_BACKUP_FILE_MAX_BYTES) throw new Error("Choose a Books backup file no larger than 14 MB.");
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { throw new Error("This file is not valid JSON. Choose a TaxSorted Books backup."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) invalidEnvelope();
  const schema = (parsed as Record<string, unknown>).schema;
  if (schema === BOOKS_BACKUP_SCHEMA) {
    if (bytes > BOOKS_BACKUP_MAX_BYTES) throw new Error("Choose an unencrypted Books backup no larger than 10 MB.");
    return { kind: "plain" };
  }
  if (schema !== BOOKS_ENCRYPTED_BACKUP_SCHEMA) throw new Error("This file is not a supported TaxSorted Books backup. Choose a Books backup exported by TaxSorted.");
  const envelope = exactObject(parsed, ["schema", "kdf", "cipher", "ciphertext"]);
  const kdf = exactObject(envelope.kdf, ["name", "hash", "iterations", "salt"]);
  const cipher = exactObject(envelope.cipher, ["name", "keyLength", "tagLength", "iv"]);
  if (kdf.name !== "PBKDF2" || kdf.hash !== "SHA-256" || kdf.iterations !== ITERATIONS || cipher.name !== "AES-GCM" || cipher.keyLength !== 256 || cipher.tagLength !== 128) invalidEnvelope();
  checkBase64(kdf.salt, 16, 16);
  checkBase64(cipher.iv, 12, 12);
  checkBase64(envelope.ciphertext, TAG_BYTES + 1, BOOKS_BACKUP_MAX_BYTES + TAG_BYTES);
  rejectDuplicateMembers(json);
  return { kind: "encrypted", envelope: parsed as EncryptedBackup };
}

/** Inspects the file format before asking for a password. Plain payloads still
 * pass through parseBooksBackup during restore; inspection grants no trust. */
export function inspectBooksBackupFile(json: string): "plain" | "encrypted" {
  return readBackupFile(json).kind;
}

/** Passwords are exact Unicode strings: no trimming or normalization. */
export function validateBackupPassword(password: string): void {
  if (typeof password !== "string") throw new Error("Enter a password for this backup.");
  if (password.length > BOOKS_BACKUP_PASSWORD_MAX_BYTES) throw new Error("Use a backup password no longer than 1,024 UTF-8 bytes.");
  let characters = 0;
  for (const character of password) {
    const point = character.codePointAt(0)!;
    if (point >= 0xd800 && point <= 0xdfff) throw new Error("The backup password contains an invalid Unicode character.");
    characters++;
  }
  if (characters < BOOKS_BACKUP_PASSWORD_MIN_LENGTH || /^\s+$/u.test(password)) throw new Error("Use at least 12 characters, with more than spaces, for your backup password.");
  const bytes = new TextEncoder().encode(password);
  try {
    if (bytes.byteLength > BOOKS_BACKUP_PASSWORD_MAX_BYTES) throw new Error("Use a backup password no longer than 1,024 UTF-8 bytes.");
  } finally { bytes.fill(0); }
}

function webCrypto(): Crypto {
  const available = globalThis.crypto;
  if (!available?.subtle || typeof available.getRandomValues !== "function") {
    throw new Error("Password-protected backups need Web Crypto in a secure browser or the TaxSorted desktop app.");
  }
  return available;
}

function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let index = 0; index < bytes.length; index += 0x8000) chunks.push(String.fromCharCode(...bytes.subarray(index, index + 0x8000)));
  return btoa(chunks.join(""));
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

// The format authenticates UTF-8 JSON in precisely this member order, without
// whitespace. Rebuild it rather than trusting the input JSON's member order.
function headerFor(salt: string, iv: string): EncryptedHeader {
  return {
    schema: BOOKS_ENCRYPTED_BACKUP_SCHEMA,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS, salt },
    cipher: { name: "AES-GCM", keyLength: 256, tagLength: 128, iv },
  };
}

async function deriveKey(crypto: Crypto, password: string, salt: Uint8Array<ArrayBuffer>, usage: "encrypt" | "decrypt"): Promise<CryptoKey> {
  const bytes = new TextEncoder().encode(password);
  try {
    const material = await crypto.subtle.importKey("raw", bytes, "PBKDF2", false, ["deriveKey"]);
    return await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS, salt }, material, { name: "AES-GCM", length: 256 }, false, [usage]);
  } finally { bytes.fill(0); }
}

export async function encryptBooksBackup(json: string, password: string): Promise<string> {
  validateBackupPassword(password);
  const crypto = webCrypto();
  await parseBooksBackup(json);
  // Exported JSON escapes lone surrogates. Refuse a hand-edited string that
  // TextEncoder would silently replace, rather than changing its Books data.
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(json)) {
    throw new Error("This Books backup contains invalid Unicode text. Export a fresh backup from Books.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const header = headerFor(encodeBase64(salt), encodeBase64(iv));
  const plaintext = new TextEncoder().encode(json);
  try {
    const key = await deriveKey(crypto, password, salt, "encrypt");
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128, additionalData: new TextEncoder().encode(JSON.stringify(header)) }, key, plaintext);
    return JSON.stringify({ ...header, ciphertext: encodeBase64(new Uint8Array(ciphertext)) }, null, 2);
  } catch {
    throw new Error("Unable to password-protect this backup. Your Books have not changed. Try again in a browser with Web Crypto or the TaxSorted desktop app.");
  } finally {
    // Best effort for these byte arrays only. JavaScript strings and engine
    // copies are managed by the runtime and cannot be reliably erased here.
    plaintext.fill(0);
  }
}

export async function decryptBooksBackup(json: string, password: string): Promise<string> {
  const file = readBackupFile(json);
  if (file.kind !== "encrypted") throw new Error("This Books backup is not password-protected. Open it without a password.");
  validateBackupPassword(password);
  const crypto = webCrypto();
  const envelope = file.envelope;
  const salt = decodeBase64(envelope.kdf.salt);
  const iv = decodeBase64(envelope.cipher.iv);
  const ciphertext = decodeBase64(envelope.ciphertext);
  let plaintext: Uint8Array<ArrayBuffer> | undefined;
  try {
    const key = await deriveKey(crypto, password, salt, "decrypt");
    const header = headerFor(envelope.kdf.salt, envelope.cipher.iv);
    plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128, additionalData: new TextEncoder().encode(JSON.stringify(header)) }, key, ciphertext));
    // Preserve a BOM so JSON.parse applies the same rules as a plain backup.
    const result = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(plaintext);
    await parseBooksBackup(result);
    return result;
  } catch {
    // Authentication, UTF-8 decoding and payload validation deliberately share
    // one error; never reveal decrypted content or any password-derived value.
    throw new Error(UNLOCK_ERROR);
  } finally { plaintext?.fill(0); }
}
