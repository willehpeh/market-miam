# Observability Plan (ADR 0026)

Remaining work + invariants for event-based observability with OpenTelemetry. Tracks [ADR 0026](docs/adr/0026-event-based-observability-with-opentelemetry.md). A span is a wide event — fat spans, not many thin logs.

## Shipped
Producer steps 1–3 (command-dispatch span; event-store append/load spans; `traceparent` into event metadata) and consumer steps 5–6 (new-trace-per-handler + span link to producer + `processing.lag_ms`). Consumer `TracingEventHandler` is applied by `ConsumerRunner` to every discovered projection and processor — uniform, no per-projection wiring. First processor→command fan-out (`StorefrontOpener`): the dispatched command and its appended event run on the opener's own consumer trace (child of the handle span), linked back to the request rather than threading the request trace through. Commits `1964004`, `bc3f826`, `8fc68e1`, `efbb5ab`, `662b08c`, `d2e4599`, `3b2e26b`, `696ba33`, `e481fa2`, `8115c96`, `944c49f`, `74acc02`; `*-tracing.spec.ts` in `apps/api`.

## Remaining
4. **Per-type intent/outcome attributes** — adapter-side per-type extractors in `apps/api` (allow-list per command/event type; exact-match-tested = PII guard). Dispatch span ← command; append span ← events. No handler span (handlers in `packages/market-days` stay OTel- and telemetry-free).

   **Sharpened trigger:** deferred until a content-rich command with a *safe (non-PII, aggregatable)* payload is *dispatched in production* (controller or processor) — not merely defined in the domain. No command qualifies today: `ChangeItemPrice` / `AddItemToCatalogue` / `RegisterMarketSchedule` / `PlanItemsForMarketDay` are content-rich but domain-only (nothing constructs them, so their spans never fire); the only content-rich command on a live path is `EditStorefrontInformation` (`PUT /storefront`), whose payload is all free-text (`name`, `description`) — nothing safe beyond `vendor.id`, already on the span. Revisit when a catalogue/schedule/market-day **write endpoint** dispatches a command with a safe payload (e.g. `ChangeItemPrice` → `item.price`).

   **Ready design** (pick-up-and-go when the trigger fires): two new files in `apps/api/src/app/event-sourcing/` — `command-attributes.ts` + `event-attributes.ts`, each a `Record<string, (msg) => Record<string, AttributeValue>>`, default empty, opt-in per type (`registry[key]?.(msg)` → missing key adds nothing, baseline unchanged). Spread the lookup into the existing `setAttributes` at `tracing.command-dispatcher.ts:18` (key `command.constructor.name`) and `tracing.event-store.ts:23` append (key `events[0].type`, read `events[0].payload`). May import domain types from `@market-monster/market-days`; never import `@opentelemetry/*` into `packages/*` (ADR-0026). Rules: raw value OK for non-PII public data (`item.price` raw — list price, not sensitive revenue); free-text → derived scalars only (`*.has_image`, `schedule.day_count`, `plan.total_quantity`), never raw text. Guard: extend the exact-match `toEqual({...})` assertions in `command-dispatch-tracing.spec.ts`; each instrumented command gets a social test through its real production entry point (no entry point ⇒ not ready). Optional later: ESLint `no-restricted-imports` banning `@opentelemetry/*` in `packages/*` (matches the `projection-decorator` / `processor-decorator` custom-rule pattern; today the invariant is structural/ADR only).

- **`QueryDispatcher` span** — when the read/query surface lands (`GET /storefront`, plan B in `PLAN.md`): mirror `CommandDispatcher` (same decorator + ESLint guard), lighter — span only, no lineage, no append (reads cause nothing). Follows the Attribute policy below.

## Deferred (per ADR)
- OTel Collector + tail-based sampling — until volume warrants (`docs/DEFERRED.md`).

## Testing harness
Hermetic span capture: test-only `NodeTracerProvider` + `InMemorySpanExporter` + `SimpleSpanProcessor`, registered once (global provider is set-once per process), `exporter.reset()` between tests, no auto-instrumentation — so `getFinishedSpans()` holds only our spans.

Synthetic for mechanism, real-domain only for content-bearing spans:
- Generic machinery (new-trace/link/lag, no-link fallback, failure paths) is parametric over type → tested with a synthetic event at the decorator unit level (`tracing.event-handler.spec.ts`). Coupling to a domain flow only makes it brittle to that domain's rules.
- Real-domain social test only where exact-match attributes are a genuine PII guard (a span handed a content-bearing message). Today: dispatch span proven blind to `RegisterVendor.email` (`command-dispatch-tracing.spec.ts`); the deferred content-rich handler span is next.
- Consumer path keeps one thin wiring smoke test (`storefront-consumer-tracing.spec.ts`): `ConsumerRunner` wraps a discovered projection. Failure paths driven by a stub whose `append`/`handle` throws.

## Attribute policy — default-rich, PII-safe by seam
Default is rich, not minimal: attach any non-PII context in hand — high-cardinality domain context is what `BubbleUp`/`group by` need. "No speculative surface" is about code surface (facades, methods that rot), not data; span attributes don't transfer.

Two seams keep richness from costing purity or leaking PII:
- **Bus/store span** — opens the event from ambient `MessageContext` metadata + message constructor name (`command.name`, `event.type`, `vendor.id`, correlation/causation). Structurally blind to message fields → cannot serialize a payload (no `JSON.stringify`, no accidental `email`).
- **Command handler** — application-layer seam holding command, resulting state, emitted event. Domain attributes added here explicitly, one `setAttribute` at a time. Pure domain packages never import OTel.

No automatic serialization path anywhere: every attribute is a deliberate, reviewable line, default empty, opt-in per field. Prevents accidental bulk leakage (dumping a whole command/event); does not prevent a deliberate mistake (explicitly stamping `email`) — that is caught by review against this policy.

Excluded/projected: never put PII on a span (`email`, names, phone). Sensitive-but-useful → derived projection (bucket `amount.bucket`, count, boolean, hash), never raw. Free text (descriptions, blurbs) is unbounded-cardinality and not aggregable — leave off unless a concrete need arises.

Caveat: `vendor.id` rides every span as the high-cardinality key — a business handle today, acceptable. If the vendor identity scheme ever becomes an email or person's name, this policy breaks; treat that change as a trigger to re-evaluate.

## Domain-purity invariant (ADR)
Instrumentation only extends the `@nestjs/cqrs` bus and the store/subscription adapters. Domain packages gain no observability dependency. Hold this line on every step above.
