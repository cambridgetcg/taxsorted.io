// Token vault primitives: AES-256-GCM at rest, HMAC-signed OAuth state.

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

// Key separation: the vault key and the state-signing key are derived from the
// master with distinct labels, so neither can ever stand in for the other.
function key(hex: string, label: "vault" | "state"): Buffer {
  const master = Buffer.from(hex, "hex");
  if (master.length !== 32) throw new Error("TOKEN_KEY must be 32 bytes of hex");
  return Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), label, 32));
}

export function encrypt(plain: string, keyHex: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(keyHex, "vault"), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(blob: string, keyHex: string): string {
  const raw = Buffer.from(blob, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(keyHex, "vault"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

// Signed, expiring state for the OAuth dance: payload.b64url.signature
export function signState(payload: object, keyHex: string, ttlSeconds = 600): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + ttlSeconds * 1000 })
  ).toString("base64url");
  const sig = createHmac("sha256", key(keyHex, "state")).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState<T>(state: string, keyHex: string): T | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", key(keyHex, "state")).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload as T;
}
