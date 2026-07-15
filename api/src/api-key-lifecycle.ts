import { createHash, randomBytes } from "node:crypto";

export type ApiKeyMode = "test" | "live";
export type ApiKeyScope = "sdlt:calculate" | "tax-expert:assess";

export const allowedApiKeyScopes: readonly ApiKeyScope[] = [
  "sdlt:calculate",
  "tax-expert:assess",
];

const MAX_KEY_LIFETIME_MS = 400 * 24 * 60 * 60 * 1_000;
const MAX_OPERATOR_LABEL_LENGTH = 160;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_PREFIX = /^ts_(?:test|live)_[A-Za-z0-9_-]{8}$/;
const API_KEY = /^ts_(test|live)_[A-Za-z0-9_-]{43}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const CONTROL_CHARACTER = /[\p{Cc}\p{Cf}]/u;
const RFC3339 =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;

interface KeyRow {
  key_id: string;
  key_name: string;
  key_prefix: string;
  mode: string;
  scopes: unknown;
  expires_at: Date | string | null;
  revoked_at: Date | string | null;
  created_at: Date | string;
  workspace_id: string;
  workspace_name: string;
  workspace_status: string;
  database_now: Date | string;
}

interface WorkspaceRow {
  workspace_id: string;
  workspace_name: string;
  workspace_status: string;
}

interface CreatedKeyRow {
  key_id: string;
  created_at: Date | string;
}

interface CreatedWorkspaceRow {
  workspace_id: string;
}

interface DatabaseNowRow {
  database_now: Date | string;
}

interface RevokedKeyRow {
  revoked_at: Date | string;
}

interface OtherActiveKeyRow {
  key_id: string;
}

interface KeyWorkspaceRow {
  workspace_id: string;
}

export interface LifecycleTransaction {
  <Row extends object = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): PromiseLike<readonly Row[]>;
}

export interface LifecycleSql {
  begin<T>(
    operation: (transaction: LifecycleTransaction) => Promise<T>,
  ): PromiseLike<T>;
}

export type ApiKeyOperationalStatus =
  | "active"
  | "expired"
  | "revoked"
  | "workspace-suspended";

export interface SafeApiKeyMetadata {
  workspace: {
    id: string;
    name: string;
    status: "active" | "suspended";
  };
  key: {
    id: string;
    name: string;
    prefix: string;
    mode: ApiKeyMode;
    scopes: string[];
    createdAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
    status: ApiKeyOperationalStatus;
  };
}

export interface IssuedApiKey {
  plaintext: string;
  metadata: SafeApiKeyMetadata;
}

export interface RevokeApiKeyResult {
  keyId: string;
  prefix: string;
  revokedAt: string;
  changed: boolean;
}

export class ApiKeyLifecycleError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiKeyLifecycleError";
  }
}

interface KeyMaterial {
  plaintext: string;
  hash: string;
  prefix: string;
}

export interface KeyMaterialFactory {
  (mode: ApiKeyMode): KeyMaterial;
}

export function createApiKeyMaterial(mode: ApiKeyMode): KeyMaterial {
  const plaintext = `ts_${mode}_${randomBytes(32).toString("base64url")}`;
  return {
    plaintext,
    hash: createHash("sha256").update(plaintext, "utf8").digest("hex"),
    prefix: plaintext.slice(0, 16),
  };
}

function exactlyOne<Row>(
  rows: readonly Row[],
  subject: string,
  notFoundCode: string,
): Row {
  if (rows.length === 0) {
    throw new ApiKeyLifecycleError(notFoundCode, `${subject} was not found.`);
  }
  if (rows.length > 1) {
    throw new ApiKeyLifecycleError(
      `${notFoundCode}_not_unique`,
      `${subject} matched more than one database row; no change was made.`,
    );
  }
  return rows[0]!;
}

async function currentDatabaseTime(
  transaction: LifecycleTransaction,
): Promise<Date> {
  const rows = await transaction<DatabaseNowRow>`
    select clock_timestamp() as database_now
  `;
  const row = exactlyOne(rows, "Database time", "database_time_missing");
  return asDate(row.database_now, "current time");
}

export function requireApiKeyUuid(value: string, field: string): string {
  if (!UUID.test(value)) {
    throw new ApiKeyLifecycleError(
      "invalid_uuid",
      `${field} must be one exact UUID.`,
    );
  }
  return value;
}

function asDate(value: Date | string, field: string): Date {
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new ApiKeyLifecycleError(
      "invalid_database_time",
      `The database returned an invalid ${field}; no change was made.`,
    );
  }
  return parsed;
}

