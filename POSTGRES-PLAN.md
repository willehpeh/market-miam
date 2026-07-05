# Persistence Plan (Postgres event store)

Durable Postgres adapters behind the existing `EventStore` / `Events` / `Checkpoint` / `Subscription` ports. Tracks `PLAN.md` backlog #1. Updated as steps land.

## Status

Done (committed):
- `version` field required on `DomainEvent` / `StoredEvent` (genesis = v1) — `45e47f0`.
- ADR 0028 serialize-appends ordering decision — `e2e1ca2`.
- Prior session (already on `main`): RxJS polling refactor, `pollSchedule`, drain-until-short-batch loop, `EVENT_NOTIFICATIONS` seam (default `EMPTY`), exponential backoff + `resetOnSuccess`, dead-letter marker in `PollingSubscription.poll` (renamed from `InMemorySubscription` in step 3).

Next: **the whole pg store/checkpoint/notifications/migrate/wiring build (steps 1–4) is done.** Remaining before prod trust: a live boot of `postgres` mode against a real pg (a command → event → projection round-trip), then the Deferred tail. (`version`, 1a, 1b, 2, 3, 4 committed/queued — see the Steps checklist.) Runner note: `ConsumerRunner` has been renamed `Subscriptions`.

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
- [x] 4 — LISTEN/NOTIFY + wiring. Sub-commits **reordered (d) before (c)** so every commit stays bootable; **(a), (b), (d), (c) all done**:
  1. [x] **(a) NOTIFY migration** `database/migrations/0002_events_notify.sql` — `AFTER INSERT ON events FOR EACH ROW` trigger `PERFORM pg_notify('events','')` (empty payload; fires post-commit, decoupled from `append`; pokes idempotent, `exhaustMap` collapses bursts). Trigger-fires container test: pooled `LISTEN events`, append via `PostgresEventStore`, assert notification. Commit `bf73877`.
  2. [x] **(b) `PostgresNotifications`** (`apps/api/src/app/event-sourcing/postgres-notifications.ts`) — takes a `() => Client` factory (fresh client per reconnect, NOT a borrowed `pool.connect()`; pg stays `import type`), optional `Logger`, optional `initialBackoffMs` (test seam). `LISTEN events` → `Observable<void>`. On drop: backoff-reconnect, re-`LISTEN`, keep the same `Subject`, **emit one catch-up poke on re-LISTEN**. `onApplicationBootstrap`→`start`, `onApplicationShutdown`→`stop` (stops loop + closes client). OTel **marker spans** per transition (`trace.getTracer('pg-notifications')`; `listen.state`/`error.message`/`reconnect.attempt`) — LISTEN-down window is the miss-window; per-event miss detection rejected (races → false positives). Harness gained `connectionString`. 5 container tests: emit-on-append, LISTEN-recovers-after-`pg_terminate_backend`, exactly-one-poke-per-append-after-reconnect (guards listener stacking), catch-up-poke-without-append, stops-after-shutdown. Commits `0043427`, `fc8f8e2`, `f40fea3`.
     - ✅ **Resolved — decoupled + moved into the package.** The earlier "needs Nest/OTel/rxjs → NOT the package" reasoning didn't hold: the class only used `import type { Client }` (pg is already a package dep), and rxjs was an accepted addition. `PostgresNotifications` is now a framework-free class in `packages/event-sourcing/src/postgres/postgres.notifications.ts` — no Nest, no OTel; lifecycle is `start()`/`stop()` and state transitions publish on `status(): Observable<ListenStatus>`. A thin `apps/api` adapter `TracingPostgresNotifications` (`tracing.postgres-notifications.ts`) owns the Nest `@Injectable`/`OnApplication*` lifecycle, the OTel marker spans, and the `Logger`, and re-exposes `notifications()`. Its container spec moved to `test/src/event-sourcing/postgres/postgres-notifications.container.spec.ts` beside the other pg specs (trigger test with it), using the local `./testcontainer` harness. So there is now **one** container target again: `nx test:container test`; the `apps/api` `vitest.container.config.mts` + `test:container` target and the `tsconfig.spec.json` `moduleResolution: bundler` tweak were all removed.
     - `status()` is a `ReplaySubject(1)` (not `Subject`/`BehaviorSubject`): a late host subscriber gets the current transition with no seed value to invent, so subscribe/start order is free. `pokes` stays a plain `Subject` (a stale "poll now" must not replay).
     - ✅ **Test gap closed:** `TracingPostgresNotifications` now has a fast unit spec (`postgres-notifications-tracing.spec.ts`, 6 tests — real core + fake `Client` boundary stub + `span-capture`/`RecordingLogger`): span+log mapping per transition, attempt/error attributes, log-vs-error routing, `notifications()` delegation, ReplaySubject order-independence, shutdown-stops-marking. The core `status()` sequence (`connected → dropped → reconnected`, incrementing `attempt`) is asserted on the real-pg drop path in the container spec (rides the existing `pg_terminate_backend` test). Container notifications spec now 7 tests.
  3. [x] **(c) Wire** `apps/api` — done as **two commits**. **4c-1 (`5b6d9a0`):** `CHECKPOINT_FACTORY` seam in `Subscriptions` (`@Optional` inject, in-memory default; `buildSubscriptions` calls `this.checkpointFor(name)`; runner never sees `Pool`) + a test asserting the factory is consulted per subscription (guards the silent "factory wired but not called → durability lost" regression). **4c-2:** `EventSourcingModule` became a **dynamic `@Global` module** — `forRoot('postgres' | 'memory')` builds the provider array conditionally. `postgres`: `Pool` from `DATABASE_CONNECTION_STRING`, `PostgresEventStore` inner (+ `MessageContext`/`Tracing` decorators), `Events` = same, `CHECKPOINT_FACTORY` = pg, `PostgresNotifications` + `TracingPostgresNotifications` via `useFactory`, `EVENT_NOTIFICATIONS` = wrapper's `notifications()`. `memory`: `InMemoryEventStore` + `EMPTY` notifications + no factory (runner default) — **pg infra never constructed**, so the fast suite needs no overrides. Divergence lives at the composition root (one `forRoot(...)` line each): `AppModule` → `'postgres'`, `apiTestModule` → `'memory'`; `MarketDaysModule` dropped its `EventSourcingModule` import (uses the global providers). The module class owns `pool.end()` on `onApplicationShutdown` (`@Optional @Inject(Pool)` — no exposed pool field). `pollSchedule` interval → **5s**. Verified: typecheck, prod build, fast api suite 43 green (market-days in-memory through the new wiring). **NOT yet run: a live boot of `postgres` mode against a real pg** (full-app boot is Auth0/JWKS-gated) — see caveat below.
  4. [x] **(d) migrate-on-boot — done, and moved *first* (before (c)) so 4c lands on a guaranteed schema.** A `Migrations` provider (`apps/api/src/app/database/migrations.ts`, `OnModuleInit`, `ConfigService`) runs `node-pg-migrate`'s `runner` (duplicated 6-line call; `migrationsTable: 'pgmigrations'`, `direction: 'up'`, `count: Infinity`) on boot — `onModuleInit` completes before any pg query (queries start at `onApplicationBootstrap`), and the advisory lock serialises concurrent instance boots. Registered in `AppModule`. **Render ships only `dist/`, NOT the repo** — so the `.sql` are copied into the bundle via webpack `assets` (`{ input: '../../database/migrations', glob: '**/*.sql', output: 'migrations' }` → `dist/apps/api/migrations/`) and resolved at `join(__dirname, 'migrations')` (webpack preserves real `__dirname`). `main.ts` `bootstrap().catch(… process.exit(1))` so a migration failure hard-crashes. `apps/api/tsconfig.app.json` → `module: esnext` + `moduleResolution: bundler` (node-pg-migrate's types are exports-map-only; unreadable under `node`). Verified against a throwaway pg: dist migrations apply → `events`/`checkpoints`/`pgmigrations` created, both recorded, second run idempotent. No new Render service. **Local caveat for future:** `main.ts` env comes from `process.env`; the migration reads `DATABASE_CONNECTION_STRING` via `ConfigService` (ConfigModule loads `apps/api/.env`), so local boot needs that key set.

## Deferred (this build's tail)

- Read-model (projection) pg adapters + transactional projection+checkpoint write → resolves the `DEFERRED.md` "Checkpoint/views transaction boundary".
- Crypto-shredding decorator + `DataKeys` store (ADR 0025).
- Per-event dead-lettering in `poll()` with a durable attempt count (marker already in `PollingSubscription.poll`).
- `pg_snapshot_xmin` composite-cursor upgrade if append throughput ever bottlenecks (widens the `Checkpoint`/`Events` ports).

## Cadence

Small steps; pause after each for review / change / commit. Commit to `main`, scoped per logical change.
