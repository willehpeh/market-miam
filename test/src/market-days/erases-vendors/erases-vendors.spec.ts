import { InMemoryCheckpoint, InMemoryDataKeys, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import {
  EraseVendor,
  EraseVendorHandler,
  ErasesVendors,
  InMemorySubdomainRegistry,
  VendorScopedEvents,
  Vendors,
} from '@market-miam/market-days';

describe('Erases Vendors', () => {
  let store: InMemoryEventStore;
  let keys: InMemoryDataKeys;
  let subdomains: InMemorySubdomainRegistry;
  let subscription: PollingSubscription;

  beforeEach(async () => {
    store = new InMemoryEventStore();
    keys = new InMemoryDataKeys();
    subdomains = new InMemorySubdomainRegistry();
    subscription = new PollingSubscription(
      store,
      new ErasesVendors(keys, subdomains),
      new InMemoryCheckpoint('erases-vendors'),
    );
    store.seedWith('vendor-vendor-id', [{
      type: 'VendorRegistered',
      payload: { vendorId: 'vendor-id', registeredAt: '2026-09-01T08:00:00.000Z', email: 'marie@example.fr' },
      version: 1,
    }], { vendorId: 'vendor-id' });
    await keys.getOrCreateKeyFor('vendor-id');
    await keys.getOrCreateKeyFor('vendor-id:legal');
    await subdomains.register('chez-marie', 'vendor-id');
  });

  async function erase(): Promise<void> {
    await new EraseVendorHandler(new Vendors(new VendorScopedEvents(store)))
      .execute(new EraseVendor('vendor-id', '2026-10-04T09:00:00.000Z'));
    await subscription.poll();
  }

  it("shreds the erased vendor's key", async () => {
    await erase();

    expect(await keys.findKeyFor('vendor-id')).toBeNull();
  });

  it('keeps their legal identity key until five years after the erasure, then lets it go', async () => {
    await erase();

    await keys.shredDue(new Date('2031-10-04T08:59:59.999Z'));
    expect(await keys.findKeyFor('vendor-id:legal')).not.toBeNull();
    await keys.shredDue(new Date('2031-10-04T09:00:00.000Z'));
    expect(await keys.findKeyFor('vendor-id:legal')).toBeNull();
  });

  it('frees their subdomain', async () => {
    await erase();

    expect(await subdomains.vendorFor('chez-marie')).toBeUndefined();
  });
});
