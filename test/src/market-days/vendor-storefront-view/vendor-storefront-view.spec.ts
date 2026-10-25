import {
  DomainEvent,
  InMemoryCheckpoint,
  InMemoryEventStore,
  PollingSubscription,
} from '@market-miam/event-sourcing';
import { InMemoryVendorStorefrontViews, VendorStorefrontViewProjection } from '@market-miam/market-days';
import { TestEditStorefrontInformation } from '../edit-storefront-information/test-data';
import { TestSetStorefrontCoverPhoto } from '../set-storefront-cover-photo/test-data';
import {
  cartePricesHidden,
  cartePricesShown,
  storefrontCoverPhotoSet,
  storefrontInformationEdited,
  storefrontOpened,
  storefrontPublished,
  storefrontStream,
} from '../storefront-events';
import { vendorErased, vendorStream } from '../vendor-events';

describe('VendorStorefrontView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryVendorStorefrontViews;
  let projection: VendorStorefrontViewProjection;
  let subscription: PollingSubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryVendorStorefrontViews();
    projection = new VendorStorefrontViewProjection(views);
    subscription = new PollingSubscription(store, projection, new InMemoryCheckpoint('vendor-storefront-view'));
  });

  // What vendor-id's storefront already holds.
  const given = (...history: DomainEvent[]): void =>
    store.seedWith(storefrontStream('vendor-id'), history, { vendorId: 'vendor-id' });

  it('has no view for a vendor whose storefront has not opened', async () => {
    await subscription.poll();
    expect(await views.findByVendor('vendor-id')).toBeUndefined();
  });

  it('creates an empty view when the storefront opens', async () => {
    given(storefrontOpened());
    await subscription.poll();
    expect(await views.findByVendor('vendor-id')).toEqual({
      name: '',
      description: '',
      phone: '',
      imageReference: '',
      published: false,
      cartePricesVisible: true
    });
  });

  it('reflects the information and cover photo the vendor enters', async () => {
    const vendorId = 'vendor-id';
    const infoCommand = TestEditStorefrontInformation.with({ vendorId });
    const photoCommand = TestSetStorefrontCoverPhoto.with({ vendorId });
    given(storefrontOpened(), storefrontInformationEdited(), storefrontCoverPhotoSet());
    await subscription.poll();
    expect(await views.findByVendor(vendorId)).toEqual({
      name: infoCommand.name,
      description: infoCommand.description,
      phone: infoCommand.phone,
      imageReference: photoCommand.imageReference,
      published: false,
      cartePricesVisible: true
    });
  });

  it('marks the view published when the storefront is published', async () => {
    given(storefrontOpened(), storefrontPublished());

    await subscription.poll();

    expect(await views.findByVendor('vendor-id')).toEqual({
      name: '',
      description: '',
      phone: '',
      imageReference: '',
      published: true,
      cartePricesVisible: true
    });
  });

  // The opt-in, as the read model sees it: a storefront that has never touched the choice
  // reads as showing prices, so the view says so without any event having said it.
  it('reads a storefront that never chose as showing its carte prices', async () => {
    given(storefrontOpened());

    await subscription.poll();

    expect(await views.findByVendor('vendor-id')).toMatchObject({ cartePricesVisible: true });
  });

  it('hides the carte prices when the vendor hides them, and restores them', async () => {
    given(storefrontOpened(), cartePricesHidden());
    await subscription.poll();
    expect(await views.findByVendor('vendor-id')).toMatchObject({ cartePricesVisible: false });

    given(cartePricesShown());
    await subscription.poll();

    expect(await views.findByVendor('vendor-id')).toMatchObject({ cartePricesVisible: true });
  });

  // The erased vendor's PII is plaintext here (model A). A rebuild replays it as SHREDDED
  // and then this event again, so the view stays gone.
  it('drops the view of an erased vendor', async () => {
    given(storefrontOpened());
    store.seedWith(vendorStream('vendor-id'), [vendorErased('vendor-id')], { vendorId: 'vendor-id' });

    await subscription.poll();

    expect(await views.findByVendor('vendor-id')).toBeUndefined();
  });

  it('resets by clearing the read model so a replay rebuilds it from zero', async () => {
    given(storefrontOpened());
    await subscription.poll();
    expect(await views.findByVendor('vendor-id')).toBeDefined();

    await projection.reset();

    expect(await views.findByVendor('vendor-id')).toBeUndefined();
  });
});
