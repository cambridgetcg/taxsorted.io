-- Fixes the VAT/ITSA collision: hmrc_connections held one row per entity
-- (unique(entity_id)), so connecting ITSA on an entity that already held a
-- VAT connection — or vice versa — silently overwrote the other rail's
-- tokens (the insert's "on conflict (entity_id) do update" clobbered
-- whichever connection was there first). Existing rows are all VAT-era (ITSA
-- didn't exist yet when they were written), so the backfill default of
-- 'vat' is exactly correct for every row already in the table. From here on,
-- storeConnection/getConnection are rail-scoped and each rail keeps its own
-- row per entity.

alter table hmrc_connections
  add column rail text not null default 'vat' check (rail in ('vat', 'itsa'));

alter table hmrc_connections drop constraint hmrc_connections_entity_id_key;

alter table hmrc_connections
  add constraint hmrc_connections_entity_id_rail_key unique (entity_id, rail);
