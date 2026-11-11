import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { InviteVendor, InviteVendorHandler, VendorScopedEvents, Vendors } from '@market-miam/market-days';

describe('Invite Vendor', () => {
  let store: InMemoryEventStore;
  let handler: InviteVendorHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new InviteVendorHandler(new Vendors(new VendorScopedEvents(store)));
  });

  it('invites a new vendor', async () => {
    await handler.execute(new InviteVendor('vendor-id', '2026-11-11T09:00:00.000Z', 'marie@example.fr'));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'VendorInvited',
        payload: { vendorId: 'vendor-id', invitedAt: '2026-11-11T09:00:00.000Z', email: 'marie@example.fr' },
        version: 1,
      }),
    ]);
  });
});
