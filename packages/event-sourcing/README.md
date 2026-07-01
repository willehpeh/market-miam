# event-sourcing

A small event-sourcing kernel: ports (abstract classes used as DI tokens),
in-memory adapters, and the `Aggregate` base. Framework-agnostic apart from the
`CommandDispatcher` port, which types over `@nestjs/cqrs`.

## What's here

- **`Aggregate`** — base class. Implement `apply(event)`; call `raise(event)` from
  behaviour methods; `rehydrate(events)` replays a stream.
- **`DomainEvent` / `StoredEvent`** — the event shape, and its stored envelope
  (id, positions, timestamp, metadata).
- **Ports** — `EventStore` (write + load a stream), `Events` (global `loadFrom`
  for subscriptions), `Checkpoint`, `Subscription`, `EventHandler`
  (→ `Projection` / `Processor`), `CommandDispatcher`, `MessageContext`.
- **In-memory adapters** — `InMemoryEventStore`, `InMemoryCheckpoint`,
  `InMemorySubscription`. Used in tests and, for now, at runtime.
- **Decorators / wrappers** — `@CheckpointedProjection` / `@CheckpointedProcessor`
  (discovery + checkpoint name), `MessageContextEventStore`,
  `MessageContextDispatcher`.

## Testing

This library has no specs of its own; it's a `typecheck`-only Nx project. Its
behaviour is covered socially from the top-level `test` project — shared port
contracts (e.g. `eventStoreContract`) plus the `market-days` use-case, projection
and processor specs.

```sh
npx nx test test          # the suite that exercises this package
npx nx typecheck event-sourcing
```

New port implementation? Hold it to the existing contract:

```ts
eventStoreContract('MyEventStore', () => new MyEventStore());
```
