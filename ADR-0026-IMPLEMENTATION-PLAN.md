# ADR 0026 — Event-based Observability: Implementation Plan

Status as of the current branch. Tracks the build-out of correlation/causation +
OpenTelemetry tracing across the CQRS/event-sourcing platform, per
`docs/adr/0026-event-based-observability-with-opentelemetry.md`.

## Goal

Wide-event tracing where a span is a fat event. One root span per HTTP request;
child spans on command/query dispatch and event-store append; async consumers
start a new trace per handler with a span *link* back to the producer. Correlation
and causation IDs live in event metadata as durable lineage (they outlive trace
sampling and the per-hop trace resets). Domain stays pure — context is ambient via
`AsyncLocalStorage`, all annotation in adapters.

## Layering

- **Skeleton** — SDK bootstrap, OTLP export to Honeycomb. *(done, live in prod)*
- **Layer 1** — correlation/causation IDs in event metadata. Plain data, no OTel
  needed to test. *(foundation built; wiring pending write-side mount)*
- **Layer 2** — OTel spans on dispatch/append + `traceparent` in metadata + span
  links for async consumers. Tested via `InMemorySpanExporter`. *(not started)*

---

## Done

### Skeleton (live in production)
- `apps/api/src/tracing.ts` — `NodeSDK` + OTLP/proto exporter, imported first in
  `main.ts`. Resource attrs incl. `RENDER_GIT_COMMIT`. US region, dataset `api`.
- Verified: spans arriving in Honeycomb from prod.

### Event identity
- `StoredEvent.id` (UUID, store-generated, per-event) — the durable causation
  handle. Decided over positional `globalPosition` for store-independence.

### Port contract test suites (adapter-agnostic, in `test/src/event-sourcing/`)
- `event-store.contract.ts` — 16 tests: round-trip, identity, position &
  optimistic concurrency, stream isolation, global ordering, metadata, timestamp.
- `events.contract.ts` — 3 tests: `loadFrom` global order, exclusive lower bound,
  empty/caught-up.
- `checkpoint.contract.ts` — 2 tests: fresh reads 0, reads back last written.
- `subscription.contract.ts` — 5 contract tests + 1 in-memory white-box
  (checkpoint advances past non-matching events; mutation-proven to catch the
  naive advance-only-on-match bug).
- Refactor: `InMemorySubscription` now takes `Checkpoint` by constructor injection
  (a port dependency, not `new`-ed internally) — also what a Postgres-backed
  subscription needs.

### Layer 1 foundation (in `packages/event-sourcing`, NestJS-agnostic)
- `MessageContext` — single `AsyncLocalStorage` holding the lineage envelope.
- `MessageContextDispatcher` — mints root context (correlationId + causationId via
  injected id generator).
- `MessageContextEventStore` — `EventStore` decorator merging ambient context into
  metadata at append; bare store and domain stay pure.
- Driven by `test/src/event-sourcing/message-context.spec.ts` (root dispatch
  stamps fresh correlation + causation onto the appended event's metadata).

Full suite green (198 tests); `event-sourcing` + `test` typecheck clean.

---

## Decisions locked

- **Correlation vs causation.** Correlation = constant across a whole flow (set at
  root, copied downstream). Causation = id of the immediate predecessor (changes
  every hop): command→event causation = command id; event→command causation =
  event id. Both in metadata, separate from `vendorId`.
- **Command IDs stay off the command object.** Commands remain pure
  (`{ ...args }`); the dispatch id is ambient (ALS), not a field. Mirrors events:
  `DomainEvent` is pure, the store assigns `StoredEvent.id`. Avoids `id?`/`id!`
  typing leakage and construct-then-mutate.
- **Root context via a global NestJS interceptor — NOT a `CommandBus` subclass.**
  The `{provide: CommandBus, useClass: ...}` override likely registers handlers on
  CqrsModule's own instance (two-instance trap). Interceptor is robust and
  decoupled from CQRS internals.
- **One request = one command = one event = one correlation root.** Makes
  per-request interceptor granularity equal to per-command granularity. The
  front-door correlationId threads unchanged through the whole async chain.
- **Two context-establishment seams, one `MessageContext`:** (1) HTTP interceptor
  for root commands; (2) subscription/processor wrapper for async continuation
  commands (correlation inherited from the consumed event, causation = event id).
- **`MessageContext` = persistable lineage envelope only** (correlation, causation,
  later `traceparent`). The live OTel span stays in OTel's own context; only its
  `traceparent` string projection is stored. Keeps the decorator's blanket
  context-spread safe by construction.

---

## Ahead

### 1. Mount the CQRS write side (prerequisite — currently unmounted)
`apps/api` has no `CqrsModule`, no `CommandBus`/`QueryBus`, no `EventStore`
binding, no handlers/repos wired. None of the wiring below can run until this
exists. First integration test: *a dispatched command reaches its handler*.

### 2. Layer 1 wiring
- Global interceptor establishing root `MessageContext` per request.
- Provide `EventStore` as `MessageContextEventStore` wrapping the real adapter,
  sharing the one `MessageContext` singleton.
- Id generator provider (`randomUUID`).

### 3. Subscription / processor wrapper (async continuation)
- Establish event-handling context: correlationId inherited from event metadata,
  causationId = event id.
- Decide here: do continuation events point at the transient command id or the
  triggering event id? (Deferred until observable.)
- Drives the nested/lineage contract tests (same correlation across the chain,
  causation walks the steps).

### 4. Layer 2 — OTel spans
- Child spans on command/query dispatch and store append.
- Compute `traceparent` from the active span into `MessageContext` at dispatch.
- Async consumers: new trace per handler + span *link* to producer.
- `processing.lag_ms` on consumer spans (read-model freshness SLO).
- Tested via `InMemorySpanExporter` + `SimpleSpanProcessor` (fake sink at the
  boundary — assert `getFinishedSpans()`).

### 5. Persistent adapters (separate track)
- Postgres `EventStore`, `Checkpoint`, `Subscription` — each held to the existing
  port contracts (a few-line sibling spec apiece).
- Gap handling (allocation-vs-visibility) is Postgres integration-test territory,
  not the shared contract. See `docs/DEFERRED.md`.

---

## Deferred (see `docs/DEFERRED.md`)

- Global position gaps (Postgres MVCC); collector + tail sampling (ADR).
- Client-supplied idempotency — natural idempotency already covers it; revisit on a
  non-idempotent relative mutation or an unrepeatable external side effect. Keep it
  separate from causation (a front-gate dedup field, not the causation id slot).
- Checkpoint/views transaction boundary; polling loop; poison events;
  Projection-vs-Processor distinction; replay strategy.
