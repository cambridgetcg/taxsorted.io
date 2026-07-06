-- ITSA needs a National Insurance number the way VAT needs a VRN: one per
-- entity, set before connecting, read back from stored enrolment on every
-- ITSA call.
alter table entities add column nino text;
