// Provider-neutral accounting connector state and sync protocol.
//
// The API stores grants, selected organisation metadata, leases, manifests and
// checkpoints. Raw provider records cross this process only long enough to be
// returned to the owning browser; they are never inserted into Postgres here.

import { createHash } from "node:crypto";
import {
  ACCOUNTING_SYNC_SCHEMA,
  assertPageManifest,
  canonicalAccountingJson,
  type AcknowledgedPage,
  type DatasetCheckpoint,
  type PageAcknowledgement,
  type PageManifest,
  type SyncRun,
  type SyncRunKind,
  type SyncRunState,
} from "@taxsorted/engine/accounting-sync";

export type AccountingProviderId =
  | "synthetic"
  | "xero"
  | "quickbooks"
  | "freeagent"
  | "sage-accounting-uk";

export type AccountingEnvironment = "sandbox" | "production";
export type SyncKind = SyncRunKind;
export type LocalPageAcknowledgement = PageAcknowledgement & {
  localReplicaId: string;
};

export interface ProviderAuthorisationSeed {
  providerSubjectId: string;
  grantedScopes: readonly string[];
}

export interface ProviderOrganisation {
  id: string;
  name: string;
  countryCode: string;
  baseCurrency: string;
  datasets: readonly string[];
  synthetic: boolean;
}

export interface ProviderOrganisationBinding {
  organisation: ProviderOrganisation;
  // This identifier is returned by the provider directory and never accepted
  // from the browser. It is null for adapters without a separate connection.
  providerConnectionId: string | null;
}

export interface RawProviderPage {
  records: readonly Readonly<Record<string, unknown>>[];
  currentCursor: string | null;
  nextCursor: string;
  isFinal: boolean;
  coverageMarker: string | null;
}

export interface AccountingProvider {
  readonly id: AccountingProviderId;
  readonly environment: AccountingEnvironment;
  beginAuthorisation(userId: string): Promise<ProviderAuthorisationSeed>;
  listOrganisations(authorisationId: string): Promise<readonly ProviderOrganisation[]>;
  pullPage(input: {
    authorisationId: string;
    organisationId: string;
    dataset: string;
    cursor: string | null;
  }): Promise<RawProviderPage>;
}

// Organisation discovery is intentionally separate from financial page
// reading. An OAuth pilot can offer and bind an organisation without gaining a
// path into the local-ledger sync protocol.
export interface AccountingOrganisationDirectory {
  readonly id: AccountingProviderId;
  readonly environment: AccountingEnvironment;
  listOrganisations(authorisationId: string): Promise<readonly ProviderOrganisation[]>;
  resolveOrganisation?(
    authorisationId: string,
    organisationId: string,
  ): Promise<ProviderOrganisationBinding | null>;
}

export interface AccountingTransaction {
  <Row extends object = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): PromiseLike<readonly Row[]>;
}

export interface AccountingSql extends AccountingTransaction {
  begin<T>(
    operation: (transaction: AccountingTransaction) => Promise<T>,
  ): PromiseLike<T>;
}

type AccountingStatus = 400 | 403 | 404 | 409 | 410 | 422 | 503;

export class AccountingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: AccountingStatus,
  ) {
    super(message);
    this.name = "AccountingError";
  }
}

interface AuthorisationRow {
  id: string;
  user_id: string;
  provider: AccountingProviderId;
  provider_environment: AccountingEnvironment;
  provider_subject_id: string;
  status: string;
  granted_scopes: string[];
  created_at: Date | string;
  updated_at: Date | string;
}

interface SourceRow {
  id: string;
  user_id: string;
  authorisation_id: string;
  entity_id: string;
  provider_organisation_id: string;
  organisation_name: string;
  country_code: string;
  base_currency: string;
  status: string;
  dirty_generation: number | string;
  provider: AccountingProviderId;
  provider_environment: AccountingEnvironment;
  provider_connection_id?: string | null;
  disconnected_at?: Date | string | null;
  provider_disconnected_at?: Date | string | null;
  provider_disconnect_lock_id?: string | null;
  created_at: Date | string;
}

interface ReplicaRow {
  id: string;
  user_id: string;
  source_connection_id: string;
  device_id: string;
  local_replica_id: string;
  status: string;
  next_fence: number | string;
  created_at: Date | string;
  provider?: AccountingProviderId;
  provider_environment?: AccountingEnvironment;
  authorisation_id?: string;
  provider_organisation_id?: string;
  replica_status?: string;
  source_status?: string;
  authorisation_status?: string;
  dirty_generation?: number | string;
}

interface RunRow {
  id: string;
  source_connection_id: string;
  replica_id: string;
  dataset: string;
  kind: SyncKind;
  status: string;
  fence: number | string;
  lease_expires_at: Date | string;
  base_cursor: string | null;
  staged_cursor: string | null;
  staged_coverage_marker: string | null;
  next_sequence: number;
  acknowledged_page_count: number;
  acknowledged_record_count: number | string;
  started_dirty_generation: number | string;
  started_at: Date | string;
  provider?: AccountingProviderId;
  provider_environment?: AccountingEnvironment;
  authorisation_id?: string;
  provider_organisation_id?: string;
  replica_status?: string;
  source_status?: string;
  authorisation_status?: string;
  current_dirty_generation?: number | string;
}

interface ManifestRow {
  id: string;
  run_id: string;
  dataset: string;
  sequence: number;
  fence: number | string;
  page_digest: string;
  record_count: number;
  current_cursor: string | null;
  next_cursor: string | null;
  is_final: boolean;
  coverage_marker: string | null;
  expires_at: Date | string;
  created_at: Date | string;
  acknowledged_at: Date | string | null;
}

interface DatabaseNowRow {
  database_now: Date | string;
}

interface CheckpointRow {
  replica_id: string;
  dataset: string;
  completed_run_id: string;
  committed_cursor: string | null;
  committed_coverage_marker: string;
  committed_dirty_generation: number | string;
  page_count: number;
  record_count: number | string;
  completed_at: Date | string;
}

const LEASE_SECONDS = 120;
const MANIFEST_SECONDS = 600;

function date(value: Date | string): Date {
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new AccountingError(
      "invalid_database_time",
      "The database returned an invalid time; no connector state advanced.",
      503,
    );
  }
  return parsed;
}

function iso(value: Date | string): string {
  return date(value).toISOString();
}

function integer(value: number | string, field: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new AccountingError(
      "invalid_database_state",
      `The stored ${field} is invalid; no connector state advanced.`,
      503,
    );
  }
  return parsed;
}

function decimalString(
  value: number | string,
  field: string,
  allowZero = true,
): string {
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new AccountingError(
      "invalid_database_state",
      `The stored ${field} was narrowed before JSON encoding; no connector state advanced.`,
      503,
    );
  }
  const text = typeof value === "number" ? String(value) : value;
  if (!/^(?:0|[1-9]\d*)$/u.test(text) || (!allowZero && text === "0")) {
    throw new AccountingError(
      "invalid_database_state",
      `The stored ${field} is invalid; no connector state advanced.`,
      503,
    );
  }
  return text;
}

function exactlyOne<Row>(
  rows: readonly Row[],
  code: string,
  message: string,
  status: AccountingStatus = 404,
): Row {
  if (rows.length !== 1) throw new AccountingError(code, message, status);
  return rows[0]!;
}

function authorisationView(row: AuthorisationRow) {
  return {
    id: row.id,
    provider: row.provider,
    environment: row.provider_environment,
    status: row.status,
    grantedScopes: [...row.granted_scopes],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    synthetic: row.provider === "synthetic",
  };
}

