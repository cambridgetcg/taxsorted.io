// Xero's first boundary is authorisation and deliberate organisation binding.
// It does not implement AccountingProvider, so no Xero financial record can
// enter the page-reader or local-ledger sync protocol in this release.

import { createHash, randomUUID } from "node:crypto";
import {
  AccountingError,
  type AccountingOrganisationDirectory,
  type AccountingSql,
  type AccountingTransaction,
  type ProviderOrganisation,
  type ProviderOrganisationBinding,
} from "./accounting.js";
import { AccountingTokenVault } from "./accounting-token-vault.js";
import {
  XERO_SCOPE,
  XeroOidcError,
  type XeroConnection,
  type XeroInitialTokenSet,
  type XeroOidcClient,
  type XeroTokenSet,
} from "./xero-oidc.js";

export interface XeroFoundationContract {
  startAuthorisation(
    userId: string,
    sessionId: string,
  ): Promise<Record<string, unknown>>;
  completeAuthorisation(
    userId: string,
    sessionId: string,
    callbackSearch: string,
  ): Promise<Record<string, unknown>>;
  disconnectSourceConnection(
    userId: string,
    sourceConnectionId: string,
  ): Promise<Record<string, unknown>>;
  revokeAuthorisation(
    userId: string,
    authorisationId: string,
  ): Promise<Record<string, unknown>>;
}

type XeroClientSource =
  | XeroOidcClient
  | (() => Promise<XeroOidcClient>);

export interface XeroFoundationOptions {
  database: AccountingSql;
  client: XeroClientSource;
  vault: AccountingTokenVault;
  callbackUri: string;
  pilotUserIds: ReadonlySet<string>;
  allowedNonDemoTenantIds: ReadonlySet<string>;
  providerNetworkEnabled?: boolean | (() => boolean);
  now?: () => Date;
  newId?: () => string;
}

interface AttemptRow {
  id: string;
  user_id: string;
  session_id: string;
  oauth_state_hash: string;
  oauth_state_ciphertext: string;
  oidc_nonce_hash: string;
  oidc_nonce_ciphertext: string;
  pkce_verifier_ciphertext: string;
  key_version: number;
  user_lifecycle_generation: number | string;
  requested_scopes: string[];
  expires_at: Date | string;
}

interface AuthorisationIdentityRow {
  id: string;
  user_id?: string;
  provider_subject_id: string;
  status: string;
  lifecycle_generation?: number | string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

interface TokenRow {
  authorisation_id: string;
  user_id?: string;
  access_token_ciphertext: string;
  refresh_token_ciphertext: string;
  key_version: number;
  access_expires_at: Date | string;
  refresh_expires_at: Date | string;
  token_generation: number | string;
  authorisation_generation?: number | string;
  refresh_lock_id?: string | null;
  refresh_lock_active?: boolean;
  revocation_confirmed_at?: Date | string | null;
  revocation_requested_at?: Date | string | null;
  revocation_lock_id?: string | null;
  revocation_lock_expires_at?: Date | string | null;
}

interface SourceDisconnectRow {
  id: string;
  authorisation_id: string;
  provider_connection_id: string;
  status: string;
  dirty_generation: number | string;
  provider_disconnected_at: Date | string | null;
  provider_disconnect_lock_id: string | null;
  provider_disconnect_lock_expires_at: Date | string | null;
}

interface OfferedOrganisation {
  organisation: ProviderOrganisation;
  connection: XeroConnection;
}

type XeroMutationKind =
  | "callback-exchange"
  | "token-refresh"
  | "authorisation-revoke"
  | "source-disconnect";

const ATTEMPT_LIFETIME_MS = 10 * 60 * 1_000;
const ACCESS_EXPIRY_SAFETY_MS = 60 * 1_000;
const REFRESH_LIFETIME_MS = 60 * 24 * 60 * 60 * 1_000;
const REFRESH_LOCK_TELEMETRY_SECONDS = 30;
const REVOCATION_LOCK_TELEMETRY_SECONDS = 30;
const SOURCE_DISCONNECT_LOCK_TELEMETRY_SECONDS = 30;
const GLOBAL_OPERATION_DEADLINE_SECONDS = 30;
const ORGANISATION_CONCURRENCY = 3;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const OAUTH_VALUE = /^[A-Za-z0-9._~-]+$/u;
const XERO_SCOPES = XERO_SCOPE.split(" ");

function one<Row>(
  rows: readonly Row[],
  code: string,
  message: string,
  status: 403 | 404 | 409 | 503,
): Row {
  if (rows.length !== 1) throw new AccountingError(code, message, status);
  return rows[0]!;
}

function date(value: Date | string): Date {
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new AccountingError(
      "invalid_database_state",
      "Stored Xero connection time is invalid.",
      503,
    );
  }
  return parsed;
}

function generation(value: number | string): string {
  const text = String(value);
  if (!/^[1-9]\d*$/u.test(text)) {
    throw new AccountingError(
      "invalid_database_state",
      "Stored Xero token generation is invalid.",
      503,
    );
  }
  return text;
}

function lifecycleGeneration(value: number | string): string {
  const text = String(value);
  if (!/^(0|[1-9]\d*)$/u.test(text)) {
    throw new AccountingError(
      "invalid_database_state",
      "Stored Xero lifecycle generation is invalid.",
      503,
    );
  }
  return text;
}

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function fixedCallbackUri(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Xero callback URI is invalid");
  }
  if (
    url.protocol !== "https:" ||
    url.pathname !== "/v1/accounting/oauth/xero/callback" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("Xero callback URI must be the fixed HTTPS callback door");
  }
  return url.href;
}

function uuid(value: string, label: string): string {
  if (!UUID.test(value)) throw new Error(`Xero ${label} must be a UUID`);
  return value.toLowerCase();
}

function providerSubject(value: string | undefined): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 240 ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new AccountingError(
      "xero_identity_invalid",
      "Xero did not return a safe account identity.",
      503,
    );
  }
  return value;
}

function callbackState(search: string): {
  state: string;
  callbackSearch: string;
  providerDenied: boolean;
} {
  if (search.length < 2 || search.length > 4_096 || !search.startsWith("?")) {
    throw new AccountingError(
      "xero_callback_invalid",
      "The Xero callback could not be verified.",
      409,
    );
  }
  const parameters = new URLSearchParams(search);
  const states = parameters.getAll("state");
  const state = states[0];
  if (
    states.length !== 1 ||
    !state ||
    state.length < 32 ||
    state.length > 256 ||
    !OAUTH_VALUE.test(state)
  ) {
    throw new AccountingError(
      "xero_callback_invalid",
      "The Xero callback could not be verified.",
      409,
    );
  }
  return {
    state,
    callbackSearch: search,
    providerDenied:
      parameters.getAll("error").length === 1 &&
      parameters.get("error") === "access_denied" &&
      !parameters.has("code"),
  };
}

