import { VendorStorefrontViewStore } from './vendor-storefront-view.store';
import { CheckpointedProjection, EventHandlerMap, ProjectionFor, StoredEvent } from '@market-miam/event-sourcing';
import { vendorIdFrom } from '@market-miam/shared-kernel';
import { StorefrontCoverPhotoSet, StorefrontEvent, StorefrontInformationEdited } from '../storefront/events';

@CheckpointedProjection('vendor-storefront-view')
export class VendorStorefrontViewProjection extends ProjectionFor<StorefrontEvent> {

  constructor(private readonly store: VendorStorefrontViewStore) {
    super();
  }

  protected handlers(): EventHandlerMap<StorefrontEvent> {
    return {
      StorefrontOpened: e => this.handleStorefrontOpened(e),
      StorefrontCoverPhotoSet: e => this.handleStorefrontCoverPhotoSet(e),
      StorefrontInformationEdited: e => this.handleStorefrontInformationEdited(e),
      StorefrontPublished: e => this.store.publish(vendorIdFrom(e))
    };
  }

  override reset(): Promise<void> {
    return this.store.clear();
  }

  private async handleStorefrontOpened(event: StoredEvent): Promise<void> {
    return this.store.open(vendorIdFrom(event));
  }

  private async handleStorefrontCoverPhotoSet(event: StoredEvent): Promise<void> {
    const payload = event.payload as StorefrontCoverPhotoSet['payload'];
    return this.store.setCoverPhoto(vendorIdFrom(event), payload.imageReference);
  }

  private async handleStorefrontInformationEdited(event: StoredEvent): Promise<void> {
    const payload = event.payload as StorefrontInformationEdited['payload'];
    return this.store.editInformation(vendorIdFrom(event), payload);
  }
}
