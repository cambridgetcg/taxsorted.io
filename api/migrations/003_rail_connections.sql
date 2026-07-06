-- Fixes the VAT/ITSA collision: hmrc_connections held one row per entity
-- (unique(entity_id)), so connecting ITSA on an entity that already held a
-- VAT connection — or vice versa — silently overwrote the other rail's
-- tokens (the insert's "on conflict (entity_id) do update" clobbered
-- whichever connection was there first). From here on, storeConnection/
-- getConnection are rail-scoped and each rail keeps its own row per entity.
--
-- Backfill: the ITSA connect door shipped BEFORE this migration (M1 wave),
-- so pre-existing rows may be either rail. The stored OAuth scope
-- discriminates reliably: ITSA connections carry 'self-assessment' scopes,
-- VAT connections carry 'vat' scopes — backfill from that, never assume.

alter table hmrc_connections
  add column rail text not null default 'vat' check (rail in ('vat', 'itsa'));

update hmrc_connections set rail = 'itsa' where scope like '%self-assessment%';

alter table hmrc_connections drop constraint hmrc_connections_entity_id_key;

alter table hmrc_connections
  add constraint hmrc_connections_entity_id_rail_key unique (entity_id, rail);
