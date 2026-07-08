# event-sourcing

A small event-sourcing kernel: ports (abstract classes used as DI tokens),
in-memory adapters, and the `Aggregate` base. Framework-agnostic apart from the
`CommandGateway` port, which types over `@nestjs/cqrs`.

## What's here

- **`Aggregate`** — base class. Implement `apply(event)`; call `raise(event)` from
  behaviour methods; `rehydrate(events)` replays a stream.
- **`DomainEvent` / `StoredEvent`** — the event shape, and its stored envelope
  (id, positions, timestamp, metadata).
- **Ports** — `EventStore` (write + load a stream), `Events` (global `loadFrom`
  for subscriptions), `Checkpoint`, `Subscription`, `EventHandler`
  (→ `Projection` / `Processor`), `CommandGateway`, `MessageContext`.
- **In-memory adapters** — `InMemoryEventStore`, `InMemoryCheckpoint`,
  `InMemorySubscription`. Used in tests and, for now, at runtime.
- **Postgres adapters** (over a `pg` `Pool`/`Client`) — `PostgresEventStore`
  (`EventStore` + `Events`; append in a transaction, load by stream / global
  position), `PostgresCheckpoint`, `PostgresNotifications` (long-lived
  `LISTEN events` connection exposed as a poke stream with reconnect/backoff),
  and `PostgresDataKeys` (AES-256-GCM keys envelope-encrypted under a master
  key, for crypto-shredding). In flight — exported and contract-tested, but not
  yet the runtime default; the app still wires the in-memory adapters.
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
