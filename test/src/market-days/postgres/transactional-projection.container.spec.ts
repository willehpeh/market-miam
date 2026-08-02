import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  Checkpoint,
  CheckpointConflictError,
  DomainEvent,
  PollingSubscription,
  PostgresCheckpoint,
  PostgresEventStore,
  PostgresUnitOfWork,
} from '@market-miam/event-sourcing';
import { PostgresVendorStorefrontViews, VendorStorefrontViewProjection } from '@market-miam/market-days';
import { PostgresHarness, startPostgres } from '../../event-sourcing/postgres/testcontainer';

let pg: PostgresHarness;

beforeAll(async () => {
  pg = await startPostgres();
});

afterAll(async () => {
  await pg?.stop();
});

beforeEach(async () => {
  await pg.reset();
});

const opened: DomainEvent = { type: 'StorefrontOpened', payload: { vendorId: 'v1' }, version: 1 };
const emptyView = { name: '', description: '', phone: '', imageReference: '', published: false };

// A checkpoint that fails its writes — simulates a crash after the view write,
// inside the per-event transaction.
class FailingCheckpoint extends Checkpoint {
  read(): Promise<number> {
    return Promise.resolve(0);
  }
  advance(_from: number, _to: number): Promise<void> {
    return Promise.reject(new Error('checkpoint advance failed'));
  }
  reset(): Promise<void> {
    return Promise.reject(new Error('checkpoint reset failed'));
  }
}

describe('transactional projection ↔ checkpoint', () => {
  it('commits the view write and the checkpoint together on success', async () => {
    const uow = new PostgresUnitOfWork(pg.pool);
    const events = new PostgresEventStore(pg.pool);
    const views = new PostgresVendorStorefrontViews(uow);
    const checkpoint = new PostgresCheckpoint(uow, 'vendor-storefront-view');
    const subscription = new PollingSubscription(events, new VendorStorefrontViewProjection(views), checkpoint, { unitOfWork: uow });

    await events.append('storefront-v1', [opened], 0, { vendorId: 'v1' });
    await subscription.poll();

    expect(await views.findByVendor('v1')).toEqual(emptyView);
    expect(await checkpoint.read()).toBeGreaterThan(0);
  });

  it('rolls back the view write when the checkpoint fails, then re-applies once on retry', async () => {
    const uow = new PostgresUnitOfWork(pg.pool);
    const events = new PostgresEventStore(pg.pool);
    const views = new PostgresVendorStorefrontViews(uow);
    const projection = new VendorStorefrontViewProjection(views);
    await events.append('storefront-v1', [opened], 0, { vendorId: 'v1' });

    // First poll: the checkpoint write throws inside the per-event tx → both roll back.
    await expect(new PollingSubscription(events, projection, new FailingCheckpoint(), { unitOfWork: uow }).poll()).rejects.toThrow();
    expect(await views.findByVendor('v1')).toBeUndefined();

    // The checkpoint never advanced, so a clean retry replays and applies exactly once.
    const checkpoint = new PostgresCheckpoint(uow, 'vendor-storefront-view');
    await new PollingSubscription(events, projection, checkpoint, { unitOfWork: uow }).poll();

    expect(await views.findByVendor('v1')).toEqual(emptyView);
    expect(await checkpoint.read()).toBeGreaterThan(0);
  });

  // The W3 mechanism on real pg: a writer whose checkpoint expectation is stale
  // cannot land effects — the CAS advance conflicts inside its transaction and
  // the view write rolls back with it. This is what makes a batch decrypted
  // before an erasure harmless: none of it can commit after the reset.
  it('rolls back a stale writer’s view write along with its rejected advance', async () => {
    const uow = new PostgresUnitOfWork(pg.pool);
    const events = new PostgresEventStore(pg.pool);
    const views = new PostgresVendorStorefrontViews(uow);
    const checkpoint = new PostgresCheckpoint(uow, 'vendor-storefront-view');

    await events.append('storefront-v1', [opened], 0, { vendorId: 'v1' });
    await new PollingSubscription(events, new VendorStorefrontViewProjection(views), checkpoint, { unitOfWork: uow }).poll();

    await expect(
      uow.transaction(async () => {
        await views.open('v2');
        await checkpoint.advance(0, 1); // read its position before the poll above moved it
      }),
    ).rejects.toBeInstanceOf(CheckpointConflictError);

    expect(await views.findByVendor('v2')).toBeUndefined();
  });
});

// Subscriptions.rebuild wraps projection.reset() + checkpoint.reset() in one
// uow.transaction. The in-memory Subscriptions test proves rebuild uses that shape;
// these prove the shape is atomic on real pg — the no-op UnitOfWork can't.
describe('rebuild ↔ checkpoint reset', () => {
  async function seedBuiltView(
    events: PostgresEventStore,
    projection: VendorStorefrontViewProjection,
    checkpoint: Checkpoint,
    uow: PostgresUnitOfWork,
  ): Promise<void> {
    await events.append('storefront-v1', [opened], 0, { vendorId: 'v1' });
    await new PollingSubscription(events, projection, checkpoint, { unitOfWork: uow }).poll();
  }

  it('clears the view and resets the checkpoint together on success', async () => {
    const uow = new PostgresUnitOfWork(pg.pool);
    const events = new PostgresEventStore(pg.pool);
    const views = new PostgresVendorStorefrontViews(uow);
    const projection = new VendorStorefrontViewProjection(views);
    const checkpoint = new PostgresCheckpoint(uow, 'vendor-storefront-view');

    await seedBuiltView(events, projection, checkpoint, uow);
    expect(await views.findByVendor('v1')).toEqual(emptyView);
    expect(await checkpoint.read()).toBeGreaterThan(0);

    await uow.transaction(async () => {
      await projection.reset();
      await checkpoint.reset();
    });

    expect(await views.findByVendor('v1')).toBeUndefined();
    expect(await checkpoint.read()).toBe(0);
  });

  it('rolls back the clear when the checkpoint reset fails', async () => {
    const uow = new PostgresUnitOfWork(pg.pool);
    const events = new PostgresEventStore(pg.pool);
    const views = new PostgresVendorStorefrontViews(uow);
    const projection = new VendorStorefrontViewProjection(views);
    const checkpoint = new PostgresCheckpoint(uow, 'vendor-storefront-view');

    await seedBuiltView(events, projection, checkpoint, uow);
    const position = await checkpoint.read();

    await expect(
      uow.transaction(async () => {
        await projection.reset();
        await new FailingCheckpoint().reset();
      }),
    ).rejects.toThrow();

    expect(await views.findByVendor('v1')).toEqual(emptyView);
    expect(await checkpoint.read()).toBe(position);
  });
});
