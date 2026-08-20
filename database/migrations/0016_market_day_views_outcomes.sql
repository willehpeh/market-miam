-- Up Migration

-- Live mode slice 2b: the day's row carries the bilan — what the vendor said about how
-- each dish sold (LIVE-MODE-PLAN.md decisions 14, 64). Written per ItemOutcomeRecorded,
-- emptied by MarketDayReopened (decision 30), and pruned to item_ids when the menu is
-- re-set, exactly as sold_out is. jsonb rather than three text[] columns: the answer is
-- one value per item, and a map says that where parallel arrays only imply it. No
-- rebuild: the event has never had a route, so no log entry predates the column, and the
-- DEFAULT keeps writes from not-yet-deployed instances valid during the overlap.
ALTER TABLE market_day_views ADD COLUMN outcomes jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Down Migration

ALTER TABLE market_day_views DROP COLUMN outcomes;
