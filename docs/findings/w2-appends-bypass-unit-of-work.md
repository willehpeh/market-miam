# W2 — Appends bypass the ambient UnitOfWork

| | |
|---|---|
| Severity | High |
| Area | Read path ↔ write path seam |
| Files | `packages/event-sourcing/src/adapters/postgres/postgres.event-store.ts:18`, `apps/api/src/app/persistence/postgres-persistence.module.ts:115`, `packages/event-sourcing/src/adapters/polling.subscription.ts:29-34` |
| Status | Open |
| Found | 2026-07-31 evaluation @ `eec797b` |

## Issue

`PostgresEventStore` is constructed with the raw `Pool`
(`postgres-persistence.module.ts:115`) and takes its own connection per append
(`postgres.event-store.ts:18`), while every Postgres view adapter and
`PostgresCheckpoint` are constructed with `PostgresUnitOfWork` as their
`Queryable`, so their writes join the ambient transaction.

`PollingSubscription` wraps each event's `handle` + `checkpoint.write` in
`unitOfWork.transaction(...)`. When the handler is a **processor**
(`OpensStorefronts`), `handle` dispatches a command whose handler appends events
— and those events commit on a second, independent connection, *outside* the
transaction the subscription opened.

## Failure scenario

1. `VendorRegistered` reaches `OpensStorefronts` inside a UoW transaction.
2. The dispatched `OpenStorefront` appends `StorefrontOpened` — committed
   immediately on its own connection.
3. `checkpoint.write` (or anything else inside the wrapping transaction) fails;
   the transaction rolls back. The checkpoint did not advance, **but the
   appended events are already durable.**
4. The poll retries and the processor re-dispatches. Today,
   `Storefront.open()`'s aggregate-level idempotency absorbs the duplicate.
   The *mechanism* guarantees nothing: any future processor whose command is not
   idempotent silently loses exactly-once — duplicated events, or a permanent
   `ConcurrencyError` loop against the moved stream.

This is the one hole in the otherwise-proven "handle + checkpoint commit
atomically" story (the atomicity itself is genuinely proven against real
Postgres in `test/src/market-days/postgres/transactional-projection.container.spec.ts`
— for *projection* writes, which do route through the UoW).

Secondary consequence — pool sizing: a processor holds one pooled client (the
UoW transaction) while the append acquires a second. The sizing comment at
`postgres-persistence.module.ts:37-44` ("steady state ≈ max + 1") does not
account for this nested acquisition. With `DATABASE_POOL_MAX` at or below the
checkpointed-consumer count, concurrent polls can deadlock the pool: every
consumer holds a client and waits for a second that can never be granted.

## Evidence

Static, from the wiring: contrast `postgres-persistence.module.ts:115` (event
store ← `Pool`) with the `views` providers in the same file (adapters ←
`PostgresUnitOfWork`). `PostgresUnitOfWork.query` routes to the ALS-stashed
client only for callers that go through it (`postgres.unit-of-work.ts:33-35`);
the event store never does. No test exercises a processor whose surrounding
transaction fails after a successful command append — see also
[T1](t1-test-and-ci-blind-spots.md).

## Suggested fix

Have `PostgresEventStore` accept a `Queryable` (which `Pool` satisfies
structurally, so tests keep passing a raw pool) and construct it with the UoW in
the Postgres profile, the same shape every view adapter already uses. The
append transaction's BEGIN/COMMIT management must then become conditional: when
an ambient transaction exists, the append joins it and must **not** issue its
own BEGIN/COMMIT (the advisory lock is `pg_advisory_xact_lock`, so it scopes to
whichever transaction it joins). When no ambient transaction exists (plain HTTP
command path), behaviour is unchanged.

Interaction to respect: `PostgresDataKeys` deliberately keeps the raw `Pool`
(`postgres.data-keys.ts:8-13`) so a minted key survives a rolled-back append —
that exemption is correct and documented; do not "fix" it along the way.

Regression test to pin it: a container spec with a processor whose checkpoint
write fails after its command appended events, asserting the events are **not**
durable after rollback, and appear exactly once after the retry.

Until fixed, the constraint worth documenting: processors' commands must be
idempotent at the aggregate level — which `docs/EVENT-SOURCING-ARCHITECTURE.md`
records as a design decision, without noting that it is currently the *only*
thing standing between a checkpoint failure and duplicated side effects.