function sourceView(row: SourceRow) {
  return {
    id: row.id,
    authorisationId: row.authorisation_id,
    entityId: row.entity_id,
    provider: row.provider,
    environment: row.provider_environment,
    organisation: {
      id: row.provider_organisation_id,
      name: row.organisation_name,
      countryCode: row.country_code,
      baseCurrency: row.base_currency,
    },
    status: row.status,
    dirtyGeneration: decimalString(row.dirty_generation, "dirty generation"),
    createdAt: iso(row.created_at),
  };
}

function replicaView(row: ReplicaRow) {
  return {
    id: row.id,
    sourceConnectionId: row.source_connection_id,
    localReplicaId: row.local_replica_id,
    status: row.status,
    createdAt: iso(row.created_at),
  };
}

function syncRunState(value: string): SyncRunState {
  if (
    value !== "active" &&
    value !== "completed" &&
    value !== "cancelled" &&
    value !== "expired" &&
    value !== "failed"
  ) {
    throw new AccountingError(
      "invalid_database_state",
      "The stored sync-run state is invalid; no connector state advanced.",
      503,
    );
  }
  return value;
}

function acknowledgedPageView(
  row: ManifestRow,
  run: RunRow,
): AcknowledgedPage {
  if (!row.acknowledged_at) {
    throw new AccountingError(
      "invalid_database_state",
      "An invalid page appeared in the acknowledged-page list.",
      503,
    );
  }
  const manifest = manifestView(row, run);
  return {
    manifestId: manifest.id,
    digest: manifest.digest,
    sequence: manifest.sequence,
    recordCount: manifest.recordCount,
    currentCursor: manifest.currentCursor,
    nextCursor: manifest.nextCursor,
    coverageMarker: manifest.coverageMarker,
    fence: manifest.fence,
    dirtyGeneration: manifest.dirtyGeneration,
    acknowledgedAt: iso(row.acknowledged_at),
    final: row.is_final,
  };
}

function runView(
  row: RunRow,
  acknowledgedRows: readonly ManifestRow[],
): SyncRun {
  const startedDirtyGeneration = decimalString(
    row.started_dirty_generation,
    "started dirty generation",
  );
  const acknowledgedPages = acknowledgedRows.map((page) =>
    acknowledgedPageView(page, row),
  );
  const acknowledgedRecordCount = integer(
    row.acknowledged_record_count,
    "acknowledged record count",
  );
  let expectedCursor = row.base_cursor;
  const chainIsValid = acknowledgedPages.every((page, sequence) => {
    if (
      page.sequence !== sequence ||
      page.currentCursor !== expectedCursor ||
      (page.final && sequence !== acknowledgedPages.length - 1)
    ) {
      return false;
    }
    expectedCursor = page.nextCursor;
    return true;
  });
  const finalPage = acknowledgedPages.at(-1);
  if (
    !chainIsValid ||
    acknowledgedPages.length !==
      integer(row.acknowledged_page_count, "acknowledged page count") ||
    acknowledgedPages.reduce((sum, page) => sum + page.recordCount, 0) !==
      acknowledgedRecordCount ||
    expectedCursor !== row.staged_cursor ||
    (finalPage?.coverageMarker ?? null) !== row.staged_coverage_marker ||
    (row.staged_coverage_marker !== null) !== (finalPage?.final === true)
  ) {
    throw new AccountingError(
      "invalid_database_state",
      "The stored sync-run acknowledgement totals are inconsistent.",
      503,
    );
  }
  return {
    schema: ACCOUNTING_SYNC_SCHEMA,
    id: row.id,
    sourceConnectionId: row.source_connection_id,
    replicaId: row.replica_id,
    dataset: row.dataset,
    kind: row.kind,
    state: syncRunState(row.status),
    lease: {
      fence: decimalString(row.fence, "fence", false),
      expiresAt: iso(row.lease_expires_at),
    },
    startedDirtyGeneration,
    nextSequence: integer(row.next_sequence, "next sequence"),
    stagedCursor: row.staged_cursor,
    stagedCoverageMarker: row.staged_coverage_marker,
    acknowledgedRecordCount,
    acknowledgedPages,
  };
}

function manifestView(row: ManifestRow, run: RunRow): PageManifest {
  const manifestFence = decimalString(row.fence, "manifest fence", false);
  if (
    row.next_cursor === null ||
    row.run_id !== run.id ||
    row.dataset !== run.dataset ||
    manifestFence !== decimalString(run.fence, "run fence", false)
  ) {
    throw new AccountingError(
      "invalid_database_state",
      "The stored page manifest is not bound to this run; no connector state advanced.",
      503,
    );
  }
  const manifest: PageManifest = {
    schema: ACCOUNTING_SYNC_SCHEMA,
    id: row.id,
    runId: row.run_id,
    sourceConnectionId: run.source_connection_id,
    replicaId: run.replica_id,
    dataset: row.dataset,
    sequence: integer(row.sequence, "manifest sequence"),
    fence: manifestFence,
    digest: row.page_digest,
    recordCount: integer(row.record_count, "manifest record count"),
    currentCursor: row.current_cursor,
    nextCursor: row.next_cursor,
    coverageMarker: row.coverage_marker,
    dirtyGeneration: decimalString(
      run.started_dirty_generation,
      "manifest dirty generation",
    ),
    final: row.is_final,
    expiresAt: iso(row.expires_at),
  };
  try {
    assertPageManifest(manifest);
  } catch {
    throw new AccountingError(
      "invalid_database_state",
      "The stored page manifest is invalid; no connector state advanced.",
      503,
    );
  }
  return manifest;
}

function checkpointView(
  row: CheckpointRow,
  sourceConnectionId: string,
): DatasetCheckpoint {
  if (row.committed_cursor === null) {
    throw new AccountingError(
      "invalid_database_state",
      "The stored checkpoint has no committed cursor.",
      503,
    );
  }
  return {
    schema: ACCOUNTING_SYNC_SCHEMA,
    sourceConnectionId,
    replicaId: row.replica_id,
    dataset: row.dataset,
    completedRunId: row.completed_run_id,
    committedCursor: row.committed_cursor,
    coverageMarker: row.committed_coverage_marker,
    committedDirtyGeneration: decimalString(
      row.committed_dirty_generation,
      "checkpoint dirty generation",
    ),
    pageCount: integer(row.page_count, "checkpoint page count"),
    recordCount: integer(row.record_count, "checkpoint record count"),
    completedAt: iso(row.completed_at),
  };
}

function pageDigest(records: readonly Readonly<Record<string, unknown>>[]): string {
  return `sha256:${createHash("sha256")
    .update(canonicalAccountingJson(records), "utf8")
    .digest("hex")}`;
}

