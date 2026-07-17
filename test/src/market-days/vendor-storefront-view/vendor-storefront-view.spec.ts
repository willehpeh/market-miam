import { VendorScopedEvents } from '@market-miam/market-days';
import {
  InMemoryCheckpoint,
  InMemoryEventStore,
  PollingSubscription,
} from '@market-miam/event-sourcing';
import {
  EditStorefrontInformationHandler,
  InMemoryVendorStorefrontViews,
  OpenStorefrontHandler,
  SetStorefrontCoverPhotoHandler,
  Storefronts,
  VendorStorefrontViewProjection
} from '@market-miam/market-days';
import { TestOpenStorefront } from '../open-storefront/test-data';
import { TestEditStorefrontInformation } from '../edit-storefront-information/test-data';
import { TestSetStorefrontCoverPhoto } from '../set-storefront-cover-photo/test-data';

describe('VendorStorefrontView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryVendorStorefrontViews;
  let storefronts: Storefronts;
  let subscription: PollingSubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryVendorStorefrontViews();
    storefronts = new Storefronts(new VendorScopedEvents(store));
    subscription = new PollingSubscription(store, new VendorStorefrontViewProjection(views), new InMemoryCheckpoint('vendor-storefront-view'));
  });

  it('has no view for a vendor whose storefront has not opened', async () => {
    await subscription.poll();
    expect(await views.findByVendor('vendor-id')).toBeUndefined();
  });

  it('creates an empty view when the storefront opens', async () => {
    await new OpenStorefrontHandler(storefronts).execute(TestOpenStorefront.valid());
    await subscription.poll();
    expect(await views.findByVendor('vendor-id')).toEqual({
      name: '',
      description: '',
      phone: '',
      imageReference: '',
      published: false
    });
  });

  it('reflects the information and cover photo the vendor enters', async () => {
    const vendorId = 'vendor-id';
    const infoCommand = TestEditStorefrontInformation.with({ vendorId });
    const photoCommand = TestSetStorefrontCoverPhoto.with({ vendorId });
    await new OpenStorefrontHandler(storefronts).execute(TestOpenStorefront.valid());
    await new EditStorefrontInformationHandler(storefronts).execute(infoCommand);
    await new SetStorefrontCoverPhotoHandler(storefronts).execute(photoCommand);
    await subscription.poll();
    expect(await views.findByVendor(vendorId)).toEqual({
      name: infoCommand.name,
      description: infoCommand.description,
      phone: infoCommand.phone,
      imageReference: photoCommand.imageReference,
      published: false
    });
  });

  it('marks the view published when the storefront is published', async () => {
    store.seedWith('storefront-vendor-id', [
      { type: 'StorefrontOpened', payload: { vendorId: 'vendor-id' }, version: 1 },
      { type: 'StorefrontPublished', payload: {}, version: 1 },
    ], { vendorId: 'vendor-id' });

    await subscription.poll();

    expect(await views.findByVendor('vendor-id')).toEqual({
      name: '',
      description: '',
      phone: '',
      imageReference: '',
      published: true
    });
  });
});
