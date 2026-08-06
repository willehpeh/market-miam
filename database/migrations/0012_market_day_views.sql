-- Up Migration

-- Read model for what a vendor is selling on one market day. Mutable — rebuilt from events
-- by replay, so no append-only trigger. Point lookup by (vendor_id, market_id, day), which
-- is the primary key; setting a menu again upserts the whole row, since MarketDayMenuSet
-- carries the whole set. Only item ids are stored: dish names and prices are joined from
-- the catalogue view at query time, so a rename reaches days already planned.
-- ponytail: day is text, not date — pg would hand back a JS Date for a date column and the
-- view speaks ISO strings. ISO-8601 sorts lexicographically, so range scans still work.
CREATE TABLE market_day_views (
  vendor_id text   NOT NULL,
  market_id text   NOT NULL,
  day       text   NOT NULL,
  item_ids  text[] NOT NULL,
  PRIMARY KEY (vendor_id, market_id, day)
);

-- Down Migration

DROP TABLE market_day_views;
