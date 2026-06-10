# 0014. Self-describing payloads; vendorId in metadata

Date: 2026-05-23 · Status: Accepted

## Context

Stream IDs encode useful data (vendorId, marketId, date — ADR 0009), which
tempts two shortcuts: leaving that data out of events because it's in the
stream ID, and putting tenant context into every payload. An `EventEnvelope`
wrapper was tried for carrying context and removed as ceremony.

## Decision

Event payloads are self-describing: everything the event is about (itemId,
marketId, date, …) lives in the payload, even when duplicated in the stream
ID. vendorId is the exception — it is context, not content, and travels in
event metadata, attached by repositories at append time and read via
`vendorIdFrom(event)`.

## Consequences

- Stream naming can be refactored freely; no consumer parses stream IDs to
  understand an event.
- Payloads stay pure domain facts, while every event still carries its
  tenant — projections group by `vendorIdFrom` without payload pollution.
- Metadata is the designated home for further cross-cutting context
  (causation, correlation, actor) without payload churn.
- The duplication costs a few bytes per event; irrelevant at this volume.
