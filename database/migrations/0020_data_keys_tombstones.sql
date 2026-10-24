-- Up Migration

-- shred() stops deleting the row: it nulls the key material and stamps shredded_at, so a
-- shredded subject can never be minted a fresh key (a late PII write would otherwise seal
-- erased data under it) and the row is a dated record of the erasure. key_version goes
-- too: nothing is wrapped any more, so a tombstone must not hold a master key version
-- unretirable (ADR 0040), nor match a racing rewrap's compare-and-set on it.
ALTER TABLE data_keys ALTER COLUMN wrapped_key DROP NOT NULL;
ALTER TABLE data_keys ALTER COLUMN key_version DROP NOT NULL;
ALTER TABLE data_keys ADD COLUMN shredded_at timestamptz;

-- Down Migration

-- The old shred deleted the row, which is what a tombstone becomes without the column.
DELETE FROM data_keys WHERE shredded_at IS NOT NULL;
ALTER TABLE data_keys DROP COLUMN shredded_at;
ALTER TABLE data_keys ALTER COLUMN key_version SET NOT NULL;
ALTER TABLE data_keys ALTER COLUMN wrapped_key SET NOT NULL;
