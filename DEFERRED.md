# Deferred Decisions

Decisions made during the projection/processor design that are not yet implemented. Revisit when building the production runtime and Postgres adapters.

## Polling loop

The `Subscription` exposes `poll()` but has no continuous polling loop (`start`/`stop`). Add this when there's a running application. In NestJS, subscriptions would be managed via `OnModuleInit`/`OnModuleDestroy` lifecycle hooks — either in-process with the API or in a separate worker process.

## Checkpoint/views transaction boundary

`handler.handle(event)` and `checkpoint.write(position)` are two independent calls — not atomic. If the process crashes between them, the event is either duplicated or skipped. When building Postgres adapters, both writes need to happen in the same transaction. This will likely require a small change to the `Subscription` — either a unit-of-work injected into the loop, or an ambient transaction context (e.g. AsyncLocalStorage) that both adapters pick up.

## Poison events

When the polling loop is added: fail loud (crash on repeated failure) rather than silently skipping. Dead-letter queue handling is not needed until there's evidence of a real operational problem. A dead-letter queue moves permanently failing events to a separate store after N retries, allowing the subscription to advance — but risks silent data loss without monitoring.

## Checkpoint storage

In production, a shared `checkpoints` table in Postgres keyed by subscription name. Each subscription's checkpoint is independent — shared table, no coupling. A single `PostgresCheckpoint` adapter can serve every subscription.

## Global position gaps

In PostgreSQL, concurrent writers can cause gaps in the global position sequence. Transaction A gets position 5, transaction B gets position 6, B commits first — the subscription sees 6 but not 5. If it advances the checkpoint to 6, event 5 is permanently skipped when A commits. Rolled-back transactions also create permanent gaps. The `InMemoryEventStore` doesn't have this problem (single-threaded, no concurrent writes).

Strategy: retry with exponential backoff, accept the gap as permanent after 5 seconds, log when a gap is accepted. This is a Postgres-specific concern — don't bake it into the Subscription itself. A decorator or wrapper around the `Events` port can handle gap detection and retries, returning only contiguous sequences. The Subscription stays simple, `InMemoryEventStore` is used unwrapped, and only the Postgres adapter gets wrapped in production wiring.

## Distinguishing Projection from Processor

Both are abstract classes with the same `handle()` shape. The subscription accepts either structurally. The distinction matters for rebuild: projections are safe to replay from position 0, processors are not. The mechanism for telling them apart programmatically is unresolved — `instanceof` was rejected as poor OO design. A better approach (e.g. a method on the type itself) should be chosen when rebuild tooling is built.

## vendorIdFrom error handling

`vendorIdFrom` currently does a raw cast with no validation. Error handling (throw if vendorId is missing from metadata) was deferred because no test drives it yet. Add when there's a failure scenario that justifies it.

## Replay strategy

To rebuild a projection: clear the views port (`clear()`), reset checkpoint to 0, replay all events. The projection logic stays append-only because replay always starts clean.
