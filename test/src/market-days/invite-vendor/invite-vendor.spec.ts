import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { InviteVendorHandler, VendorScopedEvents, Vendors } from '@market-miam/market-days';
import { vendorInvited, vendorStream } from '../vendor-events';
import { TestInviteVendor } from './test-data';

describe('Invite Vendor', () => {
  let store: InMemoryEventStore;
  let handler: InviteVendorHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new InviteVendorHandler(new Vendors(new VendorScopedEvents(store)));
  });

  it('invites a new vendor', async () => {
    await handler.execute(TestInviteVendor.valid());

    expect(store.newEvents()).toEqual([expect.objectContaining(vendorInvited())]);
  });

  it('raises nothing when the vendor is already invited', async () => {
    store.seedWith(vendorStream(), [vendorInvited()], { vendorId: 'vendor-id' });

    await handler.execute(TestInviteVendor.with({ invitedAt: '2026-11-12T09:00:00.000Z' }));

    expect(store.newEvents()).toEqual([]);
  });
});
