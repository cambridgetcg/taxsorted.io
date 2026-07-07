// webauthn.ts is pure helper plumbing for the passkey account routes (Tasks
// 7-9): recovery codes, the durable MFA factor-reference hash, and the
// short-lived WebAuthn ceremony challenge store. No Postgres, no network —
// the `sql` parameter is a bare template-tag function here, string-matched
// against the exact statements the module emits (the same fake-sql pattern
// session.test.ts uses), so these tests exercise the real functions directly
// with no doMock plumbing.

import { describe, it, expect } from "vitest";
import {
  mintRecoveryCodes,
  hashRecoveryCode,
  mfaFactorRef,
  putChallenge,
  consumeChallenge,
  type ChallengeRow,
} from "../webauthn.js";

const SID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

describe("mintRecoveryCodes — shape and entropy", () => {
  it("mints 10 codes and 10 hashes by default", () => {
    const { codes, hashes } = mintRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(hashes).toHaveLength(10);
  });

  it("mints n codes when n is given", () => {
    const { codes, hashes } = mintRecoveryCodes(3);
    expect(codes).toHaveLength(3);
    expect(hashes).toHaveLength(3);
  });

  it("every code is lowercase base32 (a-z2-7), dash-grouped in 4s, ~26 chars of content", () => {
    const { codes } = mintRecoveryCodes(5);
    for (const code of codes) {
      expect(code).toMatch(/^[a-z2-7]{4}(-[a-z2-7]{4})*(-[a-z2-7]{1,4})?$/);
      const groups = code.split("-");
      for (const g of groups.slice(0, -1)) expect(g).toHaveLength(4);
      const content = code.replace(/-/g, "");
      expect(content).toHaveLength(26);
    }
  });

  it("every code is distinct and every hash is distinct", () => {
    const { codes, hashes } = mintRecoveryCodes(10);
    expect(new Set(codes).size).toBe(10);
    expect(new Set(hashes).size).toBe(10);
  });

  it("hashes[i] equals hashRecoveryCode(codes[i]) for every i", () => {
    const { codes, hashes } = mintRecoveryCodes(10);
    codes.forEach((code, i) => {
      expect(hashRecoveryCode(code)).toBe(hashes[i]);
    });
  });
});

describe("hashRecoveryCode — normalise round-trip", () => {
  it("is a 64-char lowercase hex sha256 digest", () => {
    const { codes, hashes } = mintRecoveryCodes(1);
    expect(hashes[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRecoveryCode(codes[0])).toMatch(/^[0-9a-f]{64}$/);
  });

  it("dashes, spaces, and case never change the hash", () => {
    const { codes, hashes } = mintRecoveryCodes(1);
    const pretty = codes[0];
    const noDashes = pretty.replace(/-/g, "");
    const withSpaces = noDashes.replace(/(.{4})/g, "$1 ").trim();
    const upper = pretty.toUpperCase();
    const mixedMess = ` ${upper.replace(/-/g, " - ")} `;

    expect(hashRecoveryCode(noDashes)).toBe(hashes[0]);
    expect(hashRecoveryCode(withSpaces)).toBe(hashes[0]);
    expect(hashRecoveryCode(upper)).toBe(hashes[0]);
    expect(hashRecoveryCode(mixedMess)).toBe(hashes[0]);
  });
});

describe("mfaFactorRef — the forever hash", () => {
  it("matches a fixed test vector (computed once, pinned literally)", () => {
    // sha256hex('taxsorted-mfa-v1:test-credential-id'), computed once via
    // node:crypto and pinned here — this is the "never changes" contract.
    expect(mfaFactorRef("test-credential-id")).toBe(
      "42455df77e69505cb178abfb0c31e36e3783f7eb3e59c770f5af97d5d35f1fe1"
    );
  });

  it("is deterministic — same credentialId, same hash, every call", () => {
    const id = "some-credential-id-xyz";
    expect(mfaFactorRef(id)).toBe(mfaFactorRef(id));
  });

  it("differs across credentialIds", () => {
    expect(mfaFactorRef("credential-a")).not.toBe(mfaFactorRef("credential-b"));
  });
});

// ---- putChallenge / consumeChallenge ---------------------------------------

type FakeRow = {
  session_id: string;
  challenge: string;
  kind: string;
  webauthn_user_id: string | null;
  user_name: string | null;
  expires_at: Date;
};

/** Fake postgres for putChallenge: string-matches the upsert and the
    opportunistic GC delete, keeping a one-row-per-session table in memory so
    "second call for the same session replaces the row" is a real assertion,
    not just a call count. */
function fakePutChallengeDb(opts: { failUpsert?: boolean; failGc?: boolean } = {}) {
  const calls = { upsert: 0, gc: 0 };
  const rows: FakeRow[] = [];
  function sql(strings: TemplateStringsArray, ...values: unknown[]) {
    const text = strings.join("?").toLowerCase();
    if (text.includes("insert into webauthn_challenges") && text.includes("on conflict")) {
      calls.upsert++;
      if (opts.failUpsert) return Promise.reject(new Error("upsert failed"));
      const [sessionId, challenge, kind, webauthnUserId, userName] = values as [
        string,
        string,
        string,
        string | null,
        string | null,
      ];
      const row: FakeRow = {
        session_id: sessionId,
        challenge,
        kind,
        webauthn_user_id: webauthnUserId,
        user_name: userName,
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      };
      const existing = rows.findIndex((r) => r.session_id === sessionId);
      if (existing >= 0) rows[existing] = row;
      else rows.push(row);
      return Promise.resolve([row]);
    }
    if (text.includes("delete from webauthn_challenges") && text.includes("expires_at < now()")) {
      calls.gc++;
      if (opts.failGc) return Promise.reject(new Error("gc failed"));
      return Promise.resolve([]);
    }
    throw new Error(`fakePutChallengeDb: unrecognized query — ${text}`);
  }
  return { sql, calls, rows };
}

describe("putChallenge — upsert + fresh challenge + opportunistic GC", () => {
  it("returns a fresh base64url challenge decoding to at least 32 bytes", async () => {
    const { sql } = fakePutChallengeDb();
    const challenge = await putChallenge(sql, SID, "registration");
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(challenge, "base64url").length).toBeGreaterThanOrEqual(32);
  });

  it("two calls mint two distinct challenges", async () => {
    const { sql } = fakePutChallengeDb();
    const a = await putChallenge(sql, SID, "registration");
    const b = await putChallenge(sql, SID, "registration");
    expect(a).not.toBe(b);
  });

  it("second call for the same session replaces the row (one row, latest kind wins)", async () => {
    const { sql, rows, calls } = fakePutChallengeDb();
    await putChallenge(sql, SID, "registration", { userName: "Ada" });
    await putChallenge(sql, SID, "authentication");
    expect(calls.upsert).toBe(2);
    expect(rows).toHaveLength(1);
    expect(rows[0].session_id).toBe(SID);
    expect(rows[0].kind).toBe("authentication");
  });

  it("carries webauthnUserId/userName through to the upsert when given", async () => {
    const { sql, rows } = fakePutChallengeDb();
    await putChallenge(sql, SID, "registration", {
      webauthnUserId: "wau-123",
      userName: "Grace Hopper",
    });
    expect(rows[0].webauthn_user_id).toBe("wau-123");
    expect(rows[0].user_name).toBe("Grace Hopper");
  });

  it("fires the opportunistic GC delete alongside the upsert", async () => {
    const { sql, calls } = fakePutChallengeDb();
    await putChallenge(sql, SID, "registration");
    expect(calls.gc).toBe(1);
  });

  it("GC failure does not break the put — it still resolves with a fresh challenge", async () => {
    const { sql } = fakePutChallengeDb({ failGc: true });
    await expect(putChallenge(sql, SID, "registration")).resolves.toEqual(expect.any(String));
  });

  it("the upsert itself is NOT swallowed — its failure rejects putChallenge", async () => {
    const { sql } = fakePutChallengeDb({ failUpsert: true });
    await expect(putChallenge(sql, SID, "registration")).rejects.toThrow("upsert failed");
  });
});