function optionalDate(value: Date | string | null, field: string): Date | null {
  return value === null ? null : asDate(value, field);
}

function requireMode(value: string): ApiKeyMode {
  if (value !== "test" && value !== "live") {
    throw new ApiKeyLifecycleError(
      "invalid_mode",
      "Mode must be test or live.",
    );
  }
  return value;
}

export function normaliseOperatorLabel(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiKeyLifecycleError(
      "label_required",
      `${field} must not be empty.`,
    );
  }
  if (
    trimmed.length > MAX_OPERATOR_LABEL_LENGTH ||
    CONTROL_CHARACTER.test(trimmed)
  ) {
    throw new ApiKeyLifecycleError(
      "invalid_label",
      `${field} must be plain text without control characters and at most ${MAX_OPERATOR_LABEL_LENGTH} characters.`,
    );
  }
  return trimmed;
}

export function requireApiKeyPrefix(value: string, field: string): string {
  if (!KEY_PREFIX.test(value)) {
    throw new ApiKeyLifecycleError(
      "invalid_prefix",
      `${field} must be the exact stored safe key prefix.`,
    );
  }
  return value;
}

function storedScopes(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((scope) => typeof scope !== "string" || scope.length === 0)
  ) {
    throw new ApiKeyLifecycleError(
      "invalid_stored_scopes",
      "The stored key scopes are invalid; no change was made.",
    );
  }
  return [...new Set(value)].sort();
}

export function normaliseRequestedScopes(
  scopes: readonly string[],
  defaultScopes: readonly ApiKeyScope[] = [],
): ApiKeyScope[] {
  const selected = scopes.length === 0 ? defaultScopes : scopes;
  const unique = [...new Set(selected)].sort();
  if (unique.length === 0) {
    throw new ApiKeyLifecycleError(
      "scope_required",
      "Give at least one --scope for this key.",
    );
  }
  for (const scope of unique) {
    if (!allowedApiKeyScopes.includes(scope as ApiKeyScope)) {
      throw new ApiKeyLifecycleError(
        "unsupported_scope",
        `Unsupported scope: ${scope}`,
      );
    }
  }
  return unique as ApiKeyScope[];
}

export function parseZonedRfc3339(value: string): Date {
  const match = RFC3339.exec(value);
  if (!match) {
    throw new ApiKeyLifecycleError(
      "invalid_expiry",
      "--expires-at must be a zoned RFC3339 date-time, for example 2027-07-15T00:00:00Z.",
    );
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zone] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const maximumDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const zoneHour = zone === "Z" ? 0 : Number(zone.slice(1, 3));
  const zoneMinute = zone === "Z" ? 0 : Number(zone.slice(4, 6));
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > maximumDay ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    zoneHour > 23 ||
    zoneMinute > 59
  ) {
    throw new ApiKeyLifecycleError(
      "invalid_expiry",
      "--expires-at is not a valid zoned RFC3339 date-time.",
    );
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new ApiKeyLifecycleError(
      "invalid_expiry",
      "--expires-at is not a valid zoned RFC3339 date-time.",
    );
  }
  return parsed;
}

function checkedExpiry(value: string, databaseNow: Date): Date {
  const expiry = parseZonedRfc3339(value);
  const lifetime = expiry.getTime() - databaseNow.getTime();
  if (lifetime <= 0) {
    throw new ApiKeyLifecycleError(
      "expiry_not_future",
      "--expires-at must be later than the database time.",
    );
  }
  if (lifetime > MAX_KEY_LIFETIME_MS) {
    throw new ApiKeyLifecycleError(
      "expiry_too_distant",
      "--expires-at must be no more than 400 days after the database time.",
    );
  }
  return expiry;
}

function operationalFields(row: KeyRow) {
  const now = asDate(row.database_now, "current time");
  const expiresAt = optionalDate(row.expires_at, "key expiry");
  const revokedAt = optionalDate(row.revoked_at, "key revocation time");
  const workspaceStatus: "active" | "suspended" | null =
    row.workspace_status === "active" || row.workspace_status === "suspended"
      ? row.workspace_status
      : null;
  if (!workspaceStatus) {
    throw new ApiKeyLifecycleError(
      "invalid_workspace_status",
      "The stored workspace status is invalid.",
    );
  }

  const mode = requireMode(row.mode);
  if (!KEY_PREFIX.test(row.key_prefix) || !row.key_prefix.startsWith(`ts_${mode}_`)) {
    throw new ApiKeyLifecycleError(
      "invalid_stored_prefix",
      "The stored key prefix does not match its mode.",
    );
  }

  return {
    now,
    expiresAt,
    revokedAt,
    workspaceStatus,
    mode,
    scopes: storedScopes(row.scopes),
  };
}

