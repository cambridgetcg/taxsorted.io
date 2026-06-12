// taxsorted api — the rails. One typed surface for the web UI and agents alike.

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config, assertBootConfig } from "./config.js";
import { migrate } from "./db.js";
import { session } from "./session.js";
import { entities } from "./routes/entities.js";
import { connect } from "./routes/connect.js";
import { vat } from "./routes/vat.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: config.corsOrigins,
    credentials: true,
    allowHeaders: [
      "Content-Type",
      "Gov-Test-Scenario",
      "Gov-Client-Timezone",
      "Gov-Client-Screens",
      "Gov-Client-Window-Size",
      "Gov-Client-Browser-JS-User-Agent",
      "Gov-Client-Browser-Plugins",
      "Gov-Client-Browser-Do-Not-Track",
    ],
  })
);

app.get("/v1/health", (c) =>
  c.json({ ok: true, hmrc: { configured: config.hmrc.configured, env: config.hmrc.env } })
);

app.use("/v1/*", session);
app.route("/v1/entities", entities);
app.route("/v1/entities", vat);
app.route("/v1/hmrc", connect);

app.notFound((c) => c.json({ error: "no_such_door" }, 404));
app.onError((err, c) => {
  // Redacted: never dump full upstream bodies (they can carry taxpayer data).
  console.error(`server_error: ${err.name}: ${err.message}`);
  return c.json({ error: "server_error" }, 500);
});

assertBootConfig();
await migrate();
serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`taxsorted api listening on :${info.port} (hmrc: ${config.hmrc.env}, configured: ${config.hmrc.configured})`);
});
