# W2 — Appends bypass the ambient UnitOfWork

| | |
|---|---|
| Severity | High |
| Area | Read path ↔ write path seam |
| Files | `packages/event-sourcing/src/adapters/postgres/postgres.event-store.ts:18`, `apps/api/src/app/persistence/postgres-persistence.module.ts:115`, `packages/event-sourcing/src/adapters/polling.subscription.ts:29-34` |
| Status | **Fixed** — see [Fix](#fix-2026-07-31) below; decision recorded in [ADR 0035](../adr/0035-appends-join-the-ambient-unit-of-work.md) |
| Found | 2026-07-31 evaluation @ `eec797b` |
| Reviewed | 2026-07-31 — core claim confirmed against the code; fix shape, deadlock condition, retry-loop claim, and doc citation corrected |

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
   idempotent silently loses exactly-once — duplicated events and side effects.
   (Not, however, a permanent `ConcurrencyError` loop, as this finding
   originally claimed: command handlers go through repositories (ADR 0010),
   which load-then-save on every dispatch, so each retry recomputes the
   expected position against the moved stream. A stuck loop would need a
   command carrying a stale expected position across retries, which nothing
   does today.)

This is the one hole in the otherwise-proven "handle + checkpoint commit
atomically" story (the atomicity itself is genuinely proven against real
Postgres in `test/src/market-days/postgres/transactional-projection.container.spec.ts`
— for *projection* writes, which do route through the UoW).

Secondary consequence — pool sizing: a processor holds one pooled client (the
UoW transaction) while the append acquires a second. The sizing comment at
`postgres-persistence.module.ts:37-44` ("steady state ≈ max + 1") does not
account for this nested acquisition. The deadlock threshold is the number of
**processors appending concurrently**, not the checkpointed-consumer count as
this finding originally claimed: projections hold a client per event but never
nest an acquisition, so their transactions finish and release — they can starve
a waiting processor for a while, but not deadlock it. Deadlock needs every pool
slot held by a transaction that is itself waiting on the pool. With today's
single processor that takes `DATABASE_POOL_MAX=1`; each appending processor
added lowers the margin by one. The pool sets no `connectionTimeoutMillis`, so
`connect()` waits forever and a genuine deadlock never self-resolves.
`ShreddingEventStore`'s data-key mint (`shredding.event-store.ts:51`) is a
second nested acquisition of the same shape whenever a processor's command
carries PII — and, being deliberately pool-bound, it survives the fix below.

## Evidence

Static, from the wiring: contrast `postgres-persistence.module.ts:115` (event
store ← `Pool`) with the `views` providers in the same file (adapters ←
`PostgresUnitOfWork`). `PostgresUnitOfWork.query` routes to the ALS-stashed
client only for callers that go through it (`postgres.unit-of-work.ts:33-35`);
the event store never does. The dispatch chain, verified end to end:
`OpensStorefronts.handle` → `CommandGateway.execute` → `OpenStorefrontHandler`
→ `Storefronts.save` → `ApplicationEventStore` (tracing → lineage → shredding)
→ `PostgresEventStore.append` → `pool.connect()` — no layer consults the
UnitOfWork. No test exercises a processor whose surrounding transaction fails
after a successful command append: `transactional-projection.container.spec.ts`
proves rollback for a *projection*'s view write, whose only writes route
through the UoW — see also [T1](t1-test-and-ci-blind-spots.md).

## Suggested fix

Route the append through the ambient transaction when one exists; keep the
current dedicated-client path when none does (plain HTTP command path —
behaviour unchanged). The advisory lock is `pg_advisory_xact_lock`, so it
scopes to whichever transaction it joins.

The `Queryable`-only shape the view adapters use — which this finding
originally proposed — is **not enough here**, for two reasons:

1. An append is a multi-statement transaction (BEGIN, advisory lock,
   concurrency check, INSERT, COMMIT) that must run on one pinned connection.
   `Queryable.query` pins nothing: through a raw `Pool` each statement may land
   on a different connection, and a stray BEGIN would leak an
   idle-in-transaction client back into the pool.
2. `Queryable` cannot answer "is there an ambient transaction?" — which is
   exactly what the conditional BEGIN/COMMIT must branch on.

So the seam has to be explicit: e.g. `PostgresUnitOfWork` grows
`activeClient(): PoolClient | undefined` (reading the AsyncLocalStorage it
already keeps), and `PostgresEventStore` takes the UoW alongside the `Pool`.
Joined mode runs lock + check + INSERT on the ambient client and issues **no**
BEGIN/COMMIT; standalone mode keeps `AppendTransaction` exactly as it is.
Reads (`load`/`loadFrom`/`head`) can go through `Queryable` untouched.

Two interactions the joined mode must respect:

