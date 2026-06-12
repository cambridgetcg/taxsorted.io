import { Hono } from "hono";
import { z } from "zod";
import { sql } from "../db.js";
import { ownedEntity } from "../session.js";
import { getConnection } from "../hmrc.js";

const CreateEntity = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["person", "business", "charity", "trust"]),
  vrn: z
    .string()
    .trim()
    .regex(/^\d{9}$/, "VRN is nine digits")
    .optional(),
});

export const entities = new Hono();

entities.get("/", async (c) => {
  const rows = await sql`
    select e.id, e.name, e.kind, e.vrn, e.created_at,
           (hc.entity_id is not null) as connected
    from entities e
    left join hmrc_connections hc on hc.entity_id = e.id
    where e.session_id = ${c.get("sessionId")}
    order by e.created_at
  `;
  return c.json({ entities: rows });
});

entities.post("/", async (c) => {
  const parsed = CreateEntity.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json(
      {
        error: "invalid_entity",
        message: parsed.error.issues[0]?.message ?? "Those details don't look right.",
        issues: parsed.error.issues,
      },
      422
    );
  }
  const { name, kind, vrn } = parsed.data;
  const [row] = await sql`
    insert into entities (session_id, name, kind, vrn)
    values (${c.get("sessionId")}, ${name}, ${kind}, ${vrn ?? null})
    returning id, name, kind, vrn, created_at
  `;
  return c.json({ entity: { ...row, connected: false } }, 201);
});

// VRN can arrive after creation — no need to make the entity twice.
entities.patch("/:id", async (c) => {
  const entity = await ownedEntity(c, c.req.param("id"));
  if (!entity) return c.json({ error: "not_found" }, 404);
  const parsed = CreateEntity.pick({ vrn: true })
    .required()
    .safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json(
      {
        error: "invalid_entity",
        message: parsed.error.issues[0]?.message ?? "VRN is nine digits",
        issues: parsed.error.issues,
      },
      422
    );
  }
  const [row] = await sql`
    update entities set vrn = ${parsed.data.vrn}
    where id = ${entity.id}
    returning id, name, kind, vrn, created_at
  `;
  return c.json({ entity: row });
});

entities.get("/:id", async (c) => {
  const entity = await ownedEntity(c, c.req.param("id"));
  if (!entity) return c.json({ error: "not_found" }, 404);
  const connection = await getConnection(entity.id);
  return c.json({
    entity: {
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      vrn: entity.vrn,
      created_at: entity.created_at,
      connected: Boolean(connection),
      hmrc_env: connection?.hmrc_env ?? null,
    },
  });
});
