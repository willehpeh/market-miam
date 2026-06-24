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
- **Event-store append + load spans** (producer step 2) — `TracingEventStore`,
  the outermost store decorator (`EventStore → TracingEventStore →
  MessageContextEventStore → InMemoryEventStore`), keeps `event-sourcing`
  OTel-free. Append carries `event.type`/`event.count`/`stream_id`/`vendor.id`
  from append's own args (payload-blind); load carries `stream_id` + rehydrated
  `event.count`. Both nest on the dispatch trace (asserted by shared `traceId`,
  not parent id, so intermediate spans don't break tests). Records exceptions on
  persistence failure. Commit `efbb5ab`.
- **`traceparent` into event metadata at append** (producer step 3) — the active
  span's W3C context, persisted alongside vendorId/correlation/causation; the
  durable producer half of the producer→consumer link. Commit `662b08c`.
- **Consumer tracing** (steps 5–6) — `TracingEventHandler` decorates the
  projection: each consumed event handled on its own **new root trace** with a
  **span link** back to the producer (from the stored `traceparent`), plus
  `processing.lag_ms` (commit-to-handle), `event.type`, `vendor.id`. The generic
  `Subscription` stays OTel-free; the decorator wraps the handler at the app
  edge, symmetric with `TracingEventStore`. Built on the storefront vertical
  slice (`Events.loadFrom` gained a required page limit; in-memory subscription /
  checkpoint / view store promoted to their packages; `PUT /storefront`
  producer; projection wired behind a subscription). Commits `d2e4599`,
  `3b2e26b`, `696ba33`, `e481fa2`, `8115c96`.

## Remaining producer-side work

Steps 1–3 are done (above). What's left:

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

## Consumer-side tracing — done

Steps 5 (new trace per handler + span link) and 6 (`processing.lag_ms`) are
built — see Done above. The once-blocking subscription/processor wrapper now
exists (storefront slice), so the consumer side is live and instrumented.

Still functional-only (no observability work) and following next — the
**storefront vertical slice's remainder (plan "B")**: a background **poller**
driving `poll()` on a schedule; the **`GET /storefront` query endpoint** (which
builds the deferred `QueryDispatcher` — span-only, no lineage); and the
**frontend** (edit form + display). None of these is blocked.

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