export interface AccountingServiceContract {
  startAuthorisation(
    userId: string,
    provider: AccountingProviderId,
  ): Promise<Record<string, unknown>>;
  listOrganisations(
    userId: string,
    authorisationId: string,
  ): Promise<Record<string, unknown>>;
  createSourceConnection(
    userId: string,
    input: { authorisationId: string; entityId: string; organisationId: string },
  ): Promise<Record<string, unknown>>;
  sourceStatus(
    userId: string,
    deviceId: string,
    sourceConnectionId: string,
    localReplicaId: string,
  ): Promise<Record<string, unknown>>;
  createReplica(
    userId: string,
    deviceId: string,
    sourceConnectionId: string,
    input: { localReplicaId: string },
  ): Promise<Record<string, unknown>>;
  startRun(
    userId: string,
    deviceId: string,
    sourceConnectionId: string,
    input: {
      replicaId: string;
      localReplicaId: string;
      expectedCompletedRunId: string | null;
      dataset: string;
      kind: SyncKind;
    },
  ): Promise<Record<string, unknown>>;
  renewLease(
    userId: string,
    deviceId: string,
    runId: string,
    fence: string,
    localReplicaId: string,
  ): Promise<Record<string, unknown>>;
  pullPage(
    userId: string,
    deviceId: string,
    runId: string,
    dataset: string,
    fence: string,
    localReplicaId: string,
  ): Promise<Record<string, unknown>>;
  acknowledgePage(
    userId: string,
    deviceId: string,
    runId: string,
    input: LocalPageAcknowledgement,
  ): Promise<Record<string, unknown>>;
  completeRun(
    userId: string,
    deviceId: string,
    runId: string,
    fence: string,
    localReplicaId: string,
  ): Promise<Record<string, unknown>>;
  cancelRun(
    userId: string,
    deviceId: string,
    runId: string,
    fence: string,
    localReplicaId: string,
  ): Promise<Record<string, unknown>>;
}

export class AccountingService implements AccountingServiceContract {
  private readonly providers = new Map<AccountingProviderId, AccountingProvider>();
  private readonly directories = new Map<
    AccountingProviderId,
    AccountingOrganisationDirectory
  >();

  constructor(
    private readonly database: AccountingSql,
    providers: readonly AccountingProvider[],
    directories: readonly AccountingOrganisationDirectory[] = providers,
  ) {
    for (const provider of providers) {
      if (this.providers.has(provider.id)) {
        throw new Error(`duplicate accounting provider: ${provider.id}`);
      }
      this.providers.set(provider.id, provider);
    }
    for (const directory of directories) {
      if (this.directories.has(directory.id)) {
        throw new Error(`duplicate accounting organisation directory: ${directory.id}`);
      }
      this.directories.set(directory.id, directory);
    }
  }

