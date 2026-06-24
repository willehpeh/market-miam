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
4. **Enrich spans with domain context, PII-safely** — `vendor.id` and other
   identifiers/outcomes come from ambient `MessageContext` metadata on the bus
   span; richer domain attributes (catalogue size, market-day status, …) are
   added at the **command handler**, which holds the domain objects in scope.
   Default-rich, never the raw payload (see *Attribute policy* below).

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

## Attribute policy — default-rich, PII-safe by seam

Wide events are the point: *put on everything you can think of* (Charity Majors)
— you can't predict which dimension cracks the next unknown-unknown, and
high-cardinality domain context is exactly what `BubbleUp` / `group by` need. So
the default is **rich, not minimal**: attach any non-PII context already in hand.
(Note: "no speculative surface" is a rule about *code surface* — facades, methods
that rot. A span attribute is *data*, not surface; it doesn't transfer.)

Two seams, chosen so richness never costs domain purity or leaks PII:

- **Bus / store span** — opens the wide event from *ambient* `MessageContext`
  metadata + the message's constructor name (`command.name`, `event.type`,
  `vendor.id`, correlation/causation). It is **structurally blind to the
  message's fields**, so it cannot serialize a payload — no `JSON.stringify`
  footgun, no accidental `email`.
- **Command handler** — the application-layer seam that *does* hold the command,
  resulting state, and emitted event in scope. Domain attributes (sizes, states,
  outcomes) are added here, **explicitly, one `setAttribute` at a time**. Pure
  domain packages still never import OTel.

Why this is safe: there is **no automatic serialization path** anywhere. Every
attribute is a deliberate, reviewable line — the default is empty and you opt in
per field. That structurally prevents *accidental bulk* leakage (dumping a whole
command/event). It does **not** prevent a deliberate mistake (explicitly stamping
`email`); that is caught by review against this policy, not by the mechanism.

**Excluded / projected:** never put PII on a span (`email`, personal names,
phone). Sensitive-but-useful values go on as a **derived projection** — a bucket
(`amount.bucket`), count, boolean, or hash — never the raw value. Free text
(business descriptions, blurbs) is unbounded-cardinality and not aggregable:
leave it off unless a concrete need arises.

**Caveat to revisit:** `vendor.id` rides every span as the high-cardinality key.
It's a business handle today, which is acceptable. **If the vendor identity
scheme ever becomes an email or a person's name, this policy breaks** — treat
that change as a trigger to re-evaluate.

## Domain-purity invariant (ADR)

Instrumentation only ever extends the `@nestjs/cqrs` bus and the
store/subscription **adapters**. The domain packages gain **no** observability
dependency. Hold this line on every step above.
