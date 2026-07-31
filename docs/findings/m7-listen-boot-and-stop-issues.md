# M7 — LISTEN boot resolves on failure; `stop()` never completes its subjects

| | |
|---|---|
| Severity | Low |
| Area | Notifications / operations |
| Files | `packages/event-sourcing/src/adapters/postgres/postgres.notifications.ts:53-56,77-84,121-123` |
| Status | Open |
| Found | 2026-07-31 evaluation @ `eec797b` |

## Issue

The LISTEN/NOTIFY adapter is one of the best-reasoned pieces of the codebase —
`ReplaySubject(1)` for status vs plain `Subject` for pokes (with the reasoning
written down), catch-up poke after reconnect, capped exponential backoff, the
stop-during-connect window closed by a post-`await` recheck, and reconnect
behaviour genuinely proven against a real container via `pg_terminate_backend`
(`postgres-notifications.container.spec.ts:70-110`). Three loose ends remain:

1. **`start()` resolves even when the connection failed.** If
   `client.connect()` or `LISTEN` throws, the error routes to `handleLoss` and
   `start()` returns normally. Boot reports healthy with the poke stream down;
   the reconnect loop will keep trying, and the 5-minute poll timer masks the
   gap at high latency — but a *permanently* misconfigured LISTEN connection
   (wrong connection string, revoked grant) never fails the boot and only
   surfaces as mysteriously slow read models.
2. **`stop()` never completes `pokes` or `statuses`.** A subscriber outside
   `Subscriptions` (whose `takeUntil(stopped)` covers the app's own use) sees no
   terminal event — the port leaks the subscription contract on shutdown.
3. **The reconnect `attempt` counter is not reset on `stop()`**, so a
   stop/start cycle resumes at the previous backoff and reports a misleading
   `attempt` in its first status emission.

## Failure scenario

For (1): a deploy ships with a bad `DATABASE_CONNECTION_STRING` grant for the
LISTEN client only. All health checks pass; appends work; projections lag by up
to the 5-minute timer interval indefinitely. The `pg-listen dropped` status
span exists (`TracingPostgresNotifications`) but nothing alerts on it
(stuck-subscription alerting is deferred in `O11Y-PLAN.md`), so the symptom is
"the storefront takes minutes to appear" with no error anywhere.

For (2)/(3): cosmetic today; both become real if any second consumer of the
observables appears (tests, an admin surface, a health endpoint).

## Evidence

Static: the `connect()` error routing and `start()`/`stop()` bodies at the
cited lines. Executed-elsewhere caveat: the reconnect specs listed above are
container specs, statically reviewed in this evaluation (no Docker); what they
pin — re-LISTEN, no listener stacking, catch-up poke, status transitions with
`attempt: 1` — does **not** include first-connect failure, `attempt ≥ 2`, or
delivery of events appended during a disconnect window.

## Suggested fix

1. Make first connection failure **loud at boot**: let `start()` reject (the
   caller decides whether a poke-less boot is acceptable), or — if
   keep-trying-forever is the intended posture — emit a distinct
   `never-connected` status and document that the timer is the fallback. Either
   is fine; silent is not.
2. `stop()` completes both subjects and resets `attempt` (and the container
   spec asserts terminal events + `attempt: 1` after a stop/start cycle).
3. While in the file: a container spec for events appended during a disconnect
   window (kill the connection, append, reconnect, assert the catch-up poke
   causes delivery) — the one reconnect scenario the otherwise-thorough suite
   doesn't cover.
