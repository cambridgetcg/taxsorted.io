import { describe, expect, it } from "vitest";
import {
  AccountingTokenVault,
  type AccountingSecretContext,
} from "../accounting-token-vault.js";

const FIRST_KEY = "a".repeat(64);
const SECOND_KEY = "b".repeat(64);
const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

const context: AccountingSecretContext = {
  provider: "xero",
  environment: "production",
  recordType: "oauth-attempt",
  recordId: ATTEMPT_ID,
  field: "pkce-code-verifier",
};

function vault(
  activeVersion = 1,
  keys: ReadonlyMap<number, string> = new Map([[1, FIRST_KEY]]),
) {
  return new AccountingTokenVault({ activeVersion, keys });
}

describe("accounting token vault", () => {
  it("round-trips with the active version and a fresh IV", () => {
    const tokenVault = vault();
    const first = tokenVault.seal("secret-verifier", context);
    const second = tokenVault.seal("secret-verifier", context);

    expect(first.keyVersion).toBe(1);
    expect(first.ciphertext).toMatch(/^atsv1\.[A-Za-z0-9_-]+$/u);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(tokenVault.open(first, context)).toBe("secret-verifier");
  });

  it.each([
    ["provider", { ...context, provider: "quickbooks" }],
    ["environment", { ...context, environment: "sandbox" as const }],
    [
      "record type",
      { ...context, recordType: "provider-token-set" as const },
    ],
    ["record id", { ...context, recordId: OTHER_ID }],
    ["field", { ...context, field: "oidc-nonce" as const }],
  ])("binds ciphertext to its %s", (_label, changedContext) => {
    const tokenVault = vault();
    const sealed = tokenVault.seal("secret-verifier", context);

    expect(() => tokenVault.open(sealed, changedContext)).toThrow();
  });

  it("separates all three encrypted OAuth-attempt fields", () => {
    const tokenVault = vault();
    const stateContext: AccountingSecretContext = {
      ...context,
      field: "oauth-state",
    };
    const nonceContext: AccountingSecretContext = {
      ...context,
      field: "oidc-nonce",
    };
    const sealedState = tokenVault.seal("raw-oauth-state", stateContext);
    const sealedNonce = tokenVault.seal("raw-oidc-nonce", nonceContext);

    expect(tokenVault.open(sealedState, stateContext)).toBe("raw-oauth-state");
    expect(tokenVault.open(sealedNonce, nonceContext)).toBe("raw-oidc-nonce");
    expect(() => tokenVault.open(sealedState, nonceContext)).toThrow();
    expect(() => tokenVault.open(sealedNonce, context)).toThrow();
  });

  it("opens an old version during rotation and seals only with the active key", () => {
    const oldVault = vault();
    const oldSecret = oldVault.seal("old-refresh-token", {
      ...context,
      recordType: "provider-token-set",
      field: "refresh-token",
    });
    const rotatedVault = vault(
      2,
      new Map([
        [1, FIRST_KEY],
        [2, SECOND_KEY],
      ]),
    );

    expect(
      rotatedVault.open(oldSecret, {
        ...context,
        recordType: "provider-token-set",
        field: "refresh-token",
      }),
    ).toBe("old-refresh-token");

    const newSecret = rotatedVault.seal("new-refresh-token", {
      ...context,
      recordType: "provider-token-set",
      field: "refresh-token",
    });
    expect(newSecret.keyVersion).toBe(2);
    expect(() =>
      oldVault.open(newSecret, {
        ...context,
        recordType: "provider-token-set",
        field: "refresh-token",
      }),
    ).toThrow(/key version/iu);
  });

  it("rejects key-version substitution and ciphertext tampering", () => {
    const tokenVault = vault(
      1,
      new Map([
        [1, FIRST_KEY],
        [2, SECOND_KEY],
      ]),
    );
    const sealed = tokenVault.seal("access-token", context);
    expect(() =>
      tokenVault.open({ ...sealed, keyVersion: 2 }, context),
    ).toThrow();

    const [prefix, encoded] = sealed.ciphertext.split(".");
    const payload = Buffer.from(encoded, "base64url");
    payload[payload.length - 1] ^= 0xff;
    expect(() =>
      tokenVault.open(
        { ...sealed, ciphertext: `${prefix}.${payload.toString("base64url")}` },
        context,
      ),
    ).toThrow();
  });

  it("rejects invalid rings, malformed records and empty secrets", () => {
    expect(() => vault(2)).toThrow(/active key/iu);
    expect(() => vault(1, new Map([[1, "short"]]))).toThrow(/invalid key/iu);

    const tokenVault = vault();
    expect(() => tokenVault.seal("", context)).toThrow(/cannot be empty/iu);
    expect(() =>
      tokenVault.seal("secret", { ...context, recordId: "not-a-uuid" }),
    ).toThrow(/record id/iu);
    expect(() =>
      tokenVault.open(
        { ciphertext: "atsv1.not+base64url", keyVersion: 1 },
        context,
      ),
    ).toThrow(/malformed/iu);
  });
});
