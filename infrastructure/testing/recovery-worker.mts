import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import postgres from "postgres";
import { namesFor, parseOptions, ROLE } from "./database-recovery.mjs";

// This ESM worker accepts only generated identities and a loopback port from the
// owning parent, never a URL, password, existing database or backup filename.
type Database = ReturnType<typeof postgres>;
type Input = { phase: "prepare" | "verify-empty" | "verify"; runId: string; port: number; major: "16" | "17" };
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
let stage = "validate-input";
async function snapshot(db: Database) {
  const tables = await db<{ tablename: string }[]>`select tablename from pg_tables where schemaname='public' order by tablename`;
  const rowCounts: Record<string, number> = {};
  const hashes: Record<string, string> = {};
  for (const { tablename } of tables) {
    assert.match(tablename, /^[a-z_][a-z0-9_]*$/);
    // Keep the server's exact numeric representation. Parsing JSON first would
    // round bigint values above Number.MAX_SAFE_INTEGER before comparison.
    const rows = await db.unsafe(`select to_jsonb(t)::text as value from public."${tablename}" t order by to_jsonb(t)::text`);
    rowCounts[tablename] = rows.length;
    hashes[tablename] = digest(rows);
  }
  const columns = await db`select table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position`;
  const constraints = await db`select c.conname, c.contype, t.relname, pg_get_constraintdef(c.oid) as definition from pg_constraint c join pg_class t on c.conrelid=t.oid join pg_namespace n on t.relnamespace=n.oid where n.nspname='public' order by t.relname,c.conname`;
  const indexes = await db`select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname`;
  return { rowCounts, hashes, schemaHash: digest({ columns, constraints, indexes }) };
}
async function rejected(db: Database, sql: string, code: string) {
  let observed: string | undefined;
  try {
    await db.begin(async tx => { await tx.unsafe(sql); throw new Error("Expected rejection was absent"); });
  } catch (error) { observed = (error as { code?: string }).code; }
  assert.equal(observed, code);
}
async function verifyConstraints(db: Database) {
  await rejected(db, "insert into submissions(entity_id,period_key,hmrc_env,payload,receipt) select entity_id,period_key,hmrc_env,payload,receipt from submissions", "23505");
  await rejected(db, "insert into passkeys(id,user_id,public_key) values ('synthetic-invalid-parent','ffffffff-ffff-4fff-8fff-ffffffffffff',decode('01','hex'))", "23503");
  await rejected(db, "update itsa_receipts set quarter_index=5", "23514");
  await rejected(db, "update accounting_source_connections set entity_id='00000000-0000-4000-8000-000000000005'", "23503");
  await rejected(db, "update accounting_provider_token_sets set provider='freeagent'", "23503");
  await rejected(db, "update accounting_page_manifests set coverage_marker=null where is_final=true", "23514");
  // Partial unique index: completed history may coexist; two active runs may not.
  await rejected(db, `
    insert into accounting_sync_runs(source_connection_id,replica_id,dataset,kind,fence,lease_expires_at,started_dirty_generation)
    select source_connection_id,replica_id,dataset,'repair',fence+1,lease_expires_at,started_dirty_generation from accounting_sync_runs;
    insert into accounting_sync_runs(source_connection_id,replica_id,dataset,kind,fence,lease_expires_at,started_dirty_generation)
    select source_connection_id,replica_id,dataset,'repair',fence+2,lease_expires_at,started_dirty_generation from accounting_sync_runs where status='completed';
  `, "23505");
}

