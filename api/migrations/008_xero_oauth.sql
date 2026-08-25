-- 008_xero_oauth.sql — a bounded, read-only Xero authorisation foundation.
--
-- Pending browser attempts are short-lived; an exchanging attempt is a
-- one-time provider-operation owner until explicit completion or incident
-- recovery. Provider tokens are encrypted by the application with
-- context-bound, versioned keys. This migration stores connector identity and
-- lifecycle metadata, never accounting record bodies.

-- Composite references below prove that a token or source binding describes
-- the same provider and environment as its long-lived authorisation.
alter table users
  add column xero_lifecycle_generation bigint not null default 0 check (
    xero_lifecycle_generation >= 0
  );

alter table accounting_authorisations
  add column lifecycle_generation bigint not null default 1 check (
    lifecycle_generation > 0
  ),
  add constraint accounting_authorisations_id_provider_environment_key
  unique (id, provider, provider_environment);

alter table accounting_authorisations
  add constraint accounting_authorisations_xero_environment_check
  check (provider <> 'xero' or provider_environment = 'production');

-- The pilot admits one live Xero identity per passkey account. A revoked or
-- reauthorisation-required row remains as history and does not block a new one.
create unique index accounting_one_active_xero_authorisation_per_user
  on accounting_authorisations(user_id)
  where provider = 'xero'
    and provider_environment = 'production'
    and status = 'active';

-- Xero token sets belong to the Xero user + app pair, not merely a local
-- TaxSorted account. One Xero subject therefore has one permanent local owner.
create unique index accounting_one_owner_per_xero_subject
  on accounting_authorisations(
    provider,
    provider_environment,
    provider_subject_id
  )
  where provider = 'xero' and provider_environment = 'production';

create table accounting_oauth_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  -- This is deliberately a separate reference from user_id. Signing out clears
  -- sessions.user_id, so a composite session/user reference would break logout.
  session_id uuid not null references sessions(id) on delete cascade,
  provider text not null check (provider = 'xero'),
  provider_environment text not null check (provider_environment = 'production'),
  oauth_state_hash text not null unique check (
    oauth_state_hash ~ '^[0-9a-f]{64}$'
  ),
  oauth_state_ciphertext text not null check (
    oauth_state_ciphertext ~ '^atsv1\.[A-Za-z0-9_-]+$'
  ),
  oidc_nonce_hash text not null unique check (
    oidc_nonce_hash ~ '^[0-9a-f]{64}$'
  ),
  oidc_nonce_ciphertext text not null check (
    oidc_nonce_ciphertext ~ '^atsv1\.[A-Za-z0-9_-]+$'
  ),
  pkce_verifier_ciphertext text not null check (
    pkce_verifier_ciphertext ~ '^atsv1\.[A-Za-z0-9_-]+$'
  ),
  key_version integer not null check (key_version > 0),
  user_lifecycle_generation bigint not null check (
    user_lifecycle_generation >= 0
  ),
  requested_scopes text[] not null check (cardinality(requested_scopes) > 0),
  status text not null default 'pending' check (
    status in ('pending', 'exchanging', 'denied', 'failed', 'completed')
  ),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique (id, user_id, session_id),
  check (expires_at > created_at),
  check (
    (status = 'pending' and consumed_at is null and finished_at is null)
    or
    (status = 'exchanging' and consumed_at is not null and finished_at is null)
    or
    (
      status in ('denied', 'failed', 'completed')
      and consumed_at is not null
      and finished_at is not null
    )
  )
);
create index accounting_oauth_attempts_user_created_idx
  on accounting_oauth_attempts(user_id, created_at desc);
create index accounting_oauth_attempts_pending_expiry_idx
  on accounting_oauth_attempts(expires_at)
  where status = 'pending';
create unique index accounting_one_open_xero_attempt_per_user
  on accounting_oauth_attempts(user_id, provider, provider_environment)
  where status in ('pending', 'exchanging');

-- Before a callback returns its OpenID subject, a timed-out provider mutation
-- cannot be attributed to one local user. The private pilot therefore owns one
-- durable, app-wide Xero mutation at a time. A deadline is telemetry only; an
-- ambiguous owner remains until explicit incident reconciliation.
create table accounting_xero_operation_fence (
  singleton boolean primary key default true check (singleton),
  operation_id uuid,
  operation_kind text check (
    operation_kind in (
      'callback-exchange',
      'token-refresh',
      'authorisation-revoke',
      'source-disconnect'
    )
  ),
  user_id uuid,
  authorisation_id uuid,
  source_connection_id uuid,
  started_at timestamptz,
  deadline_at timestamptz,
  check (
    (
      operation_id is null
      and operation_kind is null
      and user_id is null
      and authorisation_id is null
      and source_connection_id is null
      and started_at is null
      and deadline_at is null
    )
    or
    (
      operation_id is not null
      and operation_kind is not null
      and user_id is not null
      and started_at is not null
      and deadline_at is not null
    )
  ),
  check (
    operation_id is null
    or (
      operation_kind = 'callback-exchange'
      and authorisation_id is null
      and source_connection_id is null
    )
    or (
      operation_kind in ('token-refresh', 'authorisation-revoke')
      and authorisation_id is not null
      and source_connection_id is null
    )
    or (
      operation_kind = 'source-disconnect'
      and authorisation_id is not null
      and source_connection_id is not null
    )
  )
);
insert into accounting_xero_operation_fence (singleton) values (true);