function safeMetadata(row: KeyRow): SafeApiKeyMetadata {
  const operational = operationalFields(row);
  const createdAt = asDate(row.created_at, "key creation time");

  return {
    workspace: {
      id: row.workspace_id,
      name: normaliseOperatorLabel(row.workspace_name, "Stored workspace name"),
      status: operational.workspaceStatus,
    },
    key: {
      id: row.key_id,
      name: normaliseOperatorLabel(row.key_name, "Stored key name"),
      prefix: row.key_prefix,
      mode: operational.mode,
      scopes: operational.scopes,
      createdAt: createdAt.toISOString(),
      expiresAt: operational.expiresAt?.toISOString() ?? null,
      revokedAt: operational.revokedAt?.toISOString() ?? null,
      status:
        operational.workspaceStatus === "suspended"
          ? "workspace-suspended"
          : operational.revokedAt
            ? "revoked"
            : operational.expiresAt &&
                operational.expiresAt.getTime() <= operational.now.getTime()
              ? "expired"
              : "active",
    },
  };
}

async function selectKeyForUpdate(
  transaction: LifecycleTransaction,
  keyId: string,
): Promise<KeyRow> {
  const keyWorkspaceRows = await transaction<KeyWorkspaceRow>`
    select workspace_id
    from api_keys
    where id = ${keyId}
  `;
  const keyWorkspace = exactlyOne(
    keyWorkspaceRows,
    "API key",
    "key_not_found",
  );
  const workspaceRows = await transaction<WorkspaceRow>`
    select
      id as workspace_id,
      name as workspace_name,
      status as workspace_status
    from api_workspaces
    where id = ${keyWorkspace.workspace_id}
    for update
  `;
  exactlyOne(workspaceRows, "API workspace", "workspace_not_found");

  const rows = await transaction<KeyRow>`
    select
      k.id as key_id,
      k.name as key_name,
      k.key_prefix,
      k.mode,
      k.scopes,
      k.expires_at,
      k.revoked_at,
      k.created_at,
      w.id as workspace_id,
      w.name as workspace_name,
      w.status as workspace_status
    from api_keys k
    join api_workspaces w on w.id = k.workspace_id
    where k.id = ${keyId}
      and w.id = ${keyWorkspace.workspace_id}
    for update of k
  `;
  const row = exactlyOne(rows, "API key", "key_not_found");
  const databaseNow = await currentDatabaseTime(transaction);
  return { ...row, database_now: databaseNow };
}

async function selectKeyForInspection(
  transaction: LifecycleTransaction,
  keyId: string,
): Promise<KeyRow> {
  const rows = await transaction<KeyRow>`
    select
      k.id as key_id,
      k.name as key_name,
      k.key_prefix,
      k.mode,
      k.scopes,
      k.expires_at,
      k.revoked_at,
      k.created_at,
      w.id as workspace_id,
      w.name as workspace_name,
      w.status as workspace_status,
      clock_timestamp() as database_now
    from api_keys k
    join api_workspaces w on w.id = k.workspace_id
    where k.id = ${keyId}
  `;
  return exactlyOne(rows, "API key", "key_not_found");
}

function validatedKeyMaterial(
  mode: ApiKeyMode,
  materialFactory: KeyMaterialFactory,
): KeyMaterial {
  const material = materialFactory(mode);
  const format = API_KEY.exec(material.plaintext);
  const expectedHash = createHash("sha256")
    .update(material.plaintext, "utf8")
    .digest("hex");
  if (
    !format ||
    format[1] !== mode ||
    !SHA256_HEX.test(material.hash) ||
    material.hash !== expectedHash ||
    material.prefix !== material.plaintext.slice(0, 16) ||
    !KEY_PREFIX.test(material.prefix)
  ) {
    throw new ApiKeyLifecycleError(
      "invalid_key_material",
      "The generated key material failed its internal consistency checks; no key was stored.",
    );
  }
  return material;
}

