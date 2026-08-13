# 0050. Client-side timeouts: a hung poll throws instead of vanishing

Date: 2026-08-13 · Status: Accepted

## Context

Investigating a `Subscription lag` alert. The alert itself was structurally
broken — it gauged head-minus-checkpoint *before* the drain that clears it,
so a NOTIFY-woken poll always read 1 and the threshold `> 0` fired on every
single append — but chasing it surfaced a real hole underneath: a poll that
*hangs* is completely invisible.

Three facts compound into that.

1. `traced()` ends its span in a `finally`. A promise that never settles
   never runs the finally, and OTel exports on `end()` — so a hung poll
   emits no span at all. `with-span.ts` already says this in its own words:
   "a forgotten protocol is silent — the span never ends, never exports."
2. `exhaustMap` in `Subscriptions.wakeSubscription` ignores source
   emissions while the inner observable is in flight. While that first poll
   hangs, every 5-minute backstop tick and every LISTEN/NOTIFY poke (ADR
   0030) is discarded, so no *later* poll starts either.
3. The `retry()` below it engages on error. A hang is not an error.

One hung promise therefore silences a subscription permanently while
emitting nothing. `keepAlive: true` bounds it, but node-postgres passes an
unset `keepAliveInitialDelayMillis` to `setKeepAlive`, so the OS default
applies — roughly two hours on Linux.

Nothing could alert on this, and no threshold can be made to: `MAX` over
zero matching rows returns `0`, so silence and health are the same number.
This is the same shape as the gap ADR 0042 named — a signal into the void —
except here there is no signal at all.

## Decision

Two options on the shared pool, chosen so the failure mode stops being
absence and starts being an error.

**`query_timeout: 10_000`** — a client-side per-query timer. Client-side is
the whole point: it fires whether or not the server ever answers.
*Rejected: `statement_timeout`.* Being server-side, Postgres would abort the
query correctly, but the abort travels back down the same dead socket — it
fixes slow queries, not black-holed ones. Sized at ~10x the slowest poll
ever observed in production (1,016ms, a `market-day-view` rebuild), and that
ceiling holds as the log grows because `loadFrom` batches at 100 rows
however long the log is. Migrations are unaffected: `node-pg-migrate` opens
its own connection from the URL rather than sharing the pool, so the
headroom they would have demanded is not a constraint here.

**`connectionTimeoutMillis: 5_000`** — bounds acquisition only (queueing for
a free connection, or the TCP/TLS/auth of a new one), so it complements
`query_timeout` rather than replacing it. The `0` default waits forever,
which turns a saturated pool into hung HTTP requests instead of the 5xx the
`API 5xx` trigger already watches. Kept under `query_timeout` so the two
cannot stack into one long stall.

*Also rejected: building alerting that proves a negative.* A "did we poll at
all" trigger is constructible — an ungrouped `COUNT` returns a real `0`
where `MAX` does not — but it cannot be scoped per subscription, because a
breakdown turns a wedged consumer into a *missing group* rather than a zero,
and the fan-out gives each subscription its own `exhaustMap` to wedge in
independently. Five filtered triggers would be needed, against a 2-trigger
plan limit. Making the hang loud at the source is cheaper than instrumenting
its silence.

## Consequences

- A hung query throws within 10s. `traced()`'s catch marks the span ERROR
  with its `exception.slug`, `span.end()` runs, and the span exports — the
  failure becomes queryable where previously nothing was emitted.
- `retry()` engages, so a wedged subscription recovers on the existing
  capped backoff rather than staying dead until the process restarts.
- The `Subscription lag` trigger was rewritten in the same pass:
  `MAX(processing.lag_ms) > 30s` on handle spans, replacing
  `MAX(subscription.lag) > 0` on poll spans. Age separates what a count
  cannot — a poison event's replays stamp a growing lag, where its count
  stays flat at 1.
- Residual gap, accepted: a poll failing persistently *while no events
  flow* still emits no handle span, so the lag trigger reads 0. Narrow, as
  the poll shares its pool with the HTTP path and a store outage therefore
  trips `API 5xx` — and now at least queryable rather than absent.
- The timeout is a calibration knob, not a constant of nature. Any future
  work that legitimately holds a pool connection longer — a bulk backfill,
  or a rebuild that stops batching at 100 — must revisit the 10s, or it
  turns a slow query into a retry storm.
