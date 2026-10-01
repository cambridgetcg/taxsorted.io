import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  assertOwnedContainer, childEnvironment, cleanupOwnedContainer,
  localDockerEndpoint, namesFor, OWNER_LABEL, parseOptions,
  rehearse, RehearsalError, safeFailure, waitForPostgres,
} from "../database-recovery.mjs";

const runId = "0123456789abcdef01234567";
const id = "a".repeat(64);
const owned = () => ({ Id: id, Name: `/${namesFor(runId).container}`, Config: { Labels: { [OWNER_LABEL]: runId } } });
const errorCode = expected => error => error instanceof RehearsalError && error.code === expected;

test("requires explicit disposable-container admission", () => {
  assert.throws(() => parseOptions([], {}), errorCode("opt-in-required"));
  assert.deepEqual(parseOptions(["--allow-local-container"], {}), { major: "17", socket: "/var/run/docker.sock" });
});

test("accepts only supported majors and an explicit Unix socket", () => {
  assert.deepEqual(parseOptions(["--allow-local-container", "--postgres-major", "16", "--docker-socket", "/tmp/example.sock"], {}), { major: "16", socket: "/tmp/example.sock" });
  for (const args of [["--postgres-major", "18"], ["--postgres-major"], ["--database-url", "synthetic"], ["--database", "existing"], ["--backup", "existing.dump"], ["--docker-socket"], ["--allow-local-container"], ["--postgres-major", "16", "--postgres-major", "17"]]) {
    assert.throws(() => parseOptions(["--allow-local-container", ...args], {}), errorCode("unsupported-option"));
  }
});

for (const name of ["DATABASE_URL", "PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGPASSFILE", "PGSERVICE", "PGSERVICEFILE", "PGOPTIONS"]) {
  test(`refuses ambient ${name} even when empty, without exposing its value`, () => {
    for (const value of ["", "synthetic-private-marker"]) {
      assert.throws(() => parseOptions(["--allow-local-container"], { [name]: value }), error => {
        assert.equal(safeFailure(error), "unsafe-environment");
        assert.equal(error.message.includes(value || "synthetic-private-marker"), false);
        return true;
      });
    }
  });
}

test("refuses remote, relative, option-like and malformed Docker endpoints", () => {
  for (const socket of ["tcp://example.invalid:2375", "ssh://host", "unix:///var/run/docker.sock", "./docker.sock", "//host/docker.sock", "/tmp/has space.sock", "/tmp/line\n.sock", "/tmp/a:b.sock", "/tmp/not-socket", "--host"]) {
    assert.throws(() => localDockerEndpoint(socket), errorCode("unsafe-docker-endpoint"));
  }
  assert.equal(localDockerEndpoint("/var/run/docker.sock"), "unix:///var/run/docker.sock");
});

test("generated identities cannot be supplied as SQL or shell fragments", () => {
  for (const input of ["", "existing", "a".repeat(23), "a".repeat(25), "A".repeat(24), "../".repeat(8), ";".repeat(24)]) {
    assert.throws(() => namesFor(input), errorCode("invalid-identity"));
  }
  const names = namesFor(runId);
  assert.notEqual(names.source, names.restored);
  assert.ok(Object.values(names).every(name => name.includes(runId)));
});

test("child environment isolates client credentials and Docker contexts", () => {
  const result = childEnvironment({ PATH: "/synthetic/bin", HOME: "/real/profile", DATABASE_URL: "synthetic", PGPASSFILE: "/real/pgpass", DOCKER_HOST: "tcp://example.invalid", DOCKER_CONTEXT: "production", DOCKER_CONFIG: "/real/docker", AWS_SECRET_ACCESS_KEY: "synthetic", NODE_OPTIONS: "synthetic" }, "/tmp/owned-rehearsal");
  assert.deepEqual(result, { PATH: "/synthetic/bin", HOME: "/tmp/owned-rehearsal", TMPDIR: "/tmp/owned-rehearsal", LANG: "C", LC_ALL: "C", TZ: "UTC" });
});

test("ownership requires exact generated name, random label and full ID", () => {
  assert.doesNotThrow(() => assertOwnedContainer(owned(), runId, id));
  for (const value of [null, { ...owned(), Id: "b".repeat(64) }, { ...owned(), Name: "/existing-container" }, { ...owned(), Config: { Labels: {} } }, { ...owned(), Config: { Labels: { [OWNER_LABEL]: "b".repeat(24) } } }]) {
    assert.throws(() => assertOwnedContainer(value, runId, id), errorCode("unowned-container"));
  }
  assert.throws(() => assertOwnedContainer(owned(), runId, id.slice(0, 12)), errorCode("unowned-container"));
});

test("uncertain create resolves generated name and removes only the verified full ID", () => {
  const calls = [];
  cleanupOwnedContainer((args) => {
    calls.push(args);
    return { status: 0, stdout: args[0] === "inspect" ? JSON.stringify([owned()]) : "" };
  }, runId);
  assert.deepEqual(calls, [["inspect", "--type", "container", namesFor(runId).container], ["rm", "--force", id]]);
});

test("cleanup refuses a generated-name collision belonging to someone else", () => {
  let removals = 0;
  assert.throws(() => cleanupOwnedContainer(args => {
    if (args[0] === "rm") removals += 1;
    return { status: 0, stdout: JSON.stringify([{ ...owned(), Config: { Labels: {} } }]) };
  }, runId), errorCode("unowned-container"));
  assert.equal(removals, 0);
});

