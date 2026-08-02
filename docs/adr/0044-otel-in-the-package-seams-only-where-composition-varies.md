# 0044. OTel is the package's opinion; seams only where composition varies

Date: 2026-08-02 · Status: Accepted · Amends: 0026

## Context

The event store and its subscription runner were composed as decorator
chains: `TracingEventStore → LineageEventStore → ShreddingEventStore → leaf`
on the store side, `TracingSubscription → PollingSubscription →
TracingEventHandler → (ContinuedLineageHandler) → handler` on the consumer
side. The tracing decorators lived in `apps/api` to keep the package
OTel-free; the api assembled the chains.

Auditing each layer against "when does composition actually vary?" showed
the chains were carrying optionality every concern already carries
internally:

- **Tracing** — the `@opentelemetry/api` facade is designed so optionality
  lives in the SDK registry, not in object composition. No SDK → no-op
  tracer → spans are free and `traceparentOf` yields nothing. An "untraced
  variant" never needs to exist.
- **Lineage stamping** — outside a dispatch `Lineage.current()` is
  `undefined` and the layer adds nothing.
- **Shredding** — an empty `PiiFields` map passes everything through.

Nothing composed these layers in more than one order, and nothing omitted
them. The only compositions that vary in fact are the **leaf store**
(in-memory vs Postgres, the profile seam behind `PERSISTED_EVENTS`) and
**`ContinuedLineageHandler`** (processors only, chosen per handler at
discovery). Meanwhile the suppress/unsuppress pairing — poll cycles
suppress instrumentation, real work lifts it — was split across two classes
that had to cooperate blindly.

A related question settled here: should lineage fold into OTel context
(trace ids as correlation ids, or Baggage as the carrier)? No. Lineage is
**durable provenance** written into an append-only log — total,
unconditional, queryable with SQL forever. Traces are telemetry — sampled,
retention-bound, absent without an SDK, and OTel context does not propagate
at all until a context manager is globally registered (a silent failure
mode in every un-instrumented environment). The consumer side deliberately
starts a **new root** per handled event, so trace ids change exactly at the
boundaries correlation must survive; and `causationId` is an event id, not
a span id. The two systems disagree at the commit boundary on purpose.

## Decision

- **The package takes OTel as its opinion**: `@opentelemetry/api` (no-op
  safe) and `@opentelemetry/core` (`suppressTracing`). "Framework-free"
  continues to mean Nest-free.
- **`ApplicationEventStore` (package) is the composed store**: span per
  append/load, `traceparent` and lineage ids stamped inline, delegating to
  a `ShreddingEventStore` it constructs around the injected leaf.
  `TracingEventStore` and `LineageEventStore` are dissolved into it.
- **`PollingSubscription` owns both spans of the consumer cycle**: the
  suppressed poll span (with the lag gauge it can now compute itself —
  it holds the events log and the checkpoint, so the api's lag closure
  disappears) and the per-event handler span that lifts suppression, roots
  a new trace, and links back to the producer. `TracingSubscription` and
  `TracingEventHandler` are dissolved into it.
- **The seams that remain are the ones that vary**: the leaf behind
  `PERSISTED_EVENTS`; `ShreddingEventStore` as a separate object (so AAD
  versioning, tamper detection and key-miss degradation keep isolated
  specs); `ContinuedLineageHandler` as a per-kind wrapper.
- **Lineage stays its own `AsyncLocalStorage`**, not OTel context or
  Baggage, for the reasons above. It is kept — the log is append-only, so
  provenance not written now can never be backfilled.

## Consequences

- The api's `tracing/` directory shrinks to the gateway tracing
  (`TracingCommandGateway`/`TracingQueryGateway` — port adapters over the
  Nest buses, not decorators) and the Nest-lifecycle boundary around
  `PostgresNotifications`. `Subscriptions.buildConsumers()` builds one
  `PollingSubscription` per consumer, no wrapper assembly.
- Spec placement follows the SDK: no-SDK behaviour (faithful metadata,
  contract suites) pins in the `test` project against the package's public
  API; behaviour requiring a captured SDK (span shapes, suppression,
  links) stays in `apps/api` beside `span-capture.ts`.
- Layer-isolated faithfulness contracts became composed-store contracts:
  `eventStoreContract` now instantiates over `ApplicationEventStore` with
  empty PII fields and no SDK — pinning that the whole composition is a
  faithful `EventStore`, which is the property the app actually relies on.
- The store's lineage merge now runs before the traceparent stamp instead
  of after; the writes commute (different keys, same merge semantics), so
  nothing observable changes.
- Failure-localisation granularity is coarser: a tracing bug now lives in
  core classes rather than a peelable wrapper. Accepted — the layers were
  never peeled in practice, and the end-to-end span specs
  (`command-gateway.spec.ts`, `consumer.spec.ts`) never changed across the
  refactoring, which is the evidence the collapse preserved behaviour.
