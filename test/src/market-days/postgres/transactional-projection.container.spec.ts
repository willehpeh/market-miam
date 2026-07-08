import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  Checkpoint,
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
const emptyView = { name: '', description: '', phone: '', imageReference: '' };

// A checkpoint that fails its write — simulates a crash after the view write, inside
// the per-event transaction.
class FailingCheckpoint extends Checkpoint {
  read(): Promise<number> {
    return Promise.resolve(0);
  }
  write(_position: number): Promise<void> {
    return Promise.reject(new Error('checkpoint write failed'));
  }
}

describe('transactional projection ↔ checkpoint', () => {
  it('commits the view write and the checkpoint together on success', async () => {
    const uow = new PostgresUnitOfWork(pg.pool);
    const events = new PostgresEventStore(pg.pool);
    const views = new PostgresVendorStorefrontViews(uow);
    const checkpoint = new PostgresCheckpoint(uow, 'vendor-storefront-view');
    const subscription = new PollingSubscription(events, new VendorStorefrontViewProjection(views), checkpoint, uow);

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
    await expect(new PollingSubscription(events, projection, new FailingCheckpoint(), uow).poll()).rejects.toThrow();
    expect(await views.findByVendor('v1')).toBeUndefined();

    // The checkpoint never advanced, so a clean retry replays and applies exactly once.
    const checkpoint = new PostgresCheckpoint(uow, 'vendor-storefront-view');
    await new PollingSubscription(events, projection, checkpoint, uow).poll();

    expect(await views.findByVendor('v1')).toEqual(emptyView);
    expect(await checkpoint.read()).toBeGreaterThan(0);
  });
});

// Subscriptions.rebuild wraps projection.reset() + checkpoint.write(0) in one
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
    await new PollingSubscription(events, projection, checkpoint, uow).poll();
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
      await checkpoint.write(0);
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
        await new FailingCheckpoint().write(0);
      }),
    ).rejects.toThrow();

    expect(await views.findByVendor('v1')).toEqual(emptyView);
    expect(await checkpoint.read()).toBe(position);
  });
});
