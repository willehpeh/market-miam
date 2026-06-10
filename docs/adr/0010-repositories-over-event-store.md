# 0010. Repositories over the event store

Date: 2026-05-09 · Status: Accepted

## Context

Command handlers need aggregates, but the event store speaks in stream IDs,
positions, and stored events. Handlers could call the store directly, leaving
each one to know stream-naming and rehydration mechanics, or that knowledge
could be centralized per aggregate.

## Decision

Each aggregate gets a repository (`Calendars`, `Catalogues`, `MarketDays`)
that owns its stream-ID scheme, rehydration, and saving (raised events +
expected position + vendorId metadata). Lookups read as domain language:
`catalogues.forVendor(vendorId)`,
`marketDays.forVendorAtMarket(vendorId, marketId).on(date)`.

## Consequences

- Stream naming (ADR 0009) lives in exactly one place per aggregate and can
  change without touching handlers.
- Handlers stay at use-case altitude: load, invoke behavior, save.
- Vendor scope is a required argument to every lookup — there is no way to
  load an unscoped aggregate.
- Repositories depend only on the `EventStore` port, so fakes from ADR 0006
  slot in directly.
