import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createLocalProject, isAllowedSourcePath } from "../create-local-project.mjs";

function fixture(t) {
  const base = mkdtempSync(path.join(os.tmpdir(), "taxsorted-scaffold-test-"));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const sourceDir = path.join(base, "source");
  mkdirSync(sourceDir);
  const git = (...args) => {
    const result = spawnSync("git", ["-C", sourceDir, ...args], { encoding: "utf8" });
    assert.equal(result.status, 0, "fixture Git command succeeded");
  };
  const write = (name, contents = "synthetic fixture\n") => {
    const destination = path.join(sourceDir, name);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, contents);
  };
  git("init", "--quiet");
  for (const file of ["package.json", "package-lock.json", "frontend/package.json", "engine/package.json", "desktop/package.json"]) write(file, "{}\n");
  git("add", ".");
  return { base, sourceDir, targetDir: path.join(base, "new-project"), git, write };
}

test("copies current tracked and new source; excludes personal/generated paths even when tracked", (t) => {
  const f = fixture(t);
  f.write("frontend/src/page.tsx", "original source\n");
  f.write(".gitignore", "frontend/ignored.ts\n");
  const excluded = [
    "frontend/.env.production", "frontend/.env.example", "frontend/credentials.json",
    "frontend/private/client.json", "frontend/profiles/person/record.json",
    "desktop/user-data/record.json", "docs/taxsorted-books-backup.json",
    "frontend/src/secret-config.ts", "frontend/ignored.ts", "frontend/.npmrc",
    "frontend/node_modules/dependency/index.js", "frontend/out/index.html",
    "desktop/dist/app.json", "desktop/bundle/index.html", "frontend/records.sqlite", "frontend/debug.log",
    "research/uk/review/private/evidence.json", "unrelated/source.ts",
  ];
  for (const file of excluded) f.write(file);
  f.git("add", "--force", ".");
  f.write("frontend/src/page.tsx", "current source\n");
  f.write("frontend/src/new.ts", "new source\n");
  f.write("research/uk/public-rules.json", "{}\n");
  f.write("scripts/check.sh", "#!/bin/sh\nexit 0\n");
  f.write("desktop/assets/AppRun", "#!/bin/sh\nexec ./taxsorted-local \"$@\"\n");
  chmodSync(path.join(f.sourceDir, "desktop/assets/AppRun"), 0o700);
  const result = createLocalProject(f);
  assert.equal(readFileSync(path.join(result.targetDir, "frontend/src/page.tsx"), "utf8"), "current source\n");
  assert.equal(readFileSync(path.join(result.targetDir, "frontend/src/new.ts"), "utf8"), "new source\n");
  assert.ok(existsSync(path.join(result.targetDir, "research/uk/public-rules.json")));
  assert.ok(existsSync(path.join(result.targetDir, "desktop/assets/AppRun")), "scaffold retains the production AppImage launcher");
  assert.equal(existsSync(path.join(result.targetDir, ".git")), false);
  for (const file of excluded) assert.equal(existsSync(path.join(result.targetDir, file)), false, "private or generated fixture is excluded");
  if (process.platform !== "win32") {
    assert.equal(lstatSync(result.targetDir).mode & 0o777, 0o700);
    assert.equal(lstatSync(path.join(result.targetDir, "package.json")).mode & 0o777, 0o600);
    assert.equal(lstatSync(path.join(result.targetDir, "desktop/assets/AppRun")).mode & 0o777, 0o700);
  }
});

test("copies the reviewed Backups route without admitting adjacent or generated backup material", (t) => {
  const f = fixture(t);
  const route = "frontend/src/app/books/workspace/backups/page.tsx";
  const source = "export default function BackupsPage() { return null; }\n";
  f.write(route, source);
  const excluded = [
    "frontend/src/app/books/workspace/backups/personal-books.json",
    "frontend/src/app/books/workspace/backups/notes.txt",
    "frontend/src/app/books/workspace/backups/private/page.tsx",
    "frontend/src/app/books/workspace/backups/backups/page.tsx",
    "frontend/src/app/books/workspace/backup/page.tsx",
    "frontend/src/app/books/workspace/money/backups/page.tsx",
    "frontend/src/app/books/workspace/money/taxsorted-books-backup.json",
    "frontend/out/books/workspace/backups/index.html",
    "desktop/bundle/books/workspace/backups/index.html",
    "docs/backups/personal-books.json",
  ];
  for (const file of excluded) f.write(file, "synthetic personal or generated fixture\n");
  f.git("add", "--force", ".");

  createLocalProject(f);

  assert.equal(readFileSync(path.join(f.targetDir, route), "utf8"), source);
  for (const file of excluded) assert.equal(existsSync(path.join(f.targetDir, file)), false, "route exception does not admit backup data or generated files");
});

