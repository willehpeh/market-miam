-- Up Migration

-- Poke on append: pg_notify fires on commit, so a LISTENer only wakes once the
-- row is visible. Empty payload — the notification is just a "poll now" nudge;
-- the 5s timer is the backstop that covers any notification missed while LISTEN
-- is reconnecting.
CREATE FUNCTION events_notify_append() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('events', '');
  RETURN NULL;
END;
$$;

CREATE TRIGGER events_notify
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION events_notify_append();

-- Down Migration

DROP TRIGGER events_notify ON events;
DROP FUNCTION events_notify_append;