- **W1's verified commit (ADR 0034).** In joined mode there is no inner COMMIT
  to check; durability is decided by `PostgresUnitOfWork.transaction`'s own
  `COMMIT` (`postgres.unit-of-work.ts:23`), which does **not** check the
  command tag. An error swallowed inside the transaction (a handler that
  catches and continues) aborts it; COMMIT then resolves with a ROLLBACK tag
  and `transaction()` reports success — silently losing both the events and
  the checkpoint. Port the tag check to `PostgresUnitOfWork.transaction` as
  part of this fix, or the fix reintroduces W1 one layer up.
- **Lock hold time (M6).** `pg_advisory_xact_lock` is global and, once joined,
  held until the *outer* commit — the whole handle + checkpoint transaction,
  not just the INSERT. Every append in the system stalls behind an appending
  processor's slowest per-event transaction. Acceptable at today's volumes
  (the ADR 0028 lock already serialises all appends), but it moves
  [M6](m6-write-path-scaling-ceilings.md)'s ceiling down and belongs in that
  finding's arithmetic.

Interaction to respect: `PostgresDataKeys` deliberately keeps the raw `Pool`
(`postgres.data-keys.ts:8-13`) so a minted key survives a rolled-back append —
that exemption is correct and documented; do not "fix" it along the way.

Regression tests to pin it: a container spec with a processor whose checkpoint
write fails after its command appended events, asserting the events are **not**
durable after rollback, and appear exactly once after the retry. A second spec
worth having: an appending processor under a pool of `max: 1`, which deadlocks
today and must not after the fix (the joined append acquires no second client —
though a PII-minting command still would; see the sizing note above).

Until fixed, the constraint worth documenting: processors' commands must be
idempotent at the aggregate level. Correcting this finding's original claim: no
document actually records that constraint. `docs/EVENT-SOURCING-ARCHITECTURE.md`
says only that delivery is at-least-once (→ ADR 0015), and aggregate idempotency
appears solely as individual cases (ADR 0024's idempotent registration,
ADR 0031's no-op re-publish, `Storefront.open()`'s guard) — never as a rule
processors must satisfy. The convention is enforced nowhere and is currently
the only thing standing between a checkpoint failure and duplicated side
effects, which makes writing it down more urgent, not less.

## Fix (2026-07-31)

Implemented in the shape suggested above, then reshaped once by a
tell-don't-ask review (the first cut's `activeClient()` seam + `ownsTransaction`
flag are recorded as rejected in the ADR); the decision and its tradeoffs are in
[ADR 0035](../adr/0035-appends-join-the-ambient-unit-of-work.md).

- `PostgresUnitOfWork` grew `inTransaction(work)`: run `work(client)` in the
  ambient transaction when one exists — its owner's COMMIT decides durability —
  or in a fresh one when none does. All transaction lifecycle, including the
  ADR 0034 verified-COMMIT check (ported up so joined appends keep W1's
  protection), lives in this one class.
- `AppendTransaction` became `SerializedAppend`: no lifecycle, no mode flag,
  one `execute(events, expected, metadata)` owning lock + concurrency check +
  INSERT on whatever client it is handed — which also resolves
  `docs/OO-SMELL-AUDIT.md` #5 (temporal coupling of the five-call protocol).
- `PostgresEventStore.append` is a single tell —
  `unitOfWork.inTransaction(client => new SerializedAppend(client, streamId)
  .execute(…))` — and reads route through the UoW so a command dispatched
  in-transaction sees its own uncommitted appends. Constructed with only a
  `Pool` (every existing test, the standalone path) it defaults a private UoW
  that never has an ambient transaction: behaviour unchanged.
- Wiring: `PERSISTED_EVENTS` in `postgres-persistence.module.ts` injects the
  shared UoW — sharing is what makes joining possible; the pool-sizing comment
  records the remaining nested acquisition (the deliberately pool-bound
  data-key mint → keep `max ≥ 2`).

Pinned by `test/src/market-days/postgres/transactional-processor.container.spec.ts`:
a processor whose checkpoint write fails after its command appended — events
gone after rollback, appended exactly once on retry — plus the max-1-pool spec
proving the joined append takes no second connection. The commit-tag check and
both `inTransaction` cases are pinned by the fast `postgres-unit-of-work.spec.ts`.
(Container specs written but not executed in this environment — no Docker; they
run under `test:container` in CI.)

Still true after the fix: a processor whose side effect *leaves* the database
(email, external API) is at-least-once and must tolerate redelivery — now
documented in ADR 0035 and `EVENT-SOURCING-ARCHITECTURE.md` §7.3 instead of
implicit. The observability shift (a green append span in joined mode no longer
implies durability; the outer commit decides) is recorded in ADR 0035's
consequences.
