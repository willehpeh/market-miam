-- Up Migration

-- The vendor chooses whether their carte quotes prices, and is opted in. DEFAULT true is
-- that opt-in in the schema: every row that predates this column — and every write from a
-- not-yet-deployed instance during the overlap — reads as showing prices, which is what
-- the aggregate says too, since it treats the absence of a CartePricesHidden as visible.
-- No rebuild needed: neither event has ever had a route, so no log entry predates it.
ALTER TABLE vendor_storefront_views ADD COLUMN carte_prices_visible boolean NOT NULL DEFAULT true;

-- Down Migration

ALTER TABLE vendor_storefront_views DROP COLUMN carte_prices_visible;
