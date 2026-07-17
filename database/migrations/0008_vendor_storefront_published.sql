-- Up Migration

-- The publication gate (ADR 0031): a storefront is public only once the vendor
-- publishes it. Defaults false so existing rows and new opens start unpublished.
ALTER TABLE vendor_storefront_views ADD COLUMN published boolean NOT NULL DEFAULT false;

-- Down Migration

ALTER TABLE vendor_storefront_views DROP COLUMN published;
