import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import {
  InMemoryVendorAccounts,
  InviteVendorHandler,
  OpensVendorAccounts,
  VendorScopedEvents,
  Vendors,
} from '@market-miam/market-days';
import { TestInviteVendor } from '../invite-vendor/test-data';

describe('Opens Vendor Accounts', () => {
  let store: InMemoryEventStore;
  let accounts: InMemoryVendorAccounts;
  let subscription: PollingSubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    accounts = new InMemoryVendorAccounts();
    subscription = new PollingSubscription(
      store,
      new OpensVendorAccounts(accounts),
      new InMemoryCheckpoint('opens-vendor-accounts'),
    );
  });

  it('opens an account for an invited vendor', async () => {
    const invitation = TestInviteVendor.valid();
    await new InviteVendorHandler(new Vendors(new VendorScopedEvents(store))).execute(invitation);

    await subscription.poll();

    expect(accounts.all()).toEqual([{ vendorId: invitation.vendorId, email: invitation.email }]);
  });
});
