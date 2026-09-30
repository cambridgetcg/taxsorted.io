#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, statSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const ROLE = "taxsorted_rehearsal";
export const OWNER_LABEL = "io.taxsorted.database-rehearsal";
const SAFE_CODES = new Set(["opt-in-required", "unsupported-option", "unsafe-environment", "unsafe-docker-endpoint", "invalid-identity", "unowned-container", "command-failed", "invalid-output", "postgres-not-ready", "unsafe-port-binding", "archive-rejection-failed", "worker-failed", "interrupted", "cleanup-failed", "node-22-required"]);
export class RehearsalError extends Error {
  constructor(code) { super("The disposable database rehearsal stopped."); this.code = code; }
}
export function safeFailure(error) {
  return SAFE_CODES.has(error?.code) ? error.code : "unexpected-failure";
}
export function parseOptions(args, environment = process.env) {
  const options = { major: "17", socket: "/var/run/docker.sock" };
  let allowed = false;
  const seen = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (seen.has(arg)) throw new RehearsalError("unsupported-option");
    seen.add(arg);
    if (arg === "--allow-local-container" && !allowed) allowed = true;
    else if (arg === "--postgres-major" && ["16", "17"].includes(args[index + 1])) options.major = args[++index];
    else if (arg === "--docker-socket" && args[index + 1]) options.socket = args[++index];
    else throw new RehearsalError("unsupported-option");
  }
  if (!allowed) throw new RehearsalError("opt-in-required");
  // Never read values, follow ambient connections, or inherit client auth files.
  if (Object.keys(environment).some(key => key === "DATABASE_URL" || /^PG[A-Z_]+$/.test(key))) {
    throw new RehearsalError("unsafe-environment");
  }
  localDockerEndpoint(options.socket);
  return options;
}
export function localDockerEndpoint(socket) {
  if (typeof socket !== "string" || !path.isAbsolute(socket) || socket.startsWith("//")
    || /[\x00-\x20\x7f]/.test(socket) || socket.includes(":") || !socket.endsWith(".sock")) {
    throw new RehearsalError("unsafe-docker-endpoint");
  }
  return `unix://${socket}`;
}
export function namesFor(runId) {
  if (!/^[a-f0-9]{24}$/.test(runId)) throw new RehearsalError("invalid-identity");
  return { container: `taxsorted-db-rehearsal-${runId}`, source: `ts_recovery_${runId}_source`, restored: `ts_recovery_${runId}_restored` };
}
export function childEnvironment(environment, temporaryDirectory) {
  return {
    PATH: environment.PATH ?? "/usr/bin:/bin", HOME: temporaryDirectory,
    TMPDIR: temporaryDirectory, LANG: "C", LC_ALL: "C", TZ: "UTC",
  };
}
export function assertOwnedContainer(value, runId, containerId) {
  const names = namesFor(runId);
  if (!/^[a-f0-9]{64}$/.test(containerId) || value?.Id !== containerId
    || value?.Name !== `/${names.container}` || value?.Config?.Labels?.[OWNER_LABEL] !== runId) {
    throw new RehearsalError("unowned-container");
  }
}
// A create/start command can time out after Docker has accepted it. Resolve only
// this generated name, then require all three ownership checks before removal.
// A failed inspect alone is not evidence that a container does not exist.
export function cleanupOwnedContainer(docker, runId, capturedId) {
  const name = namesFor(runId).container;
  const inspected = docker(["inspect", "--type", "container", name], { allowFailure: true });
  if (inspected.status !== 0 || inspected.error || inspected.signal) {
    const listed = docker(["container", "ls", "--all", "--filter", `name=^/${name}$`, "--format", "{{.ID}}"]);
    if (listed.status !== 0 || listed.error || listed.signal || listed.stdout.trim() !== "") throw new RehearsalError("cleanup-failed");
    return;
  }
  const values = json(inspected.stdout);
  if (!Array.isArray(values) || values.length !== 1) throw new RehearsalError("unowned-container");
  const value = values[0];
  assertOwnedContainer(value, runId, capturedId ?? value?.Id);
  docker(["rm", "--force", value.Id]);
}
function run(command, args, env, { input, allowFailure = false, timeout = 30000 } = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, env, input, encoding: "utf8", timeout, maxBuffer: 2 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] });
  if ((result.error || result.status !== 0) && !allowFailure) throw new RehearsalError("command-failed");
  return result;
}
function json(text) {
  try { return JSON.parse(text); } catch { throw new RehearsalError("invalid-output"); }
}

