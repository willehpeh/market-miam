# Persistence Plan (Postgres event store)

Durable Postgres adapters behind the existing `EventStore` / `Events` / `Checkpoint` / `Subscription` ports. Tracks `PLAN.md` backlog #1. Updated as steps land.

## Status

Done (committed):
- `version` field required on `DomainEvent` / `StoredEvent` (genesis = v1) — `45e47f0`.
- ADR 0028 serialize-appends ordering decision — `e2e1ca2`.
- Prior session (already on `main`): RxJS polling refactor, `pollSchedule`, drain-until-short-batch loop, `EVENT_NOTIFICATIONS` seam (default `EMPTY`), exponential backoff + `resetOnSuccess`, dead-letter marker in `InMemorySubscription.poll`.

Next: **Step 4** — NOTIFY/LISTEN + `apps/api` wiring. (`version`, 1a, 1b, 2, 3 are committed — see the Steps checklist for what each landed.) Runner note: `ConsumerRunner` has been renamed `Subscriptions`.

## Decisions (locked)

| Area | Decision | Ref |
|---|---|---|
| Global ordering | Serialize appends with a global `pg_advisory_xact_lock` held to commit → single-`bigint` cursor stays gap-free. Ceiling ~300–1000 appends/s (managed pg), far above load. Rejected: `pg_snapshot_xmin` composite cursor, Marten high-water-mark. | ADR 0028 |
| Packaging | Adapters in the existing `@market-monster/event-sourcing` package barrel; `pg` becomes a package dep (zero-dep-core deliberately given up; no Nx boundary enforcement). | — |
| ORM | None. Raw `pg` (node-postgres) + hand SQL (~6 static queries). Kysely (query builder, not ORM) only *maybe* on the read side later. | — |
| Migrations | `node-pg-migrate`, one pipeline in **`database/migrations/`** (repo root — the DB is shared by `api` and the future `admin-api`, owned by neither app). Events + checkpoints + read models, run identically in Testcontainers `beforeAll` and prod. Who runs them (a dedicated `database:migrate` job vs on-boot) is a 1b concern; node-pg-migrate's advisory lock makes concurrent runners safe as a backstop. | — |
| Testing | Bind existing contract suites (`test/src/event-sourcing/{event-store,events,checkpoint,subscription}.contract.ts`) to pg impls under Testcontainers. pg-mem rejected (false-greens concurrency + LISTEN/NOTIFY). Add a concurrent-append contract test — trivially green in-memory, drives the advisory lock in pg. | — |
| Subscription | No Postgres `Subscription`. Reuse `InMemorySubscription` (rename → `PollingSubscription`) over pg `Events` + pg `Checkpoint`. | — |
| Time | `events.created_at bigint` epoch-ms = `StoredEvent.timestamp` (zoneless instant). Vendor-local domain times live in `jsonb` payload verbatim. Ops timestamps (`checkpoints.updated_at`) use `timestamptz`. | — |
| Crypto-shredding | Not now. It's a decorator above the port + separate `DataKeys` store; the only overlap (immutable log) is covered by the append-only trigger. | ADR 0025 |

## Adapter surface (three things)

- `PostgresEventStore` implements `EventStore` + `Events` — append (advisory lock + optimistic concurrency), `load`, `loadFrom`.
- `PostgresCheckpoint` implements `Checkpoint` — shared `checkpoints` table keyed by subscription name.
- NOTIFY-on-append + one LISTEN connection → the `EVENT_NOTIFICATIONS` observable.

Mapping gotchas (adapter, not schema): the count-check throws `ConcurrencyError`, which propagates untouched — **no `23505` mapping**. Under the advisory lock a unique-violation is unreachable; if one ever escapes, the lock invariant broke, so let it blow up loudly (the `UNIQUE (stream_id, stream_position)` constraint is the DB integrity backstop). `metadata IS NULL` → omit the key (contract asserts `not.toHaveProperty('metadata')`); checkpoint with no row → `read()` returns `0`.

## Schema (built — `database/migrations/0001_events_and_checkpoints.sql`)

```sql
CREATE TABLE events (
  id              uuid    NOT NULL,
  global_position bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- loadFrom order; rollback gaps expected
  stream_id       text    NOT NULL,
  stream_position integer NOT NULL,
  event_type      text    NOT NULL,
  payload         jsonb   NOT NULL,   -- domain events verbatim, incl. vendor-local times
  metadata        jsonb,
  version         integer NOT NULL DEFAULT 1,   -- event schema version
  created_at      bigint  NOT NULL,   -- epoch ms = StoredEvent.timestamp
  UNIQUE (id),
  UNIQUE (stream_id, stream_position)
);
-- append-only: BEFORE UPDATE OR DELETE trigger RAISE EXCEPTION (events table only; data_keys must allow DELETE)

CREATE TABLE checkpoints (
  subscription_name text        PRIMARY KEY,
  position          bigint      NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now()   -- lag/stuck-consumer monitoring
);
```

Minimal indexes only: `(stream_id, stream_position)` unique doubles as `load(streamId)` read index; `global_position` PK covers `loadFrom` range scans. Advisory lock lives in `append()` code, not the schema. Also in Step 1a: **update ADR 0005** — drop `stream_type`, add `version` (match `StoredEvent`).

## Steps

