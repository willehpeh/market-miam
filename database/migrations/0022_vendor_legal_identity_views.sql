-- Up Migration

-- Read model for the vendor's legal identity, as their latest VendorLegalIdentityProvided
-- says it (vendorId aside). Mutable, rebuilt by replay. One jsonb snapshot: the payload is
-- flat with explicit nulls, so it round-trips with no per-field mapping. Plaintext, like
-- every read model (ADR 0025's model A); VendorErased deletes the row.
CREATE TABLE vendor_legal_identity_views (
  vendor_id text  PRIMARY KEY,
  identity  jsonb NOT NULL
);

-- Down Migration

DROP TABLE vendor_legal_identity_views;
