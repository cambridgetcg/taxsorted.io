-- The first ITSA write-path receipt: one row per (entity, tax year, business,
-- quarter period-end). Unlike VAT's submissions table (immutable — a receipt
-- is a receipt, once, ever), MTD ITSA quarterly updates are CUMULATIVE
-- corrections: HMRC expects a resend of the same quarter to be a PUT to the
-- same resource, replacing the year-to-date totals it already holds. So a
-- resubmission here UPDATES the existing row rather than being rejected —
-- superseded_count is the honest trail of how many times a quarter has been
-- corrected.
--
-- The unique key deliberately omits quarter_index: period_end (an ISO date)
-- already pins a submission to one specific quarter for a given election
-- (standard vs calendar quarters land on different period-end dates), so two
-- genuinely different quarters can never collide here.
create table itsa_receipts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  tax_year text not null,
  quarter_index smallint not null check (quarter_index between 1 and 4),
  -- ISO yyyy-mm-dd, same string convention the engine uses throughout
  -- (types.ts) — kept as text rather than `date` so what we store is
  -- byte-identical to what quartersFor() produced and what HMRC received,
  -- with no timezone-driven surprises on the way back out.
  period_end text not null check (period_end ~ '^\d{4}-\d{2}-\d{2}$'),
  business_id text not null,
  type_of_business text not null check (type_of_business in ('self-employment', 'uk-property')),
  submitted_at timestamptz not null default now(),
  superseded_count integer not null default 0,
  hmrc_correlation_id text,
  payload_summary jsonb not null,
  unique (entity_id, tax_year, period_end, business_id)
);
create index itsa_receipts_entity_idx on itsa_receipts(entity_id);