- [x] `version` prerequisite (committed)
- [x] 1a — schema/migration DDL review + update ADR 0005
- [x] 1b — deps added; migration `database/migrations/0001_events_and_checkpoints.sql`; Testcontainers harness (`test/src/event-sourcing/postgres/testcontainer.ts`) + smoke test via a new **`test:container`** target (`*.container.spec.ts`, Docker-gated, excluded from the fast suite). Test tsconfig → `module: esnext` + `moduleResolution: bundler`. **TODO:** prod `database:migrate` deploy job (harness migrates programmatically; deploy job unbuilt).
- [x] 2 — `PostgresEventStore` (barrel; `import type { Pool }` keeps pg runtime-free — only `apps/api` loads pg to build the pool). Passes `event-store` + `events` contracts under Testcontainers + a real-concurrency test (one append wins, one `ConcurrencyError`). append delegates to a per-call `AppendTransaction` object (owns open/append/commit/rollback/release — the safe "client as a field" shape; the store is a Nest singleton, so a shared `client` field would cross connections): open (BEGIN + advisory lock) → `AppendTransaction.append` (encapsulates the count-check `ConcurrencyError`, then inserts) → commit; `catch → rollback + rethrow`, no error mapping; `created_at` = `Date.now()` (parity w/ in-memory; Clock-routing deferred). NOTE: the lock's global-ordering guarantee is by-design, not race-tested.
- [x] 3 — landed across three commits (rename → checkpoint → subscription binding):
  1. **`PostgresCheckpoint`** (`postgres.checkpoint.ts`, barrel, `import type { Pool }`) `implements Checkpoint`, constructed `(pool, subscriptionName)`: `read()` = `SELECT position FROM checkpoints WHERE subscription_name=$1` → `row ? Number(row.position) : 0` (no row → `0`; `Number(row?.position) ?? 0` was wrong — `NaN` isn't nullish); `write(pos)` = `INSERT ... ON CONFLICT (subscription_name) DO UPDATE SET position=$2, updated_at=now()`.
  2. **Rename** `InMemorySubscription` → `PollingSubscription` (`in-memory.subscription.ts` → `polling.subscription.ts`): file + class, barrel, contract spec (renamed to `polling-subscription.contract.spec.ts`), the three `market-days/*` projection specs, and the `Subscriptions` runner (now `PollingSubscription` over `InMemoryCheckpoint` — checkpoint swaps to pg in step 4). Pure refactor, no second subscription class.
  3. **Bind both contracts over pg** in one `postgres-subscription.container.spec.ts` (single shared container, not two): `checkpointContract('PostgresCheckpoint', …)` + `subscriptionContract('PollingSubscription over Postgres', …)` with `writer = new PostgresEventStore(pg.pool)`, `subscribe = h => new PollingSubscription(store, h, new PostgresCheckpoint(pg.pool, 'sub-1'))`. Proves store + checkpoint + polling end-to-end. Container suite 31 green.
- [ ] 4 — LISTEN/NOTIFY + wiring. Four review-gated sub-commits (a–d):
  1. **(a) NOTIFY migration** `database/migrations/0002_events_notify.sql` — `AFTER INSERT ON events FOR EACH ROW` trigger `PERFORM pg_notify('events','')` (empty payload; fires post-commit, decoupled from `append`; pokes are idempotent, `exhaustMap` collapses bursts). Container test in new `postgres-notifications.container.spec.ts`: pooled client `LISTEN events`, append via `PostgresEventStore`, assert a notification arrives.
  2. **(b) `PostgresNotifications`** in **`apps/api`** (needs the pg *runtime* `Client` + `ConfigService`; keeps the package barrel runtime-pg-free). Takes a `() => Client` factory (fresh client per reconnect — NOT a borrowed `pool.connect()`), runs `LISTEN events`, exposes `Observable<void>`. On drop: backoff-reconnect, re-`LISTEN`, keep the same `Subject`, **emit one catch-up poke on successful re-LISTEN**. `OnApplicationShutdown` stops the loop + closes the client. Log connect/drop/reconnect transitions as OTel **marker spans** (`trace.getTracer('pg-notifications')`; `listen.state` + `error.message` + `reconnect.attempt`) — the LISTEN-down window is the miss-window; per-event miss detection rejected (races → false positives). Harness gains a `connectionString`. Four container tests appended to the same file: emit-on-insert, reconnect-after-`pg_terminate_backend`, exactly-one-emission-per-insert-after-reconnect (guards listener stacking), reconnect-emits-catch-up-poke (+ optional shutdown-stops-emitting).
  3. **(c) Wire** `apps/api`: `Pool` provider from `DATABASE_CONNECTION_STRING` (render.yaml; pg 18); inner store → `PostgresEventStore(pool)` (same `MessageContext`/`Tracing` decorators); `Events` → same instance; new `CHECKPOINT_FACTORY` token → `(name) => new PostgresCheckpoint(pool, name)` injected into `Subscriptions` (default stays `InMemoryCheckpoint`, so the 6 runner tests are untouched — runner never sees `Pool`); `EVENT_NOTIFICATIONS` = the LISTEN observable (drop `EMPTY`); `pollSchedule` interval → **5s** (NOT 30s — LISTEN unproven; the short timer is the backstop for missed notifies).
  4. **(d) migrate-on-boot** (last, prod-facing): run `node-pg-migrate` `runner` in `main.ts` before Nest boots (same call the harness makes; advisory lock makes concurrent boots safe; `database/migrations/` resolves at repo root at runtime). No new Render service.

## Deferred (this build's tail)

- Read-model (projection) pg adapters + transactional projection+checkpoint write → resolves the `DEFERRED.md` "Checkpoint/views transaction boundary".
- Crypto-shredding decorator + `DataKeys` store (ADR 0025).
- Per-event dead-lettering in `poll()` with a durable attempt count (marker already in `InMemorySubscription.poll`).
- `pg_snapshot_xmin` composite-cursor upgrade if append throughput ever bottlenecks (widens the `Checkpoint`/`Events` ports).

## Cadence

Small steps; pause after each for review / change / commit. Commit to `main`, scoped per logical change.
