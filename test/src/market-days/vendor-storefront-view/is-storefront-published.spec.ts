import { InMemoryVendorStorefrontViews, IsStorefrontPublished, IsStorefrontPublishedHandler } from '@market-miam/market-days';

describe('IsStorefrontPublished', () => {
  let views: InMemoryVendorStorefrontViews;
  let handler: IsStorefrontPublishedHandler;

  beforeEach(() => {
    views = new InMemoryVendorStorefrontViews();
    handler = new IsStorefrontPublishedHandler(views);
  });

  it('answers yes for a vendor whose storefront is published', async () => {
    await views.publish('vendor-id');

    expect(await handler.execute(new IsStorefrontPublished('vendor-id'))).toBe(true);
  });

  it('answers no for a vendor whose storefront is not yet published', async () => {
    await views.open('vendor-id');

    expect(await handler.execute(new IsStorefrontPublished('vendor-id'))).toBe(false);
  });

  it('answers no for a vendor with no storefront at all', async () => {
    expect(await handler.execute(new IsStorefrontPublished('vendor-id'))).toBe(false);
  });
});
