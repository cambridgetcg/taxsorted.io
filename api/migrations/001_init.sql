-- The data spine, v1: sessions own entities; entities hold one HMRC connection;
-- submissions are immutable receipts. Records/figures arrive in a later migration.

create table sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table entities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  kind text not null check (kind in ('person', 'business', 'charity', 'trust')),
  name text not null,
  vrn text,
  created_at timestamptz not null default now()
);
create index entities_session_idx on entities(session_id);

create table hmrc_connections (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references entities(id) on delete cascade,
  hmrc_env text not null check (hmrc_env in ('sandbox', 'production')),
  access_token_enc text not null,
  refresh_token_enc text not null,
  expires_at timestamptz not null,
  scope text not null,
  connected_at timestamptz not null default now()
);

-- Immutable: rows are only ever inserted. A receipt is a receipt.
create table submissions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  period_key text not null,
  hmrc_env text not null,
  payload jsonb not null,
  receipt jsonb not null,
  correlation_id text,
  submitted_at timestamptz not null default now(),
  unique (entity_id, period_key)
);
create index submissions_entity_idx on submissions(entity_id);
