# 0009. One event per command; vendor-scoped stream per aggregate

Date: 2026-05-02 · Status: Accepted

## Context

The write side needs two conventions: how many events a command may produce,
and how event streams are keyed. Commands that emit several events blur what
actually happened and make consumers reason about partial sequences;
unscoped stream IDs would leave tenant isolation to query discipline.

## Decision

Each command raises exactly one event — the fact that occurred. Effects that
span multiple streams are the job of processors reacting to that event, not
of the command handler. Each aggregate instance gets its own stream, keyed by
vendor scope: `calendar-{vendorId}`, `catalogue-{vendorId}`,
`market-day-{date}-{vendorId}-{marketId}`.

## Consequences

- Events map one-to-one to user (or system) actions, keeping the log readable and
  consumers simple.
- Cross-stream workflows are explicit (event → processor → new command), and
  eventually consistent.
- Optimistic concurrency operates per aggregate instance, which is exactly
  the consistency boundary.
- Tenant isolation is structural: a vendor's state physically lives in
  streams named after them.
