import { Hono } from "hono";
import { z } from "zod";
import { sql } from "../db.js";
import { ownedEntity } from "../session.js";
import { getConnection } from "../hmrc.js";

// Two letters, six digits, one letter — the standard NINO shape. Mirrors the
// VRN regex's simplicity; HMRC's sandbox-minted NINOs satisfy it.
const NINO_REGEX = /^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}$/i;

const CreateEntity = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["person", "business", "charity", "trust"]),
  vrn: z
    .string()
    .trim()
    .regex(/^\d{9}$/, "VRN is nine digits")
    .optional(),
  nino: z
    .string()
    .trim()
    .regex(NINO_REGEX, "NINO is two letters, six digits, one letter")
    .optional(),
});

// vrn (VAT) or nino (ITSA) can arrive after creation — no need to make the
// entity twice, and no need to have both to update one.
const PatchEntity = CreateEntity.pick({ vrn: true, nino: true })
  .partial()
  .refine((d) => d.vrn !== undefined || d.nino !== undefined, {
    message: "Provide a vrn or nino to update.",
  });

export const entities = new Hono();

entities.get("/", async (c) => {
  const rows = await sql`
    select e.id, e.name, e.kind, e.vrn, e.nino, e.created_at,
           bool_or(hc.rail = 'vat') as vat_connected,
           bool_or(hc.rail = 'itsa') as itsa_connected
    from entities e
    left join hmrc_connections hc on hc.entity_id = e.id
    where e.session_id = ${c.get("sessionId")} or e.user_id = ${c.get("userId") ?? null}
    group by e.id
    order by e.created_at
  `;
  return c.json({
    entities: rows.map(({ vat_connected, itsa_connected, ...e }) => {
      const vat = Boolean(vat_connected);
      const itsa = Boolean(itsa_connected);
      // Legacy `connected` = any rail — the VAT cockpit reads this and stays
      // untouched; new callers should read `connections` instead.
      return { ...e, connected: vat || itsa, connections: { vat, itsa } };
    }),
  });
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
  const { name, kind, vrn, nino } = parsed.data;
  const userId = c.get("userId");
  // A passkey-backed caller gets an account-owned entity from birth (no
  // claiming step later); everyone else gets exactly today's session-owned
  // insert. Exactly one owner, always — the CHECK in migration 005 enforces
  // it, this just picks the right one up front.
  const [row] = userId
    ? await sql`
        insert into entities (user_id, session_id, name, kind, vrn, nino)
        values (${userId}, ${null}, ${name}, ${kind}, ${vrn ?? null}, ${nino ?? null})
        returning id, name, kind, vrn, nino, created_at
      `
    : await sql`
        insert into entities (session_id, name, kind, vrn, nino)
        values (${c.get("sessionId")}, ${name}, ${kind}, ${vrn ?? null}, ${nino ?? null})
        returning id, name, kind, vrn, nino, created_at
      `;
  return c.json(
    { entity: { ...row, connected: false, connections: { vat: false, itsa: false } } },
    201
  );
});

// VRN or NINO can arrive after creation — no need to make the entity twice.
entities.patch("/:id", async (c) => {
  const entity = await ownedEntity(c, c.req.param("id"));
  if (!entity) return c.json({ error: "not_found" }, 404);
  const body: Record<string, unknown> = await c.req.json().catch(() => ({}));
  // Normalize at the boundary: HMRC's NINO is case-insensitive and
  // occasionally copy-pasted with a mid-string space (the standard "two
  // letters, six digits, one letter, space before the last two digit pairs"
  // formatting) — store one canonical shape so every later read (and every
  // regex check downstream) can assume it.
  if (typeof body.nino === "string") {
    body.nino = body.nino.toUpperCase().replace(/\s/g, "");
  }
  const parsed = PatchEntity.safeParse(body);
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
  const { vrn, nino } = parsed.data;
  const [row] = await sql`
    update entities set
      vrn = coalesce(${vrn ?? null}, vrn),
      nino = coalesce(${nino ?? null}, nino)
    where id = ${entity.id}
    returning id, name, kind, vrn, nino, created_at
  `;
  // Same connections shape as GET /:id — the panel reads `connections.itsa`
  // straight off this response after saving a NINO, so it must be here too.
  const [vatConnection, itsaConnection] = await Promise.all([
    getConnection(entity.id, "vat"),
    getConnection(entity.id, "itsa"),
  ]);
  return c.json({
    entity: {
      ...row,
      connected: Boolean(vatConnection) || Boolean(itsaConnection),
      connections: { vat: Boolean(vatConnection), itsa: Boolean(itsaConnection) },
    },
  });
});

entities.get("/:id", async (c) => {
  const entity = await ownedEntity(c, c.req.param("id"));
  if (!entity) return c.json({ error: "not_found" }, 404);
  const [vatConnection, itsaConnection] = await Promise.all([
    getConnection(entity.id, "vat"),
    getConnection(entity.id, "itsa"),
  ]);
  return c.json({
    entity: {
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      vrn: entity.vrn,
      nino: entity.nino,
      created_at: entity.created_at,
      // Legacy `connected` = any rail — the VAT cockpit reads this and stays
      // untouched; new callers should read `connections` instead.
      connected: Boolean(vatConnection) || Boolean(itsaConnection),
      connections: { vat: Boolean(vatConnection), itsa: Boolean(itsaConnection) },
      hmrc_env: vatConnection?.hmrc_env ?? itsaConnection?.hmrc_env ?? null,
    },
  });
});
