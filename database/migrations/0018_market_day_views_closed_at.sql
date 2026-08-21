-- Up Migration

-- The row learns what time the stand shut, not only that it did: a stand shut before its
-- market opened was called off, and a day the vendor never traded is never one to look
-- back on (LIVE-MODE-PLAN.md decision 75). A boolean cannot tell that from packing up
-- early, so the query could not either. Nullable — an open day has no closing time, and
-- MarketDayReopened clears it back to NULL.
ALTER TABLE market_day_views ADD COLUMN closed_at text;

-- Unlike 0015 and 0016, this column arrives after its event has been live: every
-- MarketDayClosed in the log already carries the time, so clear the read model and rewind
-- its checkpoint to fill the column in from the log. The boot poll (timer fires at 0)
-- replays it. Equivalent to Subscriptions.rebuild('market-day-view'), which has no
-- endpoint to call from here.
DELETE FROM market_day_views;
UPDATE checkpoints SET position = 0 WHERE subscription_name = 'market-day-view';

-- Down Migration

-- The same clear-and-rewind, into a table that no longer records when a day shut.
ALTER TABLE market_day_views DROP COLUMN closed_at;
DELETE FROM market_day_views;
UPDATE checkpoints SET position = 0 WHERE subscription_name = 'market-day-view';
