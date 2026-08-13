-- Up Migration

-- Live mode slice 1: the day's row carries which items sold out (LIVE-MODE-PLAN.md
-- decision 14) — appended per ItemMarkedAsSoldOut, removed per ItemMarkedAsAvailable,
-- intersected with item_ids when the menu is re-set. No rebuild: neither event has ever
-- had a route, so no log entry predates the column, and the DEFAULT keeps writes from
-- not-yet-deployed instances valid during the overlap.
ALTER TABLE market_day_views ADD COLUMN sold_out text[] NOT NULL DEFAULT '{}';

-- Down Migration

ALTER TABLE market_day_views DROP COLUMN sold_out;
