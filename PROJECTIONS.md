# Projection & Processor Model

## Context

The command side works. The read side needs projections (materialize read models) and processors (execute side effects). A "pure fold" projection can't persist to domain-specific Postgres tables through a generic runner, processors can't be pure folds at all, and checkpoint storage was separated from read model data.

This plan resolves those tensions with a model where **projections own their persistence through injected ports** and a **Subscription handles only polling and checkpointing**.

## The Model

### Projection & Processor

A projection receives events and writes to a views port. It owns its own dispatch and persistence logic. The views port is the boundary — a fake in tests, Postgres in production.

A processor has the same shape but different intent — side effects instead of read model writes.

Two abstract base classes communicate this distinction: projections are rebuildable and idempotent (safe to replay from position 0), processors have external side effects (not safe to replay). The subscription accepts either structurally.

```ts
// packages/event-sourcing/src/projection.ts
export abstract class Projection {
  abstract handle(event: StoredEvent): void | Promise<void>;
}

// packages/event-sourcing/src/processor.ts
export abstract class Processor {
  abstract handle(event: StoredEvent): void | Promise<void>;
}
```

### Events (read-side port)

A separate interface for cross-stream event reading, decoupled from `EventStore`. The subscription depends on this, not on `EventStore` — keeps the read side independent from the write side's stream-scoped interface.

```ts
// packages/event-sourcing/src/events.ts
export abstract class Events {
  abstract loadFrom(globalPosition: number): Promise<StoredEvent[]>;
}
```

Returns events with `globalPosition > globalPosition`, ordered by `globalPosition`. `InMemoryEventStore` implements both `EventStore` and `Events`.

### Subscription (the runner)

Polls the `Events` port, dispatches to a handler, manages the checkpoint. Does not know or care whether the handler is a projection or processor.

```ts
// packages/event-sourcing/src/subscription.ts
export abstract class Checkpoint {
  abstract read(): Promise<number>;
  abstract write(position: number): Promise<void>;
}

export class Subscription {
  constructor(
    private readonly name: string,
    private readonly events: Events,
    private readonly handler: Projection | Processor,
    private readonly checkpoint: Checkpoint,
  ) {}

  async poll(): Promise<void> {
    const position = await this.checkpoint.read();
    const events = await this.events.loadFrom(position);
    for (const event of events) {
      await this.handler.handle(event);
      await this.checkpoint.write(event.globalPosition);
    }
  }
}
```

`poll()` returns `void` — command methods don't return values. Tests assert on view state, not on processing counts.

`poll()` is public so tests call it directly — no polling loop needed in tests. The continuous polling loop (`start`/`stop`) is deferred — it's infrastructure that isn't needed to prove the model works.

### Checkpoint storage

In production, a shared `checkpoints` table in Postgres keyed by subscription name. Each subscription's checkpoint is independent — shared table, no coupling between subscriptions. In tests, `InMemoryCheckpoint` is trivial.

### Poison events

Deferred. When the polling loop is added, fail loud (crash on repeated failure) rather than silently skipping. Dead-letter handling is not needed until there's evidence of a real operational problem.

### Views Port (per projection)

Each projection defines its own port with domain-specific methods. A single port combines read and write — the projection writes through `add()`, the query handler reads through `forVendor()`. Decoupled by the port.

```ts
// packages/market-days/src/repertoire-view/repertoire-views.ts
export abstract class RepertoireViews {
  abstract add(vendorId: string, item: RepertoireViewItem): void;
  abstract forVendor(vendorId: string): RepertoireView;
  abstract clear(): void;
}
```

`forVendor()` returns an empty view (not `undefined`) when no items have been projected for a vendor — a vendor with no items has an empty repertoire, not a missing one.

`add()` appends one item to the vendor's list — one call per event, not per snapshot.

`clear()` wipes all view data. Used before replay — the projection is rebuilt from position 0 against a clean slate. This is the replay strategy: clear views, reset checkpoint to 0, replay all events. The projection logic stays simple (append-only) because replay always starts clean.

