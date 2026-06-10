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
