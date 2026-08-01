-- Up Migration

-- Which master key version wraps each row (M2: makes master-key rotation
-- possible). Existing rows were all wrapped under the only key there has ever
-- been — version 1 by convention, which is where a single MASTER_KEY lands in
-- the keyring. The blob layout (iv || authTag || ciphertext) is unchanged; the
-- discriminator lives in this column.
ALTER TABLE data_keys ADD COLUMN key_version integer NOT NULL DEFAULT 1;

-- Down Migration

ALTER TABLE data_keys DROP COLUMN key_version;
