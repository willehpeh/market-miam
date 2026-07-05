# Deferred Decisions

Decisions made during the projection/processor design that are not yet implemented. Revisit when building the production runtime and Postgres adapters.

## Polling loop

`Subscription` is abstract — it only declares `poll()`. The production implementation should add a continuous polling loop (`start`/`stop`). In NestJS, subscriptions would be managed via `OnModuleInit`/`OnModuleDestroy` lifecycle hooks — either in-process with the API or in a separate worker process.

## Checkpoint/views transaction boundary

→ **Now tracked in `POSTGRES-PLAN.md` #1** (PG read-model adapters + transactional projection↔checkpoint). The non-atomic `handle` + `checkpoint.write` window (crash between them → duplicate or skip) is resolved there via an ambient unit-of-work (an AsyncLocalStorage tx that the pg view-store and pg checkpoint both enlist in).

## Poison events

→ **Now tracked in `POSTGRES-PLAN.md` #4** (per-event dead-lettering with a durable attempt count). Until then, fail loud (backoff-retry) rather than silently skip. A DLQ (move to a separate store after N retries, advance past it) needs monitoring or it's silent data loss — deferred until a real poison event appears.

## Checkpoint storage

In production, a shared `checkpoints` table in Postgres keyed by subscription name. Each subscription's checkpoint is independent — shared table, no coupling. A single `PostgresCheckpoint` adapter can serve every subscription.

**Discovery-time orphan detection.** → **Now tracked in `POSTGRES-PLAN.md` #3.** A renamed `@Checkpointed('<name>')` silently orphans the old pg checkpoint and replays from zero; detect it at startup by diffing persisted names (the `checkpoints` table) against discovered names — needs a `names()` on the `Checkpoint` port. `PostgresCheckpoint` and the shared `checkpoints` table are built; `Subscriptions` already fails fast on *duplicate* names at bootstrap.

## Global position gaps

In PostgreSQL, concurrent writers can cause gaps in the global position sequence. Transaction A gets position 5, transaction B gets position 6, B commits first — the subscription sees 6 but not 5. If it advances the checkpoint to 6, event 5 is permanently skipped when A commits. Rolled-back transactions also create permanent gaps. The `InMemoryEventStore` doesn't have this problem (single-threaded, no concurrent writes).

**Resolution: serialize appends (ADR 0028).** A global `pg_advisory_xact_lock` held to commit makes position order == commit order, so the single-`bigint` checkpoint cursor stays correct and rollback gaps are safe to skip. The gap-detection-with-timeout strategy sketched here was rejected — it needs a background frontier detector and a skip heuristic that risks dropping slow-but-committed events. **Upgrade path** if append throughput bottlenecks: batch events per append, partition the lock per stream-category, or move to a `pg_snapshot_xmin` composite `(transactionId, position)` cursor (widens the `Checkpoint`/`Events` ports). → Upgrade path tracked in `POSTGRES-PLAN.md` #6 (act only if throughput bottlenecks).

## Distinguishing Projection from Processor

Both are abstract classes with the same `handle()` shape; the subscription accepts either structurally. The distinction is operational: projections are safe to replay from position 0, processors are not (re-dispatching commands re-runs side effects), and processors need the continuation message-context wrapping (correlationId inherited from the event, causationId = the event id) that projections don't.

**Resolution: the discriminator is the decorator, not the type.** **Built** (the `StorefrontOpener`, the first processor). `@CheckpointedProjection('<name>')` and `@CheckpointedProcessor('<name>')` share one `checkpoints` WeakMap, distinguished by a `kind`; `checkpointMetadata` exposes both. The `Subscriptions` reads the kind to wrap processors with the `ContinuationContextHandler` (correlationId inherited from the event, causationId = the event id), inside the tracing wrapper. `instanceof` stays rejected. **Still deferred → `POSTGRES-PLAN.md` #5:** replay-safety — processors are *not* safe to replay from 0 (re-dispatching commands re-runs side effects); the runner must refuse replay for processors, and no replay mechanism exists yet.

## vendorIdFrom error handling

`vendorIdFrom` currently does a raw cast with no validation. Error handling (throw if vendorId is missing from metadata) was deferred because no test drives it yet. Add when there's a failure scenario that justifies it.

## Client-supplied idempotency

Not needed yet. Natural idempotency already comes from three layers: client-supplied aggregate identity (`vendorId`, `itemId` arrive on the command), domain-level idempotency in handlers (e.g. `RegisterVendor` retains the original on re-registration), and optimistic concurrency (`expectedStreamPosition` rejects concurrent duplicates). Revisit when either appears: a non-idempotent *relative* mutation (e.g. "increment stock by 5", where a retry double-applies), or an external side effect that can't be repeated (payment capture, outbound email/SMS).

When added, it is a separate concern from causation — a distinct metadata field plus a *front gate* that dedups before the handler executes (on a hit: skip execution, append nothing, return the prior outcome). Do not reuse the causation id slot for it: the idempotency key must be stable across retries, whereas the causation id must be unique per dispatch — collapsing them corrupts lineage in exactly the retry case. The causation id stays internally generated. (A client-supplied *correlation seed* is a third, separate input: accept-external-or-generate into the `correlationId` ALS field.) If the front-gate ever needs a durable dedup store, that store is pg — pull this item into `POSTGRES-PLAN.md` when it lands.

## Replay strategy

→ **Now tracked in `POSTGRES-PLAN.md` #5** (replay mechanism + processor replay-safety). Rebuild a projection = `clear()` its view store, reset checkpoint to 0, replay; append-only logic starts clean. Refused for processors (not replay-safe).
