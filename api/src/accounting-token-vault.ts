// Accounting-provider secrets have their own versioned vault. HMRC keeps its
// established crypto format in crypto.ts; the two formats and key schedules do
// not overlap.

import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

export type AccountingSecretRecordType =
  | "oauth-attempt"
  | "provider-token-set";

export type AccountingSecretField =
  | "oauth-state"
  | "pkce-code-verifier"
  | "oidc-nonce"
  | "access-token"
  | "refresh-token";

export interface AccountingSecretContext {
  provider: string;
  environment: "sandbox" | "production";
  recordType: AccountingSecretRecordType;
  recordId: string;
  field: AccountingSecretField;
}

export interface AccountingTokenKeyRing {
  activeVersion: number;
  keys: ReadonlyMap<number, string>;
}

export interface SealedAccountingSecret {
  ciphertext: string;
  keyVersion: number;
}

const CIPHERTEXT_PREFIX = "atsv1";
const HEX_KEY = /^[0-9a-f]{64}$/iu;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function positiveVersion(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function boundedText(value: string, label: string): string {
  if (value.length < 1 || value.length > 240 || value.includes("\0")) {
    throw new Error(`Invalid accounting secret ${label}`);
  }
  return value;
}

function validateContext(context: AccountingSecretContext): void {
  boundedText(context.provider, "provider");
  boundedText(context.environment, "environment");
  boundedText(context.recordType, "record type");
  boundedText(context.field, "field");
  if (!UUID.test(context.recordId)) {
    throw new Error("Invalid accounting secret record id");
  }
}

function aad(context: AccountingSecretContext, keyVersion: number): Buffer {
  validateContext(context);
  if (!positiveVersion(keyVersion)) {
    throw new Error("Invalid accounting secret key version");
  }
  // An ordered JSON tuple is canonical and collision-free. Every identity
  // dimension travels as authenticated data, so moving a ciphertext between
  // providers, environments, records, fields or key versions cannot decrypt.
  return Buffer.from(
    JSON.stringify([
      "taxsorted.accounting-secret-context/1",
      context.provider,
      context.environment,
      context.recordType,
      context.recordId.toLowerCase(),
      context.field,
      keyVersion,
    ]),
    "utf8",
  );
}

function key(rootHex: string, keyVersion: number): Buffer {
  const root = Buffer.from(rootHex, "hex");
  const info = Buffer.from(
    `taxsorted/accounting-token-vault/aes-256-gcm/1/key/${keyVersion}`,
    "utf8",
  );
  return Buffer.from(hkdfSync("sha256", root, Buffer.alloc(0), info, 32));
}

/**
 * Encrypts accounting OAuth material with AES-256-GCM and context-bound AAD.
 * A ring can retain old keys for reads while every new seal uses one active
 * version, which makes rotation explicit and reversible during rollout.
 */
export class AccountingTokenVault {
  private readonly activeVersion: number;
  private readonly keys: ReadonlyMap<number, string>;

  constructor(keyRing: AccountingTokenKeyRing) {
    if (!positiveVersion(keyRing.activeVersion)) {
      throw new Error("Accounting token key ring has no valid active version");
    }

    const keys = new Map<number, string>();
    for (const [version, rootHex] of keyRing.keys) {
      if (!positiveVersion(version) || !HEX_KEY.test(rootHex)) {
        throw new Error("Accounting token key ring contains an invalid key");
      }
      keys.set(version, rootHex.toLowerCase());
    }
    if (!keys.has(keyRing.activeVersion)) {
      throw new Error("Accounting token key ring is missing its active key");
    }

    this.activeVersion = keyRing.activeVersion;
    this.keys = keys;
  }

  seal(
    plaintext: string,
    context: AccountingSecretContext,
  ): SealedAccountingSecret {
    if (plaintext.length < 1) {
      throw new Error("Accounting secrets cannot be empty");
    }

    const keyVersion = this.activeVersion;
    const rootHex = this.keys.get(keyVersion)!;
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      key(rootHex, keyVersion),
      iv,
    );
    cipher.setAAD(aad(context, keyVersion));
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const payload = Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
    return {
      ciphertext: `${CIPHERTEXT_PREFIX}.${payload.toString("base64url")}`,
      keyVersion,
    };
  }

  open(
    sealed: SealedAccountingSecret,
    context: AccountingSecretContext,
  ): string {
    if (!positiveVersion(sealed.keyVersion)) {
      throw new Error("Invalid accounting secret key version");
    }
    const rootHex = this.keys.get(sealed.keyVersion);
    if (!rootHex) {
      throw new Error("Accounting token key ring cannot open that key version");
    }

    const parts = sealed.ciphertext.split(".");
    if (
      parts.length !== 2 ||
      parts[0] !== CIPHERTEXT_PREFIX ||
      !/^[A-Za-z0-9_-]+$/u.test(parts[1])
    ) {
      throw new Error("Malformed accounting secret ciphertext");
    }
    const payload = Buffer.from(parts[1], "base64url");
    if (
      payload.length < 29 ||
      payload.toString("base64url") !== parts[1]
    ) {
      throw new Error("Malformed accounting secret ciphertext");
    }

    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(rootHex, sealed.keyVersion),
      iv,
    );
    decipher.setAAD(aad(context, sealed.keyVersion));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");
  }
}
