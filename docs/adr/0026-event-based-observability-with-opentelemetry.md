# 0026. Event-based observability with OpenTelemetry

Date: 2026-06-21 · Status: Accepted

## Context

We want high-cardinality, event-based observability (the Honeycomb/Majors
"wide events" model) across the platform. We run on Render, so the ingress
edge is not instrumentable; the process boundary is the earliest point we
control. The write path is CQRS over an event log (ADR 0002, 0011) and
read/reactive work happens asynchronously in polling subscriptions feeding
`Projection` and `Processor` handlers (ADR 0015), so causal context is lost
across the commit boundary unless we carry it ourselves.

## Decision

Use OpenTelemetry tracing as the substrate: a span is a wide event, and we
make spans fat rather than emitting many thin logs. One root span per HTTP
request (auto-instrumentation). Instrument command/query dispatch and the
event-store append as child spans of the request. At append time, inject the
W3C trace context into event metadata alongside `vendorId` (ADR 0014).
Asynchronous consumers do **not** continue the request's trace: each consumed
event starts a new trace per handler with a span *link* back to the producer
(OTel messaging conventions), keeping traces bounded under processor→command
fan-out. Domain code stays pure — context is ambient via `AsyncLocalStorage`
and all annotation lives in adapters. Export OTLP directly to the vendor for
now; a collector and tail-based sampling are deferred (DEFERRED.md).

## Consequences

- Instrumentation extends the `@nestjs/cqrs` bus and the store/subscription
  adapters; the domain packages gain no observability dependency.
- `processing.lag_ms` (commit-time to handle-time) on every consumer span
  becomes the read-model freshness SLO — a signal a CRUD system lacks.
- Trace context is plumbing, not domain fact: it lives only in metadata, is
  optional on rehydration, and event replay tolerates its absence without
  resurrecting old traces.
- Per-deploy comparison works by stamping `RENDER_GIT_COMMIT` as a resource
  attribute; `vendor.id` is the primary high-cardinality dimension.
- Running an OTel Collector and tail sampling is deferred until volume
  warrants it (DEFERRED.md).
