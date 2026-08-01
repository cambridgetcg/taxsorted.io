-- 007_accounting_connectors.sql — the local-first accounting connector spine.
--
-- This migration stores permission, selected-organisation and sync progress
-- metadata only. Provider record bodies belong in the browser replica and are
-- deliberately absent from every table below. The first adapter is synthetic:
-- it has no OAuth code, token, credential, network call or customer data.

-- A long-lived provider grant belongs to a passkey-backed account, never an
-- anonymous browser session. The composite key lets source connections prove
-- that their entity and authorisation have the same owner.
alter table entities
  add constraint entities_id_user_id_key unique (id, user_id);

create table accounting_authorisations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (
    provider in ('synthetic', 'xero', 'quickbooks', 'freeagent', 'sage-accounting-uk')
  ),
  provider_environment text not null check (
    provider_environment in ('sandbox', 'production')
  ),
  provider_subject_id text not null,
  status text not null check (
    status in ('active', 'reauthorisation-required', 'revoked', 'failed')
  ),
  granted_scopes text[] not null default '{}',
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  revoked_at timestamptz,
  unique (user_id, provider, provider_environment, provider_subject_id),
  unique (id, user_id)
);
create index accounting_authorisations_user_idx
  on accounting_authorisations(user_id, created_at);

create table accounting_source_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  authorisation_id uuid not null,
  entity_id uuid not null,
  provider_organisation_id text not null,
  organisation_name text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  status text not null default 'active' check (
    status in ('active', 'paused', 'disconnected')
  ),
  dirty_generation bigint not null default 0 check (dirty_generation >= 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (authorisation_id, user_id)
    references accounting_authorisations(id, user_id) on delete cascade,
  foreign key (entity_id, user_id)
    references entities(id, user_id) on delete cascade,
  unique (authorisation_id, provider_organisation_id),
  unique (id, user_id)
);
create index accounting_source_connections_user_idx
  on accounting_source_connections(user_id, created_at);

create table accounting_sync_replicas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source_connection_id uuid not null,
  -- Bound to the host-only ts_device cookie. A second browser signed into the
  -- same account cannot borrow or clone this replica's checkpoint.
  device_id uuid not null,
  -- Generated and kept with the browser's local ledger. If IndexedDB is
  -- cleared while the device cookie survives, a new local ID creates a fresh
  -- server replica instead of inheriting a checkpoint for records now absent.
  local_replica_id uuid not null,
  status text not null default 'active' check (status in ('active', 'retired')),
  next_fence bigint not null default 0 check (next_fence >= 0),
  created_at timestamptz not null default clock_timestamp(),
  retired_at timestamptz,
  foreign key (source_connection_id, user_id)
    references accounting_source_connections(id, user_id) on delete cascade,
  unique (id, source_connection_id),
  unique (source_connection_id, device_id, local_replica_id)
);

create table accounting_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_connection_id uuid not null references accounting_source_connections(id) on delete cascade,
  replica_id uuid not null,
  dataset text not null,
  kind text not null check (kind in ('initial', 'incremental', 'repair', 'pre-filing')),
  status text not null default 'active' check (
    status in ('active', 'completed', 'cancelled', 'expired', 'failed')
  ),
  fence bigint not null check (fence > 0),
  lease_expires_at timestamptz not null,
  base_cursor text,
  staged_cursor text,
  staged_coverage_marker text,
  next_sequence integer not null default 0 check (next_sequence >= 0),
  acknowledged_page_count integer not null default 0 check (acknowledged_page_count >= 0),
  acknowledged_record_count bigint not null default 0 check (acknowledged_record_count >= 0),
  started_dirty_generation bigint not null check (started_dirty_generation >= 0),
  started_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  foreign key (replica_id, source_connection_id)
    references accounting_sync_replicas(id, source_connection_id) on delete cascade,
  unique (id, dataset),
  unique (id, replica_id, dataset)
);
create unique index accounting_one_active_run_per_replica
  on accounting_sync_runs(replica_id)
  where status = 'active';
create index accounting_sync_runs_replica_idx
  on accounting_sync_runs(replica_id, started_at desc);

create table accounting_page_manifests (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  dataset text not null,
  sequence integer not null check (sequence >= 0),
  fence bigint not null check (fence > 0),
  page_digest text not null check (page_digest ~ '^sha256:[0-9a-f]{64}$'),
  record_count integer not null check (record_count >= 0),
  current_cursor text,
  next_cursor text not null check (length(next_cursor) > 0),
  is_final boolean not null,
  coverage_marker text,
  expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  acknowledged_at timestamptz,
  foreign key (run_id, dataset)
    references accounting_sync_runs(id, dataset) on delete cascade,
  unique (run_id, sequence),
  check (is_final = (coverage_marker is not null)),
  check (coverage_marker is null or length(coverage_marker) > 0)
);
create index accounting_page_manifests_run_idx
  on accounting_page_manifests(run_id, sequence);

create table accounting_dataset_checkpoints (
  replica_id uuid not null references accounting_sync_replicas(id) on delete cascade,
  dataset text not null,
  completed_run_id uuid not null,
  committed_cursor text not null check (length(committed_cursor) > 0),
  committed_coverage_marker text not null check (length(committed_coverage_marker) > 0),
  committed_dirty_generation bigint not null check (committed_dirty_generation >= 0),
  page_count integer not null check (page_count >= 0),
  record_count bigint not null check (record_count >= 0),
  completed_at timestamptz not null,
  foreign key (completed_run_id, replica_id, dataset)
    references accounting_sync_runs(id, replica_id, dataset) on delete restrict,
  primary key (replica_id, dataset)
);
