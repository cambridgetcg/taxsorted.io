import { describe, it, expect } from "vitest";
import { encrypt, decrypt, signState, verifyState } from "../src/crypto.js";

const KEY = "a".repeat(64);
const OTHER_KEY = "b".repeat(64);

describe("token vault", () => {
  it("round-trips a token", () => {
    const token = "very-secret-access-token";
    expect(decrypt(encrypt(token, KEY), KEY)).toBe(token);
  });

  it("produces a different ciphertext every time (fresh IV)", () => {
    expect(encrypt("same", KEY)).not.toBe(encrypt("same", KEY));
  });

  it("refuses the wrong key", () => {
    expect(() => decrypt(encrypt("secret", KEY), OTHER_KEY)).toThrow();
  });

  it("refuses tampered ciphertext", () => {
    const blob = Buffer.from(encrypt("secret", KEY), "base64");
    blob[blob.length - 1] ^= 0xff;
    expect(() => decrypt(blob.toString("base64"), KEY)).toThrow();
  });

  it("refuses a short key", () => {
    expect(() => encrypt("secret", "deadbeef")).toThrow();
  });
});

describe("oauth state", () => {
  it("round-trips and binds the payload", () => {
    const state = signState({ entityId: "e1", sessionId: "s1" }, KEY);
    expect(verifyState(state, KEY)).toMatchObject({ entityId: "e1", sessionId: "s1" });
  });

  it("rejects a forged signature", () => {
    const state = signState({ entityId: "e1" }, KEY);
    expect(verifyState(state, OTHER_KEY)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const [body, sig] = signState({ entityId: "e1" }, KEY).split(".");
    const forged = Buffer.from(
      JSON.stringify({ entityId: "someone-else", exp: Date.now() + 60_000 })
    ).toString("base64url");
    expect(verifyState(`${forged}.${sig}`, KEY)).toBeNull();
    expect(verifyState(`${body}.`, KEY)).toBeNull();
  });

  it("rejects expired state", () => {
    const state = signState({ entityId: "e1" }, KEY, -1);
    expect(verifyState(state, KEY)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verifyState("not-a-state", KEY)).toBeNull();
    expect(verifyState("", KEY)).toBeNull();
  });
});
