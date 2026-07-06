-- Up Migration

-- Per-subject data keys for crypto-shredding. Each row holds one vendor's data
-- key, envelope-encrypted under the master key (iv || authTag || ciphertext).
-- NOT append-only: shred() DELETEs the row — deleting the key is the erasure act,
-- leaving the ciphertext in `events` permanently unreadable.
CREATE TABLE data_keys (
  subject_id  text        PRIMARY KEY,
  wrapped_key bytea       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Down Migration

DROP TABLE data_keys;
