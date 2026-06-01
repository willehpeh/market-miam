# Projection & Processor Model

## Context

The command side works. The read side needs projections (materialize read models) and processors (execute side effects). A "pure fold" projection can't persist to domain-specific Postgres tables through a generic runner, processors can't be pure folds at all, and checkpoint storage was separated from read model data.

This plan resolves those tensions with a model where **projections own their persistence through injected ports** and a **Subscription handles only polling and checkpointing**.

## The Model

### Projection

A projection receives events and writes to a views port. It owns its own dispatch and persistence logic. The views port is the boundary — a fake in tests, Postgres in production.

```ts
// packages/event-sourcing/src/projection.ts
export abstract class Projection {
  abstract handle(event: StoredEvent): void | Promise<void>;
}
```

Concrete example:

```ts
export class RepertoireViewProjection extends Projection {
  constructor(private readonly views: RepertoireViews) { super(); }

  handle(event: StoredEvent) {
    switch (event.type) {
      case 'ItemAddedToRepertoire':
        this.views.add(event.metadata?.vendorId as string, {
          itemId: event.payload['itemId'],
          name: event.payload['name'],
          // ...
        });
    }
    // unhandled events are silently ignored (no default needed)
  }
}
```

### Processor

Same shape, different intent. Side effects instead of read model writes.

```ts
// packages/event-sourcing/src/processor.ts
export abstract class Processor {
  abstract handle(event: StoredEvent): void | Promise<void>;
}
```

Two base classes (not one `EventHandler`) communicates intent: projections are rebuildable and idempotent, processors have external side effects.

### Subscription (the runner)

Polls the event store, dispatches to a handler, manages the checkpoint. Does not know or care whether the handler is a projection or processor.

```ts
// packages/event-sourcing/src/subscription.ts
export type SubscriptionHandler = {
  handle(event: StoredEvent): void | Promise<void>;
};

export abstract class Checkpoint {
  abstract read(): Promise<number>;
  abstract write(position: number): Promise<void>;
}

export class Subscription {
  constructor(
    private readonly name: string,
    private readonly store: EventStore,
    private readonly handler: SubscriptionHandler,
    private readonly checkpoint: Checkpoint,
  ) {}

  async poll(): Promise<void> {
    const position = await this.checkpoint.read();
    const events = await this.store.loadFrom(position);
    for (const event of events) {
      await this.handler.handle(event);
      await this.checkpoint.write(event.globalPosition);
    }
  }
}
```

`poll()` is public so tests call it directly — no polling loop needed in tests.

The continuous polling loop (`start`/`stop`) is deferred — it's infrastructure that isn't needed to prove the model works. Add it when there's a running application.

### Views Port (per projection)

Each projection defines its own port with domain-specific methods. This is how each projection gets its own Postgres schema without the runner needing to know about it.

```ts
// packages/market-days/src/repertoire-view/repertoire-views.ts
export abstract class RepertoireViews {
  abstract add(vendorId: string, item: RepertoireViewItem): void;
  abstract forVendor(vendorId: string): RepertoireView | undefined;
}
```

The projection writes through `add()`. The query handler reads through `forVendor()`. Decoupled by the port.

## Why Not Pure Fold

A pure fold `(state, event) -> state` requires the runner to load, pass, and persist the state — meaning the runner must understand every projection's schema. That's either a generic JSON blob (kills query performance) or a per-projection persistence adapter inside the runner (same coupling, worse location). Letting the projection write through its own port keeps schema knowledge where it belongs.

## Event Store Change

Add one method:

```ts
// packages/event-sourcing/src/event-store.ts
abstract loadFrom(globalPosition: number): Promise<StoredEvent[]>;
```

Returns events with `globalPosition > globalPosition`, ordered by `globalPosition`.

## Testing

Full social test through the subscription:

```ts
beforeEach(() => {
  store = new InMemoryEventStore();
  views = new InMemoryRepertoireViews();
  projection = new RepertoireViewProjection(views);
  checkpoint = new InMemoryCheckpoint();
  subscription = new Subscription('repertoire-view', store, projection, checkpoint);
  repertoires = new Repertoires(store);
  addItemHandler = new AddItemToRepertoireHandler(repertoires);
});

it('projects an item added to the repertoire', async () => {
  await addItemHandler.execute(TestAddItemToRepertoire.valid());
  await subscription.poll();
  const view = views.forVendor('vendor-id');
  expect(view.items).toEqual([...]);
});
```

Fakes needed: `InMemoryEventStore` (exists), `InMemoryCheckpoint` (new, trivial), `InMemoryRepertoireViews` (new, per-projection).

## Files to Create/Modify

**New in `packages/event-sourcing/src/`:**
- `projection.ts` — abstract Projection
- `processor.ts` — abstract Processor
- `subscription.ts` — Subscription, Checkpoint, SubscriptionHandler

**New in `packages/market-days/src/repertoire-view/`:**
- `repertoire-views.ts` — port + view types
- `repertoire-view.projection.ts` — RepertoireViewProjection

**New in `test/src/`:**
- `in-memory.checkpoint.ts`
- `market-days/repertoire-view/in-memory-repertoire-views.ts`

**Modified:**
- `packages/event-sourcing/src/event-store.ts` — add `loadFrom`
- `packages/event-sourcing/src/index.ts` — export new types
- `test/src/in-memory.event-store.ts` — implement `loadFrom`
- `test/src/market-days/repertoire-view/repertoire-view.spec.ts` — full test

## Implementation Order

1. Add `loadFrom` to `EventStore` + `InMemoryEventStore`
2. `Projection`, `Processor`, `Subscription`, `Checkpoint` in event-sourcing package
3. `InMemoryCheckpoint` in test
4. `RepertoireViews` port + types in market-days
5. `InMemoryRepertoireViews` in test
6. `RepertoireViewProjection` in market-days
7. Repertoire view test — drives steps 4-6

All TDD. Step 7 is the outside test that pulls everything together.

## Verification

```bash
npx nx test market-days
```
