#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  closeSync, constants, existsSync, fstatSync, lstatSync, mkdirSync,
  openSync, readFileSync, realpathSync, writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_ROOTS = new Set([
  ".github", "api", "content", "desktop", "docs", "engine", "frontend",
  "infrastructure", "regs", "research", "scripts",
]);
const ROOT_FILES = new Set([
  ".dockerignore", ".gitignore", ".nvmrc", "AGENTS.md", "CLAUDE.md",
  "CONTENT-LICENSE", "LICENSE", "PHILOSOPHY.md", "PRINCIPLES.md",
  "README.md", "package.json", "package-lock.json",
]);
const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".jsonc", ".md", ".mdx", ".yml", ".yaml", ".toml",
  ".html", ".css", ".scss", ".sass", ".sql", ".sh", ".txt",
  ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif",
  ".ico", ".icns", ".woff", ".woff2", ".ttf", ".otf",
]);
const SOURCE_NAMES = new Set([
  "Dockerfile", "LICENSE", "CONTENT-LICENSE", "_headers", "_redirects",
  ".gitignore", ".dockerignore", ".nvmrc",
]);
const BLOCKED_DIRECTORIES = new Set([
  ".git", ".next", ".vercel", ".wrangler", ".cache", ".turbo",
  "node_modules", "out", "build", "dist", "bundle", "coverage", "artifacts",
  "profile", "profiles", "user-data", "userdata", "appdata",
  "local-data", "logs", "log", "backups", "backup", "private",
  "secrets", "credentials", "storage", "tmp", "temp", "cache", "caches",
]);
const PRIVATE_NAME = /(^|[._-])(secrets?|credentials?|passwords?|cookies?)([._-]|$)/i;
const PRIVATE_DATA_NAME = /(^|[._-])(auth|sessions?|tokens?|backups?|exports?|private|profile)([._-]|$)/i;
const DATA_EXTENSION = /\.(jsonc?|ya?ml|txt|toml)$/i;
// These reviewed routes are application source despite their data-directory name.
// Keep the exception file-specific so adjacent personal backups stay excluded.
const BACKUPS_ROUTE_SOURCES = new Set([
  "frontend/src/app/books/workspace/backups/page.tsx",
  "frontend/src/app/backups/page.tsx",
]);

/** Conservative path policy, not an inspection of arbitrary file contents. */
export function isAllowedSourcePath(relativePath) {
  if (!relativePath || /[\\:\x00-\x1f\x7f]/.test(relativePath)) return false;
  const parts = relativePath.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) return false;
  const name = parts.at(-1);
  if (parts.some((part) => part.toLowerCase().startsWith(".env"))) return false;
  if (parts.some((part) => PRIVATE_NAME.test(part))) return false;
  if (!BACKUPS_ROUTE_SOURCES.has(relativePath) && parts.slice(0, -1).some((part) => BLOCKED_DIRECTORIES.has(part.toLowerCase()))) return false;
  if (/\.local(?:\.|$)/i.test(name) || /\.tsbuildinfo$/i.test(name)) return false;
  if (DATA_EXTENSION.test(name) && PRIVATE_DATA_NAME.test(name)) return false;
  if (parts.length === 1) return ROOT_FILES.has(name);
  if (!SOURCE_ROOTS.has(parts[0])) return false;
  if (parts.some((part, index) => part.startsWith(".") && !(index === 0 && part === ".github") && !(index === parts.length - 1 && SOURCE_NAMES.has(part)))) return false;
  return relativePath === "desktop/assets/AppRun" || SOURCE_NAMES.has(name) || SOURCE_EXTENSIONS.has(path.posix.extname(name).toLowerCase());
}