async function insertKey(
  transaction: LifecycleTransaction,
  input: {
    workspaceId: string;
    workspaceName: string;
    workspaceStatus: "active";
    name: string;
    mode: ApiKeyMode;
    scopes: readonly string[];
    expiresAt: Date;
    databaseNow: Date;
    material: KeyMaterial;
  },
): Promise<IssuedApiKey> {
  const workspaceName = normaliseOperatorLabel(input.workspaceName, "Workspace name");
  const keyName = normaliseOperatorLabel(input.name, "Key name");
  const material = input.material;
  const rows = await transaction<CreatedKeyRow>`
    insert into api_keys (
      workspace_id,
      name,
      mode,
      key_hash,
      key_prefix,
      scopes,
      expires_at,
      created_at
    )
    values (
      ${input.workspaceId},
      ${keyName},
      ${input.mode},
      ${material.hash},
      ${material.prefix},
      ${[...input.scopes]},
      ${input.expiresAt},
      clock_timestamp()
    )
    returning id as key_id, created_at
  `;
  const created = exactlyOne(rows, "Created API key", "key_insert_failed");
  const metadata = safeMetadata({
    key_id: created.key_id,
    key_name: keyName,
    key_prefix: material.prefix,
    mode: input.mode,
    scopes: [...input.scopes],
    expires_at: input.expiresAt,
    revoked_at: null,
    created_at: created.created_at,
    workspace_id: input.workspaceId,
    workspace_name: workspaceName,
    workspace_status: input.workspaceStatus,
    database_now: input.databaseNow,
  });
  return { plaintext: material.plaintext, metadata };
}

export async function inspectApiKey(
  database: LifecycleSql,
  keyId: string,
): Promise<SafeApiKeyMetadata> {
  requireApiKeyUuid(keyId, "--key-id");
  return await database.begin(async (transaction) => {
    const row = await selectKeyForInspection(transaction, keyId);
    return safeMetadata(row);
  });
}

export async function createWorkspaceWithFirstKey(
  database: LifecycleSql,
  input: {
    workspaceName: string;
    mode: ApiKeyMode;
    scopes: readonly string[];
    expiresAt: string;
  },
  materialFactory: KeyMaterialFactory = createApiKeyMaterial,
): Promise<IssuedApiKey> {
  const workspaceName = normaliseOperatorLabel(input.workspaceName, "Workspace name");
  const mode = requireMode(input.mode);
  const scopes = normaliseRequestedScopes(input.scopes, ["sdlt:calculate"]);
  parseZonedRfc3339(input.expiresAt);

  return await database.begin(async (transaction) => {
    const databaseNow = await currentDatabaseTime(transaction);
    const expiresAt = checkedExpiry(input.expiresAt, databaseNow);
    const material = validatedKeyMaterial(mode, materialFactory);
    const workspaceRows = await transaction<CreatedWorkspaceRow>`
      insert into api_workspaces (name)
      values (${workspaceName})
      returning id as workspace_id
    `;
    const workspace = exactlyOne(
      workspaceRows,
      "Created workspace",
      "workspace_insert_failed",
    );
    return await insertKey(transaction, {
      workspaceId: workspace.workspace_id,
      workspaceName,
      workspaceStatus: "active",
      name: "first key",
      mode,
      scopes,
      expiresAt,
      databaseNow,
      material,
    });
  });
}

export async function issueApiKey(
  database: LifecycleSql,
  input: {
    workspaceId: string;
    name?: string;
    mode: ApiKeyMode;
    scopes: readonly string[];
    expiresAt: string;
  },
  materialFactory: KeyMaterialFactory = createApiKeyMaterial,
): Promise<IssuedApiKey> {
  const workspaceId = requireApiKeyUuid(input.workspaceId, "--workspace-id");
  const mode = requireMode(input.mode);
  const scopes = normaliseRequestedScopes(input.scopes);
  const name = normaliseOperatorLabel(input.name ?? "issued key", "Key name");
  parseZonedRfc3339(input.expiresAt);

  return await database.begin(async (transaction) => {
    const rows = await transaction<WorkspaceRow>`
      select
        id as workspace_id,
        name as workspace_name,
        status as workspace_status
      from api_workspaces
      where id = ${workspaceId}
      for update
    `;
    const workspace = exactlyOne(rows, "API workspace", "workspace_not_found");
    if (workspace.workspace_status !== "active") {
      throw new ApiKeyLifecycleError(
        "workspace_not_active",
        "The API workspace is not active; no key was issued.",
      );
    }
    const databaseNow = await currentDatabaseTime(transaction);
    const expiresAt = checkedExpiry(input.expiresAt, databaseNow);
    const material = validatedKeyMaterial(mode, materialFactory);
    return await insertKey(transaction, {
      workspaceId: workspace.workspace_id,
      workspaceName: workspace.workspace_name,
      workspaceStatus: "active",
      name,
      mode,
      scopes,
      expiresAt,
      databaseNow,
      material,
    });
  });
}