test("cleanup refuses an inspected ID different from captured create output", () => {
  assert.throws(() => cleanupOwnedContainer(() => ({ status: 0, stdout: JSON.stringify([owned()]) }), runId, "b".repeat(64)), errorCode("unowned-container"));
});

test("failed inspect requires a successful exact-name absence query", () => {
  const calls = [];
  cleanupOwnedContainer(args => {
    calls.push(args);
    return args[0] === "inspect" ? { status: 1, stdout: "" } : { status: 0, stdout: "" };
  }, runId);
  assert.deepEqual(calls[1], ["container", "ls", "--all", "--filter", `name=^/${namesFor(runId).container}$`, "--format", "{{.ID}}"]);
  assert.equal(calls.some(args => args[0] === "rm"), false);
});

test("cleanup cannot report absence when a matching name remains or the daemon fails", () => {
  assert.throws(() => cleanupOwnedContainer(args => args[0] === "inspect" ? { status: 1, stdout: "" } : { status: 0, stdout: "abcdef\n" }, runId), errorCode("cleanup-failed"));
  assert.throws(() => cleanupOwnedContainer(() => ({ status: 1, stdout: "" }), runId), errorCode("cleanup-failed"));
  assert.throws(() => cleanupOwnedContainer(args => {
    if (args[0] === "inspect") return { status: 1, stdout: "" };
    throw new RehearsalError("command-failed");
  }, runId), errorCode("command-failed"));
});

test("cleanup rejects malformed inspection and propagates failed removal", () => {
  assert.throws(() => cleanupOwnedContainer(() => ({ status: 0, stdout: "[]" }), runId), errorCode("unowned-container"));
  assert.throws(() => cleanupOwnedContainer(args => {
    if (args[0] === "inspect") return { status: 0, stdout: JSON.stringify([owned()]) };
    throw new RehearsalError("command-failed");
  }, runId), errorCode("command-failed"));
});

test("failure reports never expose raw exception messages or unknown codes", () => {
  assert.equal(safeFailure(new Error("synthetic-private-marker")), "unexpected-failure");
  assert.equal(safeFailure({ code: "synthetic-private-marker" }), "unexpected-failure");
  assert.equal(safeFailure(new RehearsalError("cleanup-failed")), "cleanup-failed");
});

test("readiness ignores the temporary socket-only bootstrap server", async () => {
  let phase = "bootstrap";
  let probes = 0;
  let pauses = 0;
  await waitForPostgres((args, settings) => {
    probes += 1;
    assert.equal(args[1], id);
    assert.equal(args[2], "pg_isready");
    assert.equal(settings.allowFailure, true);
    assert.equal(settings.timeout, 5000);
    const host = args[args.indexOf("-h") + 1];
    const port = args[args.indexOf("-p") + 1];
    // A socket-only probe would incorrectly pass on the first attempt.
    return { status: phase === "final" || host !== "127.0.0.1" || port !== "5432" ? 0 : 2 };
  }, id, () => {}, async () => { pauses += 1; phase = "final"; });
  assert.equal(probes, 2);
  assert.equal(pauses, 1);
  assert.equal(phase, "final");
});

test("readiness retries rejection and command failures, with a fixed attempt limit", async () => {
  let probes = 0;
  let pauses = 0;
  const failures = [{ status: 1 }, { status: 2 }, { status: null, error: new Error("synthetic-private-marker") }, { status: null, signal: "SIGTERM" }];
  await assert.rejects(waitForPostgres(() => failures[probes++ % failures.length], id, () => {}, async () => { pauses += 1; }), errorCode("postgres-not-ready"));
  assert.equal(probes, 60);
  assert.equal(pauses, 59);
});

test("readiness checks interruption before issuing another probe", async () => {
  let probes = 0;
  let interrupted = false;
  await assert.rejects(waitForPostgres(() => { probes += 1; return { status: 2 }; }, id, () => {
    if (interrupted) throw new RehearsalError("interrupted");
  }, async () => { interrupted = true; }), errorCode("interrupted"));
  assert.equal(probes, 1);
});

test("exported rehearsal entry refuses unsafe inputs before accessing Docker", async () => {
  await assert.rejects(rehearse({ major: "17", socket: "/var/run/docker.sock" }, { DATABASE_URL: "" }), errorCode("unsafe-environment"));
  await assert.rejects(rehearse({ major: "17", socket: "tcp://example.invalid:2375" }, {}), errorCode("unsafe-docker-endpoint"));
  await assert.rejects(rehearse({ major: "18", socket: "/var/run/docker.sock" }, {}), errorCode("unsupported-option"));
  await assert.rejects(rehearse({ major: "17", socket: "/var/run/docker.sock", database: "existing" }, {}), errorCode("unsupported-option"));
});

test("CLI refuses unsafe input before Docker even when no commands are on PATH", () => {
  const script = fileURLToPath(new URL("../database-recovery.mjs", import.meta.url));
  for (const [args, extra, failure] of [[[], {}, "opt-in-required"], [["--allow-local-container"], { DATABASE_URL: "synthetic-private-marker" }, "unsafe-environment"]]) {
    const result = spawnSync(process.execPath, [script, ...args], { env: { PATH: "/nonexistent", ...extra }, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.deepEqual(JSON.parse(result.stderr), { status: "refused", failure });
    assert.equal(result.stderr.includes("synthetic-private-marker"), false);
  }
});
