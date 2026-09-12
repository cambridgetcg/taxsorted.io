// Start the API only after validating configuration and applying migrations.

import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { config, assertBootConfig } from "./config.js";
import { migrate } from "./db.js";

const app = createApp();

assertBootConfig();
await migrate();
serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`taxsorted api listening on :${info.port} (hmrc: ${config.hmrc.env}, configured: ${config.hmrc.configured})`);
});
