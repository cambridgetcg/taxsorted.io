// Create one workspace and its first machine key. The secret is printed once;
// only its SHA-256 digest is stored. Usage:
//   npm run create:api-key --workspace api -- "Firm name" [--live]

import { createHash, randomBytes } from "node:crypto";
import { migrate, sql } from "../src/db.js";

const args = process.argv.slice(2);
const live = args.includes("--live");
const name = args.filter((arg) => arg !== "--live").join(" ").trim();

if (!name) {
  throw new Error('Give the workspace name, for example: npm run create:api-key --workspace api -- "North & Co"');
}

const mode = live ? "live" : "test";
const rawKey = `ts_${mode}_${randomBytes(32).toString("base64url")}`;
const keyHash = createHash("sha256").update(rawKey, "utf8").digest("hex");
const keyPrefix = rawKey.slice(0, 16);
const scopes = ["sdlt:calculate"];

try {
  await migrate();
  const result = await sql.begin(async (tx) => {
    const [workspace] = await tx`
      insert into api_workspaces (name)
      values (${name})
      returning id
    `;
    const [key] = await tx`
      insert into api_keys (workspace_id, name, mode, key_hash, key_prefix, scopes)
      values (${workspace.id}, ${"first key"}, ${mode}, ${keyHash}, ${keyPrefix}, ${scopes})
      returning id
    `;
    return { workspaceId: workspace.id as string, keyId: key.id as string };
  });

  console.log(`Workspace: ${name}`);
  console.log(`Workspace ID: ${result.workspaceId}`);
  console.log(`Key ID: ${result.keyId}`);
  console.log(`Scopes: ${scopes.join(", ")}`);
  console.log(`API key (shown once): ${rawKey}`);
} finally {
  await sql.end({ timeout: 5 });
}