### Read model types

Read models are plain `type`s, not classes. Classes are for write-side objects with behavior and invariants; types are for read-side data shaped for display.

```ts
// packages/market-days/src/repertoire-view/repertoire-view.ts
export type RepertoireViewItem = {
  itemId: string;
  name: string;
  description: string;
  price: number;
  photoUrl: string;
};

export type RepertoireView = {
  items: RepertoireViewItem[];
};
```

### Event type dispatch

Projections use a local type derived from the event type's literal union for switch dispatch. Payload is cast per case using the event type's indexed payload type.

```ts
export class RepertoireViewProjection extends Projection {
  constructor(private readonly views: RepertoireViews) { super(); }

  handle(event: StoredEvent) {
    switch (event.type as RepertoireEvent['type']) {
      case 'ItemAddedToRepertoire': {
        const payload = event.payload as ItemAddedToRepertoire['payload'];
        this.views.add(vendorIdFrom(event), {
          itemId: payload.itemId,
          name: payload.name,
          description: payload.description,
          price: payload.price,
          photoUrl: payload.photoUrl,
        });
      }
    }
  }
}
```

### VendorId helper

A centralised helper extracts `vendorId` from event metadata. Every projection in market-days needs this — one place for the cast, fails fast if the convention is violated. Lives in `shared-kernel` next to `assignedToVendor()` — they're two sides of the same convention (write and read).

```ts
// packages/shared-kernel/src/vendor-id-from.ts
export function vendorIdFrom(event: StoredEvent): string { ... }
```

## Why Not Pure Fold

A pure fold `(state, event) -> state` requires the runner to load, pass, and persist the state — meaning the runner must understand every projection's schema. That's either a generic JSON blob (kills query performance) or a per-projection persistence adapter inside the runner (same coupling, worse location). Letting the projection write through its own port keeps schema knowledge where it belongs.

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

Fakes needed: `InMemoryEventStore` (exists, will implement `Events`), `InMemoryCheckpoint` (new, trivial), `InMemoryRepertoireViews` (new, per-projection). The test uses a single `InMemoryEventStore` instance serving both `EventStore` (for repositories) and `Events` (for the subscription) — same store, two interfaces, same as production.

## Files to Create/Modify

**New in `packages/event-sourcing/src/`:**
- `projection.ts` — abstract Projection
- `processor.ts` — abstract Processor
- `events.ts` — abstract Events (read-side port)
- `subscription.ts` — Subscription, Checkpoint

**New in `packages/market-days/src/repertoire-view/`:**
- `repertoire-view.ts` — RepertoireView and RepertoireViewItem types
- `repertoire-views.ts` — RepertoireViews port
- `repertoire-view.projection.ts` — RepertoireViewProjection

**New in `packages/shared-kernel/src/`:**
- `vendor-id-from.ts` — vendorIdFrom helper (next to assignedToVendor)

**New in `test/src/`:**
- `in-memory.checkpoint.ts`
- `market-days/repertoire-view/in-memory-repertoire-views.ts`

**Modified:**
- `packages/event-sourcing/src/index.ts` — export new types
- `test/src/in-memory.event-store.ts` — implement `Events` interface
- `test/src/market-days/repertoire-view/repertoire-view.spec.ts` — full test

## Implementation Order

1. `Events` interface in event-sourcing package
2. Implement `Events` on `InMemoryEventStore`
3. `Projection`, `Processor`, `Subscription`, `Checkpoint` in event-sourcing package
4. `InMemoryCheckpoint` in test
5. `RepertoireView` types + `RepertoireViews` port (with `add`, `forVendor`, `clear`) in market-days
6. `InMemoryRepertoireViews` in test (Map-backed, `add` appends, `forVendor` returns empty view for unknown, `clear` wipes all)
7. `vendorIdFrom` helper in shared-kernel
8. `RepertoireViewProjection` in market-days
9. Repertoire view test — drives steps 5-8

All TDD. Step 9 is the outside test that pulls everything together.

## Verification

```bash
npx nx test market-days
```
