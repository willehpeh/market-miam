-- Up Migration

-- 0012 keyed the table (vendor_id, market_id, day) for the point lookup slice 2 planned.
-- Slice 3a replaced that read with a window — vendor_id equality plus a range over day —
-- which that key order cannot bound: day is the third column, so postgres walked every
-- one of the vendor's index entries and filtered. Harmless at a vendor's cardinality, but
-- the adapter's comment claimed a prefix scan it wasn't getting. Reorder to
-- (vendor_id, day, market_id) so the window is a true prefix scan and ORDER BY
-- day, market_id comes straight off the index.
-- Derived state, so no data migration: drop, recreate, rewind the checkpoint, and the
-- boot poll (timer fires at 0) replays the log into the new table — the 0010 pattern.
-- Old instances in a deploy overlap still write correctly: the upsert's ON CONFLICT
-- names its columns, which postgres matches to the PK as a set, regardless of order.
DROP TABLE market_day_views;
CREATE TABLE market_day_views (
  vendor_id text   NOT NULL,
  market_id text   NOT NULL,
  day       text   NOT NULL,
  item_ids  text[] NOT NULL,
  PRIMARY KEY (vendor_id, day, market_id)
);
UPDATE checkpoints SET position = 0 WHERE subscription_name = 'market-day-view';

-- Down Migration

-- The same clear-and-rewind, back into 0012's key order.
DROP TABLE market_day_views;
CREATE TABLE market_day_views (
  vendor_id text   NOT NULL,
  market_id text   NOT NULL,
  day       text   NOT NULL,
  item_ids  text[] NOT NULL,
  PRIMARY KEY (vendor_id, market_id, day)
);
UPDATE checkpoints SET position = 0 WHERE subscription_name = 'market-day-view';
