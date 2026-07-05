# 0030. LISTEN/NOTIFY to poke the poller (low latency without a broker)

Date: 2026-07-05 · Status: Accepted

## Context

ADR 0015 chose pull-based polling for post-commit event delivery and rejected a
message broker (keep the dependency surface to Postgres). Polling alone couples
delivery latency to the poll interval and imposes idle query load. Postgres's
LISTEN/NOTIFY offers low-latency push within the database we already run — no new
infrastructure. This extends ADR 0015; it does not supersede it.

## Decision

- An `AFTER INSERT ON events FOR EACH ROW` trigger fires `pg_notify('events','')`
  (post-commit, decoupled from the append code; empty payload — the notification
  is only a "poll now" poke).
- A dedicated long-lived pg connection (`PostgresNotifications`) runs `LISTEN
  events` and exposes an `Observable<void>` of pokes. The `Subscriptions` poller
  merges pokes with a timer: **NOTIFY drives latency; the timer is the safety-net
  backstop** for any poke missed while LISTEN is reconnecting.
- Reconnect is the risky part: backoff-reconnect, re-`LISTEN`, and **emit a
  catch-up poke on reconnect** (events may have landed during the gap). Keep the
  backstop interval short (5 s, not 30 s) until LISTEN is trusted — a broken
  LISTEN is invisible behind a long timer.
- The core is framework-free (in the package, publishing connection state on a
  `status` stream); a thin `apps/api` decorator adds the Nest lifecycle, logging,
  and OTel marker spans.

## Consequences

- Low delivery latency without a broker — stays within ADR 0015's single-Postgres
  spirit.
- Correctness never depends on NOTIFY: a missed or lagged notification only
  degrades latency; the poll backstop still delivers every event. Per-event
  "did we miss a notify?" detection was rejected as race-prone (false positives).
- Costs one extra dedicated Postgres connection — a connection-budget factor on
  small managed instances.
- Reconnect/re-LISTEN is covered by container tests (terminate the backend; assert
  recovery, no listener stacking, and the catch-up poke).
