-- Up Migration

-- The market id moved out of the nested market object to a top-level marketId on
-- MarketScheduleView. The whole view lives in one jsonb column, so existing rows hold the
-- old nested shape and will not self-heal on the next event. Clear the read model and
-- rewind its checkpoint; the boot poll (timer fires at 0) replays the log into the new
-- shape. Equivalent to Subscriptions.rebuild('market-schedule-view'), which has no
-- endpoint to call from here.
DELETE FROM market_schedule_views;
UPDATE checkpoints SET position = 0 WHERE subscription_name = 'market-schedule-view';

-- Down Migration

-- Identical by design: rolling the code back means replaying into the old nested shape,
-- which is the same clear-and-rewind.
DELETE FROM market_schedule_views;
UPDATE checkpoints SET position = 0 WHERE subscription_name = 'market-schedule-view';
