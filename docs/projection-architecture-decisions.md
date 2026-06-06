# Projection Architecture Decisions

Decisions captured from architecture review on 2026-06-06.

## Confirmed Decisions

### Events vs EventStore is interface segregation, not deployment separation
`Events` (with `loadFrom`) and `EventStore` (with `append`/`load`) are separate interfaces over the same backing store. Projections depend on `Events` so they never get access to `append`. Same principle as read/write separation in CQRS.

### Subscription filters events, Projection declares interest
Projections declare which event types they care about via `eventTypes()`. The Subscription uses that declaration to filter before dispatching. This allows real implementations to push filtering down to the query layer (e.g., `WHERE type IN (...)`).

### One Subscription per handler
Each Projection or Processor gets its own Subscription with its own Checkpoint. They poll independently, fail independently, and can be rebuilt independently. The polling cost is an infrastructure concern, not an architecture one.

### Aggregates first, projections when there's a use case
Events like `ItemsPlannedForMarketDay`, `ItemMarkedAsSoldOut`, and `MarketScheduleRegistered` exist with no projection handling them yet. That's fine — events are banked, replayable history. Projections arrive when a feature needs a read model.

### Manual projection rebuilds
Clear the read model, reset the checkpoint to zero, re-poll from the beginning. No automatic schema-change detection. The building blocks already exist: `clear()`, writable `Checkpoint`, `loadFrom(0)`.

### Blow up on poison events
No dead-letter queue or skip-and-log mechanism yet. Unhandleable events should fail loudly. An explicit error policy will be designed when production use demands it. Premature error handling hides problems.

### Each Subscription implementation owns its poll loop
The orchestration (read checkpoint, load events, filter, handle, advance checkpoint) is not extracted into the base `Subscription` class. A Postgres implementation needs transactional boundaries around that loop, which makes shared orchestration awkward. Two implementations with similar loops is acceptable; extract if a third appears.

### Checkpoint scoped at construction time
Each `Checkpoint` instance is created for a specific subscription. The subscription name is a constructor dependency, not a method parameter. Keeps the `Checkpoint` interface simple (`read()`/`write(position)`).

## Pending Changes

### Move vendorId from metadata to event payload
`vendorId` is a domain concept, not an infrastructure concern. It currently travels through event metadata via `assignedToVendor()` and `vendorIdFrom()`. It should be part of the event payload so events remain self-describing. Those helpers should be removed once migrated.

### Split read model interfaces (write surface vs read surface)
Read model abstractions like `RepertoireViews` currently expose both write methods (used by projections) and read methods (used by query handlers). Split into a write interface for projections and a read interface for query handlers. Same interface segregation principle applied to `EventStore` vs `Events`.