export async function rehearse(options, environment = process.env) {
  // Keep the exported entry point as strict as the CLI.
  if (!options || Object.keys(options).sort().join(",") !== "major,socket") throw new RehearsalError("unsupported-option");
  options = parseOptions(["--allow-local-container", "--postgres-major", options.major, "--docker-socket", options.socket], environment);
  if (process.versions.node.split(".")[0] !== "22") throw new RehearsalError("node-22-required");
  const runId = randomBytes(12).toString("hex");
  const names = namesFor(runId);
  const directory = mkdtempSync(path.join(tmpdir(), "taxsorted-db-recovery-"));
  chmodSync(directory, 0o700);
  const config = path.join(directory, "docker-config");
  mkdirSync(config, { mode: 0o700 });
  const env = childEnvironment(environment, directory);
  const endpoint = localDockerEndpoint(options.socket);
  const docker = (args, settings) => run("docker", ["--config", config, "--host", endpoint, ...args], env, settings);
  const report = {
    schema: "taxsorted.database-recovery-rehearsal/1", runId,
    status: "failed", stage: "preflight", startedAt: new Date().toISOString(),
    postgresMajor: options.major, data: "synthetic-only", productionRecoveryProven: false,
    scope: { logicalDumpRestore: true, rolesAndPrivilegesRecovered: false, tokenDecryptionVerified: false, productionVersionVerified: false },
    checks: {}, cleanup: { ownedContainerRemoved: false, temporaryDockerConfigRemoved: false, dumpNeverWrittenToHost: true },
  };
  let containerId;
  let creationAttempted = false;
  let interrupted = false;
  const signal = () => { interrupted = true; };
  process.on("SIGINT", signal); process.on("SIGTERM", signal);
  const proceed = () => { if (interrupted) throw new RehearsalError("interrupted"); };
  const inspect = () => json(docker(["inspect", containerId]).stdout)[0];
  try {
    // An explicitly selected local Unix socket; do not consult Docker contexts.
    if (!statSync(options.socket).isSocket()) throw new RehearsalError("unsafe-docker-endpoint");
    docker(["version", "--format", "{{.Server.Version}}"]);
    const revision = run("git", ["rev-parse", "HEAD"], env).stdout.trim();
    report.checkoutCommit = /^[a-f0-9]{40}$/.test(revision) ? revision : "unavailable";
    report.checkoutHadLocalChanges = run("git", ["status", "--porcelain"], env).stdout.trim() !== "";
    report.stage = "create-owned-container";
    // No host data mounts, no reusable volume, no password, no published LAN port.
    // --pull never makes missing-image admission a separate explicit operation.
    creationAttempted = true;
    containerId = docker([
      "create", "--pull", "never", "--name", names.container, "--label", `${OWNER_LABEL}=${runId}`,
      "--publish", "127.0.0.1::5432", "--memory", "512m", "--cpus", "2",
      "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=268435456",
      "--tmpfs", "/tmp:rw,noexec,nosuid,size=67108864",
      "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "--env", `POSTGRES_USER=${ROLE}`,
      "--env", "POSTGRES_DB=postgres", `postgres:${options.major}`,
    ]).stdout.trim();
    const created = inspect();
    assertOwnedContainer(created, runId, containerId);
    if (!/^sha256:[a-f0-9]{64}$/.test(created.Image)) throw new RehearsalError("invalid-output");
    report.postgresImageId = created.Image;
    docker(["start", containerId]);
    report.stage = "wait-for-postgres";
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      proceed();
      if (docker(["exec", containerId, "pg_isready", "-U", ROLE, "-d", "postgres"], { allowFailure: true, timeout: 5000 }).status === 0) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ready) throw new RehearsalError("postgres-not-ready");
    const binding = inspect().NetworkSettings?.Ports?.["5432/tcp"];
    if (!Array.isArray(binding) || binding.length !== 1 || binding[0].HostIp !== "127.0.0.1" || !/^\d{1,5}$/.test(binding[0].HostPort)) throw new RehearsalError("unsafe-port-binding");
    const port = Number(binding[0].HostPort);
    if (port < 1024 || port > 65535) throw new RehearsalError("unsafe-port-binding");
    report.checks.loopbackOnly = true;
    for (const name of [names.source, names.restored]) docker(["exec", containerId, "createdb", "--username", ROLE, "--template", "template0", name]);
    const worker = phase => {
      proceed();
      const result = run(process.execPath, ["--import", "tsx", "infrastructure/testing/recovery-worker.mts"], env, {
        input: JSON.stringify({ phase, runId, port, major: options.major }), timeout: 45000, allowFailure: true,
      });
      if (result.error || result.signal) throw new RehearsalError("worker-failed");
      const output = json(result.stdout);
      if (output.status !== "passed" || result.status !== 0) {
        // The worker returns fixed stage labels and classifications only.
        if (/^[a-z-]{1,64}$/.test(output.stage)) report.workerStage = output.stage;
        if (/^(?:[0-9A-Z]{5}|assertion-failed|unexpected-failure)$/.test(output.failure)) report.workerFailure = output.failure;
        throw new RehearsalError("worker-failed");
      }
      return output;
    };
    report.stage = "migrate-and-seed";
    const prepared = worker("prepare");
    report.migrationCount = prepared.migrationCount;
    report.checks.actualMigrationsApplied = true;
    report.checks.migrationRerunUnchanged = prepared.migrationRerunUnchanged;
    report.stage = "dump";
    const archive = `/tmp/${runId}.dump`;
    const truncated = `/tmp/${runId}.truncated`;
    docker(["exec", containerId, "pg_dump", "--username", ROLE, "--dbname", names.source, "--format=custom", "--file", archive]);
    report.stage = "reject-truncated-archive";
    docker(["exec", containerId, "sh", "-c", 'head -c 16 "$1" > "$2"', "sh", archive, truncated]);
    const restoreArgs = ["exec", containerId, "pg_restore", "--exit-on-error", "--single-transaction", "--no-owner", "--no-privileges", "--username", ROLE, "--dbname", names.restored];
    const rejected = docker([...restoreArgs, truncated], { allowFailure: true });
    if (rejected.error || rejected.signal || rejected.status === 0) throw new RehearsalError("archive-rejection-failed");
    report.checks.truncatedArchiveRejected = true;
    report.checks.failedRestoreLeftTargetEmpty = worker("verify-empty").targetEmpty;
    report.stage = "restore";
    docker([...restoreArgs, archive]);
    report.stage = "verify-restored-database";
    const verified = worker("verify");
    report.checks = { ...report.checks, ...verified.checks };
    report.rowCounts = verified.rowCounts;
    report.tableCount = verified.tableCount;
    report.postgresVersion = verified.postgresVersion;
    if (Object.values(report.checks).some(value => value !== true)) throw new RehearsalError("worker-failed");
    proceed();
    report.status = "passed";
  } catch (error) {
    report.failure = safeFailure(error);
  } finally {
    try {
      if (creationAttempted) cleanupOwnedContainer(docker, runId, /^[a-f0-9]{64}$/.test(containerId ?? "") ? containerId : undefined);
      report.cleanup.ownedContainerRemoved = true;
    } catch {
      report.status = "failed"; report.failure = "cleanup-failed";
      // Name is generated, not an operator-supplied database or container.
      report.cleanup.ownedContainerName = names.container;
    }
    try { rmSync(config, { recursive: true }); report.cleanup.temporaryDockerConfigRemoved = true; }
    catch { report.status = "failed"; report.failure = "cleanup-failed"; }
    process.off("SIGINT", signal); process.off("SIGTERM", signal);
    report.finishedAt = new Date().toISOString();
    const reportPath = path.join(directory, "report.json");
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    return { report, reportPath };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = parseOptions(process.argv.slice(2));
    const { report, reportPath } = await rehearse(options);
    console.log(JSON.stringify({ status: report.status, stage: report.stage, failure: report.failure, checks: report.checks, reportPath }));
    if (report.status !== "passed") process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ status: "refused", failure: safeFailure(error) }));
    process.exitCode = 1;
  }
}