describe("consumeChallenge — atomic single-use delete", () => {
  /** Fake postgres for consumeChallenge: a real delete-with-condition — only
      splices the row out of the in-memory table when session_id, kind, AND
      expires_at > now() all match, exactly mirroring what the real
      `delete ... returning` can and can't see. */
  function fakeConsumeDb(initial: FakeRow[]) {
    const rows = [...initial];
    function sql(strings: TemplateStringsArray, ...values: unknown[]) {
      const text = strings.join("?").toLowerCase();
      if (text.includes("delete from webauthn_challenges") && text.includes("returning")) {
        const [sessionId, kind] = values as [string, string];
        const idx = rows.findIndex(
          (r) => r.session_id === sessionId && r.kind === kind && r.expires_at.getTime() > Date.now()
        );
        if (idx === -1) return Promise.resolve([]);
        const [row] = rows.splice(idx, 1);
        return Promise.resolve([row]);
      }
      throw new Error(`fakeConsumeDb: unrecognized query — ${text}`);
    }
    return { sql, rows };
  }

  const freshRow: FakeRow = {
    session_id: SID,
    challenge: "chal-fresh",
    kind: "registration",
    webauthn_user_id: null,
    user_name: null,
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
  };

  it("returns the row once, then null on a second call (single-use)", async () => {
    const { sql } = fakeConsumeDb([freshRow]);
    const first = (await consumeChallenge(sql, SID, "registration")) as ChallengeRow;
    expect(first).not.toBeNull();
    expect(first.challenge).toBe("chal-fresh");

    const second = await consumeChallenge(sql, SID, "registration");
    expect(second).toBeNull();
  });

  it("an expired row is not returned (and is left in place, untouched)", async () => {
    const expired: FakeRow = { ...freshRow, expires_at: new Date(Date.now() - 1000) };
    const { sql, rows } = fakeConsumeDb([expired]);

    const result = await consumeChallenge(sql, SID, "registration");

    expect(result).toBeNull();
    expect(rows).toHaveLength(1);
  });

  it("wrong kind does not match a fresh row for the same session", async () => {
    const { sql } = fakeConsumeDb([freshRow]);
    const result = await consumeChallenge(sql, SID, "authentication");
    expect(result).toBeNull();
  });
});
