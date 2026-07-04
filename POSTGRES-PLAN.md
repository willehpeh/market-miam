# Persistence Plan (Postgres event store)

Durable Postgres adapters behind the existing `EventStore` / `Events` / `Checkpoint` / `Subscription` ports. Tracks `PLAN.md` backlog #1. Updated as steps land.

## Status

Done (committed):
- `version` field required on `DomainEvent` / `StoredEvent` (genesis = v1) — `45e47f0`.
- ADR 0028 serialize-appends ordering decision — `e2e1ca2`.
- Prior session (already on `main`): RxJS polling refactor, `pollSchedule`, drain-until-short-batch loop, `EVENT_NOTIFICATIONS` seam (default `EMPTY`), exponential backoff + `resetOnSuccess`, dead-letter marker in `InMemorySubscription.poll`.

Next: **Step 1a** — schema/migration DDL for review + update ADR 0005.

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

Mapping gotchas (adapter, not schema): `23505` unique violation on `(stream_id, stream_position)` → `ConcurrencyError`; `metadata IS NULL` → omit the key (contract asserts `not.toHaveProperty('metadata')`); checkpoint with no row → `read()` returns `0`.

## Schema draft (for Step 1a review)

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
- [x] 2 — `PostgresEventStore` (barrel; `import type { Pool }` keeps pg runtime-free — only `apps/api` loads pg to build the pool). Passes `event-store` + `events` contracts under Testcontainers + a real-concurrency test (one append wins, one `ConcurrencyError`). append = txn + advisory lock (ADR 0028) + count-check concurrency + insert; `23505` → `ConcurrencyError` fallback; `created_at` = `Date.now()` (parity w/ in-memory; Clock-routing deferred). NOTE: the lock's global-ordering guarantee is by-design, not race-tested (deterministic reproduction needs white-box txn timing).
- [ ] 3 — `PostgresCheckpoint` + `checkpoint` binding; rename `InMemorySubscription` → `PollingSubscription`; `subscription` binding
- [ ] 4 — NOTIFY/LISTEN → `EVENT_NOTIFICATIONS` provider; wire `EventSourcingModule` to pg, drop the `EMPTY` default; lengthen `pollSchedule` interval to a safety net

## Deferred (this build's tail)

- Read-model (projection) pg adapters + transactional projection+checkpoint write → resolves the `DEFERRED.md` "Checkpoint/views transaction boundary".
- Crypto-shredding decorator + `DataKeys` store (ADR 0025).
- Per-event dead-lettering in `poll()` with a durable attempt count (marker already in `InMemorySubscription.poll`).
- `pg_snapshot_xmin` composite-cursor upgrade if append throughput ever bottlenecks (widens the `Checkpoint`/`Events` ports).

## Cadence

Small steps; pause after each for review / change / commit. Commit to `main`, scoped per logical change.
