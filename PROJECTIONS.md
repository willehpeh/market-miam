# Projection & Processor Architecture Plan

## Context

The codebase has a working command side (commands, handlers, aggregates, events) but no read side. Queries currently require replaying events from the store, and cross-aggregate reads (e.g., looking up item details when planning a market day) have no clean path. Building projection infrastructure unblocks both query handlers and event enrichment.

## Architecture

### Projections

A projection is a pure fold over events that materializes a read model.

- `init()` returns the initial state
- `when(state, event)` returns new state — pure function, no side effects
- The result is persisted to Postgres after each batch (not held in memory across polls)
- Each projection writes to its own domain-specific Postgres table
- Each projection is checkpointed: stores its read model + the last `globalPosition` it processed

### Processors

A processor shares the same plumbing as a projection but executes side effects instead of accumulating state.

- `when(event)` performs a side effect (send notification, dispatch command, call API)
- Checkpointed the same way — tracks `globalPosition` to avoid reprocessing
- Same runner, same gap handling

### Projection Runner

Each projection/processor gets its own independent polling runner.

- **Pull-based**: polls the event store via `loadFrom(globalPosition)`
- **One runner per projection**: no fan-out, no shared coordination — each polls at its own pace, fails independently, can't block others
- **Gap detection**: when a gap in `globalPosition` is detected, retries with exponential backoff (100ms doubling to 5s cap). Transient gaps (in-flight Postgres transactions) resolve in early retries. Permanent gaps (rollbacks, sequence skips) are accepted and logged after max retries.
- **No staggering needed** at current scale

### Event Store Changes

- Add `loadFrom(globalPosition): Promise<StoredEvent[]>` — loads all events after a given global position, ordered by `globalPosition`

### Query Side

- Query classes named `<Thing>Query` (e.g., `RepertoireQuery`)
- Query handlers named `<Thing>QueryHandler`
- Read models named `<Thing>View` (e.g., `RepertoireView`)
- Query handlers depend on projections, not the event store directly
- RxJS available as an ergonomic layer for composing/transforming projections at the query level

### Vendor Scoping

- All vendor-scoped events carry `vendorId` in event **metadata** (not payload)
- Metadata is set in repository `save()` methods when constructing envelopes
- Projections read `StoredEvent.metadata.vendorId` to scope read models per vendor

### Testing

- Full social tests from event store through projection to query handler
- `InMemoryEventStore` is the only fake
- Tests use existing command handlers (e.g., `AddItemToRepertoireHandler`) to populate the store, avoiding coupling to stream ID formats
- Projection tests verify the complete flow: seed via handler, run projection, query via handler, assert on view

## Implementation Order

1. Add `vendorId` to event metadata in all repository `save()` methods (`Calendars`, `Repertoires`, `MarketDays`)
2. Add `loadFrom(globalPosition)` to `EventStore` abstract class and `InMemoryEventStore`
3. `Projection` base class and `Checkpoint` type in `packages/event-sourcing`
4. `ProjectionRunner` with poll-fold-checkpoint loop and gap detection
5. `RepertoireView` read model and `RepertoireProjection` in `packages/market-days`
6. `RepertoireQuery` and `RepertoireQueryHandler`
7. Update `PlanItemsForMarketDay` handler to look up item details from the projection and enrich the `ItemsPlannedForMarketDay` event payload

All steps TDD, driven from the repertoire query test.