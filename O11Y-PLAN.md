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
- **Command dispatch spans** (producer step 1) — `CommandDispatcher` decorates
  the `@nestjs/cqrs` `CommandBus` (B-pattern: distinct seam, delegates to the
  real bus, never touches handler registration). Payload-blind span named for
  the command, carrying `command.name` + `app.correlation_id`/`app.causation_id`
  from the ambient `MessageContext`. On a handler throw it stamps a static
  `exception.slug`, records the exception, sets `ERROR` status, and re-throws
  (observe, never swallow). An ESLint `no-restricted-imports` guard makes "only
  `command-dispatcher.ts` imports `CommandBus`" a build error, so every command
  is uniformly traced. Commits `1964004`, `bc3f826`, `8fc68e1`.

## Next set — producer-side tracing (remaining)

Step 1 (above) is done. Remaining steps build on the live dispatch span and the
existing append path.

2. **Child span on the event-store append** — a tracing decorator composed with
   `MessageContextEventStore`, nested under the dispatch span. Carries
   `event.type`, `event.count`, `stream_id`, and **`vendor.id`** — all sourced
   from append's own `events`/`metadata`/`streamId` arguments (payload-blind,
   purity-safe). *Grill before building:* where the decorator sits relative to
   `MessageContextEventStore`, and how the event→attributes mapper is **injected
   from `apps/api`** so the `event-sourcing` package stays generic.
   - **Correction logged:** `vendor.id` is **not** ambient. Repositories pass
     `{ vendorId }` as the append `metadata` argument (from `command.vendorId`
     via the handler — e.g. `calendars.ts:19`), so `vendor.id` belongs on the
     **append** span, not the dispatch span. The earlier "`vendor.id` from
     ambient context / enrich at the handler" note was wrong on both counts.
3. **Inject W3C `traceparent` into event metadata at append** — capture the
   active span context, serialize to `traceparent`, merge into metadata in the
   adapter, alongside `vendorId`/correlation/causation (ADR: "At append time,
   inject the W3C trace context into event metadata alongside `vendorId`"). This
   is the persistable string projection of the span — never store the live span
   object in `MessageContext`. Constraint (ADR): trace context is "plumbing, not
   domain fact … optional on rehydration … replay tolerates its absence."
4. **Per-type intent/outcome attributes** — adapter-side per-type extractors in
   `apps/api` (allow-list per command/event type; exact-match-tested = the PII
   guard). Dispatch span ← the command (what the user tried to do); append span
   ← the events (what happened). **No handler span** — handlers live in
   `packages/market-days`, which stays OTel-free *and* telemetry-free (purity).
   Deferred until the first content-rich command: `RegisterVendor` is
   content-thin (`vendorId` = identity → append span; `registeredAt` = clock;
   `email` = PII), so step 1 stayed generic — no speculative extractors.

**QueryBus** — deferred until a read/query surface exists; then mirror with a
`QueryDispatcher` (same decorator + ESLint guard) but lighter: span only, no
lineage, no append (reads cause nothing).

Outcome: fat request-side spans, and the producer half of the producer→consumer
link seeded into the event log (step 3) ready for the consumer side later.

### Testing (established in step 1)
Hermetic span capture: a test-only `NodeTracerProvider` + `InMemorySpanExporter`
+ `SimpleSpanProcessor`, registered **once** (the global provider is set-once per
process) with `exporter.reset()` between tests; **no auto-instrumentation**, so
`getFinishedSpans()` holds only our spans. Social test: boot the module, `POST`
via supertest, assert spans. **Exact-match** the attribute set — that doubles as
the PII guard (a stray `email` fails the test). Failure paths driven by a stub
`EventStore` whose `append` rejects. See `command-dispatch-tracing.spec.ts`.

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
