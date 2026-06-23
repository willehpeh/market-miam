# Observability Plan (ADR 0026)

Implementation plan for event-based observability with OpenTelemetry, tracking
[ADR 0026](docs/adr/0026-event-based-observability-with-opentelemetry.md)
clause-by-clause. A span is a wide event; spans are fat, not many thin logs.

## Done

- **One root span per HTTP request** (auto-instrumentation) — live in prod.
- **OTLP export direct to Honeycomb** + **`RENDER_GIT_COMMIT`** stamped as a
  resource attribute (per-deploy comparison) — live (US region, dataset `api`).
- **Ambient-context-in-adapters pattern** (ADR: "context ambient via
  `AsyncLocalStorage`, annotation in adapters") — established via `MessageContext`
  + the `MessageContextEventStore` decorator, currently carrying
  correlation/causation. Trace context will reuse this exact seam.

## Next set — producer-side tracing (unblocked)

Builds on the live root span and the existing dispatch→append path; a small
extension of the current ALS + decorator machinery. No new architecture.

1. **Child spans on command/query dispatch** — extend the `@nestjs/cqrs` bus
   (ADR: "Instrument command/query dispatch … as child spans of the request";
   consequence: "extends the `@nestjs/cqrs` bus").
2. **Child span on the event-store append** — extend the store adapter; natural
   home alongside `MessageContextEventStore`.
3. **Inject W3C `traceparent` into event metadata at append** — capture the
   active span context, serialize to `traceparent`, merge into metadata in the
   adapter, alongside `vendorId`/correlation/causation (ADR: "At append time,
   inject the W3C trace context into event metadata alongside `vendorId`"). This
   is the persistable string projection of the span — never store the live span
   object in `MessageContext`. Constraint (ADR): trace context is "plumbing, not
   domain fact … optional on rehydration … replay tolerates its absence."
4. **Stamp `vendor.id` on spans** — the primary high-cardinality dimension.

Outcome: fat request-side spans, and the producer half of the producer→consumer
link seeded into the event log (step 3) ready for the consumer side later.

### Testing
Verify spans with OTel's `InMemorySpanExporter` + `SimpleSpanProcessor` (a fake
sink at the export boundary — assert `getFinishedSpans()`): span names,
attributes (`vendor.id`), and parent/child relationships. Real SDK, fake export.

## Blocked set — consumer-side tracing

Gated on the **subscription/processor wrapper** existing (there's no async
consumer to instrument yet — see the main plan's backlog).

5. **New trace per handler with a span *link* back to the producer** — the
   wrapper reads `traceparent` from event metadata and links (ADR: "consumers do
   not continue the request's trace: each consumed event starts a new trace per
   handler with a span link … keeping traces bounded under processor→command
   fan-out"). Consequence: "extends the … subscription adapter."
6. **`processing.lag_ms` on every consumer span** — `StoredEvent.timestamp`
   (commit) vs. handle time; the read-model freshness SLO (ADR consequence).

## Deferred (per ADR)

- OTel **Collector** and **tail-based sampling** — until volume warrants
  (`docs/DEFERRED.md`).

## Sequencing

Producer-side (1–4) is next and standalone. Consumer-side (5–6) lands with the
subscription/processor wrapper, which also unlocks the correlation/causation
continuation seam — do them together. Step 3 is the bridge: doing it now means
the producer link is already in the log when the consumer wrapper arrives.

## Domain-purity invariant (ADR)

Instrumentation only ever extends the `@nestjs/cqrs` bus and the
store/subscription **adapters**. The domain packages gain **no** observability
dependency. Hold this line on every step above.