async function main(input: Input) {
  assert.deepEqual(Object.keys(input).sort(), ["major", "phase", "port", "runId"]);
  assert.ok(["prepare", "verify-empty", "verify"].includes(input.phase));
  assert.ok(["16", "17"].includes(input.major));
  assert.ok(Number.isInteger(input.port) && input.port >= 1024 && input.port <= 65535);
  parseOptions(["--allow-local-container"], process.env);
  const names = namesFor(input.runId);
  const connections: Database[] = [];
  const connect = (database: string) => {
    const sql = postgres({ host: "127.0.0.1", port: input.port, user: ROLE, database, max: 1, connect_timeout: 5, onnotice: () => {}, connection: { timezone: "UTC" } });
    connections.push(sql); return sql;
  };
  try {
    const source = connect(names.source);
    const restored = connect(names.restored);
    if (input.phase === "verify-empty") {
      stage = "verify-empty-target";
      const tables = await restored`select tablename from pg_tables where schemaname='public'`;
      assert.equal(tables.length, 0);
      return { status: "passed", targetEmpty: true };
    }
    // The actual migration module reads this only inside this scoped worker.
    // It cannot inherit a real DATABASE_URL, and its unused default connection
    // is closed along with the explicitly injected synthetic connections.
    process.env.DATABASE_URL = `postgres://${ROLE}@127.0.0.1:${input.port}/${names.source}`;
    const { migrate, sql: unusedDefault } = await import("../../api/src/db.ts");
    connections.push(unusedDefault);
    const migrationNames = (await readdir(new URL("../../api/migrations/", import.meta.url))).filter(name => name.endsWith(".sql")).sort();
    const apply = async (db: Database) => {
      const log = console.log;
      console.log = () => {};
      try { await migrate(db as unknown as Parameters<typeof migrate>[0]); }
      finally { console.log = log; }
    };
    if (input.phase === "prepare") {
      stage = "apply-migrations";
      await apply(source);
      const ledger = await source<{ name: string }[]>`select name from _migrations order by name`;
      assert.deepEqual(ledger.map(row => row.name), migrationNames);
      const before = await snapshot(source);
      stage = "verify-migration-idempotence";
      await apply(source);
      assert.deepEqual(await snapshot(source), before);
      stage = "seed-synthetic-rows";
      await source.begin(async tx => { await tx.unsafe(await readFile(new URL("./synthetic-recovery.sql", import.meta.url), "utf8")); });
      stage = "verify-source-constraints";
      await verifyConstraints(source);
      return { status: "passed", migrationCount: migrationNames.length, migrationRerunUnchanged: true };
    }
    stage = "compare-restored-snapshot";
    const original = await snapshot(source);
    const recovered = await snapshot(restored);
    assert.deepEqual(recovered, original);
    const checks: Record<string, boolean> = { allTableRowsMatch: true, schemaConstraintsAndIndexesMatch: true };
    stage = "verify-restored-fixture";
    const expectedCounts = {
      users: 2, sessions: 1, passkeys: 1, recovery_codes: 1, entities: 2,
      hmrc_connections: 2, submissions: 1, itsa_receipts: 1, api_workspaces: 1, api_keys: 1,
      accounting_authorisations: 1, accounting_source_connections: 1, accounting_provider_token_sets: 1,
      accounting_sync_replicas: 1, accounting_sync_runs: 1, accounting_page_manifests: 1,
      accounting_dataset_checkpoints: 1, accounting_xero_operation_fence: 1,
    };
    for (const [table, count] of Object.entries(expectedCounts)) assert.equal(recovered.rowCounts[table], count);
    const [account] = await restored`select encode(public_key,'hex') as key, counter::text as counter, transports from passkeys`;
    assert.equal(account.key, "0102030405"); assert.equal(account.counter, "9007199254740993");
    assert.deepEqual(account.transports, ["internal"]);
    checks.accountsAndBinaryPasskeyPreserved = true;
    const rails = await restored`select rail,hmrc_env from hmrc_connections order by rail`;
    assert.deepEqual(rails.map(row => [row.rail, row.hmrc_env]), [["itsa", "sandbox"], ["vat", "sandbox"]]);
    checks.separateHmrcRailsPreserved = true;
    const [grant] = await restored`select token_generation::text as generation, access_token_ciphertext,refresh_token_ciphertext,key_version from accounting_provider_token_sets`;
    assert.equal(grant.generation, "9007199254740993");
    assert.equal(grant.access_token_ciphertext, "atsv1.synthetic_not_a_token");
    assert.equal(grant.refresh_token_ciphertext, "atsv1.synthetic_not_a_token");
    assert.equal(grant.key_version, 1);
    checks.syntheticGrantMarkersPreserved = true;
    const [receipt] = await restored`select payload,receipt from submissions`;
    assert.equal(receipt.payload.amountPence, 12345); assert.equal(receipt.receipt.accepted, true);
    const [quarter] = await restored`select superseded_count,payload_summary from itsa_receipts`;
    assert.equal(quarter.superseded_count, 2); assert.equal(quarter.payload_summary.turnoverPence, 67890);
    checks.submissionJsonAndCorrectionCountPreserved = true;
    const [checkpoint] = await restored`select committed_cursor,committed_dirty_generation::text as generation from accounting_dataset_checkpoints`;
    assert.equal(checkpoint.committed_cursor, "synthetic-cursor"); assert.equal(checkpoint.generation, "9007199254740993");
    checks.syncMetadataAndExactBigintsPreserved = true;
    // These adjacent integers collapse to the same JavaScript Number. Prove
    // that the full-table comparison still detects the change, then roll back.
    stage = "verify-exact-large-integer-comparison";
    const rollback = new Error("synthetic comparison rollback");
    await assert.rejects(restored.begin(async tx => {
      await tx`update accounting_sync_replicas set next_fence=next_fence-1`;
      const changed = await snapshot(tx as unknown as Database);
      assert.notEqual(changed.hashes.accounting_sync_replicas, recovered.hashes.accounting_sync_replicas);
      throw rollback;
    }), error => error === rollback);
    assert.deepEqual(await snapshot(restored), recovered);
    checks.adjacentLargeIntegerDifferenceDetected = true;
    stage = "verify-restored-constraints";
    await verifyConstraints(restored);
    assert.deepEqual(await snapshot(restored), recovered);
    checks.uniqueForeignKeyCheckAndPartialIndexEnforced = true;
    checks.rejectedWritesRolledBack = true;
    stage = "verify-restored-migration-idempotence";
    await apply(restored);
    assert.deepEqual(await snapshot(restored), recovered);
    checks.restoredMigrationRerunUnchanged = true;
    const [version] = await restored`select current_setting('server_version_num') as value`;
    assert.equal(Math.floor(Number(version.value) / 10000), Number(input.major));
    return { status: "passed", checks, rowCounts: recovered.rowCounts, tableCount: Object.keys(recovered.rowCounts).length, postgresVersion: version.value };
  } finally {
    delete process.env.DATABASE_URL;
    await Promise.all(connections.map(sql => sql.end({ timeout: 5 })));
  }
}

try {
  let input = "";
  for await (const chunk of process.stdin) { input += chunk; if (input.length > 2048) throw new Error("Worker input exceeded its bound"); }
  console.log(JSON.stringify(await main(JSON.parse(input))));
} catch (error) {
  const code = (error as { code?: string }).code;
  const failure = code === "ERR_ASSERTION" ? "assertion-failed" : /^[0-9A-Z]{5}$/.test(code ?? "") ? code : "unexpected-failure";
  console.log(JSON.stringify({ status: "failed", stage, failure })); process.exitCode = 1;
}
