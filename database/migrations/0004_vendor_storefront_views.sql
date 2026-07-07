-- Up Migration

-- Read model for the vendor storefront (the vitrine). Mutable — rebuilt from events
-- by replay, so no append-only trigger. name/description/phone hold decrypted PII (or
-- the SHREDDED sentinel after erasure); NOT NULL is safe because the sentinel is a
-- string, never null.
CREATE TABLE vendor_storefront_views (
  vendor_id       text PRIMARY KEY,
  name            text NOT NULL DEFAULT '',
  description     text NOT NULL DEFAULT '',
  phone           text NOT NULL DEFAULT '',
  image_reference text NOT NULL DEFAULT ''
);

-- Down Migration

DROP TABLE vendor_storefront_views;
