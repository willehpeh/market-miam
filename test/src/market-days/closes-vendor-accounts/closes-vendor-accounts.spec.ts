import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import {
  ClosesVendorAccounts,
  EraseVendor,
  EraseVendorHandler,
  InMemoryVendorAccounts,
  VendorScopedEvents,
  Vendors,
} from '@market-miam/market-days';
import { vendorRegistered, vendorStream } from '../vendor-events';

describe('Closes Vendor Accounts', () => {
  let store: InMemoryEventStore;
  let accounts: InMemoryVendorAccounts;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  async function erase(vendorId = 'vendor-id'): Promise<void> {
    await new EraseVendorHandler(new Vendors(new VendorScopedEvents(store))).execute(
      new EraseVendor(vendorId, '2026-11-14T09:00:00.000Z'),
    );
  }

  async function process(): Promise<void> {
    await new PollingSubscription(
      store,
      new ClosesVendorAccounts(accounts),
      new InMemoryCheckpoint('closes-vendor-accounts'),
    ).poll();
  }

  it("closes an erased vendor's account", async () => {
    accounts = new InMemoryVendorAccounts([{ email: 'vendor@domain.com', vendorId: 'vendor-id' }]);
    store.seedWith(vendorStream(), [vendorRegistered()], { vendorId: 'vendor-id' });

    await erase();
    await process();

    expect(accounts.all()).toEqual([]);
  });
});
