import { FindVendorCatalogue, FindVendorCatalogueHandler, InMemoryCatalogueViews } from '@market-miam/market-days';

describe('FindVendorCatalogue', () => {
  let views: InMemoryCatalogueViews;
  let handler: FindVendorCatalogueHandler;

  beforeEach(() => {
    views = new InMemoryCatalogueViews();
    handler = new FindVendorCatalogueHandler(views);
  });

  it('returns an empty catalogue for a vendor with no items', async () => {
    expect(await handler.execute(new FindVendorCatalogue('vendor-id'))).toEqual({ items: [] });
  });

  it('returns the queried vendor catalogue', async () => {
    const item = { itemId: 'item-1', name: 'Bœuf bourguignon', description: 'Mijoté maison', price: 1300, imageReference: 'market-miam/items/item-photo' };
    await views.addItemToCatalogue(item, 'vendor-id');

    expect(await handler.execute(new FindVendorCatalogue('vendor-id'))).toEqual({ items: [item] });
  });

  it('scopes the catalogue to the queried vendor', async () => {
    await views.addItemToCatalogue({ itemId: 'item-1', name: 'A', description: '', price: 100, imageReference: 'ref' }, 'vendor-a');

    expect(await handler.execute(new FindVendorCatalogue('vendor-b'))).toEqual({ items: [] });
  });
});
