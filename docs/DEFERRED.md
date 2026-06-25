# Deferred Decisions

Decisions made during the projection/processor design that are not yet implemented. Revisit when building the production runtime and Postgres adapters.

## Polling loop

`Subscription` is abstract — it only declares `poll()`. The production implementation should add a continuous polling loop (`start`/`stop`). In NestJS, subscriptions would be managed via `OnModuleInit`/`OnModuleDestroy` lifecycle hooks — either in-process with the API or in a separate worker process.

## Checkpoint/views transaction boundary

In the `InMemorySubscription`, `handler.handle(event)` and `checkpoint.write(position)` are two independent calls — not atomic. If the process crashes between them, the event is either duplicated or skipped. The production `Subscription` implementation should make both writes happen in the same transaction — either via a unit-of-work injected into the loop, or an ambient transaction context (e.g. AsyncLocalStorage) that both adapters pick up.

## Poison events

When the polling loop is added: fail loud (crash on repeated failure) rather than silently skipping. Dead-letter queue handling is not needed until there's evidence of a real operational problem. A dead-letter queue moves permanently failing events to a separate store after N retries, allowing the subscription to advance — but risks silent data loss without monitoring.

## Checkpoint storage

In production, a shared `checkpoints` table in Postgres keyed by subscription name. Each subscription's checkpoint is independent — shared table, no coupling. A single `PostgresCheckpoint` adapter can serve every subscription.

**Discovery-time orphan detection.** The `ConsumerRunner` discovers projections by their `@CheckpointedProjection('<name>')` decorator and builds one checkpoint per name. It already fails fast on *duplicate* names at bootstrap. It cannot detect a *renamed* checkpoint from code — discovery sees only the current names, so a rename silently orphans the old checkpoint and replays from zero. Against the Postgres `checkpoints` table this becomes detectable: at startup, diff persisted checkpoint names against discovered names and flag the leftovers ("checkpoint `X` has no projection — renamed or removed?"), which catches renames *and* accidental deletions. Needs the `Checkpoint` port to enumerate names (it currently only reads/writes one by name). In-memory has nothing to orphan, so this is Postgres-era.

## Global position gaps

In PostgreSQL, concurrent writers can cause gaps in the global position sequence. Transaction A gets position 5, transaction B gets position 6, B commits first — the subscription sees 6 but not 5. If it advances the checkpoint to 6, event 5 is permanently skipped when A commits. Rolled-back transactions also create permanent gaps. The `InMemoryEventStore` doesn't have this problem (single-threaded, no concurrent writes).

Strategy: retry with exponential backoff, accept the gap as permanent after 5 seconds, log when a gap is accepted. This is a Postgres-specific concern — don't bake it into the abstract `Subscription`. A decorator or wrapper around the `Events` port can handle gap detection and retries, returning only contiguous sequences. The production `Subscription` implementation stays simple, `InMemoryEventStore` is used unwrapped, and only the Postgres adapter gets wrapped in production wiring.

## Distinguishing Projection from Processor

Both are abstract classes with the same `handle()` shape. The subscription accepts either structurally. The distinction matters for rebuild: projections are safe to replay from position 0, processors are not. The mechanism for telling them apart programmatically is unresolved — `instanceof` was rejected as poor OO design. A better approach (e.g. a method on the type itself) should be chosen when rebuild tooling is built.

## vendorIdFrom error handling

`vendorIdFrom` currently does a raw cast with no validation. Error handling (throw if vendorId is missing from metadata) was deferred because no test drives it yet. Add when there's a failure scenario that justifies it.

## Client-supplied idempotency

Not needed yet. Natural idempotency already comes from three layers: client-supplied aggregate identity (`vendorId`, `itemId` arrive on the command), domain-level idempotency in handlers (e.g. `RegisterVendor` retains the original on re-registration), and optimistic concurrency (`expectedStreamPosition` rejects concurrent duplicates). Revisit when either appears: a non-idempotent *relative* mutation (e.g. "increment stock by 5", where a retry double-applies), or an external side effect that can't be repeated (payment capture, outbound email/SMS).

When added, it is a separate concern from causation — a distinct metadata field plus a *front gate* that dedups before the handler executes (on a hit: skip execution, append nothing, return the prior outcome). Do not reuse the causation id slot for it: the idempotency key must be stable across retries, whereas the causation id must be unique per dispatch — collapsing them corrupts lineage in exactly the retry case. The causation id stays internally generated. (A client-supplied *correlation seed* is a third, separate input: accept-external-or-generate into the `correlationId` ALS field.)

## Replay strategy

To rebuild a projection: clear the views port (`clear()`), reset checkpoint to 0, replay all events. The projection logic stays append-only because replay always starts clean.
