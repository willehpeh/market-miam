-- Up Migration

-- Authoritative subdomain → vendor lookup behind the public storefront. NOT a projection:
-- rows are written directly (v1: hand-seeded per env), never rebuilt from events, so the
-- subdomain PK stays the reservation guard. Mutable — erasure deletes the row via removeFor
-- — hence no append-only trigger. vendor_id UNIQUE = one subdomain per vendor.
CREATE TABLE subdomain_registry (
  subdomain text NOT NULL PRIMARY KEY,
  vendor_id text NOT NULL UNIQUE
);

-- Down Migration

DROP TABLE subdomain_registry;