function runGit(sourceDir, args, input) {
  return spawnSync("git", ["-C", sourceDir, ...args], {
    encoding: "utf8", input, maxBuffer: 64 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function within(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function hasOnlyRegularAncestors(sourceDir, relativePath) {
  const parts = relativePath.split("/");
  let current = sourceDir;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    let stat;
    try { stat = lstatSync(current); } catch (error) {
      if (error.code === "ENOENT") return false; // A tracked file may have been deleted locally.
      throw new Error("Could not inspect a selected source path.");
    }
    if (stat.isSymbolicLink()) return false;
    if (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile()) return false;
  }
  return true;
}

export function createLocalProject({ sourceDir, targetDir }) {
  const source = realpathSync(sourceDir);
  // Ask Git whether this directory is the worktree root. Comparing absolute
  // path spellings breaks on Windows drive casing and short-name aliases.
  const position = runGit(source, ["rev-parse", "--is-inside-work-tree", "--show-prefix"]);
  const [insideWorktree, prefix] = position.stdout?.split(/\r?\n/) ?? [];
  if (position.status !== 0 || insideWorktree !== "true" || prefix !== "") {
    throw new Error("Run the scaffold from a TaxSorted Git checkout; its source root must be the repository root.");
  }
  const requestedTarget = path.resolve(targetDir);
  // lstat also catches a dangling destination symlink, which existsSync cannot.
  try {
    lstatSync(requestedTarget);
    throw new Error("The destination already exists. Choose a new directory; existing files are never replaced.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const parent = path.dirname(requestedTarget);
  if (!existsSync(parent) || !lstatSync(realpathSync(parent)).isDirectory()) {
    throw new Error("The destination's parent directory must already exist.");
  }
  const target = path.join(realpathSync(parent), path.basename(requestedTarget));
  if (within(source, target)) throw new Error("Choose a destination outside the source checkout.");

  const listed = runGit(source, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]);
  if (listed.status !== 0) throw new Error("Git could not list source files. No destination was created.");
  // Filter symlinks before check-ignore: Git refuses paths below a symlink.
  const candidates = [...new Set(listed.stdout.split("\0").filter(Boolean))]
    .filter((name) => isAllowedSourcePath(name) && hasOnlyRegularAncestors(source, name));
  // --cached includes tracked files which are now ignored. Exclude those too.
  const ignoredResult = candidates.length
    ? runGit(source, ["check-ignore", "--no-index", "--stdin", "-z"], `${candidates.join("\0")}\0`)
    : { status: 1, stdout: "" };
  if (ignoredResult.status !== 0 && ignoredResult.status !== 1) {
    throw new Error("Git could not check ignored files. No destination was created.");
  }
  const ignored = new Set(ignoredResult.stdout.split("\0").filter(Boolean));
  const selected = candidates.filter((name) => !ignored.has(name));
  for (const required of ["package.json", "package-lock.json", "frontend/package.json", "engine/package.json", "desktop/package.json"]) {
    if (!selected.includes(required)) throw new Error("The source checkout is incomplete; a required project manifest is missing or excluded.");
  }

  mkdirSync(target, { mode: 0o700 });
  try {
    for (const relativePath of selected) {
      // Recheck before reading, and refuse a symlink substituted for the file.
      if (!hasOnlyRegularAncestors(source, relativePath)) throw new Error("A source path changed during copying.");
      const input = path.join(source, relativePath);
      const output = path.join(target, relativePath);
      if (!within(source, realpathSync(input)) || !within(target, output)) throw new Error("A source path left its project boundary.");
      const descriptor = openSync(input, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      try {
        const stat = fstatSync(descriptor);
        if (!stat.isFile()) throw new Error("A selected source is no longer a regular file.");
        mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
        writeFileSync(output, readFileSync(descriptor), { flag: "wx", mode: stat.mode & 0o100 ? 0o700 : 0o600 });
      } finally {
        closeSync(descriptor);
      }
    }
  } catch {
    throw new Error("Scaffolding stopped while copying. The new destination may contain a partial source copy; no existing project was replaced.");
  }
  return { targetDir: target, copiedFiles: selected.length };
}

const invokedPath = process.argv[1] && path.resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
    console.log("Usage: node scripts/create-local-project.mjs <new-directory>\nCopies project source only. Does not install dependencies, access the network, or copy app profiles. See docs/LOCAL-APP.md.");
  } else if (args.length !== 1 || args[0].startsWith("-")) {
    console.error("Usage: node scripts/create-local-project.mjs <new-directory>");
    process.exitCode = 1;
  } else {
    try {
      const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
      const result = createLocalProject({ sourceDir, targetDir: args[0] });
      console.log(`Created a local source project (${result.copiedFiles} files).\nRead docs/LOCAL-APP.md in the new directory for install and build commands.\nGit history, app profiles, and known private/generated paths were excluded. No dependencies were installed.`);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