export async function rotateApiKey(
  database: LifecycleSql,
  input: { keyId: string; expiresAt: string; name?: string },
  materialFactory: KeyMaterialFactory = createApiKeyMaterial,
): Promise<IssuedApiKey> {
  const keyId = requireApiKeyUuid(input.keyId, "--key-id");
  parseZonedRfc3339(input.expiresAt);

  return await database.begin(async (transaction) => {
    const source = await selectKeyForUpdate(transaction, keyId);
    const sourceMetadata = safeMetadata(source);
    if (sourceMetadata.workspace.status !== "active") {
      throw new ApiKeyLifecycleError(
        "workspace_not_active",
        "The source key's workspace is not active; no replacement was created.",
      );
    }
    if (sourceMetadata.key.status === "revoked") {
      throw new ApiKeyLifecycleError(
        "key_revoked",
        "The source key is revoked; use issue with the workspace UUID instead.",
      );
    }
    if (sourceMetadata.key.status === "expired") {
      throw new ApiKeyLifecycleError(
        "key_expired",
        "The source key is expired; use issue with the workspace UUID instead.",
      );
    }

    const databaseNow = asDate(source.database_now, "current time");
    const expiresAt = checkedExpiry(input.expiresAt, databaseNow);
    const material = validatedKeyMaterial(sourceMetadata.key.mode, materialFactory);
    return await insertKey(transaction, {
      workspaceId: sourceMetadata.workspace.id,
      workspaceName: sourceMetadata.workspace.name,
      workspaceStatus: "active",
      name: normaliseOperatorLabel(
        input.name ?? `replacement for ${sourceMetadata.key.name}`,
        "Key name",
      ),
      mode: sourceMetadata.key.mode,
      scopes: sourceMetadata.key.scopes,
      expiresAt,
      databaseNow,
      material,
    });
  });
}

export async function revokeApiKey(
  database: LifecycleSql,
  input: {
    keyId: string;
    confirmPrefix: string;
    allowLastKey?: boolean;
  },
): Promise<RevokeApiKeyResult> {
  const keyId = requireApiKeyUuid(input.keyId, "--key-id");
  requireApiKeyPrefix(input.confirmPrefix, "--confirm-prefix");

  return await database.begin(async (transaction) => {
    const source = await selectKeyForUpdate(transaction, keyId);
    const operational = operationalFields(source);
    if (source.key_prefix !== input.confirmPrefix) {
      throw new ApiKeyLifecycleError(
        "prefix_mismatch",
        "The confirmation prefix does not match this key; no change was made.",
      );
    }

    const alreadyRevoked = operational.revokedAt;
    if (alreadyRevoked) {
      return {
        keyId: source.key_id,
        prefix: source.key_prefix,
        revokedAt: alreadyRevoked.toISOString(),
        changed: false,
      };
    }

    const targetIsCurrentlyActive =
      operational.workspaceStatus === "active" &&
      (operational.expiresAt === null ||
        operational.expiresAt.getTime() > operational.now.getTime());
    if (targetIsCurrentlyActive && input.allowLastKey !== true) {
      const otherActiveKeys = await transaction<OtherActiveKeyRow>`
        select id as key_id
        from api_keys
        where workspace_id = ${source.workspace_id}
          and id <> ${source.key_id}
          and mode = ${operational.mode}
          and scopes @> ${operational.scopes}
          and revoked_at is null
          and (expires_at is null or expires_at > clock_timestamp() + interval '5 minutes')
      `;
      if (otherActiveKeys.length === 0) {
        throw new ApiKeyLifecycleError(
          "last_active_key",
          "No same-mode key with every required scope will remain valid for more than five minutes. Rotate or issue and verify a replacement, or repeat with --allow-last-key as an explicit off-switch.",
        );
      }
    }

    const revokedRows = await transaction<RevokedKeyRow>`
      update api_keys
      set revoked_at = clock_timestamp()
      where id = ${source.key_id}
        and key_prefix = ${source.key_prefix}
        and revoked_at is null
      returning revoked_at
    `;
    const revoked = exactlyOne(
      revokedRows,
      "Revoked API key",
      "key_revoke_failed",
    );
    return {
      keyId: source.key_id,
      prefix: source.key_prefix,
      revokedAt: asDate(revoked.revoked_at, "key revocation time").toISOString(),
      changed: true,
    };
  });
}
