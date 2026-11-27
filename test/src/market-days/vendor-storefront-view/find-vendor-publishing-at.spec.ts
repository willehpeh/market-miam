import {
  FindVendorPublishingAt,
  FindVendorPublishingAtHandler,
  InMemorySubdomainRegistry,
  InMemoryVendorStorefrontViews,
} from '@market-miam/market-days';

describe('FindVendorPublishingAt', () => {
  let registry: InMemorySubdomainRegistry;
  let views: InMemoryVendorStorefrontViews;
  let handler: FindVendorPublishingAtHandler;

  beforeEach(() => {
    registry = new InMemorySubdomainRegistry();
    views = new InMemoryVendorStorefrontViews();
    handler = new FindVendorPublishingAtHandler(registry, views);
  });

  it('answers the vendor whose storefront at the subdomain is published', async () => {
    await registry.register('acme-bakery', 'vendor-id');
    await views.publish('vendor-id');

    expect(await handler.execute(new FindVendorPublishingAt('acme-bakery'))).toBe('vendor-id');
  });

  it.each<[string, () => Promise<unknown>]>([
    ['a storefront opened but not yet published', () => registry.register('acme-bakery', 'vendor-id').then(() => views.open('vendor-id'))],
    ['a subdomain assigned to no vendor', async () => undefined],
  ])('answers no one for %s', async (_, arrange) => {
    await arrange();

    expect(await handler.execute(new FindVendorPublishingAt('acme-bakery'))).toBeUndefined();
  });
});
