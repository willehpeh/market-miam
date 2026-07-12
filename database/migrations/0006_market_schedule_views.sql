-- Up Migration

-- Read model for a vendor's market schedules (the Calendrier). Mutable — rebuilt from
-- events by replay, so no append-only trigger. The whole view snapshot lives in one jsonb
-- column: the schedule is echoed verbatim (incl. optional fields omitted when absent), so a
-- single column round-trips exactly with no per-field mapping. seq preserves registration
-- order; re-register upserts by (vendor_id, schedule_id), keeping the original seq.
CREATE TABLE market_schedule_views (
  vendor_id   text      NOT NULL,
  schedule_id text      NOT NULL,
  schedule    jsonb     NOT NULL,
  seq         bigserial NOT NULL,
  PRIMARY KEY (vendor_id, schedule_id)
);

CREATE INDEX market_schedule_views_vendor_seq ON market_schedule_views (vendor_id, seq);

-- Down Migration

DROP TABLE market_schedule_views;
