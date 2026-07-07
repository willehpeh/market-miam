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
  write(): Promise<void> {
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
