// Passkey account primitives: recovery codes, the durable MFA
// factor-reference hash, and the short-lived WebAuthn ceremony challenge
// store. Plain crypto in, plain rows out — the account routes (Tasks 7-9)
// import these rather than re-deriving them.

import { createHash, randomBytes } from "node:crypto";

// RFC 4648 base32 alphabet, no padding — every code is a fixed length so
// padding would only add characters a person has to type back for nothing.
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

// Groups of 4 for a person to read out or type back — "abcd-efgh-...".
// Purely cosmetic: normalise() strips the dashes straight back out before
// hashing, so grouping never affects the stored hash.
function group(s: string, size = 4): string {
  const parts: string[] = [];
  for (let i = 0; i < s.length; i += size) parts.push(s.slice(i, i + size));
  return parts.join("-");
}

// A recovery code is ~128 bits of randomness, never a human-chosen password,
// so a single fast hash is the right trade — no per-code salt needed, and
// redemption stays a plain equality lookup on the hash.
function normalise(code: string): string {
  return code.replace(/[\s-]/g, "").toLowerCase();
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalise(code)).digest("hex");
}

export function mintRecoveryCodes(n = 10): { codes: string[]; hashes: string[] } {
  const codes: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < n; i++) {
    // 16 random bytes = 128 bits → 26 base32 characters, lowercased for
    // display (we pick lowercase and are consistent about it everywhere).
    const pretty = group(base32Encode(randomBytes(16)).toLowerCase());
    codes.push(pretty);
    hashes.push(hashRecoveryCode(pretty));
  }
  return { codes, hashes };
}

// This hash — this exact salt string, this exact algorithm — can NEVER
// change. Every signed-in session persists its output as mfa_factor_ref:
// the Gov-Client-Multi-Factor fraud header's unique-reference is read
// straight off that column, and deleting a passkey finds every session it
// opened by matching this same hash again. Changing the salt or the
// function would silently orphan every session already signed in and break
// the revocation join — if this ever must change, it needs a data
// migration, not a code edit.
export function mfaFactorRef(credentialId: string): string {
  return createHash("sha256").update(`taxsorted-mfa-v1:${credentialId}`).digest("hex");
}

// ---- WebAuthn ceremony challenges ------------------------------------------

export type ChallengeKind = "registration" | "authentication";

export interface PutChallengeOpts {
  webauthnUserId?: string;
  userName?: string;
}

export interface ChallengeRow {
  session_id: string;
  challenge: string;
  kind: ChallengeKind;
  webauthn_user_id: string | null;
  user_name: string | null;
  expires_at: string | Date;
}

// postgres.js's tagged-template call signature is a generically-overloaded
// "query helper or template tag" union (see ISql in the postgres package)
// that plain TypeScript function types can't mirror exactly without forcing
// every caller — including test fakes — to satisfy the whole driver
// interface. This is the minimal shape every caller actually needs: call it
// as a template tag, get rows back. The real driver and a bare fake function
// both satisfy it with no cast.
interface SqlTag {
  (strings: TemplateStringsArray, ...values: any[]): Promise<any[]>;
}

/** Stash (or replace) this session's in-flight WebAuthn challenge and return
    the fresh challenge string. One row per session (PK session_id) — a
    second ceremony starting before the first finishes simply replaces it, so
    only the most recent challenge is ever valid. Also fires an opportunistic
    sweep of expired rows alongside the upsert; that sweep's own failure is
    swallowed (it is only housekeeping — the next put or consume tries
    again), but the upsert itself is never swallowed here. */
export async function putChallenge(
  sql: SqlTag,
  sessionId: string,
  kind: ChallengeKind,
  opts: PutChallengeOpts = {}
): Promise<string> {
  const challenge = randomBytes(32).toString("base64url");
  await sql`
    insert into webauthn_challenges (session_id, challenge, kind, webauthn_user_id, user_name, expires_at)
    values (${sessionId}, ${challenge}, ${kind}, ${opts.webauthnUserId ?? null}, ${opts.userName ?? null}, now() + interval '5 minutes')
    on conflict (session_id) do update set
      challenge = excluded.challenge,
      kind = excluded.kind,
      webauthn_user_id = excluded.webauthn_user_id,
      user_name = excluded.user_name,
      expires_at = excluded.expires_at
  `;
  // Opportunistic GC: fired, never awaited, failure swallowed — this request
  // does not depend on it, and it costs nothing to skip when it fails.
  void sql`delete from webauthn_challenges where expires_at < now()`.catch(() => {});
  return challenge;
}

/** Atomically redeem this session's pending challenge of the given kind —
    `delete ... returning` in one round trip, so two concurrent verifies can
    never both succeed against the same challenge. Returns null when there is
    nothing to consume: no challenge was ever put, the kind doesn't match, or
    it has already expired (expiry is enforced by the WHERE clause, not read
    afterwards). */
export async function consumeChallenge(
  sql: SqlTag,
  sessionId: string,
  kind: ChallengeKind
): Promise<ChallengeRow | null> {
  const [row] = await sql`
    delete from webauthn_challenges
    where session_id = ${sessionId} and kind = ${kind} and expires_at > now()
    returning *
  `;
  return (row as ChallengeRow) ?? null;
}
