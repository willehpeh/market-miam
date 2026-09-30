import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { HideCartePricesHandler, StorefrontNotOpenError, Storefronts, VendorScopedEvents } from '@market-miam/market-days';
import { TestHideCartePrices } from './test-data';

// Prices on the carte are the vendor's choice, and they are opted in: a storefront that
// has never said otherwise shows them. So hiding is the only fact worth recording, and
// showing again is its counterpart — never a flag written at open time.
describe('Hide Carte Prices', () => {
  let store: InMemoryEventStore;
  let handler: HideCartePricesHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new HideCartePricesHandler(new Storefronts(new VendorScopedEvents(store)));
  });

  it('rejects hiding prices on a storefront that has not been opened', async () => {
    await expect(handler.execute(TestHideCartePrices.valid())).rejects.toThrow(StorefrontNotOpenError);
  });

  it('stops the carte quoting prices to customers', async () => {
    openStorefront();

    await handler.execute(TestHideCartePrices.valid());

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'CartePricesHidden',
      payload: {}
    })]);
  });

  // A re-statement, not a change: the same stance setCoverPhoto and publish take. A
  // second event would say the prices were hidden twice, which is not a thing that
  // happened.
  it('takes a second hide as a no-op, appending nothing', async () => {
    openStorefront();
    await handler.execute(TestHideCartePrices.valid());

    await handler.execute(TestHideCartePrices.valid());

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'CartePricesHidden' })
    ]);
  });

  function openStorefront() {
    store.seedWith('storefront-vendor-id', [{ type: 'StorefrontOpened', payload: { vendorId: 'vendor-id' }, version: 1 }], { vendorId: 'vendor-id' });
  }
});
