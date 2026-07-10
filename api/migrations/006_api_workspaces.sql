-- 006_api_workspaces.sql — machine identities for the developer API.
--
-- Browser passkeys own a person's tax records. API keys belong to a workspace
-- and are deliberately separate: a server credential must never inherit a
-- person's browser session or HMRC connection by accident.

create table api_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references api_workspaces(id) on delete cascade,
  name text not null,
  mode text not null check (mode in ('test', 'live')),
  -- SHA-256 of a 32-byte random secret. The plaintext is shown once and never stored.
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  -- Safe identifier for support and revocation; never enough to authenticate.
  key_prefix text not null,
  scopes text[] not null check (cardinality(scopes) > 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index api_keys_workspace_idx on api_keys(workspace_id);
