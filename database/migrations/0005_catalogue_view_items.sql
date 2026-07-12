-- Up Migration

-- Read model for a vendor's catalogue (their dishes). Mutable — rebuilt from events by
-- replay, so no append-only trigger. price is whole cents. seq preserves the order in
-- which dishes were added so the vitrine lists them consistently.
CREATE TABLE catalogue_view_items (
  vendor_id       text      NOT NULL,
  item_id         text      NOT NULL,
  name            text      NOT NULL,
  description     text      NOT NULL DEFAULT '',
  price           integer   NOT NULL,
  image_reference text      NOT NULL,
  seq             bigserial NOT NULL,
  PRIMARY KEY (vendor_id, item_id)
);

CREATE INDEX catalogue_view_items_vendor_seq ON catalogue_view_items (vendor_id, seq);

-- Down Migration

DROP TABLE catalogue_view_items;