export class XeroFoundationService
  implements XeroFoundationContract, AccountingOrganisationDirectory {
  readonly id = "xero" as const;
  readonly environment = "production" as const;

  private readonly database: AccountingSql;
  private readonly clientSource: XeroClientSource;
  private readonly vault: AccountingTokenVault;
  private readonly callbackUri: string;
  private readonly pilotUserIds: ReadonlySet<string>;
  private readonly allowedNonDemoTenantIds: ReadonlySet<string>;
  private readonly providerNetworkEnabled: boolean | (() => boolean);
  private readonly now: () => Date;
  private readonly newId: () => string;
  private clientPromise: Promise<XeroOidcClient> | undefined;

  constructor(options: XeroFoundationOptions) {
    this.database = options.database;
    this.clientSource = options.client;
    this.vault = options.vault;
    this.callbackUri = fixedCallbackUri(options.callbackUri);
    this.pilotUserIds = new Set(
      [...options.pilotUserIds].map((userId) => uuid(userId, "pilot user ID")),
    );
    this.allowedNonDemoTenantIds = new Set(
      [...options.allowedNonDemoTenantIds].map((tenantId) =>
        uuid(tenantId, "non-demo tenant ID")),
    );
    this.providerNetworkEnabled = options.providerNetworkEnabled ?? true;
    this.now = options.now ?? (() => new Date());
    this.newId = options.newId ?? randomUUID;
  }

  async startAuthorisation(userId: string, sessionId: string) {
    const checkedUserId = this.pilotUser(userId);
    const checkedSessionId = uuid(sessionId, "session ID");
    this.requireProviderNetwork();
    const attemptId = uuid(this.newId(), "OAuth attempt ID");
    const client = await this.client();
    const request = await client.beginAuthorization();
    const expiresAt = new Date(this.now().getTime() + ATTEMPT_LIFETIME_MS);

    const sealedState = this.vault.seal(request.state, {
      provider: "xero",
      environment: "production",
      recordType: "oauth-attempt",
      recordId: attemptId,
      field: "oauth-state",
    });
    const sealedVerifier = this.vault.seal(request.codeVerifier, {
      provider: "xero",
      environment: "production",
      recordType: "oauth-attempt",
      recordId: attemptId,
      field: "pkce-code-verifier",
    });
    const sealedNonce = this.vault.seal(request.nonce, {
      provider: "xero",
      environment: "production",
      recordType: "oauth-attempt",
      recordId: attemptId,
      field: "oidc-nonce",
    });
    if (
      sealedState.keyVersion !== sealedVerifier.keyVersion ||
      sealedVerifier.keyVersion !== sealedNonce.keyVersion
    ) {
      throw new AccountingError(
        "token_key_changed",
        "The accounting token key changed during the Xero request.",
        503,
      );
    }

    const rows = await this.database.begin(async (tx) => {
      const globalFence = one(
        await tx<{ operation_id: string | null }>`
          select operation_id
          from accounting_xero_operation_fence
          where singleton = true
          for update
        `,
        "invalid_database_state",
        "The Xero provider-operation fence is unavailable.",
        503,
      );
      if (globalFence.operation_id) {
        throw new AccountingError(
          "xero_global_operation_busy",
          "Another Xero provider operation is still in progress.",
          409,
        );
      }
      const account = one(
        await tx<{ id: string; xero_lifecycle_generation: number | string }>`
          select u.id, u.xero_lifecycle_generation
          from users u
          join sessions s on s.user_id = u.id
          where u.id = ${checkedUserId}
            and s.id = ${checkedSessionId}
            and s.mfa_at is not null
            and s.signed_in_at > clock_timestamp() - interval '30 days'
          for update of u, s
        `,
        "passkey_session_changed",
        "Sign in with a passkey again before connecting Xero.",
        403,
      );
      await tx`
        update accounting_oauth_attempts
        set status = 'failed',
            consumed_at = coalesce(consumed_at, clock_timestamp()),
            finished_at = clock_timestamp()
        where user_id = ${checkedUserId}
          and provider = 'xero'
          and provider_environment = 'production'
          and status = 'pending'
          and expires_at <= clock_timestamp()
      `;
      const unfinished = await tx<{ id: string }>`
        select id
        from accounting_oauth_attempts
        where user_id = ${checkedUserId}
          and provider = 'xero'
          and provider_environment = 'production'
          and status in ('pending', 'exchanging')
        for update
      `;
      if (unfinished.length > 0) {
        throw new AccountingError(
          "xero_authorisation_in_progress",
          "Finish the current Xero connection attempt before starting another one.",
          409,
        );
      }
      const existingAuthorisations = await tx<{ id: string; status: string }>`
        select id, status
        from accounting_authorisations
        where user_id = ${checkedUserId}
          and provider = 'xero'
          and provider_environment = 'production'
          and status in ('active', 'failed')
        for update
      `;
      if (existingAuthorisations.some(({ status }) => status === "failed")) {
        throw new AccountingError(
          "xero_identity_quarantined",
          "That Xero identity is quarantined for operator review.",
          409,
        );
      }
      if (existingAuthorisations.length > 0) {
        throw new AccountingError(
          "xero_authorisation_active",
          "Disconnect the active Xero authorisation before starting another one.",
          409,
        );
      }
      const providerOperations = await tx<{
        authorisation_id: string;
      }>`
        select ts.authorisation_id
        from accounting_provider_token_sets ts
        join accounting_authorisations a on a.id = ts.authorisation_id
        where a.user_id = ${checkedUserId}
          and a.provider = 'xero'
          and a.provider_environment = 'production'
          and (
            ts.refresh_lock_id is not null
            or ts.revocation_lock_id is not null
            or (
              ts.revocation_requested_at is not null
              and ts.revocation_confirmed_at is null
            )
          )
        for update of ts
      `;
      if (providerOperations.length > 0) {
        throw new AccountingError(
          "xero_provider_operation_busy",
          "Finish the current Xero provider operation before starting another connection.",
          409,
        );
      }
      const sourceOperations = await tx<{ id: string }>`
        select sc.id
        from accounting_source_connections sc
        where sc.user_id = ${checkedUserId}
          and sc.provider = 'xero'
          and sc.provider_environment = 'production'
          and sc.provider_disconnect_lock_id is not null
        for update of sc
      `;
      if (sourceOperations.length > 0) {
        throw new AccountingError(
          "xero_provider_operation_busy",
          "Finish the current Xero organisation disconnect before starting another connection.",
          409,
        );
      }
      return await tx<{ id: string }>`
        insert into accounting_oauth_attempts (
          id, user_id, session_id, provider, provider_environment,
          oauth_state_hash, oauth_state_ciphertext, oidc_nonce_hash,
          oidc_nonce_ciphertext,
          pkce_verifier_ciphertext, key_version, user_lifecycle_generation,
          requested_scopes, expires_at
        ) values (
          ${attemptId}, ${checkedUserId}, ${checkedSessionId}, 'xero', 'production',
          ${digest(request.state)}, ${sealedState.ciphertext},
          ${digest(request.nonce)},
          ${sealedNonce.ciphertext}, ${sealedVerifier.ciphertext},
          ${sealedVerifier.keyVersion},
          ${lifecycleGeneration(account.xero_lifecycle_generation)},
          ${XERO_SCOPES}, ${expiresAt}
        )
        returning id
      `;
    });
    one(
      rows,
      "passkey_session_changed",
      "Sign in with a passkey again before connecting Xero.",
      403,
    );
    return {
      provider: "xero",
      authorizationUrl: request.authorizationUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async completeAuthorisation(
    userId: string,
    sessionId: string,
    callbackSearch: string,
  ) {
    const checkedUserId = this.pilotUser(userId);
    const checkedSessionId = uuid(sessionId, "session ID");
    this.requireProviderNetwork();
    const parsed = callbackState(callbackSearch);
    const operationId = uuid(this.newId(), "global Xero operation ID");
    const attempt = await this.database.begin(async (tx) => {
      await this.acquireGlobalOperation(tx, {
        operationId,
        kind: "callback-exchange",
        userId: checkedUserId,
      });
      one(
        await tx<{ id: string }>`
          select u.id
          from users u
          join sessions s on s.user_id = u.id
          where u.id = ${checkedUserId}
            and s.id = ${checkedSessionId}
            and s.mfa_at is not null
            and s.signed_in_at > clock_timestamp() - interval '30 days'
          for update of u, s
        `,
        "passkey_session_changed",
        "Sign in with a passkey again before connecting Xero.",
        403,
      );
      return one(
        await tx<AttemptRow>`
          update accounting_oauth_attempts
          set status = 'exchanging', consumed_at = clock_timestamp()
          where provider = 'xero'
            and provider_environment = 'production'
            and user_id = ${checkedUserId}
            and session_id = ${checkedSessionId}
            and oauth_state_hash = ${digest(parsed.state)}
            and status = 'pending'
            and expires_at > clock_timestamp()
          returning id, user_id, session_id, oauth_state_hash, oidc_nonce_hash,
                    oauth_state_ciphertext, oidc_nonce_ciphertext,
                    pkce_verifier_ciphertext, key_version,
                    user_lifecycle_generation, requested_scopes, expires_at
        `,
        "xero_callback_expired",
        "That Xero connection attempt is no longer available. Start again.",
        409,
      );
    });

    let expectedState: string;
    let codeVerifier: string;
    let nonce: string;
    try {
      expectedState = this.vault.open({
        ciphertext: attempt.oauth_state_ciphertext,
        keyVersion: attempt.key_version,
      }, {
        provider: "xero",
        environment: "production",
        recordType: "oauth-attempt",
        recordId: attempt.id,
        field: "oauth-state",
      });
      codeVerifier = this.vault.open({
        ciphertext: attempt.pkce_verifier_ciphertext,
        keyVersion: attempt.key_version,
      }, {
        provider: "xero",
        environment: "production",
        recordType: "oauth-attempt",
        recordId: attempt.id,
        field: "pkce-code-verifier",
      });
      nonce = this.vault.open({
        ciphertext: attempt.oidc_nonce_ciphertext,
        keyVersion: attempt.key_version,
      }, {
        provider: "xero",
        environment: "production",
        recordType: "oauth-attempt",
        recordId: attempt.id,
        field: "oidc-nonce",
      });
    } catch {
      await this.finishAttempt(attempt.id, "failed");
      await this.releaseGlobalOperation(operationId);
      throw new AccountingError(
        "xero_callback_unavailable",
        "That Xero connection attempt could not be opened safely. Start again.",
        503,
      );
    }
    if (
      digest(expectedState) !== attempt.oauth_state_hash ||
      digest(nonce) !== attempt.oidc_nonce_hash
    ) {
      await this.finishAttempt(attempt.id, "failed");
      await this.releaseGlobalOperation(operationId);
      throw new AccountingError(
        "xero_callback_invalid",
        "The Xero callback could not be verified.",
        409,
      );
    }

    const callbackUrl = new URL(this.callbackUri);
    callbackUrl.search = parsed.callbackSearch;
    let tokens: XeroInitialTokenSet;
    try {
      tokens = await (await this.client()).completeAuthorization({
        callbackUrl,
        codeVerifier,
        expectedState,
        expectedNonce: nonce,
      });
    } catch {
      // An explicit browser denial is known not to have issued a token. Every
      // other transport/library failure has an ambiguous provider outcome: a
      // late code exchange could still rotate the token family, so retain the
      // `exchanging` row as the incident fence.
      if (parsed.providerDenied) {
        await this.finishAttempt(attempt.id, "denied");
        await this.releaseGlobalOperation(operationId);
      }
      throw new AccountingError(
        parsed.providerDenied
          ? "xero_authorisation_denied"
          : "xero_authorisation_outcome_unknown",
        parsed.providerDenied
          ? "Xero did not grant that connection."
          : "Xero did not confirm whether that connection completed. Operator review is required.",
        parsed.providerDenied ? 409 : 503,
      );
    }

    try {
      return await this.persistAuthorisation(
        checkedUserId,
        checkedSessionId,
        attempt,
        tokens,
        operationId,
      );
    } catch (error) {
      const superseded = error instanceof AccountingError &&
        error.code === "xero_callback_superseded";
      let quarantine: "quarantined" | "superseded" | "unknown" = superseded
        ? "superseded"
        : "unknown";
      if (!superseded) {
        quarantine = await this.quarantineIssuedIdentity(
          checkedUserId,
          checkedSessionId,
          attempt,
          tokens.subject,
          operationId,
        ).catch(() => "unknown" as const);
      }
      // Never let a cleanup call cross a newer grant. Provider revocation is
      // allowed only after the exact subject is durably quarantined. If that
      // transaction is unknown, the attempt remains the local incident fence
      // and provider-side cleanup is an operator action.
      let cleanupConfirmed = false;
      if (quarantine === "quarantined") {
        try {
          await (await this.client()).revoke(tokens.refreshToken);
          cleanupConfirmed = true;
        } catch {
          // The permanent subject quarantine and global operation fence remain.
        }
      }
      // If the compensating transaction itself could not commit, retain the
      // `exchanging` row as a fail-closed incident fence. A timer must not make
      // a second token grant possible while provider state is uncertain.
      if (quarantine !== "unknown") {
        await this.finishAttempt(attempt.id, "failed");
      }
      if (cleanupConfirmed) {
        await this.releaseGlobalOperation(operationId);
      }
      if (error instanceof AccountingError) throw error;
      throw new AccountingError(
        "xero_authorisation_not_saved",
        "The Xero connection could not be saved safely.",
        503,
      );
    }
  }

  async listOrganisations(
    authorisationId: string,
  ): Promise<readonly ProviderOrganisation[]> {
    return (await this.offerings(uuid(authorisationId, "authorisation ID")))
      .map((offering) => ({ ...offering.organisation }));
  }

  async resolveOrganisation(
    authorisationId: string,
    organisationId: string,
  ): Promise<ProviderOrganisationBinding | null> {
    const target = uuid(organisationId, "tenant ID");
    const offered = (await this.offerings(uuid(authorisationId, "authorisation ID")))
      .find((candidate) => candidate.organisation.id.toLowerCase() === target);
    return offered ? {
      organisation: { ...offered.organisation },
      providerConnectionId: offered.connection.connectionId,
    } : null;
  }

  async disconnectSourceConnection(userId: string, sourceConnectionId: string) {
    const checkedUserId = uuid(userId, "pilot user ID");
    const checkedSourceId = uuid(sourceConnectionId, "source connection ID");
    const providerNetworkEnabled = this.canContactProvider();
    const local = await this.database.begin(async (tx) => {
      const globalFence = one(
        await tx<{ operation_id: string | null }>`
          select operation_id
          from accounting_xero_operation_fence
          where singleton = true
          for update
        `,
        "invalid_database_state",
        "The Xero provider-operation fence is unavailable.",
        503,
      );
      if (globalFence.operation_id) {
        throw new AccountingError(
          "xero_global_operation_busy",
          "Another Xero provider operation is still in progress.",
          409,
        );
      }
      one(
        await tx<{ id: string }>`
          select id from users where id = ${checkedUserId} for update
        `,
        "source_connection_not_found",
        "That Xero source connection was not found.",
        404,
      );
      const rows = await tx<SourceDisconnectRow>`
        select sc.id, sc.authorisation_id, sc.provider_connection_id,
               sc.status, sc.dirty_generation, sc.provider_disconnected_at,
               sc.provider_disconnect_lock_id,
               sc.provider_disconnect_lock_expires_at
        from accounting_source_connections sc
        where sc.id = ${checkedSourceId}
          and sc.user_id = ${checkedUserId}
          and sc.provider = 'xero'
          and sc.provider_environment = 'production'
        for update of sc
      `;
      const owned = one(
        rows,
        "source_connection_not_found",
        "That Xero source connection was not found.",
        404,
      );
      if (owned.provider_disconnected_at) {
        return { kind: "confirmed" as const };
      }
      if (owned.provider_disconnect_lock_id) {
        throw new AccountingError(
          "xero_source_cleanup_busy",
          "Xero is still resolving this organisation disconnect.",
          409,
        );
      }
      await this.retireSource(tx, checkedSourceId);
      return { kind: "local" as const, source: owned };
    });

    if (local.kind === "confirmed") {
      return { disconnected: true, providerDisconnected: true };
    }
    if (!providerNetworkEnabled) {
      return { disconnected: true, providerDisconnected: false };
    }

    // No provider connection DELETE has started yet, so failure to obtain an
    // access token is safely retryable and does not acquire a source lock.
    let accessToken: string;
    try {
      accessToken = await this.accessToken(local.source.authorisation_id);
    } catch {
      return { disconnected: true, providerDisconnected: false };
    }

    const lockId = uuid(this.newId(), "source disconnect lock ID");
    const source = await this.database.begin(async (tx) => {
      await this.acquireGlobalOperation(tx, {
        operationId: lockId,
        kind: "source-disconnect",
        userId: checkedUserId,
        authorisationId: local.source.authorisation_id,
        sourceConnectionId: checkedSourceId,
      });
      one(
        await tx<{ id: string }>`
          select id from users where id = ${checkedUserId} for update
        `,
        "source_connection_not_found",
        "That Xero source connection was not found.",
        404,
      );
      const providerState = one(
        await tx<{
          authorisation_id: string;
          status: string;
          refresh_lock_id: string | null;
          revocation_requested_at: Date | string | null;
          revocation_confirmed_at: Date | string | null;
          revocation_lock_id: string | null;
        }>`
          select a.id as authorisation_id, a.status, ts.refresh_lock_id,
                 ts.revocation_requested_at, ts.revocation_confirmed_at,
                 ts.revocation_lock_id
          from accounting_authorisations a
          join accounting_source_connections sc
            on sc.authorisation_id = a.id
          join accounting_provider_token_sets ts
            on ts.authorisation_id = a.id
          where sc.id = ${checkedSourceId}
            and sc.user_id = ${checkedUserId}
            and a.user_id = ${checkedUserId}
            and a.provider = 'xero'
            and a.provider_environment = 'production'
          for update of a, ts
        `,
        "xero_source_cleanup_unavailable",
        "The Xero organisation disconnect is not available.",
        409,
      );
      if (
        providerState.status !== "active" ||
        providerState.refresh_lock_id ||
        providerState.revocation_lock_id ||
        (providerState.revocation_requested_at &&
          !providerState.revocation_confirmed_at)
      ) {
        throw new AccountingError(
          "xero_provider_operation_busy",
          "Finish the current Xero provider operation before disconnecting its organisation.",
          409,
        );
      }
      const attempts = await tx<{ id: string }>`
        select id
        from accounting_oauth_attempts
        where user_id = ${checkedUserId}
          and provider = 'xero'
          and provider_environment = 'production'
          and status in ('pending', 'exchanging')
        for update
      `;
      if (attempts.length > 0) {
        throw new AccountingError(
          "xero_provider_operation_busy",
          "Finish the current Xero connection attempt before disconnecting its organisation.",
          409,
        );
      }
      const owned = one(
        await tx<SourceDisconnectRow>`
          select sc.id, sc.authorisation_id, sc.provider_connection_id,
                 sc.status, sc.dirty_generation, sc.provider_disconnected_at,
                 sc.provider_disconnect_lock_id,
                 sc.provider_disconnect_lock_expires_at
          from accounting_source_connections sc
          where sc.id = ${checkedSourceId}
            and sc.user_id = ${checkedUserId}
            and sc.authorisation_id = ${providerState.authorisation_id}
            and sc.provider = 'xero'
            and sc.provider_environment = 'production'
          for update of sc
        `,
        "source_connection_not_found",
        "That Xero source connection was not found.",
        404,
      );
      if (owned.provider_disconnected_at) {
        await this.releaseGlobalOperationIn(tx, lockId);
        return owned;
      }
      if (owned.provider_disconnect_lock_id) {
        throw new AccountingError(
          "xero_source_cleanup_busy",
          "Xero is still resolving this organisation disconnect.",
          409,
        );
      }
      return one(
        await tx<SourceDisconnectRow>`
          update accounting_source_connections
          set provider_disconnect_lock_id = ${lockId},
              provider_disconnect_lock_expires_at = clock_timestamp()
                + ${SOURCE_DISCONNECT_LOCK_TELEMETRY_SECONDS} * interval '1 second',
              updated_at = clock_timestamp()
          where id = ${checkedSourceId}
            and user_id = ${checkedUserId}
            and authorisation_id = ${providerState.authorisation_id}
            and status = 'disconnected'
            and dirty_generation = ${String(owned.dirty_generation)}
            and provider_connection_id = ${owned.provider_connection_id}
            and provider_disconnected_at is null
            and provider_disconnect_lock_id is null
          returning id, authorisation_id, provider_connection_id, status,
                    dirty_generation, provider_disconnected_at,
                    provider_disconnect_lock_id,
                    provider_disconnect_lock_expires_at
        `,
        "xero_source_cleanup_not_owned",
        "The Xero organisation disconnect could not be fenced safely.",
        503,
      );
    });
    if (source.provider_disconnected_at) {
      return { disconnected: true, providerDisconnected: true };
    }

    let providerDisconnected = false;
    try {
      await (await this.client()).disconnectConnection(accessToken, {
        connectionId: source.provider_connection_id as XeroConnection["connectionId"],
      });
      providerDisconnected = true;
    } catch (error) {
      providerDisconnected =
        error instanceof XeroOidcError && error.providerStatus === 404;
    }
    if (providerDisconnected) {
      providerDisconnected = await this.database.begin(async (tx) => {
        await this.assertGlobalOperationIn(tx, lockId);
        const confirmed = await tx<{ id: string }>`
          update accounting_source_connections
          set provider_disconnected_at = coalesce(
                provider_disconnected_at,
                clock_timestamp()
              ),
              provider_disconnect_lock_id = null,
              provider_disconnect_lock_expires_at = null,
              updated_at = clock_timestamp()
          where id = ${checkedSourceId}
            and user_id = ${checkedUserId}
            and status = 'disconnected'
            and provider_connection_id = ${source.provider_connection_id}
            and dirty_generation = ${String(source.dirty_generation)}
            and provider_disconnect_lock_id = ${lockId}
          returning id
        `;
        if (confirmed.length !== 1) return false;
        await this.releaseGlobalOperationIn(tx, lockId);
        return true;
      });
    }
    return { disconnected: true, providerDisconnected };
  }

  async revokeAuthorisation(userId: string, authorisationId: string) {
    const checkedUserId = uuid(userId, "pilot user ID");
    const checkedAuthorisationId = uuid(authorisationId, "authorisation ID");
    const providerNetworkEnabled = this.canContactProvider();
    const operationId = uuid(this.newId(), "revocation lock ID");
    const work = await this.database.begin(async (tx) => {
      await this.acquireGlobalOperation(tx, {
        operationId,
        kind: "authorisation-revoke",
        userId: checkedUserId,
        authorisationId: checkedAuthorisationId,
      });
      one(
        await tx<{ id: string }>`
          select id from users where id = ${checkedUserId} for update
        `,
        "authorisation_not_found",
        "That Xero authorisation was not found.",
        404,
      );
      // A callback that has reached Xero owns the user lifecycle until it
      // finishes. Only pending browser work is safe to cancel automatically.
      await tx`
        update accounting_oauth_attempts
        set status = 'failed',
            consumed_at = coalesce(consumed_at, clock_timestamp()),
            finished_at = clock_timestamp()
        where user_id = ${checkedUserId}
          and provider = 'xero'
          and provider_environment = 'production'
          and status = 'pending'
      `;
      const exchanging = await tx<{ id: string }>`
        select id
        from accounting_oauth_attempts
        where user_id = ${checkedUserId}
          and provider = 'xero'
          and provider_environment = 'production'
          and status = 'exchanging'
        for update
      `;
      if (exchanging.length > 0) {
        throw new AccountingError(
          "xero_callback_busy",
          "Xero is still finishing a connection attempt.",
          409,
        );
      }
      const authorisations = await tx<AuthorisationIdentityRow>`
        select id, provider_subject_id, status
        from accounting_authorisations
        where id = ${checkedAuthorisationId}
          and user_id = ${checkedUserId}
          and provider = 'xero'
          and provider_environment = 'production'
        for update
      `;
      const authorisation = one(
        authorisations,
        "authorisation_not_found",
        "That Xero authorisation was not found.",
        404,
      );
      // A cross-account Xero-subject collision may have issued a newer token
      // family before TaxSorted could reject it. Its owner is quarantined
      // permanently in this pilot: ordinary DELETE must not create a path for
      // a delayed best-effort revoke to cross a later reconnect.
      if (authorisation.status === "failed") {
        throw new AccountingError(
          "xero_identity_quarantined",
          "That Xero identity is quarantined for operator review.",
          409,
        );
      }
      const tokens = await tx<TokenRow>`
        select authorisation_id, access_token_ciphertext,
               refresh_token_ciphertext, key_version, access_expires_at,
               refresh_expires_at, token_generation,
               (
                 refresh_lock_id is not null
               ) as refresh_lock_active,
               revocation_confirmed_at, revocation_lock_id,
               revocation_lock_expires_at
        from accounting_provider_token_sets
        where authorisation_id = ${checkedAuthorisationId}
        for update
      `;
      if (tokens.length > 1) {
        throw new AccountingError(
          "invalid_database_state",
          "More than one Xero token set was found during cleanup.",
          503,
        );
      }
      const token = tokens[0];
      if (token?.refresh_lock_active) {
        throw new AccountingError(
          "xero_refresh_busy",
          "Xero is still refreshing its token.",
          409,
        );
      }
      const sourceRows = await tx<{
        id: string;
        provider_disconnect_lock_id: string | null;
      }>`
        select id, provider_disconnect_lock_id
        from accounting_source_connections
        where authorisation_id = ${checkedAuthorisationId}
          and user_id = ${checkedUserId}
        for update
      `;
      if (sourceRows.some((source) => source.provider_disconnect_lock_id)) {
        throw new AccountingError(
          "xero_provider_operation_busy",
          "Finish the current Xero organisation disconnect before revoking its authorisation.",
          409,
        );
      }
      one(
        await tx<{ id: string }>`
          update users
          set xero_lifecycle_generation = xero_lifecycle_generation + 1
          where id = ${checkedUserId}
          returning id
        `,
        "authorisation_not_found",
        "That Xero authorisation was not found.",
        404,
      );
      await tx`
        update accounting_authorisations
        set status = 'revoked', revoked_at = coalesce(revoked_at, clock_timestamp()),
            lifecycle_generation = lifecycle_generation + 1,
            updated_at = clock_timestamp()
        where id = ${checkedAuthorisationId} and user_id = ${checkedUserId}
      `;
      for (const source of sourceRows) await this.retireSource(tx, source.id);
      if (!token) {
        await this.releaseGlobalOperationIn(tx, operationId);
        return { kind: "none" as const };
      }
      if (token.revocation_confirmed_at) {
        await this.releaseGlobalOperationIn(tx, operationId);
        return { kind: "confirmed" as const };
      }
      if (!providerNetworkEnabled) {
        await tx`
          update accounting_provider_token_sets
          set revocation_requested_at = coalesce(
                revocation_requested_at,
                clock_timestamp()
              ),
              updated_at = clock_timestamp()
          where authorisation_id = ${checkedAuthorisationId}
        `;
        await this.releaseGlobalOperationIn(tx, operationId);
        return { kind: "pending" as const };
      }
      const leased = await tx<{ authorisation_id: string }>`
        update accounting_provider_token_sets
        set revocation_requested_at = coalesce(
              revocation_requested_at,
              clock_timestamp()
            ),
            revocation_lock_id = ${operationId},
            revocation_lock_expires_at = clock_timestamp()
              + ${REVOCATION_LOCK_TELEMETRY_SECONDS} * interval '1 second',
            updated_at = clock_timestamp()
        where authorisation_id = ${checkedAuthorisationId}
          and revocation_confirmed_at is null
          and revocation_lock_id is null
        returning authorisation_id
      `;
      one(
        leased,
        "xero_revoke_busy",
        "Another Xero revocation is still in progress.",
        409,
      );
      return { kind: "lease" as const, token, lockId: operationId };
    });

    if (work.kind === "confirmed") {
      return { revoked: true, providerRevoked: true };
    }
    if (work.kind !== "lease") {
      return { revoked: true, providerRevoked: false };
    }
    try {
      const refreshToken = this.openToken(
        work.token.refresh_token_ciphertext,
        work.token.key_version,
        checkedAuthorisationId,
        "refresh-token",
      );
      await (await this.client()).revoke(refreshToken);
    } catch {
      // The local rail is already closed, but the provider outcome is unknown.
      // Keep this exact lock and retained token as an incident fence: a timed-
      // out revocation may still complete and must never cross a reconnect.
      return { revoked: true, providerRevoked: false };
    }

    try {
      const providerRevoked = await this.database.begin(async (tx) => {
        await this.assertGlobalOperationIn(tx, work.lockId);
        // Reconnect locks this same row. It cannot reactivate the identity
        // until this exact generation and cleanup lock are confirmed.
        await tx`
          select status
          from accounting_authorisations
          where id = ${checkedAuthorisationId}
          for update
        `;
        const confirmed = await tx<{ authorisation_id: string }>`
          update accounting_provider_token_sets
          set revocation_confirmed_at = coalesce(
                revocation_confirmed_at,
                clock_timestamp()
              ),
              revocation_lock_id = null,
              revocation_lock_expires_at = null,
              updated_at = clock_timestamp()
          where authorisation_id = ${checkedAuthorisationId}
            and token_generation = ${generation(work.token.token_generation)}
            and revocation_lock_id = ${work.lockId}
            and revocation_requested_at is not null
          returning authorisation_id
        `;
        if (confirmed.length !== 1) return false;
        await tx`
          update accounting_source_connections
          set provider_disconnected_at = coalesce(
            provider_disconnected_at,
            clock_timestamp()
          )
          where authorisation_id = ${checkedAuthorisationId}
            and status = 'disconnected'
        `;
        await this.releaseGlobalOperationIn(tx, work.lockId);
        return true;
      });
      return { revoked: true, providerRevoked };
    } catch {
      // The provider call succeeded, but without a generation-and-lock-bound
      // local confirmation cleanup remains pending and reconnect stays closed.
      return { revoked: true, providerRevoked: false };
    }
  }

  private async client(): Promise<XeroOidcClient> {
    if (typeof this.clientSource !== "function") return this.clientSource;
    if (!this.clientPromise) {
      this.clientPromise = this.clientSource().catch((error) => {
        this.clientPromise = undefined;
        throw error;
      });
    }
    return await this.clientPromise;
  }

  private async acquireGlobalOperation(
    tx: AccountingTransaction,
    input: {
      operationId: string;
      kind: XeroMutationKind;
      userId: string;
      authorisationId?: string;
      sourceConnectionId?: string;
    },
  ): Promise<void> {
    one(
      await tx<{ singleton: boolean }>`
        update accounting_xero_operation_fence
        set operation_id = ${input.operationId},
            operation_kind = ${input.kind},
            user_id = ${input.userId},
            authorisation_id = ${input.authorisationId ?? null},
            source_connection_id = ${input.sourceConnectionId ?? null},
            started_at = clock_timestamp(),
            deadline_at = clock_timestamp()
              + ${GLOBAL_OPERATION_DEADLINE_SECONDS} * interval '1 second'
        where singleton = true and operation_id is null
        returning singleton
      `,
      "xero_global_operation_busy",
      "Another Xero provider operation is still in progress.",
      409,
    );
  }

  private async releaseGlobalOperationIn(
    tx: AccountingTransaction,
    operationId: string,
  ): Promise<void> {
    one(
      await tx<{ singleton: boolean }>`
        update accounting_xero_operation_fence
        set operation_id = null,
            operation_kind = null,
            user_id = null,
            authorisation_id = null,
            source_connection_id = null,
            started_at = null,
            deadline_at = null
        where singleton = true and operation_id = ${operationId}
        returning singleton
      `,
      "xero_global_operation_not_owned",
      "The Xero provider operation no longer owns its global fence.",
      503,
    );
  }

  private async assertGlobalOperationIn(
    tx: AccountingTransaction,
    operationId: string,
  ): Promise<void> {
    one(
      await tx<{ singleton: boolean }>`
        select singleton
        from accounting_xero_operation_fence
        where singleton = true and operation_id = ${operationId}
        for update
      `,
      "xero_global_operation_not_owned",
      "The Xero provider operation no longer owns its global fence.",
      503,
    );
  }

  private async releaseGlobalOperation(operationId: string): Promise<boolean> {
    try {
      const rows = await this.database<{ singleton: boolean }>`
        update accounting_xero_operation_fence
        set operation_id = null,
            operation_kind = null,
            user_id = null,
            authorisation_id = null,
            source_connection_id = null,
            started_at = null,
            deadline_at = null
        where singleton = true and operation_id = ${operationId}
        returning singleton
      `;
      return rows.length === 1;
    } catch {
      return false;
    }
  }

  private pilotUser(userId: string): string {
    const checkedUserId = uuid(userId, "pilot user ID");
    if (!this.pilotUserIds.has(checkedUserId)) {
      throw new AccountingError(
        "provider_unavailable",
        "That accounting provider is not available.",
        404,
      );
    }
    return checkedUserId;
  }

  private canContactProvider(): boolean {
    return typeof this.providerNetworkEnabled === "function"
      ? this.providerNetworkEnabled()
      : this.providerNetworkEnabled;
  }

  private requireProviderNetwork(): void {
    if (!this.canContactProvider()) {
      throw new AccountingError(
        "xero_emergency_stop",
        "The Xero connection stop is active.",
        503,
      );
    }
  }

  private async persistAuthorisation(
    userId: string,
    sessionId: string,
    attempt: AttemptRow,
    tokens: XeroTokenSet,
    operationId: string,
  ) {
    const subject = providerSubject(tokens.subject);
    const issuedAt = this.now();
    const accessExpiresAt = new Date(
      issuedAt.getTime() + tokens.expiresInSeconds * 1_000,
    );
    const refreshExpiresAt = new Date(issuedAt.getTime() + REFRESH_LIFETIME_MS);

    const outcome = await this.database.begin(async (tx) => {
      await this.assertGlobalOperationIn(tx, operationId);
      const account = one(
        await tx<{ id: string; xero_lifecycle_generation: number | string }>`
          select id, xero_lifecycle_generation
          from users where id = ${userId} for update
        `,
        "passkey_account_missing",
        "The passkey account is no longer available.",
        403,
      );
      if (
        lifecycleGeneration(account.xero_lifecycle_generation) !==
        lifecycleGeneration(attempt.user_lifecycle_generation)
      ) {
        return { kind: "superseded" as const };
      }
      // Xero rotates one token family per Xero user + app. Serialize that
      // identity across every local passkey account before choosing its owner.
      await tx`
        select pg_advisory_xact_lock(
          hashtextextended(${`taxsorted-xero-subject:${subject}`}, 0)
        )
      `;
      const subjectRows = await tx<AuthorisationIdentityRow>`
        select id, user_id, provider_subject_id, status
        from accounting_authorisations
        where provider = 'xero'
          and provider_environment = 'production'
          and provider_subject_id = ${subject}
        for update
      `;
      if (subjectRows.length > 1) {
        throw new AccountingError(
          "multiple_xero_subject_owners",
          "More than one TaxSorted owner was found for that Xero identity.",
          503,
        );
      }
      const subjectOwner = subjectRows[0];
      if (subjectOwner?.user_id !== undefined && subjectOwner.user_id !== userId) {
        // The provider has already issued this callback's token family, which
        // may have superseded the other owner's stored token. Close that local
        // rail before committing the conflict; the caller then revokes the new
        // callback token outside this transaction.
        await tx`
          update accounting_authorisations
          set status = 'failed',
              lifecycle_generation = lifecycle_generation + 1,
              updated_at = clock_timestamp()
          where id = ${subjectOwner.id} and status <> 'revoked'
        `;
        await tx`
          update accounting_source_connections
          set status = 'paused', updated_at = clock_timestamp()
          where authorisation_id = ${subjectOwner.id} and status = 'active'
        `;
        one(
          await tx<{ id: string }>`
            update accounting_oauth_attempts
            set status = 'failed', finished_at = clock_timestamp()
            where id = ${attempt.id}
              and user_id = ${userId}
              and session_id = ${sessionId}
              and status = 'exchanging'
            returning id
          `,
          "xero_attempt_not_completed",
          "The one-time Xero attempt could not be closed safely.",
          503,
        );
        return { kind: "identity-owned-elsewhere" as const };
      }
      if (subjectOwner?.user_id === userId && subjectOwner.status === "failed") {
        one(
          await tx<{ id: string }>`
            update accounting_oauth_attempts
            set status = 'failed', finished_at = clock_timestamp()
            where id = ${attempt.id}
              and user_id = ${userId}
              and session_id = ${sessionId}
              and status = 'exchanging'
            returning id
          `,
          "xero_attempt_not_completed",
          "The one-time Xero attempt could not be closed safely.",
          503,
        );
        return { kind: "identity-quarantined" as const };
      }
      const activeRows = await tx<AuthorisationIdentityRow>`
        select id, provider_subject_id, status
        from accounting_authorisations
        where user_id = ${userId}
          and provider = 'xero'
          and provider_environment = 'production'
          and status = 'active'
        for update
      `;
      if (activeRows.length > 1) {
        throw new AccountingError(
          "multiple_xero_authorisations",
          "More than one active Xero authorisation was found.",
          503,
        );
      }
      const active = activeRows[0];
      if (active && active.provider_subject_id !== subject) {
        throw new AccountingError(
          "xero_identity_conflict",
          "Disconnect the current Xero identity before connecting another one.",
          409,
        );
      }
      const reusableRows = active
        ? [active]
        : subjectOwner && subjectOwner.user_id === userId
          ? [subjectOwner]
          : [];
      if (reusableRows.length > 1) {
        throw new AccountingError(
          "multiple_xero_identities",
          "Duplicate Xero identity records were found.",
          503,
        );
      }
      const reusable = reusableRows[0];
      if (reusable?.status === "revoked") {
        const cleanup = await tx<{
          revocation_confirmed_at: Date | string | null;
          revocation_lock_id: string | null;
        }>`
          select revocation_confirmed_at, revocation_lock_id
          from accounting_provider_token_sets
          where authorisation_id = ${reusable.id}
          for update
        `;
        if (
          cleanup.length !== 1 ||
          !cleanup[0]!.revocation_confirmed_at ||
          cleanup[0]!.revocation_lock_id
        ) {
          throw new AccountingError(
            "xero_cleanup_pending",
            "Finish the previous Xero disconnect before reconnecting it.",
            409,
          );
        }
      }
      const sourceOperations = await tx<{ id: string }>`
        select id
        from accounting_source_connections
        where user_id = ${userId}
          and provider = 'xero'
          and provider_environment = 'production'
          and provider_disconnect_lock_id is not null
        for update
      `;
      if (sourceOperations.length > 0) {
        throw new AccountingError(
          "xero_provider_operation_busy",
          "Finish the current Xero organisation disconnect before saving this connection.",
          409,
        );
      }
      const proposedId = reusable?.id ?? uuid(
        this.newId(),
        "authorisation ID",
      );
      const authorisations = await tx<AuthorisationIdentityRow>`
        insert into accounting_authorisations (
          id, user_id, provider, provider_environment, provider_subject_id,
          status, granted_scopes
        ) values (
          ${proposedId}, ${userId}, 'xero', 'production', ${subject},
          'active', ${XERO_SCOPES}
        )
        on conflict (user_id, provider, provider_environment, provider_subject_id)
        do update set status = 'active', granted_scopes = excluded.granted_scopes,
                      revoked_at = null,
                      lifecycle_generation = accounting_authorisations.lifecycle_generation + 1,
                      updated_at = clock_timestamp()
        returning id, provider_subject_id, status, created_at, updated_at
      `;
      const authorisation = one(
        authorisations,
        "xero_authorisation_not_saved",
        "The Xero authorisation could not be saved.",
        503,
      );
      const tokenOperations = await tx<TokenRow>`
        select authorisation_id, access_token_ciphertext,
               refresh_token_ciphertext, key_version, access_expires_at,
               refresh_expires_at, token_generation, refresh_lock_id,
               revocation_requested_at, revocation_confirmed_at,
               revocation_lock_id
        from accounting_provider_token_sets
        where authorisation_id = ${authorisation.id}
        for update
      `;
      if (tokenOperations.length > 1) {
        throw new AccountingError(
          "invalid_database_state",
          "More than one Xero token set was found while connecting.",
          503,
        );
      }
      const tokenOperation = tokenOperations[0];
      if (
        tokenOperation?.refresh_lock_id ||
        tokenOperation?.revocation_lock_id ||
        (tokenOperation?.revocation_requested_at &&
          !tokenOperation.revocation_confirmed_at)
      ) {
        throw new AccountingError(
          "xero_provider_operation_busy",
          "Finish the current Xero provider operation before saving this connection.",
          409,
        );
      }
      const access = this.vault.seal(tokens.accessToken, {
        provider: "xero",
        environment: "production",
        recordType: "provider-token-set",
        recordId: authorisation.id,
        field: "access-token",
      });
      const refresh = this.vault.seal(tokens.refreshToken, {
        provider: "xero",
        environment: "production",
        recordType: "provider-token-set",
        recordId: authorisation.id,
        field: "refresh-token",
      });
      if (access.keyVersion !== refresh.keyVersion) {
        throw new AccountingError(
          "token_key_changed",
          "The accounting token key changed while saving Xero.",
          503,
        );
      }
      one(
        await tx<{ authorisation_id: string }>`
          insert into accounting_provider_token_sets (
            authorisation_id, provider, provider_environment,
            access_token_ciphertext, refresh_token_ciphertext, key_version,
            access_expires_at, refresh_expires_at
          ) values (
            ${authorisation.id}, 'xero', 'production', ${access.ciphertext},
            ${refresh.ciphertext}, ${access.keyVersion}, ${accessExpiresAt},
            ${refreshExpiresAt}
          )
          on conflict (authorisation_id) do update set
            access_token_ciphertext = excluded.access_token_ciphertext,
            refresh_token_ciphertext = excluded.refresh_token_ciphertext,
            key_version = excluded.key_version,
            access_expires_at = excluded.access_expires_at,
            refresh_expires_at = excluded.refresh_expires_at,
            token_generation = accounting_provider_token_sets.token_generation + 1,
            refresh_lock_id = null,
            refresh_lock_expires_at = null,
            last_refresh_error_code = null,
            revocation_requested_at = null,
            revocation_confirmed_at = null,
            revocation_lock_id = null,
            revocation_lock_expires_at = null,
            updated_at = clock_timestamp()
          where accounting_provider_token_sets.refresh_lock_id is null
            and accounting_provider_token_sets.revocation_lock_id is null
            and (
              accounting_provider_token_sets.revocation_requested_at is null
              or accounting_provider_token_sets.revocation_confirmed_at is not null
            )
          returning authorisation_id
        `,
        "xero_tokens_not_saved",
        "The encrypted Xero tokens could not be saved.",
        503,
      );
      one(
        await tx<{ id: string }>`
          update users
          set xero_lifecycle_generation = xero_lifecycle_generation + 1
          where id = ${userId}
            and xero_lifecycle_generation = ${lifecycleGeneration(
              attempt.user_lifecycle_generation,
            )}
          returning id
        `,
        "xero_callback_not_committed",
        "The issued Xero callback could not advance its account lifecycle.",
        503,
      );
      one(
        await tx<{ id: string }>`
          update accounting_oauth_attempts
          set status = 'completed', finished_at = clock_timestamp()
          where id = ${attempt.id}
            and user_id = ${userId}
            and session_id = ${sessionId}
            and status = 'exchanging'
          returning id
        `,
        "xero_callback_not_committed",
        "The issued Xero callback could not close its one-time attempt.",
        503,
      );
      await this.releaseGlobalOperationIn(tx, operationId);
      return { kind: "saved" as const, value: {
        authorisation: {
          id: authorisation.id,
          provider: "xero",
          environment: "production",
          status: "active",
          grantedScopes: [...XERO_SCOPES],
          createdAt: authorisation.created_at
            ? date(authorisation.created_at).toISOString()
            : issuedAt.toISOString(),
          updatedAt: authorisation.updated_at
            ? date(authorisation.updated_at).toISOString()
            : issuedAt.toISOString(),
          synthetic: false,
        },
      } };
    });
    if (outcome.kind === "superseded") {
      throw new AccountingError(
        "xero_callback_superseded",
        "That Xero callback belongs to an older account lifecycle.",
        409,
      );
    }
    if (outcome.kind === "identity-owned-elsewhere") {
      throw new AccountingError(
        "xero_identity_owned_elsewhere",
        "That Xero identity already belongs to another TaxSorted passkey account.",
        409,
      );
    }
    if (outcome.kind === "identity-quarantined") {
      throw new AccountingError(
        "xero_identity_quarantined",
        "Finish provider cleanup for this Xero identity before reconnecting it.",
        409,
      );
    }
    return outcome.value;
  }

  private async quarantineIssuedIdentity(
    userId: string,
    sessionId: string,
    attempt: AttemptRow,
    rawSubject: string,
    operationId: string,
  ): Promise<"quarantined" | "superseded"> {
    const subject = providerSubject(rawSubject);
    return await this.database.begin(async (tx) => {
      await this.assertGlobalOperationIn(tx, operationId);
      const accounts = await tx<{
        id: string;
        xero_lifecycle_generation: number | string;
      }>`
        select id, xero_lifecycle_generation
        from users where id = ${userId} for update
      `;
      if (
        accounts.length === 1 &&
        lifecycleGeneration(accounts[0]!.xero_lifecycle_generation) !==
          lifecycleGeneration(attempt.user_lifecycle_generation)
      ) {
        return "superseded" as const;
      }
      if (accounts.length > 1) {
        throw new AccountingError(
          "invalid_database_state",
          "More than one passkey account was found during Xero quarantine.",
          503,
        );
      }

      await tx`
        select pg_advisory_xact_lock(
          hashtextextended(${`taxsorted-xero-subject:${subject}`}, 0)
        )
      `;
      const owners = await tx<AuthorisationIdentityRow>`
        select id, user_id, provider_subject_id, status
        from accounting_authorisations
        where provider = 'xero'
          and provider_environment = 'production'
          and provider_subject_id = ${subject}
        for update
      `;
      if (owners.length > 1) {
        throw new AccountingError(
          "multiple_xero_subject_owners",
          "More than one TaxSorted owner was found for that Xero identity.",
          503,
        );
      }

      let ownerId = owners[0]?.id;
      if (ownerId) {
        const closed = one(
          await tx<{ id: string }>`
            update accounting_authorisations
            set status = 'failed',
                lifecycle_generation = lifecycle_generation + case
                  when status = 'failed' then 0 else 1 end,
                updated_at = clock_timestamp()
            where id = ${ownerId}
            returning id
          `,
          "xero_identity_not_quarantined",
          "The issued Xero identity could not be quarantined.",
          503,
        );
        ownerId = closed.id;
      } else if (accounts.length === 1) {
        const inserted = one(
          await tx<{ id: string }>`
            insert into accounting_authorisations (
              user_id, provider, provider_environment, provider_subject_id,
              status, granted_scopes
            ) values (
              ${userId}, 'xero', 'production', ${subject}, 'failed', ${XERO_SCOPES}
            )
            returning id
          `,
          "xero_identity_not_quarantined",
          "The issued Xero identity could not be quarantined.",
          503,
        );
        ownerId = inserted.id;
      }
      if (ownerId) {
        await tx`
          update accounting_source_connections
          set status = 'paused', updated_at = clock_timestamp()
          where authorisation_id = ${ownerId} and status = 'active'
        `;
      }
      if (accounts.length === 1) {
        one(
          await tx<{ id: string }>`
            update users
            set xero_lifecycle_generation = xero_lifecycle_generation + 1
            where id = ${userId}
              and xero_lifecycle_generation = ${lifecycleGeneration(
                attempt.user_lifecycle_generation,
              )}
            returning id
          `,
          "xero_callback_superseded",
          "That Xero callback belongs to an older account lifecycle.",
          409,
        );
      }
      await tx`
        update accounting_oauth_attempts
        set status = 'failed', finished_at = clock_timestamp()
        where id = ${attempt.id}
          and user_id = ${userId}
          and session_id = ${sessionId}
          and status = 'exchanging'
      `;
      return "quarantined" as const;
    });
  }

  private async finishAttempt(
    attemptId: string,
    status: "denied" | "failed",
  ): Promise<void> {
    await Promise.resolve(
      this.database`
        update accounting_oauth_attempts
        set status = ${status}, finished_at = clock_timestamp()
        where id = ${attemptId} and status = 'exchanging'
      `,
    ).catch(() => []);
  }

  private async offerings(authorisationId: string): Promise<OfferedOrganisation[]> {
    this.requireProviderNetwork();
    const owner = one(
      await this.database<{ user_id: string }>`
        select user_id
        from accounting_authorisations
        where id = ${authorisationId}
          and provider = 'xero'
          and provider_environment = 'production'
          and status = 'active'
      `,
      "xero_reauthorisation_required",
      "Reconnect Xero before reading its organisation list.",
      409,
    );
    if (!UUID.test(owner.user_id)) {
      throw new AccountingError(
        "invalid_database_state",
        "The stored Xero authorisation owner is invalid.",
        503,
      );
    }
    if (!this.pilotUserIds.has(owner.user_id.toLowerCase())) {
      throw new AccountingError(
        "provider_unavailable",
        "That accounting provider is not available.",
        404,
      );
    }
    const accessToken = await this.accessToken(authorisationId);
    const client = await this.client();
    let connections: readonly XeroConnection[];
    try {
      connections = await client.listConnections(accessToken);
    } catch {
      throw new AccountingError(
        "xero_directory_unavailable",
        "Xero's organisation list is temporarily unavailable.",
        503,
      );
    }
    const organisations = connections.filter(
      (connection) => connection.tenantType === "ORGANISATION",
    );
    const tenantIds = new Set<string>();
    const connectionIds = new Set<string>();
    for (const connection of organisations) {
      const tenantId = connection.tenantId.toLowerCase();
      const connectionId = connection.connectionId.toLowerCase();
      if (tenantIds.has(tenantId) || connectionIds.has(connectionId)) {
        throw new AccountingError(
          "xero_directory_ambiguous",
          "Xero returned an ambiguous organisation connection.",
          503,
        );
      }
      tenantIds.add(tenantId);
      connectionIds.add(connectionId);
    }

    const details = await mapWithConcurrency(
      organisations,
      ORGANISATION_CONCURRENCY,
      async (connection) => {
        try {
          return {
            connection,
            organisation: await client.getOrganisation(
              accessToken,
              connection.tenantId,
            ),
          };
        } catch {
          throw new AccountingError(
            "xero_directory_unavailable",
            "Xero's organisation details are temporarily unavailable.",
            503,
          );
        }
      },
    );
    return details
      .filter(({ organisation }) =>
        organisation.status === "ACTIVE" &&
        (organisation.isDemoCompany ||
          this.allowedNonDemoTenantIds.has(
            organisation.organisationId.toLowerCase(),
          )),
      )
      .map(({ connection, organisation }) => ({
        connection,
        organisation: {
          id: organisation.organisationId,
          name: organisation.name,
          countryCode: organisation.countryCode,
          baseCurrency: organisation.baseCurrency,
          datasets: [],
          synthetic: false,
        },
      }))
      .sort((left, right) => left.organisation.id.localeCompare(right.organisation.id));
  }

  private async accessToken(authorisationId: string): Promise<string> {
    const rows = await this.database<TokenRow>`
      select ts.authorisation_id, a.user_id, ts.access_token_ciphertext,
             ts.refresh_token_ciphertext, ts.key_version,
             ts.access_expires_at, ts.refresh_expires_at,
             ts.token_generation
      from accounting_provider_token_sets ts
      join accounting_authorisations a on a.id = ts.authorisation_id
      where ts.authorisation_id = ${authorisationId}
        and ts.provider = 'xero'
        and ts.provider_environment = 'production'
        and a.status = 'active'
    `;
    const token = one(
      rows,
      "xero_reauthorisation_required",
      "Reconnect Xero before reading its organisation list.",
      409,
    );
    if (!token.user_id || !UUID.test(token.user_id)) {
      throw new AccountingError(
        "invalid_database_state",
        "The stored Xero authorisation owner is invalid.",
        503,
      );
    }
    if (
      date(token.access_expires_at).getTime() >
      this.now().getTime() + ACCESS_EXPIRY_SAFETY_MS
    ) {
      try {
        return this.openToken(
          token.access_token_ciphertext,
          token.key_version,
          authorisationId,
          "access-token",
        );
      } catch {
        throw new AccountingError(
          "xero_token_unavailable",
          "The encrypted Xero token could not be opened safely.",
          503,
        );
      }
    }
    return await this.refreshAccessToken(
      authorisationId,
      token.user_id.toLowerCase(),
    );
  }

  private async refreshAccessToken(
    authorisationId: string,
    userId: string,
  ): Promise<string> {
    const lockId = uuid(this.newId(), "refresh lock ID");
    const token = await this.database.begin(async (tx) => {
      await this.acquireGlobalOperation(tx, {
        operationId: lockId,
        kind: "token-refresh",
        userId: uuid(userId, "pilot user ID"),
        authorisationId,
      });
      one(
        await tx<{ id: string }>`
          select u.id
          from users u
          join accounting_authorisations a on a.user_id = u.id
          where a.id = ${authorisationId}
            and a.provider = 'xero'
            and a.provider_environment = 'production'
            and a.status = 'active'
          for update of u
        `,
        "xero_reauthorisation_required",
        "Reconnect Xero before reading its organisation list.",
        409,
      );
      const attempts = await tx<{ id: string }>`
        select oa.id
        from accounting_oauth_attempts oa
        join accounting_authorisations a on a.user_id = oa.user_id
        where a.id = ${authorisationId}
          and oa.provider = 'xero'
          and oa.provider_environment = 'production'
          and oa.status in ('pending', 'exchanging')
        for update of oa
      `;
      if (attempts.length > 0) {
        throw new AccountingError(
          "xero_provider_operation_busy",
          "Finish the current Xero connection attempt before refreshing its token.",
          409,
        );
      }
      const acquired = await tx<TokenRow>`
        update accounting_provider_token_sets ts
        set refresh_lock_id = ${lockId},
            refresh_lock_expires_at = clock_timestamp()
              + ${REFRESH_LOCK_TELEMETRY_SECONDS} * interval '1 second',
            last_refresh_attempt_at = clock_timestamp(),
            last_refresh_error_code = null,
            updated_at = clock_timestamp()
        from accounting_authorisations a
        where ts.authorisation_id = ${authorisationId}
          and a.id = ts.authorisation_id
          and a.status = 'active'
          and ts.revocation_requested_at is null
          and ts.revocation_lock_id is null
          and ts.refresh_lock_id is null
        returning ts.authorisation_id, ts.access_token_ciphertext,
                  ts.refresh_token_ciphertext, ts.key_version,
                  ts.access_expires_at, ts.refresh_expires_at,
                  ts.token_generation, ts.refresh_lock_id,
                  a.lifecycle_generation as authorisation_generation
      `;
      const owned = one(
        acquired,
        "xero_refresh_busy",
        "Another Xero token refresh is still in progress.",
        409,
      );
      const sourceOperations = await tx<{ id: string }>`
        select id
        from accounting_source_connections
        where authorisation_id = ${authorisationId}
          and provider_disconnect_lock_id is not null
        for update
      `;
      if (sourceOperations.length > 0) {
        throw new AccountingError(
          "xero_provider_operation_busy",
          "Finish the current Xero organisation disconnect before refreshing its token.",
          409,
        );
      }
      return owned;
    });
    const authorisationGeneration = generation(
      token.authorisation_generation ?? "",
    );
    if (date(token.refresh_expires_at).getTime() <= this.now().getTime()) {
      await this.failRefresh(
        authorisationId,
        authorisationGeneration,
        lockId,
        "refresh_expired",
        "reauthorisation-required",
        lockId,
      );
      throw new AccountingError(
        "xero_reauthorisation_required",
        "Reconnect Xero before reading its organisation list.",
        409,
      );
    }
    let refreshToken: string;
    try {
      refreshToken = this.openToken(
        token.refresh_token_ciphertext,
        token.key_version,
        authorisationId,
        "refresh-token",
      );
    } catch {
      await this.failRefresh(
        authorisationId,
        authorisationGeneration,
        lockId,
        "token_decryption_failed",
        "unchanged",
        lockId,
      );
      throw new AccountingError(
        "xero_token_unavailable",
        "The encrypted Xero token could not be opened safely.",
        503,
      );
    }
    let refreshed: XeroTokenSet;
    try {
      refreshed = await (await this.client()).refresh(refreshToken);
    } catch (error) {
      const invalidGrant =
        error instanceof XeroOidcError && error.code === "invalid_grant";
      if (invalidGrant) {
        await this.failRefresh(
          authorisationId,
          authorisationGeneration,
          lockId,
          "invalid_grant",
          "reauthorisation-required",
          lockId,
        );
      } else {
        await this.quarantineAmbiguousRefresh(
          authorisationId,
          authorisationGeneration,
          lockId,
        );
      }
      throw new AccountingError(
        invalidGrant
          ? "xero_reauthorisation_required"
          : "xero_refresh_outcome_unknown",
        invalidGrant
          ? "Reconnect Xero before reading its organisation list."
          : "Xero did not confirm whether its token refresh completed. Operator review is required.",
        invalidGrant ? 409 : 503,
      );
    }

    let access;
    let refresh;
    try {
      access = this.vault.seal(refreshed.accessToken, {
        provider: "xero",
        environment: "production",
        recordType: "provider-token-set",
        recordId: authorisationId,
        field: "access-token",
      });
      refresh = this.vault.seal(refreshed.refreshToken, {
        provider: "xero",
        environment: "production",
        recordType: "provider-token-set",
        recordId: authorisationId,
        field: "refresh-token",
      });
    } catch {
      const ownership = await this.failRefresh(
        authorisationId,
        authorisationGeneration,
        lockId,
        "token_encryption_failed",
        "failed",
      ).catch(() => "unknown" as const);
      if (ownership === "owned") {
        const revoked = await this.revokeUnsavedRefreshToken(
          refreshed.refreshToken,
        );
        if (revoked) await this.releaseGlobalOperation(lockId);
      }
      throw new AccountingError(
        "xero_token_unavailable",
        "The refreshed Xero token could not be sealed safely.",
        503,
      );
    }
    if (access.keyVersion !== refresh.keyVersion) {
      const ownership = await this.failRefresh(
        authorisationId,
        authorisationGeneration,
        lockId,
        "token_key_changed",
        "failed",
      ).catch(() => "unknown" as const);
      if (ownership === "owned") {
        const revoked = await this.revokeUnsavedRefreshToken(
          refreshed.refreshToken,
        );
        if (revoked) await this.releaseGlobalOperation(lockId);
      }
      throw new AccountingError(
        "token_key_changed",
        "The accounting token key changed during refresh.",
        503,
      );
    }
    const refreshedAt = this.now();
    let outcome: "saved" | "quarantined" | "superseded";
    try {
      outcome = await this.database.begin(async (tx) => {
        await this.assertGlobalOperationIn(tx, lockId);
        const authorisations = await tx<{
          status: string;
          lifecycle_generation: number | string;
        }>`
          select status, lifecycle_generation
          from accounting_authorisations
          where id = ${authorisationId}
          for update
        `;
        if (
          authorisations.length !== 1 ||
          generation(authorisations[0]!.lifecycle_generation) !==
            authorisationGeneration
        ) {
          return "superseded" as const;
        }
        if (authorisations[0]!.status !== "active") {
          await tx`
            update accounting_authorisations
            set status = 'failed',
                lifecycle_generation = lifecycle_generation + case
                  when status = 'failed' then 0 else 1 end,
                updated_at = clock_timestamp()
            where id = ${authorisationId}
              and lifecycle_generation = ${authorisationGeneration}
          `;
          await tx`
            update accounting_source_connections
            set status = 'paused', updated_at = clock_timestamp()
            where authorisation_id = ${authorisationId} and status = 'active'
          `;
          return "quarantined" as const;
        }
        const updated = await tx<{ authorisation_id: string }>`
          update accounting_provider_token_sets
          set access_token_ciphertext = ${access.ciphertext},
              refresh_token_ciphertext = ${refresh.ciphertext},
              key_version = ${access.keyVersion},
              access_expires_at = ${new Date(
                refreshedAt.getTime() + refreshed.expiresInSeconds * 1_000,
              )},
              refresh_expires_at = ${new Date(
                refreshedAt.getTime() + REFRESH_LIFETIME_MS,
              )},
              token_generation = token_generation + 1,
              refresh_lock_id = null,
              refresh_lock_expires_at = null,
              last_refresh_error_code = null,
              updated_at = clock_timestamp()
          where authorisation_id = ${authorisationId}
            and token_generation = ${generation(token.token_generation)}
            and refresh_lock_id = ${lockId}
          returning authorisation_id
        `;
        if (updated.length === 1) {
          await this.releaseGlobalOperationIn(tx, lockId);
          return "saved" as const;
        }
        if (updated.length > 1) {
          throw new AccountingError(
            "invalid_database_state",
            "More than one Xero token set was refreshed.",
            503,
          );
        }
        const currentTokens = await tx<{
          token_generation: number | string;
          refresh_lock_id: string | null;
        }>`
          select token_generation, refresh_lock_id
          from accounting_provider_token_sets
          where authorisation_id = ${authorisationId}
          for update
        `;
        if (
          currentTokens.length === 1 &&
          generation(currentTokens[0]!.token_generation) !==
            generation(token.token_generation)
        ) {
          return "superseded" as const;
        }
        // The same lifecycle lost custody of an issued rotated token without a
        // newer saved generation. Permanently quarantine it before attempting
        // provider cleanup, whose failure or timeout cannot safely permit a
        // later reconnect.
        const demoted = await tx<{ id: string }>`
          update accounting_authorisations
          set status = 'failed',
              lifecycle_generation = lifecycle_generation + 1,
              updated_at = clock_timestamp()
          where id = ${authorisationId}
            and status = 'active'
            and lifecycle_generation = ${authorisationGeneration}
          returning id
        `;
        if (demoted.length !== 1) return "superseded" as const;
        await tx`
          update accounting_source_connections
          set status = 'paused', updated_at = clock_timestamp()
          where authorisation_id = ${authorisationId} and status = 'active'
        `;
        return "quarantined" as const;
      });
    } catch (error) {
      const ownership = await this.failRefresh(
        authorisationId,
        authorisationGeneration,
        lockId,
        "token_save_failed",
        "failed",
      ).catch(() => "unknown" as const);
      if (ownership === "owned") {
        const revoked = await this.revokeUnsavedRefreshToken(
          refreshed.refreshToken,
        );
        if (revoked) await this.releaseGlobalOperation(lockId);
      }
      if (error instanceof AccountingError) throw error;
      throw new AccountingError(
        "xero_refresh_not_saved",
        "The refreshed Xero token could not be saved safely.",
        503,
      );
    }
    if (outcome === "superseded") {
      throw new AccountingError(
        "xero_refresh_superseded",
        "That Xero refresh belongs to an older authorisation lifecycle.",
        409,
      );
    }
    if (outcome === "quarantined") {
      const revoked = await this.revokeUnsavedRefreshToken(
        refreshed.refreshToken,
      );
      if (revoked) await this.releaseGlobalOperation(lockId);
      throw new AccountingError(
        "xero_identity_quarantined",
        "That Xero identity is quarantined for operator review.",
        409,
      );
    }
    return refreshed.accessToken;
  }

  private async revokeUnsavedRefreshToken(refreshToken: string): Promise<boolean> {
    try {
      await (await this.client()).revoke(refreshToken);
      return true;
    } catch {
      // The local rail is permanently failed and paused before this call. A
      // timeout or failure must not open a reconnect path for a delayed revoke.
      return false;
    }
  }

  private async quarantineAmbiguousRefresh(
    authorisationId: string,
    authorisationGeneration: string,
    lockId: string,
  ): Promise<void> {
    await this.database.begin(async (tx) => {
      await this.assertGlobalOperationIn(tx, lockId);
      const authorisations = await tx<{
        status: string;
        lifecycle_generation: number | string;
      }>`
        select status, lifecycle_generation
        from accounting_authorisations
        where id = ${authorisationId}
        for update
      `;
      if (
        authorisations.length !== 1 ||
        generation(authorisations[0]!.lifecycle_generation) !==
          authorisationGeneration
      ) {
        return;
      }
      const owned = await tx<{ authorisation_id: string }>`
        update accounting_provider_token_sets
        set last_refresh_error_code = 'provider_refresh_outcome_unknown',
            updated_at = clock_timestamp()
        where authorisation_id = ${authorisationId}
          and refresh_lock_id = ${lockId}
        returning authorisation_id
      `;
      if (owned.length !== 1) return;
      await tx`
        update accounting_authorisations
        set status = 'failed',
            lifecycle_generation = lifecycle_generation + case
              when status = 'failed' then 0 else 1 end,
            updated_at = clock_timestamp()
        where id = ${authorisationId}
          and lifecycle_generation = ${authorisationGeneration}
      `;
      await tx`
        update accounting_source_connections
        set status = 'paused', updated_at = clock_timestamp()
        where authorisation_id = ${authorisationId} and status = 'active'
      `;
    });
  }

  private async failRefresh(
    authorisationId: string,
    authorisationGeneration: string,
    lockId: string,
    code: string,
    disposition: "unchanged" | "reauthorisation-required" | "failed",
    releaseGlobalOperationId?: string,
  ): Promise<"owned" | "superseded"> {
    return await this.database.begin(async (tx) => {
      await this.assertGlobalOperationIn(tx, lockId);
      // Keep the same authorisation -> token lock order as final refresh saves
      // and local revocation, preventing an incident path from deadlocking.
      const authorisations = await tx<{
        status: string;
        lifecycle_generation: number | string;
      }>`
        select status, lifecycle_generation
        from accounting_authorisations
        where id = ${authorisationId}
        for update
      `;
      if (
        authorisations.length !== 1 ||
        generation(authorisations[0]!.lifecycle_generation) !==
          authorisationGeneration
      ) {
        return "superseded" as const;
      }
      const ownedLease = await tx<{ authorisation_id: string }>`
        update accounting_provider_token_sets
        set refresh_lock_id = null, refresh_lock_expires_at = null,
            last_refresh_error_code = ${code}, updated_at = clock_timestamp()
        where authorisation_id = ${authorisationId}
          and refresh_lock_id = ${lockId}
        returning authorisation_id
      `;
      if (ownedLease.length > 1) {
        throw new AccountingError(
          "invalid_database_state",
          "More than one Xero token lock was released.",
          503,
        );
      }
      if (ownedLease.length !== 1) return "superseded" as const;
      // The lifecycle check protects a newer explicitly reconciled state. A
      // non-null provider-operation lock is never stolen merely because its
      // diagnostic deadline has passed.
      if (disposition !== "unchanged") {
        const demoted = await tx<{ id: string }>`
          update accounting_authorisations
          set status = ${disposition},
              lifecycle_generation = lifecycle_generation + 1,
              updated_at = clock_timestamp()
          where id = ${authorisationId}
            and status = 'active'
            and lifecycle_generation = ${authorisationGeneration}
          returning id
        `;
        if (demoted.length === 1) {
          await tx`
            update accounting_source_connections
            set status = 'paused', updated_at = clock_timestamp()
            where authorisation_id = ${authorisationId} and status = 'active'
          `;
        }
      }
      if (releaseGlobalOperationId) {
        await this.releaseGlobalOperationIn(tx, releaseGlobalOperationId);
      }
      return "owned" as const;
    });
  }

  private openToken(
    ciphertext: string,
    keyVersion: number,
    authorisationId: string,
    field: "access-token" | "refresh-token",
  ): string {
    return this.vault.open({ ciphertext, keyVersion }, {
      provider: "xero",
      environment: "production",
      recordType: "provider-token-set",
      recordId: authorisationId,
      field,
    });
  }

  private async retireSource(
    tx: AccountingTransaction,
    sourceConnectionId: string,
  ): Promise<void> {
    await tx`
      update accounting_sync_replicas
      set status = 'retired', retired_at = coalesce(
        retired_at,
        clock_timestamp()
      )
      where source_connection_id = ${sourceConnectionId} and status = 'active'
    `;
    await tx`
      update accounting_sync_runs
      set status = 'cancelled', cancelled_at = coalesce(
        cancelled_at,
        clock_timestamp()
      )
      where source_connection_id = ${sourceConnectionId} and status = 'active'
    `;
    await tx`
      update accounting_source_connections
      set status = 'disconnected',
          disconnected_at = coalesce(disconnected_at, clock_timestamp()),
          dirty_generation = dirty_generation + 1,
          updated_at = clock_timestamp()
      where id = ${sourceConnectionId}
    `;
  }
}

async function mapWithConcurrency<Input, Output>(
  values: readonly Input[],
  limit: number,
  operation: (value: Input) => Promise<Output>,
): Promise<Output[]> {
  const output = new Array<Output>(values.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, values.length) },
    async () => {
      while (next < values.length) {
        const index = next++;
        output[index] = await operation(values[index]!);
      }
    },
  );
  await Promise.all(workers);
  return output;
}
