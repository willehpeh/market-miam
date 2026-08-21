-- Up Migration

-- Read model for what a vendor charges at one market (ADR 0052). Mutable — rebuilt from
-- events by replay, so no append-only trigger. Keyed (vendor_id, market_id): prices belong
-- to a market, not to a schedule, since two schedules can sit at one market. Pricing a
-- market again upserts the whole row, because MarketPricesSet carries the whole list.
-- jsonb rather than columns: the list is one value per dish, and that value is itself
-- either cents or cents per variant name. Read whole, per vendor, never queried across
-- dishes — the same reasoning that made catalogue_view_items.variants jsonb (ADR 0033).
CREATE TABLE market_prices_views (
  vendor_id text  NOT NULL,
  market_id text  NOT NULL,
  prices    jsonb NOT NULL,
  PRIMARY KEY (vendor_id, market_id)
);

-- Down Migration

DROP TABLE market_prices_views;
