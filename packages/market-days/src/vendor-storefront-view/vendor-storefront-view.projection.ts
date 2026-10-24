import { VendorStorefrontViewStore } from './vendor-storefront-view.store';
import { CheckpointedProjection, EventHandlerMap, ProjectionFor, StoredEvent } from '@market-miam/event-sourcing';
import { vendorIdFrom } from '@market-miam/shared-kernel';
import { StorefrontCoverPhotoSet, StorefrontEvent, StorefrontInformationEdited } from '../storefront/events';
import { VendorErased } from '../vendor/events';

@CheckpointedProjection('vendor-storefront-view')
export class VendorStorefrontViewProjection extends ProjectionFor<StorefrontEvent | VendorErased> {

  constructor(private readonly store: VendorStorefrontViewStore) {
    super();
  }

  protected handlers(): EventHandlerMap<StorefrontEvent | VendorErased> {
    return {
      StorefrontOpened: e => this.handleStorefrontOpened(e),
      StorefrontCoverPhotoSet: e => this.handleStorefrontCoverPhotoSet(e),
      StorefrontInformationEdited: e => this.handleStorefrontInformationEdited(e),
      StorefrontPublished: e => this.store.publish(vendorIdFrom(e)),
      CartePricesHidden: e => this.store.setCartePricesVisible(vendorIdFrom(e), false),
      CartePricesShown: e => this.store.setCartePricesVisible(vendorIdFrom(e), true),
      VendorErased: e => this.store.remove(vendorIdFrom(e)),
    };
  }

  reset(): Promise<void> {
    return this.store.clear();
  }

  private async handleStorefrontOpened(event: StoredEvent): Promise<void> {
    return this.store.open(vendorIdFrom(event));
  }

  private async handleStorefrontCoverPhotoSet(event: StoredEvent<StorefrontCoverPhotoSet>): Promise<void> {
    return this.store.setCoverPhoto(vendorIdFrom(event), event.payload.imageReference);
  }

  private async handleStorefrontInformationEdited(event: StoredEvent<StorefrontInformationEdited>): Promise<void> {
    return this.store.editInformation(vendorIdFrom(event), event.payload);
  }
}