create table accounting_provider_token_sets (
  authorisation_id uuid primary key,
  provider text not null check (
    provider in ('xero', 'quickbooks', 'freeagent', 'sage-accounting-uk')
  ),
  provider_environment text not null check (
    provider_environment in ('sandbox', 'production')
  ),
  access_token_ciphertext text not null check (
    access_token_ciphertext ~ '^atsv1\.[A-Za-z0-9_-]+$'
  ),
  refresh_token_ciphertext text not null check (
    refresh_token_ciphertext ~ '^atsv1\.[A-Za-z0-9_-]+$'
  ),
  key_version integer not null check (key_version > 0),
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  -- A generation and ownership lock make refresh a compare-and-swap operation.
  -- The timestamp is incident telemetry, not permission to steal the lock.
  -- No database transaction needs to remain open during the provider request.
  token_generation bigint not null default 1 check (token_generation > 0),
  refresh_lock_id uuid,
  refresh_lock_expires_at timestamptz,
  last_refresh_attempt_at timestamptz,
  last_refresh_error_code text check (
    last_refresh_error_code is null or length(last_refresh_error_code) <= 120
  ),
  revocation_requested_at timestamptz,
  revocation_confirmed_at timestamptz,
  revocation_lock_id uuid,
  revocation_lock_expires_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (authorisation_id, provider, provider_environment)
    references accounting_authorisations(id, provider, provider_environment)
    on delete cascade,
  check (
    (refresh_lock_id is null) = (refresh_lock_expires_at is null)
  ),
  check (
    refresh_lock_id is null or last_refresh_attempt_at is not null
  ),
  check (
    revocation_confirmed_at is null or revocation_requested_at is not null
  ),
  check (
    (revocation_lock_id is null) = (revocation_lock_expires_at is null)
  ),
  check (
    revocation_lock_id is null or revocation_requested_at is not null
  ),
  check (
    revocation_confirmed_at is null or revocation_lock_id is null
  )
);
create index accounting_provider_token_refresh_lock_telemetry_idx
  on accounting_provider_token_sets(refresh_lock_expires_at)
  where refresh_lock_id is not null;
create index accounting_provider_token_revocation_lock_telemetry_idx
  on accounting_provider_token_sets(revocation_lock_expires_at)
  where revocation_lock_id is not null;

-- A source stores the provider-side connection separately from the tenant. The
-- browser chooses only the offered tenant; the server resolves this binding.
alter table accounting_source_connections
  add column provider text,
  add column provider_environment text,
  add column provider_connection_id text,
  add column disconnected_at timestamptz,
  add column provider_disconnected_at timestamptz,
  add column provider_disconnect_lock_id uuid,
  add column provider_disconnect_lock_expires_at timestamptz;

update accounting_source_connections as source
set provider = authorisation.provider,
    provider_environment = authorisation.provider_environment
from accounting_authorisations as authorisation
where authorisation.id = source.authorisation_id;

update accounting_source_connections
set disconnected_at = updated_at
where status = 'disconnected' and disconnected_at is null;

alter table accounting_source_connections
  alter column provider set not null,
  alter column provider_environment set not null,
  add constraint accounting_source_connections_provider_check check (
    provider in ('synthetic', 'xero', 'quickbooks', 'freeagent', 'sage-accounting-uk')
  ),
  add constraint accounting_source_connections_environment_check check (
    provider_environment in ('sandbox', 'production')
  ),
  add constraint accounting_source_connections_authorisation_provider_fk
    foreign key (authorisation_id, provider, provider_environment)
    references accounting_authorisations(id, provider, provider_environment)
    on delete cascade,
  add constraint accounting_source_connections_xero_binding_check check (
    provider <> 'xero'
    or (
      provider_organisation_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and provider_connection_id is not null
      and provider_connection_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
  ),
  add constraint accounting_source_connections_disconnected_time_check check (
    (status = 'disconnected') = (disconnected_at is not null)
  ),
  add constraint accounting_source_connections_provider_disconnected_check check (
    provider_disconnected_at is null or disconnected_at is not null
  ),
  add constraint accounting_source_connections_disconnect_lock_pair_check check (
    (provider_disconnect_lock_id is null) =
      (provider_disconnect_lock_expires_at is null)
  ),
  add constraint accounting_source_connections_disconnect_lock_state_check check (
    provider_disconnect_lock_id is null
    or (
      provider = 'xero'
      and disconnected_at is not null
      and provider_disconnected_at is null
    )
  );

create index accounting_source_disconnect_lock_telemetry_idx
  on accounting_source_connections(provider_disconnect_lock_expires_at)
  where provider_disconnect_lock_id is not null;

create unique index accounting_source_provider_connection_unique
  on accounting_source_connections(provider, provider_connection_id)
  where provider_connection_id is not null;

create unique index accounting_one_live_source_per_provider_organisation
  on accounting_source_connections(
    user_id,
    provider,
    provider_environment,
    provider_organisation_id
  )
  where status in ('active', 'paused');
