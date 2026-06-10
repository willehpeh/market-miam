# 0002. Event Sourcing + CQRS as the persistence model

Date: 2026-05-01 · Status: Accepted

## Context

Vendors plan market days, evolve catalogues, and record outcomes over time —
history matters as much as current state. The platform is multi-tenant but
each tenant is a single vendor, so write concurrency per stream is near zero.
The conventional alternative was CRUD over a relational model with separate
audit logging.

## Decision

Persist all domain state as events. Aggregates are rehydrated by replaying
their stream and raise events as the sole effect of commands (CQRS write
side). Read models are built asynchronously by projections consuming the
event log.

## Consequences

- Complete audit trail and temporal queries come for free; new read models
  can be projected from existing events at any time.
- Events are immutable, so schema decisions carry long-term weight (see later
  ADRs on payload design and PII).
- Read models are eventually consistent; UIs must tolerate the lag.
- More moving parts than CRUD (subscriptions, checkpoints, projections), kept
  manageable by the low-concurrency tenant model.
