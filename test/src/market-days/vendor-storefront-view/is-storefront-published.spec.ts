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
});
