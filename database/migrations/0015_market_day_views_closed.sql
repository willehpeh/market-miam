-- Up Migration

-- Live mode slice 2: the day's row carries whether the vendor has closed the stand
-- (LIVE-MODE-PLAN.md decision 14) — set by MarketDayClosed, cleared by MarketDayReopened,
-- and preserved when the menu is re-set. No rebuild: neither event has ever had a route,
-- so no log entry predates the column, and the DEFAULT keeps writes from not-yet-deployed
-- instances valid during the overlap.
ALTER TABLE market_day_views ADD COLUMN closed boolean NOT NULL DEFAULT false;

-- Down Migration

ALTER TABLE market_day_views DROP COLUMN closed;
