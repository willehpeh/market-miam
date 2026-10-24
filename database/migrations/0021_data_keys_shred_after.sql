-- Up Migration

-- When a key that outlives its subject's erasure must itself be shredded (ADR 0056: the
-- vendor's legal identity, five years on). Null for every other key. The daily sweep
-- tombstones each row whose date has come.
ALTER TABLE data_keys ADD COLUMN shred_after timestamptz;

-- Down Migration

ALTER TABLE data_keys DROP COLUMN shred_after;
