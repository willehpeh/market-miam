# event-sourcing

A small event-sourcing kernel: ports (abstract classes used as DI tokens),
in-memory adapters, and the `Aggregate` base. Nest-free apart from the
`CommandGateway` port, which types over `@nestjs/cqrs`; OTel is the package's
opinion (ADR 0044) — it instruments itself via the no-op-safe
`@opentelemetry/api` facade and stays inert wherever no SDK is registered.

## What's here

- **`Aggregate`** — base class. Implement `apply(event)`; call `raise(event)` from
  behaviour methods; `rehydrate(events)` replays a stream.
- **`DomainEvent` / `StoredEvent`** — the event shape, and its stored envelope
  (id, positions, timestamp, metadata).
- **Ports** — `EventStore` (write + load a stream), `Events` (global `loadFrom`
  for subscriptions), `Checkpoint`, `Subscription`, `EventHandler`
  (→ `Projection` / `Processor`), `CommandGateway`, `QueryGateway`, `UnitOfWork`,
  `DataKeys`, `Lineage`.
- **In-memory adapters** — `InMemoryEventStore`, `InMemoryCheckpoint`,
  `InMemoryDataKeys`. Used in tests and in local dev (`NODE_ENV=development`).
- **`PollingSubscription`** — the one `Subscription`, in memory and on Postgres
  alike: it reads `Events` on from its checkpoint (ADR 0015), poked by
  `PostgresNotifications` where there is a database (ADR 0030).
- **Postgres adapters** (over a `pg` `Pool`/`Client`) — `PostgresEventStore`
  (`EventStore` + `Events`; append in a transaction, load by stream / global
  position), `PostgresCheckpoint` (advanced by compare-and-set, ADR 0036),
  `PostgresNotifications` (long-lived `LISTEN events` connection exposed as a poke
  stream with reconnect/backoff), `PostgresUnitOfWork` (the ambient transaction
  appends join, ADR 0035), `PostgresDataKeys` (AES-256-GCM keys envelope-encrypted
  under a master key, for crypto-shredding) with `MasterKeyring` (rotating that key,
  ADR 0040), and `Queryable`, which the contexts' Postgres read models query
  through. The runtime default in every non-development environment (the app wires
  in-memory only for local dev); exported and contract-tested.
- **Composed store** — `ApplicationEventStore`: the store an app wires in.
  Tracing spans, `traceparent` and lineage ids inline, over an injected
  inner store (in production: `ShreddingEventStore` around a leaf adapter,
  composed by the app — the PII subject key is application policy).
- **Decorators / wrappers** — `@CheckpointedProjection` / `@CheckpointedProcessor`
  (discovery + checkpoint name), `LineageDispatcher`.

## Testing

This library has no specs of its own; it's a `typecheck`-only Nx project. Its
behaviour is covered socially from the top-level `test` project — shared port
contracts (e.g. `eventStoreContract`), its own specs under
`test/src/event-sourcing/`, and the contexts' use-case, projection and processor
specs.

```sh
npx nx test test          # the suite that exercises this package
npx nx typecheck event-sourcing
```

New port implementation? Hold it to the existing contract:

```ts
eventStoreContract('MyEventStore', () => new MyEventStore());
```
