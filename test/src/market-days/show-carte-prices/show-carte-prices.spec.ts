import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { ShowCartePricesHandler, StorefrontNotOpenError, Storefronts, VendorScopedEvents } from '@market-miam/market-days';
import { TestShowCartePrices } from './test-data';

describe('Show Carte Prices', () => {
  let store: InMemoryEventStore;
  let handler: ShowCartePricesHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new ShowCartePricesHandler(new Storefronts(new VendorScopedEvents(store)));
  });

  it('rejects showing prices on a storefront that has not been opened', async () => {
    await expect(handler.execute(TestShowCartePrices.valid())).rejects.toThrow(StorefrontNotOpenError);
  });

  it('puts the prices back on a carte that was hiding them', async () => {
    openStorefrontHidingPrices();

    await handler.execute(TestShowCartePrices.valid());

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'CartePricesShown',
      payload: {}
    })]);
  });

  // The opt-in, stated from the outside: a vendor who has never touched the choice is
  // already showing prices, so asking for them again is a re-statement and appends
  // nothing. Nothing is written at open time for this to undo.
  it('appends nothing on a storefront that never hid its prices', async () => {
    openStorefront();

    await handler.execute(TestShowCartePrices.valid());

    expect(store.newEvents()).toEqual([]);
  });

  function openStorefront() {
    store.seedWith('storefront-vendor-id', [{ type: 'StorefrontOpened', payload: { vendorId: 'vendor-id' }, version: 1 }], { vendorId: 'vendor-id' });
  }

  function openStorefrontHidingPrices() {
    store.seedWith('storefront-vendor-id', [
      { type: 'StorefrontOpened', payload: { vendorId: 'vendor-id' }, version: 1 },
      { type: 'CartePricesHidden', payload: {}, version: 1 },
    ], { vendorId: 'vendor-id' });
  }
});
