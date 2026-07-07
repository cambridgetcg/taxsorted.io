// Task 5: ownership dual predicate on the entities routes themselves (not
// just ownedEntity, which session.test.ts pins). LIST must surface both
// session-owned and account-owned rows for a passkey caller; CREATE must
// branch — account-owned from birth (user_id set, session_id null) when the
// caller carries a passkey-backed userId, else exactly today's session-owned
// insert. db is faked in-memory, same whole-module mock pattern as
// connections.test.ts.

import { describe, it, expect, vi, afterEach } from "vitest";

const SID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const UID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../../db.js");
});

type EntityRow = {
  id: string;
  session_id: string | null;
  user_id: string | null;
  name: string;
  kind: string;
  vrn: string | null;
  nino: string | null;
  created_at: string;
};

/** Fake postgres.js for the entities router: recognises the LIST join query
    and the CREATE insert. Re-implements Postgres NULL semantics for the
    dual-owner predicate (null never equals anything, including null) and
    rejects a bare JS `undefined` in the values — exactly what the real
    driver does — so the route is forced to pass null explicitly rather than
    silently mismatching. */
function fakeEntitiesRouteDb(seed: EntityRow[]) {
  const inserts: { text: string; values: unknown[] }[] = [];
  let nextId = 1;
  function sql(strings: TemplateStringsArray, ...values: unknown[]) {
    const text = strings.join("?").toLowerCase();
    if (values.some((v) => v === undefined)) {
      throw new Error("Undefined values are not allowed");
    }
    if (text.includes("from entities e") && text.includes("left join hmrc_connections")) {
      const [sessionId, userId] = values as (string | null)[];
      const rows = seed.filter(
        (e) =>
          (sessionId !== null && e.session_id === sessionId) ||
          (userId !== null && e.user_id === userId)
      );
      return Promise.resolve(
        rows.map((e) => ({
          id: e.id,
          name: e.name,
          kind: e.kind,
          vrn: e.vrn,
          nino: e.nino,
          created_at: e.created_at,
          vat_connected: false,
          itsa_connected: false,
        }))
      );
    }
    if (text.includes("insert into entities")) {
      inserts.push({ text: strings.join("?"), values });
      const [name, kind, vrn, nino] = values.slice(-4) as (string | null)[];
      const id = `new-${nextId++}`;
      return Promise.resolve([
        { id, name, kind, vrn, nino, created_at: "2026-01-01T00:00:00.000Z" },
      ]);
    }
    throw new Error(`fakeEntitiesRouteDb: unrecognized query — ${text}`);
  }
  return { sql, inserts };
}

async function mountEntities(sql: ReturnType<typeof fakeEntitiesRouteDb>["sql"], ctx: {
  sessionId: string;
  userId?: string;
}) {
  vi.doMock("../../db.js", () => ({ sql }));
  const { Hono } = await import("hono");
  const { entities } = await import("../entities.js");
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("sessionId", ctx.sessionId);
    c.set("userId", ctx.userId);
    await next();
  });
  app.route("/v1/entities", entities);
  return app;
}

describe("entities LIST — dual predicate (session OR account)", () => {
  it("passkey caller sees both their session-owned and account-owned entities", async () => {
    const seed: EntityRow[] = [
      {
        id: "e-session",
        session_id: SID,
        user_id: null,
        name: "Session Co",
        kind: "business",
        vrn: null,
        nino: null,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "e-account",
        session_id: null,
        user_id: UID,
        name: "Account Co",
        kind: "business",
        vrn: null,
        nino: null,
        created_at: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "e-other",
        session_id: "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
        user_id: null,
        name: "Not Mine",
        kind: "business",
        vrn: null,
        nino: null,
        created_at: "2026-01-03T00:00:00.000Z",
      },
    ];
    const { sql } = fakeEntitiesRouteDb(seed);
    const app = await mountEntities(sql, { sessionId: SID, userId: UID });

    const res = await app.request("/v1/entities");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entities: { id: string }[] };
    const ids = body.entities.map((e) => e.id).sort();
    expect(ids).toEqual(["e-account", "e-session"]);
  });

  it("anonymous caller (no userId) sees only their session-owned entities", async () => {
    const seed: EntityRow[] = [
      {
        id: "e-session",
        session_id: SID,
        user_id: null,
        name: "Session Co",
        kind: "business",
        vrn: null,
        nino: null,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "e-account",
        session_id: null,
        user_id: UID,
        name: "Account Co",
        kind: "business",
        vrn: null,
        nino: null,
        created_at: "2026-01-02T00:00:00.000Z",
      },
    ];
    const { sql } = fakeEntitiesRouteDb(seed);
    const app = await mountEntities(sql, { sessionId: SID });

    const res = await app.request("/v1/entities");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entities: { id: string }[] };
    expect(body.entities.map((e) => e.id)).toEqual(["e-session"]);
  });
});

describe("entities CREATE — ownership branch", () => {
  it("passkey caller (userId present): inserts account-owned — user_id set, session_id null", async () => {
    const { sql, inserts } = fakeEntitiesRouteDb([]);
    const app = await mountEntities(sql, { sessionId: SID, userId: UID });

    const res = await app.request("/v1/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Co", kind: "business" }),
    });

    expect(res.status).toBe(201);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].text).toContain("insert into entities (user_id, session_id");
    // First two bound values are the owner columns: user_id then session_id.
    expect(inserts[0].values[0]).toBe(UID);
    expect(inserts[0].values[1]).toBeNull();
  });

  it("anonymous caller (no userId): inserts session-owned, exactly as before", async () => {
    const { sql, inserts } = fakeEntitiesRouteDb([]);
    const app = await mountEntities(sql, { sessionId: SID });

    const res = await app.request("/v1/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Co", kind: "business" }),
    });

    expect(res.status).toBe(201);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].text).toContain("insert into entities (session_id");
    expect(inserts[0].text).not.toContain("user_id");
    expect(inserts[0].values[0]).toBe(SID);
  });
});
