-- Up Migration

CREATE TABLE events (
  id              uuid    NOT NULL,
  global_position bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stream_id       text    NOT NULL,
  stream_position integer NOT NULL,
  event_type      text    NOT NULL,
  payload         jsonb   NOT NULL,
  metadata        jsonb,
  version         integer NOT NULL DEFAULT 1,
  created_at      bigint  NOT NULL,
  UNIQUE (id),
  UNIQUE (stream_id, stream_position)
);

-- Append-only: block row mutation. TRUNCATE bypasses row triggers (intentional — test reset).
CREATE FUNCTION events_reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'events is append-only: % denied', TG_OP;
END;
$$;

CREATE TRIGGER events_append_only
  BEFORE UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION events_reject_mutation();

CREATE TABLE checkpoints (
  subscription_name text        PRIMARY KEY,
  position          bigint      NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Down Migration

DROP TABLE checkpoints;
DROP TABLE events;
DROP FUNCTION events_reject_mutation;