test("never follows source file or ancestor symlinks", { skip: process.platform === "win32" ? "Windows symlink privileges vary" : false }, (t) => {
  const f = fixture(t);
  const outside = path.join(f.base, "outside");
  mkdirSync(outside);
  writeFileSync(path.join(outside, "data.json"), "synthetic private fixture\n");
  f.write("frontend/src/sub/data.json");
  f.git("add", ".");
  rmSync(path.join(f.sourceDir, "frontend/src/sub"), { recursive: true });
  symlinkSync(outside, path.join(f.sourceDir, "frontend/src/sub"));
  symlinkSync(path.join(outside, "data.json"), path.join(f.sourceDir, "frontend/src/link.json"));
  createLocalProject(f);
  assert.equal(existsSync(path.join(f.targetDir, "frontend/src/sub/data.json")), false);
  assert.equal(existsSync(path.join(f.targetDir, "frontend/src/link.json")), false);
});

test("refuses existing destinations without changing them", (t) => {
  const f = fixture(t);
  mkdirSync(f.targetDir);
  assert.throws(() => createLocalProject(f), /already exists/);
  writeFileSync(path.join(f.targetDir, "keep.txt"), "keep\n");
  assert.throws(() => createLocalProject(f), /already exists/);
  assert.equal(readFileSync(path.join(f.targetDir, "keep.txt"), "utf8"), "keep\n");
});

test("refuses a dangling destination symlink", { skip: process.platform === "win32" ? "Windows symlink privileges vary" : false }, (t) => {
  const f = fixture(t);
  symlinkSync(path.join(f.base, "missing"), f.targetDir);
  assert.throws(() => createLocalProject(f), /already exists/);
  assert.equal(lstatSync(f.targetDir).isSymbolicLink(), true);
});

test("refuses a destination inside the checkout, missing parents, and incomplete source", (t) => {
  const f = fixture(t);
  assert.throws(() => createLocalProject({ ...f, targetDir: path.join(f.sourceDir, "copy") }), /outside the source/);
  assert.throws(() => createLocalProject({ ...f, targetDir: path.join(f.base, "missing", "copy") }), /parent directory/);
  rmSync(path.join(f.sourceDir, "desktop/package.json"));
  assert.throws(() => createLocalProject(f), /incomplete/);
  assert.equal(existsSync(f.targetDir), false);
});

test("refuses a worktree subdirectory even when it has a complete project shape", (t) => {
  const f = fixture(t);
  for (const file of ["package.json", "package-lock.json", "frontend/package.json", "engine/package.json", "desktop/package.json"]) {
    f.write(`nested/${file}`, "{}\n");
  }
  assert.throws(
    () => createLocalProject({ sourceDir: path.join(f.sourceDir, "nested"), targetDir: f.targetDir }),
    /source root must be the repository root/,
  );
  assert.equal(existsSync(f.targetDir), false);
});

test("refuses bare repositories and directories outside a Git worktree", (t) => {
  const f = fixture(t);
  const bare = path.join(f.base, "bare.git");
  const init = spawnSync("git", ["init", "--bare", "--quiet", bare], { encoding: "utf8" });
  assert.equal(init.status, 0, "bare fixture Git command succeeded");
  const ordinary = path.join(f.base, "ordinary");
  mkdirSync(ordinary);
  for (const sourceDir of [bare, ordinary]) {
    assert.throws(() => createLocalProject({ sourceDir, targetDir: f.targetDir }), /source root must be the repository root/);
    assert.equal(existsSync(f.targetDir), false);
  }
});

test("rejects escaped paths and sensitive filenames; retains ordinary implementation files", () => {
  for (const name of ["../package.json", "/frontend/a.ts", "frontend/../a.ts", "frontend\\a.ts", "frontend/C:a.ts", "frontend/a\nb.ts", "frontend/.git/config", "frontend/local.env", "frontend/auth.json", "frontend/session.json", "desktop/secrets.yml", "frontend/.env", "frontend/.env.example", "frontend/config.local.json"]) {
    assert.equal(isAllowedSourcePath(name), false, "unsafe source path is excluded");
  }
  for (const name of ["frontend/src/lib/books-backup.ts", "api/src/session.ts", "api/src/accounting-token-vault.ts", ".github/workflows/desktop-build.yml", "frontend/public/_headers", "desktop/electron-builder.yml"]) {
    assert.equal(isAllowedSourcePath(name), true, "ordinary project source is retained");
  }
});
