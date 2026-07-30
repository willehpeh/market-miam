# 0015. Polling subscriptions; Projection and Processor behind EventHandler

Date: 2026-06-03 · Status: Accepted

## Context

Read models and reactive workflows need events delivered to them after
commit. Delivery could be synchronous (in the command path), push-based
(message broker), or pull-based (polling the log). Consumers also come in
two flavors with identical mechanics but different rebuild semantics:
projections (safe to replay from zero) and processors (side effects — not
safe to replay).

## Decision

Subscriptions pull: a `Subscription` reads its `Checkpoint`, loads events
from that global position via the `Events` port, passes each matching event
to its handler, and advances the checkpoint. Each subscription is named and
checkpoints independently. Consumers extend a shared `EventHandler`
(`handle(event)` + `eventTypes()`); `Projection` and `Processor` are
distinct subclasses carrying the semantic distinction, and subscriptions
depend only on `EventHandler`. Event-type filtering lives in the
subscription, so handlers only declare what they care about.

## Consequences

- No broker to operate; the event log is the only delivery mechanism, and
  at-least-once semantics fall out of the checkpoint protocol.
- Delivery is eventually consistent; tests drive `poll()` explicitly, and a
  production polling loop is deferred (see DEFERRED.md).
- Checkpoint and view writes are currently separate operations — making them
  transactional is a known production requirement (DEFERRED.md).
- How to programmatically tell Projection from Processor at rebuild time is
  deliberately unresolved (DEFERRED.md).

## Amendment (2026-07-30): the three contracts are interfaces

`EventHandler`, `Projection` and `Processor` are interfaces, not abstract
classes — "consumers extend a shared `EventHandler`" above now reads
*implement*. None of the three is a DI token and nothing asks `instanceof`,
so the abstract-class-as-token convention that governs `EventStore`,
`Events`, `Checkpoint`, `DataKeys` and `UnitOfWork` never applied to them.

The forcing issue was `Projection.reset()`. As a class it carried a concrete
no-op default, so a projection that forgot to override it inherited a silent
one: `Subscriptions.rebuild()` would reset the checkpoint and replay onto an
uncleared read model, which can overwrite what the events re-assert but can
never remove a row the log no longer produces — and report success either
way. Two of three projections had taken that default. An interface cannot
carry an implementation, and `ProjectionFor` now re-declares `reset()`
abstract, so every store-backed projection must state what a rebuild clears.

The rebuild-time distinction is still read from the `@Checkpointed*`
decorator metadata, unchanged — the lint rule in `eslint.config.mjs` keeps
the marker and the decorator in step.
