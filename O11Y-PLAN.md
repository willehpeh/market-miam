# Observability Plan (ADR 0026)

Remaining work + standing invariants for event-based observability with
OpenTelemetry, tracking
[ADR 0026](docs/adr/0026-event-based-observability-with-opentelemetry.md).
A span is a wide event; spans are fat, not many thin logs.

## Shipped

Producer steps 1–3 (command dispatch span; event-store append/load spans;
`traceparent` into event metadata) and consumer steps 5–6 (new-trace-per-handler
+ span link back to the producer + `processing.lag_ms`) are live. The consumer
`TracingEventHandler` is applied by the `ConsumerRunner` to every discovered
projection, so instrumentation is uniform without per-projection wiring. Commits
`1964004`, `bc3f826`, `8fc68e1`, `efbb5ab`, `662b08c`, `d2e4599`, `3b2e26b`,
`696ba33`, `e481fa2`, `8115c96`, `944c49f`, `74acc02`; see the `*-tracing.spec.ts`
files in `apps/api`.

## Remaining

4. **Per-type intent/outcome attributes** — adapter-side per-type extractors in
   `apps/api` (allow-list per command/event type; exact-match-tested = the PII
   guard). Dispatch span ← the command (what the user tried to do); append span
   ← the events (what happened). **No handler span** — handlers live in
   `packages/market-days`, which stays OTel-free *and* telemetry-free (purity).
   Deferred until the first content-rich command: `RegisterVendor` is
   content-thin (`vendorId` = identity → append span; `registeredAt` = clock;
   `email` = PII), so the generic spans stayed generic — no speculative extractors.

- **`QueryDispatcher` span** — when the read/query surface lands (`GET /storefront`,
  plan "B" in `PLAN.md`), mirror `CommandDispatcher` (same decorator + ESLint
  guard) but lighter: span only, no lineage, no append (reads cause nothing).
  Must follow the Attribute policy below.

## Deferred (per ADR)

- OTel **Collector** and **tail-based sampling** — until volume warrants
  (`docs/DEFERRED.md`).

## Testing harness (established)

Hermetic span capture: a test-only `NodeTracerProvider` + `InMemorySpanExporter`
+ `SimpleSpanProcessor`, registered **once** (the global provider is set-once per
process) with `exporter.reset()` between tests; **no auto-instrumentation**, so
`getFinishedSpans()` holds only our spans. Social test: boot the module, drive
HTTP via supertest (and `poll()` for consumers), assert spans. **Exact-match**
the attribute set — that doubles as the PII guard (a stray `email` fails the
test). Failure paths driven by a stub whose inner `append`/`handle` throws. See
`command-dispatch-tracing.spec.ts` and `storefront-consumer-tracing.spec.ts`.

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
