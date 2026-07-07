-- 005_accounts.sql — passkey accounts (plan C).
-- Plain words: an account is a set of passkeys, nothing else — no email, no
-- password, no personal details. Entities belong to the browser session that
-- made them until they are claimed into an account; claiming clears
-- session_id, so deleting a session row can never cascade away claimed
-- entities or their receipts. Exactly one owner, always.

create table users (
  id uuid primary key default gen_random_uuid(),
  -- Opaque base64url handle authenticators store; reused for every passkey
  -- this account adds so devices overwrite instead of duplicating. No PII.
  webauthn_user_id text not null unique,
  -- Only what the passkey picker shows. Not unique, not an identifier.
  name text not null default 'TaxSorted user',
  created_at timestamptz not null default now()
);

create table passkeys (
  -- The credential id, base64url — the lookup key at sign-in.
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  public_key bytea not null,
  -- Signature counter. The library hard-fails a regression only when the
  -- stored counter is above zero (always-zero providers like iCloud never
  -- trip it) — that is the clone signal, kept deliberately.
  counter bigint not null default 0,
  transports text[],
  nickname text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index passkeys_user_idx on passkeys(user_id);

create table recovery_codes (
  -- sha256 hex of a single-use ~128-bit random code. High entropy makes a
  -- fast hash safe (random tokens, not human passwords). Shown exactly once.
  code_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index recovery_codes_user_idx on recovery_codes(user_id);

-- One in-flight WebAuthn challenge per browser session: short-lived,
-- single-use (consumed atomically with delete ... returning at verify).
-- For a brand-new account the pending handle + name live here, so no user
-- row exists until a ceremony actually succeeds.
create table webauthn_challenges (
  session_id uuid primary key references sessions(id) on delete cascade,
  challenge text not null,
  kind text not null check (kind in ('registration', 'authentication')),
  webauthn_user_id text,
  user_name text,
  expires_at timestamptz not null
);

-- A session can now be signed in. Signing out clears these columns.
alter table sessions add column user_id uuid references users(id) on delete cascade;
alter table sessions add column signed_in_at timestamptz;
-- Time of the last successful passkey prompt on THIS session — feeds the
-- Gov-Client-Multi-Factor timestamp. Never set by recovery-code sign-ins.
alter table sessions add column mfa_at timestamptz;
-- Salted-and-hashed credential id of the passkey that asserted — feeds the
-- header's unique-reference AND lets deleting that passkey sign out every
-- session it opened. Same hash function, forever.
alter table sessions add column mfa_factor_ref text;
create index sessions_user_idx on sessions(user_id);
create index sessions_mfa_ref_idx on sessions(mfa_factor_ref);

-- Entities get exactly one owner: a session (anonymous) or a user (claimed).
alter table entities alter column session_id drop not null;
alter table entities add column user_id uuid references users(id) on delete cascade;
alter table entities add constraint entities_one_owner
  check (session_id is not null or user_id is not null);
create index entities_user_idx on entities(user_id);
