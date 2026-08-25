import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migration = await readFile(
  new URL("../../migrations/008_xero_oauth.sql", import.meta.url),
  "utf8",
);

describe("Xero OAuth migration", () => {
  it("makes OAuth attempts one-time and binds them to both user and session", () => {
    expect(migration).toContain("create table accounting_oauth_attempts");
    expect(migration).toContain(
      "user_id uuid not null references users(id) on delete cascade",
    );
    expect(migration).toContain(
      "session_id uuid not null references sessions(id) on delete cascade",
    );
    expect(migration).toContain("oauth_state_hash text not null unique");
    expect(migration).toContain("oauth_state_ciphertext text not null");
    expect(migration).toContain("oidc_nonce_hash text not null unique");
    expect(migration).toContain("oidc_nonce_ciphertext text not null");
    expect(migration).toContain("pkce_verifier_ciphertext text not null");
    expect(migration).toContain("user_lifecycle_generation bigint not null");
    expect(migration).toContain("status = 'pending' and consumed_at is null");
    expect(migration).toContain("unique (id, user_id, session_id)");
    expect(migration).toContain(
      "create unique index accounting_one_open_xero_attempt_per_user",
    );
    expect(migration).toContain("where status in ('pending', 'exchanging')");
    expect(migration).not.toMatch(
      /foreign key \(session_id, user_id\)/iu,
    );
    expect(migration).not.toMatch(/\boauth_state\s+text\b/iu);
    expect(migration).not.toMatch(/\boidc_nonce\s+text\b/iu);
    expect(migration).not.toMatch(/\bpkce_verifier\s+text\b/iu);
  });

  it("stores only versioned ciphertext and refresh compare-and-swap state", () => {
    expect(migration).toContain("create table accounting_xero_operation_fence");
    expect(migration).toContain("operation_id uuid");
    expect(migration).toContain("'callback-exchange'");
    expect(migration).toContain("'token-refresh'");
    expect(migration).toContain("'authorisation-revoke'");
    expect(migration).toContain("'source-disconnect'");
    expect(migration).toContain(
      "insert into accounting_xero_operation_fence (singleton) values (true)",
    );
    expect(migration).toContain("create table accounting_provider_token_sets");
    expect(migration).toContain("access_token_ciphertext text not null");
    expect(migration).toContain("refresh_token_ciphertext text not null");
    expect(migration).toContain("key_version integer not null");
    expect(migration).toContain("token_generation bigint not null default 1");
    expect(migration).toContain("refresh_lock_id uuid");
    expect(migration).toContain("refresh_lock_expires_at timestamptz");
    expect(migration).toContain("revocation_lock_id uuid");
    expect(migration).toContain("revocation_lock_expires_at timestamptz");
    expect(migration).toContain(
      "(refresh_lock_id is null) = (refresh_lock_expires_at is null)",
    );
    expect(migration).toContain(
      "(revocation_lock_id is null) = (revocation_lock_expires_at is null)",
    );
    expect(migration).not.toMatch(
      /\b(?:access_token|refresh_token)\s+text\b/iu,
    );
  });

  it("binds source, authorisation, provider, tenant and provider connection", () => {
    expect(migration).toContain("add column provider_connection_id text");
    expect(migration).toContain(
      "foreign key (authorisation_id, provider, provider_environment)",
    );
    expect(migration).toContain(
      "references accounting_authorisations(id, provider, provider_environment)",
    );
    expect(migration).toContain(
      "create unique index accounting_source_provider_connection_unique",
    );
    expect(migration).toContain(
      "create unique index accounting_one_live_source_per_provider_organisation",
    );
    expect(migration).toContain("provider_disconnect_lock_id uuid");
    expect(migration).toContain(
      "provider_disconnect_lock_expires_at timestamptz",
    );
    expect(migration).toContain(
      "accounting_source_connections_disconnect_lock_pair_check",
    );
    expect(migration).toContain(
      "accounting_source_connections_disconnect_lock_state_check",
    );
  });

  it("binds user and authorisation lifecycles to one permanent Xero-subject owner", () => {
    expect(migration).toContain(
      "add column xero_lifecycle_generation bigint not null default 0",
    );
    expect(migration).toContain(
      "add column lifecycle_generation bigint not null default 1",
    );
    expect(migration).toContain(
      "create unique index accounting_one_active_xero_authorisation_per_user",
    );
    expect(migration).toContain("where provider = 'xero'");
    expect(migration).toContain("and provider_environment = 'production'");
    expect(migration).toContain("and status = 'active'");
    expect(migration).toContain(
      "create unique index accounting_one_owner_per_xero_subject",
    );
    expect(migration).toMatch(
      /on accounting_authorisations\(\s*provider,\s*provider_environment,\s*provider_subject_id\s*\)/u,
    );
  });

  it("uses ordinary transactional migration statements only", () => {
    expect(migration).not.toMatch(/^\s*(?:drop|rename)\b/imu);
    expect(migration).not.toMatch(/\bconcurrently\b/iu);
  });
});