  private provider(id: AccountingProviderId): AccountingProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new AccountingError(
        "provider_unavailable",
        "That accounting provider is not available in this build.",
        404,
      );
    }
    return provider;
  }

  private directory(
    id: AccountingProviderId,
    environment: AccountingEnvironment,
  ): AccountingOrganisationDirectory {
    const directory = this.directories.get(id);
    if (!directory || directory.environment !== environment) {
      throw new AccountingError(
        "organisation_directory_unavailable",
        "That provider's organisation directory is not available in this build.",
        404,
      );
    }
    return directory;
  }

  private pageProvider(id: AccountingProviderId): AccountingProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new AccountingError(
        "dataset_unavailable",
        "Financial record sync is not available for that provider.",
        422,
      );
    }
    return provider;
  }

  private async authorisation(userId: string, id: string): Promise<AuthorisationRow> {
    const rows = await this.database<AuthorisationRow>`
      select id, user_id, provider, provider_environment, provider_subject_id,
             status, granted_scopes, created_at, updated_at
      from accounting_authorisations
      where id = ${id} and user_id = ${userId}
    `;
    const row = exactlyOne(
      rows,
      "authorisation_not_found",
      "That accounting authorisation was not found.",
    );
    if (row.status !== "active") {
      throw new AccountingError(
        "authorisation_not_active",
        "That accounting authorisation is not active.",
        409,
      );
    }
    return row;
  }

  async startAuthorisation(userId: string, providerId: AccountingProviderId) {
    const provider = this.provider(providerId);
    const seed = await provider.beginAuthorisation(userId);
    const rows = await this.database<AuthorisationRow>`
      insert into accounting_authorisations (
        user_id, provider, provider_environment, provider_subject_id,
        status, granted_scopes
      ) values (
        ${userId}, ${provider.id}, ${provider.environment},
        ${seed.providerSubjectId}, 'active', ${[...seed.grantedScopes]}
      )
      on conflict (user_id, provider, provider_environment, provider_subject_id)
      do update set
        status = 'active',
        granted_scopes = excluded.granted_scopes,
        revoked_at = null,
        updated_at = clock_timestamp()
      returning id, user_id, provider, provider_environment, provider_subject_id,
                status, granted_scopes, created_at, updated_at
    `;
    return { authorisation: authorisationView(exactlyOne(
      rows,
      "authorisation_failed",
      "The synthetic authorisation could not be created.",
      503,
    )) };
  }

  async listOrganisations(userId: string, authorisationId: string) {
    const authorisation = await this.authorisation(userId, authorisationId);
    const directory = this.directory(
      authorisation.provider,
      authorisation.provider_environment,
    );
    const organisations = await directory.listOrganisations(authorisation.id);
    return {
      authorisation: authorisationView(authorisation),
      organisations: organisations.map((organisation) => ({ ...organisation })),
      persisted: false,
    };
  }

  async createSourceConnection(
    userId: string,
    input: { authorisationId: string; entityId: string; organisationId: string },
  ) {
    const authorisation = await this.authorisation(userId, input.authorisationId);
    const directory = this.directory(
      authorisation.provider,
      authorisation.provider_environment,
    );
    const resolveCurrent = async (): Promise<ProviderOrganisationBinding> => {
      let resolved: ProviderOrganisationBinding | null;
      if (directory.resolveOrganisation) {
        resolved = await directory.resolveOrganisation(
          authorisation.id,
          input.organisationId,
        );
      } else {
        const organisations = await directory.listOrganisations(authorisation.id);
        const organisation = organisations.find(
          (offered) => offered.id === input.organisationId,
        );
        resolved = organisation
          ? { organisation, providerConnectionId: null }
          : null;
      }
      if (!resolved) {
        throw new AccountingError(
          "organisation_not_offered",
          "Select an organisation offered by this authorisation.",
          422,
        );
      }
      if (
        authorisation.provider === "xero" &&
        (!resolved.providerConnectionId ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
            .test(resolved.providerConnectionId))
      ) {
        throw new AccountingError(
          "invalid_provider_binding",
          "The provider did not return a safe organisation connection binding.",
          503,
        );
      }
      return resolved;
    };
    const resolved = await resolveCurrent();
    const selected = resolved.organisation;

    const outcome: { kind: "ready"; row: SourceRow } | {
      kind: "rebind";
      row: SourceRow;
    } = await this.database.begin(async (transaction) => {
      const eligible = await transaction<AuthorisationRow & { entity_id: string }>`
        select a.id, a.user_id, a.provider, a.provider_environment,
               a.provider_subject_id, a.status, a.granted_scopes,
               a.created_at, a.updated_at, e.id as entity_id
        from accounting_authorisations a
        join entities e on e.id = ${input.entityId} and e.user_id = ${userId}
        where a.id = ${input.authorisationId}
          and a.user_id = ${userId}
          and a.status = 'active'
        for update of a, e
      `;
      exactlyOne(
        eligible,
        "connection_owner_mismatch",
        "Use an account-owned entity and an active authorisation from the same passkey account.",
        403,
      );

      const inserted = await transaction<SourceRow>`
        insert into accounting_source_connections (
          user_id, authorisation_id, entity_id, provider_organisation_id,
          organisation_name, country_code, base_currency, status,
          provider, provider_environment, provider_connection_id
        ) values (
          ${userId}, ${input.authorisationId}, ${input.entityId}, ${selected.id},
          ${selected.name}, ${selected.countryCode}, ${selected.baseCurrency}, 'active',
          ${authorisation.provider}, ${authorisation.provider_environment},
          ${resolved.providerConnectionId}
        )
        on conflict (authorisation_id, provider_organisation_id) do nothing
        returning id, user_id, authorisation_id, entity_id,
                  provider_organisation_id, organisation_name, country_code,
                  base_currency, status, dirty_generation, provider,
                  provider_environment, provider_connection_id, created_at
      `;
      if (inserted.length === 1) {
        return { kind: "ready" as const, row: inserted[0]! };
      }

      const existing = await transaction<SourceRow>`
        select sc.id, sc.user_id, sc.authorisation_id, sc.entity_id,
               sc.provider_organisation_id, sc.organisation_name,
               sc.country_code, sc.base_currency, sc.status,
               sc.dirty_generation, sc.provider_connection_id,
               sc.disconnected_at, sc.provider_disconnected_at,
               sc.provider_disconnect_lock_id, sc.created_at,
               a.provider, a.provider_environment
        from accounting_source_connections sc
        join accounting_authorisations a on a.id = sc.authorisation_id
        where sc.authorisation_id = ${input.authorisationId}
          and sc.provider_organisation_id = ${selected.id}
          and sc.user_id = ${userId}
        for update of sc
      `;
      const found = exactlyOne(
        existing,
        "source_connection_conflict",
        "That provider organisation could not be linked safely.",
        409,
      );
      const xeroCanRebind =
        found.provider === "xero" &&
        found.provider_disconnect_lock_id == null &&
        (found.status === "paused" ||
          (found.status === "disconnected" &&
            found.provider_disconnected_at != null));
      if (xeroCanRebind) {
        // The provider lookup happened before this lifecycle row was locked.
        // Re-resolve after releasing the lock, then bind with an exact CAS.
        return { kind: "rebind" as const, row: found };
      }
      if (
        found.entity_id !== input.entityId ||
        found.status !== "active" ||
        found.provider_connection_id !== resolved.providerConnectionId
      ) {
        throw new AccountingError(
          "organisation_already_linked",
          "That provider organisation already has a different or inactive TaxSorted link.",
          409,
        );
      }
      return { kind: "ready" as const, row: found };
    });

    if (outcome.kind === "ready") {
      return { sourceConnection: sourceView(outcome.row) };
    }

    const current = await resolveCurrent();
    const selectedCurrent = current.organisation;
    const found = outcome.row;
    const row = await this.database.begin(async (transaction) => {
      const eligible = await transaction<AuthorisationRow & { entity_id: string }>`
        select a.id, a.user_id, a.provider, a.provider_environment,
               a.provider_subject_id, a.status, a.granted_scopes,
               a.created_at, a.updated_at, e.id as entity_id
        from accounting_authorisations a
        join entities e on e.id = ${input.entityId} and e.user_id = ${userId}
        where a.id = ${input.authorisationId}
          and a.user_id = ${userId}
          and a.status = 'active'
        for update of a, e
      `;
      exactlyOne(
        eligible,
        "connection_owner_mismatch",
        "Use an account-owned entity and an active authorisation from the same passkey account.",
        403,
      );
      const rebound = await transaction<SourceRow>`
        update accounting_source_connections
        set entity_id = ${input.entityId},
            organisation_name = ${selectedCurrent.name},
            country_code = ${selectedCurrent.countryCode},
            base_currency = ${selectedCurrent.baseCurrency},
            provider_connection_id = ${current.providerConnectionId},
            status = 'active',
            disconnected_at = null,
            provider_disconnected_at = null,
            dirty_generation = dirty_generation + 1,
            updated_at = clock_timestamp()
        where id = ${found.id}
          and user_id = ${userId}
          and authorisation_id = ${input.authorisationId}
          and provider = 'xero'
          and provider_environment = ${authorisation.provider_environment}
          and provider_organisation_id = ${selectedCurrent.id}
          and status = ${found.status}
          and dirty_generation = ${decimalString(
            found.dirty_generation,
            "dirty generation",
          )}
          and provider_connection_id is not distinct from ${found.provider_connection_id}
          and provider_disconnected_at is not distinct from ${found.provider_disconnected_at}
          and provider_disconnect_lock_id is null
          and (
            status = 'paused'
            or (
              status = 'disconnected'
              and provider_disconnected_at is not null
            )
          )
        returning id, user_id, authorisation_id, entity_id,
                  provider_organisation_id, organisation_name, country_code,
                  base_currency, status, dirty_generation, provider,
                  provider_environment, provider_connection_id, created_at
      `;
      return exactlyOne(
        rebound,
        "source_connection_conflict",
        "That Xero organisation changed while it was being rebound. Try again.",
        409,
      );
    });
    return { sourceConnection: sourceView(row) };
  }

  async sourceStatus(
    userId: string,
    deviceId: string,
    sourceConnectionId: string,
    localReplicaId: string,
  ) {
    const sources = await this.database<SourceRow>`
      select sc.id, sc.user_id, sc.authorisation_id, sc.entity_id,
             sc.provider_organisation_id, sc.organisation_name,
             sc.country_code, sc.base_currency, sc.status,
             sc.dirty_generation, sc.created_at,
             a.provider, a.provider_environment
      from accounting_source_connections sc
      join accounting_authorisations a on a.id = sc.authorisation_id
      where sc.id = ${sourceConnectionId} and sc.user_id = ${userId}
    `;
    const source = exactlyOne(
      sources,
      "source_connection_not_found",
      "That accounting source connection was not found.",
    );
    const replicas = await this.database<ReplicaRow>`
      select id, user_id, source_connection_id, device_id, local_replica_id,
             status, next_fence, created_at
      from accounting_sync_replicas
      where source_connection_id = ${sourceConnectionId}
        and user_id = ${userId}
        and device_id = ${deviceId}
        and local_replica_id = ${localReplicaId}
      order by created_at
    `;
    const checkpoints = await this.database<CheckpointRow>`
      select cp.replica_id, cp.dataset, cp.completed_run_id,
             cp.committed_cursor, cp.committed_coverage_marker,
             cp.committed_dirty_generation, cp.page_count, cp.record_count,
             cp.completed_at
      from accounting_dataset_checkpoints cp
      join accounting_sync_replicas rp on rp.id = cp.replica_id
      where rp.source_connection_id = ${sourceConnectionId}
        and rp.user_id = ${userId}
        and rp.device_id = ${deviceId}
        and rp.local_replica_id = ${localReplicaId}
      order by cp.completed_at
    `;
    return {
      sourceConnection: sourceView(source),
      replicas: replicas.map(replicaView),
      checkpoints: checkpoints.map((checkpoint) =>
        checkpointView(checkpoint, sourceConnectionId),
      ),
    };
  }

  async createReplica(
    userId: string,
    deviceId: string,
    sourceConnectionId: string,
    input: { localReplicaId: string },
  ) {
    const sourceProviders = await this.database<{
      provider: AccountingProviderId;
      provider_environment: AccountingEnvironment;
    }>`
      select a.provider, a.provider_environment
      from accounting_source_connections sc
      join accounting_authorisations a on a.id = sc.authorisation_id
      where sc.id = ${sourceConnectionId}
        and sc.user_id = ${userId}
        and sc.status = 'active'
        and a.status = 'active'
    `;
    const sourceProvider = exactlyOne(
      sourceProviders,
      "source_connection_not_active",
      "An active owned source connection is required before creating a browser replica.",
      409,
    );
    this.pageProvider(sourceProvider.provider);

    const replica = await this.database.begin(async (transaction) => {
      const lockedSources = await transaction<{
        provider: AccountingProviderId;
        provider_environment: AccountingEnvironment;
      }>`
        select a.provider, a.provider_environment
        from accounting_source_connections sc
        join accounting_authorisations a on a.id = sc.authorisation_id
        where sc.id = ${sourceConnectionId}
          and sc.user_id = ${userId}
          and sc.status = 'active'
          and a.status = 'active'
        for update of sc
      `;
      const lockedSource = exactlyOne(
        lockedSources,
        "source_connection_not_active",
        "An active owned source connection is required before creating a browser replica.",
        409,
      );
      this.pageProvider(lockedSource.provider);
      const inserted = await transaction<ReplicaRow>`
        insert into accounting_sync_replicas (
          user_id, source_connection_id, device_id, local_replica_id
        )
        select ${userId}, sc.id, ${deviceId}, ${input.localReplicaId}
        from accounting_source_connections sc
        join accounting_authorisations a on a.id = sc.authorisation_id
        where sc.id = ${sourceConnectionId}
          and sc.user_id = ${userId}
          and sc.status = 'active'
          and a.status = 'active'
        on conflict (source_connection_id, device_id, local_replica_id) do nothing
        returning id, user_id, source_connection_id, device_id,
                  local_replica_id, status, next_fence, created_at
      `;
      if (inserted.length === 1) return inserted[0]!;

      const existing = await transaction<ReplicaRow>`
        select rp.id, rp.user_id, rp.source_connection_id, rp.device_id,
               rp.local_replica_id, rp.status, rp.next_fence, rp.created_at
        from accounting_sync_replicas rp
        join accounting_source_connections sc on sc.id = rp.source_connection_id
        join accounting_authorisations a on a.id = sc.authorisation_id
        where rp.source_connection_id = ${sourceConnectionId}
          and rp.user_id = ${userId}
          and rp.device_id = ${deviceId}
          and rp.local_replica_id = ${input.localReplicaId}
          and sc.status = 'active'
          and a.status = 'active'
        for update of rp
      `;
      const found = exactlyOne(
        existing,
        "source_connection_not_active",
        "An active owned source connection is required before creating a browser replica.",
        409,
      );
      if (found.status !== "active") {
        throw new AccountingError(
          "replica_retired",
          "That local browser replica was retired and cannot be revived.",
          409,
        );
      }
      return found;
    });
    return { replica: replicaView(replica) };
  }

  async startRun(
    userId: string,
    deviceId: string,
    sourceConnectionId: string,
    input: {
      replicaId: string;
      localReplicaId: string;
      expectedCompletedRunId: string | null;
      dataset: string;
      kind: SyncKind;
    },
  ) {
    if (input.kind !== "initial" && input.kind !== "incremental") {
      throw new AccountingError(
        "sync_kind_unavailable",
        "Repair and pre-filing comparisons are not implemented in this connector proof.",
        422,
      );
    }
    const run = await this.database.begin(async (transaction) => {
      const sourceRows = await transaction<SourceRow & {
        authorisation_status: string;
      }>`
        select sc.id, sc.user_id, sc.authorisation_id, sc.entity_id,
               sc.provider_organisation_id, sc.organisation_name,
               sc.country_code, sc.base_currency, sc.status,
               sc.dirty_generation, sc.created_at,
               a.provider, a.provider_environment,
               a.status as authorisation_status
        from accounting_source_connections sc
        join accounting_authorisations a on a.id = sc.authorisation_id
        where sc.id = ${sourceConnectionId}
          and sc.user_id = ${userId}
        for update of sc
      `;
      const source = exactlyOne(
        sourceRows,
        "source_connection_not_found",
        "That accounting source connection was not found.",
      );
      if (source.status !== "active" || source.authorisation_status !== "active") {
        throw new AccountingError(
          "connection_not_active",
          "The authorisation, source connection and browser replica must all be active.",
          409,
        );
      }
      this.pageProvider(source.provider);
      const replicaRows = await transaction<ReplicaRow>`
        select rp.id, rp.user_id, rp.source_connection_id, rp.device_id,
               rp.local_replica_id, rp.status,
               rp.next_fence, rp.created_at, sc.status as source_status,
               sc.dirty_generation, sc.provider_organisation_id,
               a.id as authorisation_id, a.provider,
               a.provider_environment, a.status as authorisation_status
        from accounting_sync_replicas rp
        join accounting_source_connections sc on sc.id = rp.source_connection_id
        join accounting_authorisations a on a.id = sc.authorisation_id
        where rp.id = ${input.replicaId}
          and rp.source_connection_id = ${sourceConnectionId}
          and rp.user_id = ${userId}
          and rp.device_id = ${deviceId}
          and rp.local_replica_id = ${input.localReplicaId}
        for update of rp
      `;
      const replica = exactlyOne(
        replicaRows,
        "replica_not_found",
        "That browser replica was not found for this source connection.",
      );
      if (
        replica.status !== "active" ||
        replica.source_status !== "active" ||
        replica.authorisation_status !== "active"
      ) {
        throw new AccountingError(
          "connection_not_active",
          "The authorisation, source connection and browser replica must all be active.",
          409,
        );
      }
      this.pageProvider(replica.provider!);
      // This first mounted adapter has one route-validated dataset. Keep future
      // provider/network discovery outside the replica lock and transaction.
      if (input.dataset !== "bank-transactions") {
        throw new AccountingError(
          "dataset_unavailable",
          "That dataset is not available in this connector proof.",
          422,
        );
      }

      const now = exactlyOne(
        await transaction<DatabaseNowRow>`select clock_timestamp() as database_now`,
        "database_time_missing",
        "The database clock was unavailable; no sync run began.",
        503,
      );
      const activeRows = await transaction<RunRow>`
        select id, source_connection_id, replica_id, dataset, kind, status,
               fence, lease_expires_at, base_cursor, staged_cursor,
               staged_coverage_marker, next_sequence,
               acknowledged_page_count, acknowledged_record_count,
               started_dirty_generation, started_at
        from accounting_sync_runs
        where replica_id = ${input.replicaId} and status = 'active'
        for update
      `;
      if (activeRows.length > 1) {
        throw new AccountingError(
          "multiple_active_runs",
          "More than one active run was found; no sync state advanced.",
          503,
        );
      }
      const active = activeRows[0];
      if (active && date(active.lease_expires_at).getTime() > date(now.database_now).getTime()) {
        throw new AccountingError(
          "sync_run_already_active",
          "This browser replica already has an unexpired sync run.",
          409,
        );
      }
      if (active) {
        await transaction`
          update accounting_sync_runs
          set status = 'expired'
          where id = ${active.id} and status = 'active'
        `;
      }

      const checkpoints = await transaction<CheckpointRow>`
        select replica_id, dataset, completed_run_id, committed_cursor,
               committed_coverage_marker, committed_dirty_generation,
               page_count, record_count, completed_at
        from accounting_dataset_checkpoints
        where replica_id = ${input.replicaId} and dataset = ${input.dataset}
      `;
      if (checkpoints.length > 1) {
        throw new AccountingError(
          "multiple_checkpoints",
          "More than one dataset checkpoint was found; no sync run began.",
          503,
        );
      }
      if (input.kind === "initial" && checkpoints.length !== 0) {
        throw new AccountingError(
          "initial_sync_has_checkpoint",
          "An initial run requires a fresh browser replica with no completed checkpoint.",
          409,
        );
      }
      if (input.kind === "incremental" && checkpoints.length !== 1) {
        throw new AccountingError(
          "incremental_sync_needs_checkpoint",
          "An incremental run requires exactly one completed checkpoint.",
          409,
        );
      }
      if ((checkpoints[0]?.completed_run_id ?? null) !== input.expectedCompletedRunId) {
        throw new AccountingError(
          "sync_checkpoint_changed",
          "The completed checkpoint changed after this browser inspected it. Read status again.",
          409,
        );
      }
      const baseCursor = checkpoints[0]?.committed_cursor ?? null;
      const fences = await transaction<{ next_fence: number | string }>`
        update accounting_sync_replicas
        set next_fence = next_fence + 1
        where id = ${input.replicaId}
        returning next_fence
      `;
      const fence = decimalString(exactlyOne(
        fences,
        "fence_not_issued",
        "A sync fence could not be issued.",
        503,
      ).next_fence, "fence", false);
      const runs = await transaction<RunRow>`
        insert into accounting_sync_runs (
          source_connection_id, replica_id, dataset, kind, status, fence,
          lease_expires_at, base_cursor, staged_cursor,
          started_dirty_generation
        ) values (
          ${sourceConnectionId}, ${input.replicaId}, ${input.dataset},
          ${input.kind}, 'active', ${fence},
          clock_timestamp() + ${LEASE_SECONDS} * interval '1 second',
          ${baseCursor}, ${baseCursor}, ${decimalString(replica.dirty_generation!, "dirty generation")}
        )
        returning id, source_connection_id, replica_id, dataset, kind, status,
                  fence, lease_expires_at, base_cursor, staged_cursor,
                  staged_coverage_marker, next_sequence,
                  acknowledged_page_count, acknowledged_record_count,
                  started_dirty_generation, started_at
      `;
      return exactlyOne(
        runs,
        "sync_run_not_created",
        "The sync run could not be created.",
        503,
      );
    });
    return { run: runView(run, []) };
  }

  private async lockCurrentRun(
    transaction: AccountingTransaction,
    userId: string,
    deviceId: string,
    runId: string,
    fence: string,
    localReplicaId: string,
    allowCompleted = false,
  ): Promise<{ run: RunRow; now: Date }> {
    const rows = await transaction<RunRow>`
      select r.id, r.source_connection_id, r.replica_id, r.dataset, r.kind,
             r.status, r.fence, r.lease_expires_at, r.base_cursor,
             r.staged_cursor, r.staged_coverage_marker, r.next_sequence,
             r.acknowledged_page_count, r.acknowledged_record_count,
             r.started_dirty_generation, r.started_at,
             rp.status as replica_status,
             sc.status as source_status,
             sc.dirty_generation as current_dirty_generation,
             sc.provider_organisation_id, a.id as authorisation_id,
             a.provider, a.provider_environment,
             a.status as authorisation_status
      from accounting_sync_runs r
      join accounting_sync_replicas rp on rp.id = r.replica_id
      join accounting_source_connections sc on sc.id = r.source_connection_id
      join accounting_authorisations a on a.id = sc.authorisation_id
      where r.id = ${runId}
        and rp.user_id = ${userId}
        and rp.device_id = ${deviceId}
        and rp.local_replica_id = ${localReplicaId}
      for update of r
    `;
    const run = exactlyOne(
      rows,
      "sync_run_not_found",
      "That sync run was not found.",
    );
    const nowRow = exactlyOne(
      await transaction<DatabaseNowRow>`select clock_timestamp() as database_now`,
      "database_time_missing",
      "The database clock was unavailable; no sync state advanced.",
      503,
    );
    const now = date(nowRow.database_now);
    const exactFence = decimalString(run.fence, "fence", false) === fence;
    if (allowCompleted && run.status === "completed" && exactFence) {
      return { run, now };
    }
    if (
      run.status !== "active" ||
      !exactFence ||
      date(run.lease_expires_at).getTime() <= now.getTime()
    ) {
      throw new AccountingError(
        "stale_sync_fence",
        "This sync run no longer owns the current unexpired lease.",
        409,
      );
    }
    if (
      run.replica_status !== "active" ||
      run.source_status !== "active" ||
      run.authorisation_status !== "active"
    ) {
      throw new AccountingError(
        "connection_not_active",
        "The accounting authorisation or source connection is not active.",
        409,
      );
    }
    return { run, now };
  }

  async renewLease(
    userId: string,
    deviceId: string,
    runId: string,
    fence: string,
    localReplicaId: string,
  ) {
    const renewed = await this.database.begin(async (transaction) => {
      await this.lockCurrentRun(
        transaction,
        userId,
        deviceId,
        runId,
        fence,
        localReplicaId,
      );
      const rows = await transaction<RunRow>`
        update accounting_sync_runs
        set lease_expires_at = clock_timestamp() + ${LEASE_SECONDS} * interval '1 second'
        where id = ${runId} and fence = ${fence} and status = 'active'
        returning id, source_connection_id, replica_id, dataset, kind, status,
                  fence, lease_expires_at, base_cursor, staged_cursor,
                  staged_coverage_marker, next_sequence,
                  acknowledged_page_count, acknowledged_record_count,
                  started_dirty_generation, started_at
      `;
      const run = exactlyOne(
        rows,
        "lease_not_renewed",
        "The current sync lease could not be renewed.",
        409,
      );
      const acknowledgedPages = await transaction<ManifestRow>`
        select id, run_id, dataset, sequence, fence, page_digest,
               record_count, current_cursor, next_cursor, is_final,
               coverage_marker, expires_at, created_at, acknowledged_at
        from accounting_page_manifests
        where run_id = ${runId} and acknowledged_at is not null
        order by sequence
      `;
      return { run, acknowledgedPages };
    });
    return { run: runView(renewed.run, renewed.acknowledgedPages) };
  }

  async pullPage(
    userId: string,
    deviceId: string,
    runId: string,
    dataset: string,
    fence: string,
    localReplicaId: string,
  ) {
    const initialRows = await this.database<RunRow>`
      select r.id, r.source_connection_id, r.replica_id, r.dataset, r.kind,
             r.status, r.fence, r.lease_expires_at, r.base_cursor,
             r.staged_cursor, r.staged_coverage_marker, r.next_sequence,
             r.acknowledged_page_count, r.acknowledged_record_count,
             r.started_dirty_generation, r.started_at,
             rp.status as replica_status,
             sc.status as source_status, sc.dirty_generation as current_dirty_generation,
             sc.provider_organisation_id, a.id as authorisation_id,
             a.provider, a.provider_environment,
             a.status as authorisation_status
      from accounting_sync_runs r
      join accounting_sync_replicas rp on rp.id = r.replica_id
      join accounting_source_connections sc on sc.id = r.source_connection_id
      join accounting_authorisations a on a.id = sc.authorisation_id
      where r.id = ${runId}
        and rp.user_id = ${userId}
        and rp.device_id = ${deviceId}
        and rp.local_replica_id = ${localReplicaId}
        and rp.status = 'active'
        and r.status = 'active'
        and r.fence = ${fence}
        and r.lease_expires_at > clock_timestamp()
        and sc.status = 'active'
        and a.status = 'active'
    `;
    const initial = exactlyOne(
      initialRows,
      "stale_sync_fence",
      "This sync run no longer owns the current unexpired lease.",
      409,
    );
    if (initial.dataset !== dataset) {
      throw new AccountingError(
        "dataset_mismatch",
        "The requested dataset does not match this sync run.",
        422,
      );
    }
    if (initial.staged_coverage_marker !== null) {
      throw new AccountingError(
        "run_ready_to_complete",
        "The final page is acknowledged; complete this run instead of fetching another page.",
        409,
      );
    }

    const provider = this.pageProvider(initial.provider!);
    let page: RawProviderPage;
    try {
      page = await provider.pullPage({
        authorisationId: initial.authorisation_id!,
        organisationId: initial.provider_organisation_id!,
        dataset,
        cursor: initial.staged_cursor,
      });
    } catch {
      throw new AccountingError(
        "provider_page_failed",
        "The synthetic provider could not produce that page.",
        503,
      );
    }
    if (
      page.currentCursor !== initial.staged_cursor ||
      (page.records.length < 1 && !page.isFinal) ||
      page.isFinal !== (page.coverageMarker !== null) ||
      (page.coverageMarker !== null && page.coverageMarker.length === 0) ||
      typeof page.nextCursor !== "string" ||
      page.nextCursor.length === 0
    ) {
      throw new AccountingError(
        "invalid_provider_page",
        "The provider returned an internally inconsistent page.",
        503,
      );
    }
    const digest = pageDigest(page.records);

    const manifest = await this.database.begin(async (transaction) => {
      const { run, now } = await this.lockCurrentRun(
        transaction,
        userId,
        deviceId,
        runId,
        fence,
        localReplicaId,
      );
      if (
        run.dataset !== dataset ||
        run.next_sequence !== initial.next_sequence ||
        run.staged_cursor !== initial.staged_cursor ||
        run.staged_coverage_marker !== null
      ) {
        throw new AccountingError(
          "sync_run_advanced",
          "The sync run advanced while this page was being prepared. Request its current page.",
          409,
        );
      }

      const existingRows = await transaction<ManifestRow>`
        select id, run_id, dataset, sequence, fence, page_digest,
               record_count, current_cursor, next_cursor, is_final,
               coverage_marker, expires_at, created_at, acknowledged_at
        from accounting_page_manifests
        where run_id = ${runId} and sequence = ${run.next_sequence}
        for update
      `;
      if (existingRows.length > 1) {
        throw new AccountingError(
          "multiple_page_manifests",
          "More than one page manifest was found; no sync state advanced.",
          503,
        );
      }
      const existing = existingRows[0];
      if (existing) {
        if (date(existing.expires_at).getTime() <= now.getTime()) {
          throw new AccountingError(
            "page_manifest_expired",
            "That page manifest expired. Start a fresh sync run from the committed checkpoint.",
            410,
          );
        }
        if (
          existing.dataset !== dataset ||
          decimalString(existing.fence, "manifest fence", false) !== fence ||
          existing.page_digest !== digest ||
          existing.record_count !== page.records.length ||
          existing.current_cursor !== page.currentCursor ||
          existing.next_cursor !== page.nextCursor ||
          existing.is_final !== page.isFinal ||
          existing.coverage_marker !== page.coverageMarker
        ) {
          throw new AccountingError(
            "page_manifest_changed",
            "The provider page changed before acknowledgement. Start a repair run; this manifest was not replaced.",
            409,
          );
        }
        return manifestView(existing, run);
      }

      const inserted = await transaction<ManifestRow>`
        insert into accounting_page_manifests (
          run_id, dataset, sequence, fence, page_digest, record_count,
          current_cursor, next_cursor, is_final, coverage_marker, expires_at
        ) values (
          ${runId}, ${dataset}, ${run.next_sequence}, ${fence}, ${digest},
          ${page.records.length}, ${page.currentCursor}, ${page.nextCursor},
          ${page.isFinal}, ${page.coverageMarker},
          clock_timestamp() + ${MANIFEST_SECONDS} * interval '1 second'
        )
        returning id, run_id, dataset, sequence, fence, page_digest,
                  record_count, current_cursor, next_cursor, is_final,
                  coverage_marker, expires_at, created_at, acknowledged_at
      `;
      return manifestView(exactlyOne(
        inserted,
        "page_manifest_not_created",
        "The page manifest could not be created.",
        503,
      ), run);
    });

    return { manifest, records: page.records };
  }

  async acknowledgePage(
    userId: string,
    deviceId: string,
    runId: string,
    input: LocalPageAcknowledgement,
  ) {
    return await this.database.begin(async (transaction) => {
      const { run, now } = await this.lockCurrentRun(
        transaction,
        userId,
        deviceId,
        runId,
        input.fence,
        input.localReplicaId,
      );
      const rows = await transaction<ManifestRow>`
        select id, run_id, dataset, sequence, fence, page_digest,
               record_count, current_cursor, next_cursor, is_final,
               coverage_marker, expires_at, created_at, acknowledged_at
        from accounting_page_manifests
        where id = ${input.manifestId} and run_id = ${runId}
        for update
      `;
      const manifest = exactlyOne(
        rows,
        "page_manifest_not_found",
        "That page manifest was not found for this sync run.",
      );
      const issuedManifest = manifestView(manifest, run);
      if (
        input.runId !== runId ||
        input.replicaId !== run.replica_id ||
        input.dataset !== run.dataset ||
        input.sequence !== issuedManifest.sequence ||
        issuedManifest.fence !== input.fence ||
        issuedManifest.digest !== input.digest
      ) {
        throw new AccountingError(
          "page_manifest_mismatch",
          "The acknowledgement does not exactly match the API-issued manifest.",
          409,
        );
      }
      if (manifest.acknowledged_at) {
        return {
          acknowledgement: {
            manifestId: manifest.id,
            runId: manifest.run_id,
            replicaId: run.replica_id,
            dataset: manifest.dataset,
            sequence: manifest.sequence,
            fence: input.fence,
            digest: manifest.page_digest,
          },
          changed: false,
          nextSequence: run.next_sequence,
        };
      }
      if (
        run.staged_coverage_marker !== null ||
        issuedManifest.currentCursor !== run.staged_cursor
      ) {
        throw new AccountingError(
          "page_cursor_mismatch",
          "Only the page at the run's current staged cursor can be acknowledged.",
          409,
        );
      }
      if (date(manifest.expires_at).getTime() <= now.getTime()) {
        throw new AccountingError(
          "page_manifest_expired",
          "That page manifest expired before acknowledgement.",
          410,
        );
      }
      if (manifest.sequence !== run.next_sequence) {
        throw new AccountingError(
          "page_sequence_mismatch",
          "Only the next API-issued page can be acknowledged.",
          409,
        );
      }
      if (
        !Number.isSafeInteger(
          integer(
            run.acknowledged_record_count,
            "acknowledged record count",
          ) + issuedManifest.recordCount,
        )
      ) {
        throw new AccountingError(
          "record_count_too_large",
          "The acknowledged record count cannot be represented safely in JSON.",
          503,
        );
      }

      await transaction`
        update accounting_page_manifests
        set acknowledged_at = clock_timestamp()
        where id = ${manifest.id} and acknowledged_at is null
      `;
      const advanced = await transaction<{ next_sequence: number }>`
        update accounting_sync_runs
        set staged_cursor = ${issuedManifest.nextCursor},
            staged_coverage_marker = ${issuedManifest.coverageMarker},
            next_sequence = next_sequence + 1,
            acknowledged_page_count = acknowledged_page_count + 1,
            acknowledged_record_count = acknowledged_record_count + ${issuedManifest.recordCount}
        where id = ${runId}
          and fence = ${input.fence}
          and status = 'active'
          and next_sequence = ${manifest.sequence}
        returning next_sequence
      `;
      const next = exactlyOne(
        advanced,
        "page_acknowledgement_raced",
        "The page acknowledgement lost its current fence; no checkpoint advanced.",
        409,
      );
      return {
        acknowledgement: {
          manifestId: manifest.id,
          runId: manifest.run_id,
          replicaId: run.replica_id,
          dataset: manifest.dataset,
          sequence: manifest.sequence,
          fence: input.fence,
          digest: manifest.page_digest,
        },
        changed: true,
        nextSequence: next.next_sequence,
      };
    });
  }

  async completeRun(
    userId: string,
    deviceId: string,
    runId: string,
    fence: string,
    localReplicaId: string,
  ) {
    return await this.database.begin(async (transaction) => {
      const { run } = await this.lockCurrentRun(
        transaction,
        userId,
        deviceId,
        runId,
        fence,
        localReplicaId,
        true,
      );
      if (run.status === "completed") {
        const manifests = await transaction<ManifestRow>`
          select id, run_id, dataset, sequence, fence, page_digest,
                 record_count, current_cursor, next_cursor, is_final,
                 coverage_marker, expires_at, created_at, acknowledged_at
          from accounting_page_manifests
          where run_id = ${runId}
          order by sequence
          for update
        `;
        const checkpointRows = await transaction<CheckpointRow>`
          select replica_id, dataset, completed_run_id, committed_cursor,
                 committed_coverage_marker, committed_dirty_generation,
                 page_count, record_count, completed_at
          from accounting_dataset_checkpoints
          where replica_id = ${run.replica_id}
            and dataset = ${run.dataset}
            and completed_run_id = ${run.id}
          for update
        `;
        const checkpoint = exactlyOne(
          checkpointRows,
          "completed_checkpoint_missing",
          "The completed sync run has no matching checkpoint.",
          503,
        );
        return {
          run: runView(run, manifests),
          checkpoint: checkpointView(checkpoint, run.source_connection_id),
          needsAnotherSync:
            decimalString(run.current_dirty_generation!, "current dirty generation") !==
            decimalString(run.started_dirty_generation, "started dirty generation"),
        };
      }
      if (
        run.next_sequence < 1 ||
        run.acknowledged_page_count !== run.next_sequence ||
        !run.staged_coverage_marker
      ) {
        throw new AccountingError(
          "run_not_complete",
          "A final page and every preceding page must be acknowledged before completion.",
          409,
        );
      }
      const manifests = await transaction<ManifestRow>`
        select id, run_id, dataset, sequence, fence, page_digest,
               record_count, current_cursor, next_cursor, is_final,
               coverage_marker, expires_at, created_at, acknowledged_at
        from accounting_page_manifests
        where run_id = ${runId}
        order by sequence
        for update
      `;
      if (
        manifests.length !== run.next_sequence ||
        manifests.some(
          (manifest, sequence) =>
            manifest.sequence !== sequence || manifest.acknowledged_at === null,
        )
      ) {
        throw new AccountingError(
          "run_has_unacknowledged_pages",
          "Every page manifest must be acknowledged in order before completion.",
          409,
        );
      }
      const final = manifests.at(-1)!;
      if (!final.is_final) {
        throw new AccountingError(
          "final_manifest_missing",
          "The last acknowledged manifest is not a final page.",
          409,
        );
      }
      if (final.coverage_marker !== run.staged_coverage_marker) {
        throw new AccountingError(
          "coverage_marker_mismatch",
          "The final coverage marker does not match the staged run.",
          409,
        );
      }

      const checkpointRows = await transaction<CheckpointRow>`
        insert into accounting_dataset_checkpoints (
          replica_id, dataset, completed_run_id, committed_cursor,
          committed_coverage_marker, committed_dirty_generation,
          page_count, record_count, completed_at
        ) values (
          ${run.replica_id}, ${run.dataset}, ${run.id}, ${run.staged_cursor},
          ${run.staged_coverage_marker},
          ${decimalString(run.started_dirty_generation, "started dirty generation")},
          ${run.acknowledged_page_count},
          ${decimalString(run.acknowledged_record_count, "acknowledged record count")},
          clock_timestamp()
        )
        on conflict (replica_id, dataset) do update set
          completed_run_id = excluded.completed_run_id,
          committed_cursor = excluded.committed_cursor,
          committed_coverage_marker = excluded.committed_coverage_marker,
          committed_dirty_generation = excluded.committed_dirty_generation,
          page_count = excluded.page_count,
          record_count = excluded.record_count,
          completed_at = excluded.completed_at
        returning replica_id, dataset, completed_run_id, committed_cursor,
                  committed_coverage_marker, committed_dirty_generation,
                  page_count, record_count, completed_at
      `;
      const checkpoint = exactlyOne(
        checkpointRows,
        "checkpoint_not_promoted",
        "The completed run could not promote its dataset checkpoint.",
        503,
      );
      const completedRows = await transaction<{ completed_at: Date | string }>`
        update accounting_sync_runs
        set status = 'completed', completed_at = ${checkpoint.completed_at}
        where id = ${runId} and fence = ${fence} and status = 'active'
        returning completed_at
      `;
      exactlyOne(
        completedRows,
        "run_completion_raced",
        "The run lost its current fence before completion.",
        409,
      );
      return {
        run: runView({ ...run, status: "completed" }, manifests),
        checkpoint: checkpointView(checkpoint, run.source_connection_id),
        needsAnotherSync:
          decimalString(run.current_dirty_generation!, "current dirty generation") !==
          decimalString(run.started_dirty_generation, "started dirty generation"),
      };
    });
  }

  async cancelRun(
    userId: string,
    deviceId: string,
    runId: string,
    fence: string,
    localReplicaId: string,
  ) {
    return await this.database.begin(async (transaction) => {
      const rows = await transaction<RunRow>`
        select r.id, r.source_connection_id, r.replica_id, r.dataset, r.kind,
               r.status, r.fence, r.lease_expires_at, r.base_cursor,
               r.staged_cursor, r.staged_coverage_marker, r.next_sequence,
               r.acknowledged_page_count, r.acknowledged_record_count,
               r.started_dirty_generation, r.started_at
        from accounting_sync_runs r
        join accounting_sync_replicas rp on rp.id = r.replica_id
        where r.id = ${runId}
          and rp.user_id = ${userId}
          and rp.device_id = ${deviceId}
          and rp.local_replica_id = ${localReplicaId}
        for update of r
      `;
      let run = exactlyOne(
        rows,
        "sync_run_not_found",
        "That sync run was not found.",
      );
      let changed = false;
      if (decimalString(run.fence, "fence", false) !== fence) {
        throw new AccountingError(
          "stale_sync_fence",
          "This sync run does not belong to that fence.",
          409,
        );
      }
      if (run.status === "active") {
        const cancelledRows = await transaction<RunRow>`
          update accounting_sync_runs
          set status = 'cancelled', cancelled_at = clock_timestamp()
          where id = ${runId} and fence = ${fence} and status = 'active'
          returning id, source_connection_id, replica_id, dataset, kind, status,
                    fence, lease_expires_at, base_cursor, staged_cursor,
                    staged_coverage_marker, next_sequence,
                    acknowledged_page_count, acknowledged_record_count,
                    started_dirty_generation, started_at
        `;
        run = exactlyOne(
          cancelledRows,
          "run_cancellation_raced",
          "The sync run changed before it could be cancelled.",
          409,
        );
        changed = true;
      } else if (run.status !== "cancelled" && run.status !== "completed") {
        throw new AccountingError(
          "sync_run_not_cancellable",
          "That sync run has already ended and cannot be cancelled.",
          409,
        );
      }

      const acknowledgedPages = await transaction<ManifestRow>`
        select id, run_id, dataset, sequence, fence, page_digest,
               record_count, current_cursor, next_cursor, is_final,
               coverage_marker, expires_at, created_at, acknowledged_at
        from accounting_page_manifests
        where run_id = ${runId} and acknowledged_at is not null
        order by sequence
      `;
      return { run: runView(run, acknowledgedPages), changed };
    });
  }
}
