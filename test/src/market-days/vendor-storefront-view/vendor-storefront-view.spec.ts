import { InMemoryEventStore } from '../../in-memory.event-store';
import {
  EditStorefrontInformationHandler,
  SetStorefrontCoverPhotoHandler,
  Storefronts,
  VendorStorefrontViewProjection
} from '@market-monster/market-days';
import { InMemorySubscription } from '../../in-memory.subscription';
import { InMemoryCheckpoint } from '../../in-memory.checkpoint';
import { TestEditStorefrontInformation } from '../edit-storefront-information/test-data';
import { TestSetStorefrontCoverPhoto } from '../set-storefront-cover-photo/test-data';
import { InMemoryVendorStorefrontViews } from './in-memory-vendor-storefront.views';

describe('VendorStorefrontView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryVendorStorefrontViews;
  let storefronts: Storefronts;
  let subscription: InMemorySubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryVendorStorefrontViews();
    storefronts = new Storefronts(store);
    subscription = new InMemorySubscription(store, new VendorStorefrontViewProjection(views), new InMemoryCheckpoint('vendor-storefront-view'));
  });

  it('should return an empty storefront if the vendor has not entered anything yet', async () => {
    await subscription.poll();
    const view = await views.findOrCreateForVendor('vendor-id');
    expect(view).toEqual({
      name: '',
      description: '',
      imageReference: ''
    });
  });

  it('should return a storefront with the information entered by the vendor', async () => {
    const vendorId = 'vendor-id';
    const infoCommand = TestEditStorefrontInformation.with({ vendorId });
    const photoCommand = TestSetStorefrontCoverPhoto.with({ vendorId });
    await new EditStorefrontInformationHandler(storefronts).execute(infoCommand);
    await new SetStorefrontCoverPhotoHandler(storefronts).execute(photoCommand);
    await subscription.poll();
    const view = await views.findOrCreateForVendor(vendorId);
    expect(view).toEqual({
      name: infoCommand.name,
      description: infoCommand.description,
      imageReference: photoCommand.imageReference
    });
  });
});
