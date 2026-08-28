import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { ShowCartePricesHandler, Storefronts, VendorScopedEvents } from '@market-miam/market-days';
import { TestShowCartePrices } from './test-data';

describe('Show Carte Prices', () => {
  let store: InMemoryEventStore;
  let handler: ShowCartePricesHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new ShowCartePricesHandler(new Storefronts(new VendorScopedEvents(store)));
  });

  it('puts the prices back on a carte that was hiding them', async () => {
    openStorefrontHidingPrices();

    await handler.execute(TestShowCartePrices.valid());

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'CartePricesShown',
      payload: {}
    })]);
  });

  function openStorefrontHidingPrices() {
    store.seedWith('storefront-vendor-id', [
      { type: 'StorefrontOpened', payload: { vendorId: 'vendor-id' }, version: 1 },
      { type: 'CartePricesHidden', payload: {}, version: 1 },
    ], { vendorId: 'vendor-id' });
  }
});
