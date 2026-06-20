import { VendorStorefrontViewStore } from './vendor-storefront-view.store';
import { EventHandlerMap, Projection, StoredEvent } from '@market-monster/event-sourcing';
import { vendorIdFrom } from '@market-monster/shared-kernel';
import { StorefrontCoverPhotoSet, StorefrontEvent, StorefrontInformationEdited } from '../storefront/events';

export class VendorStorefrontViewProjection implements Projection {

  private readonly _handlers: EventHandlerMap<StorefrontEvent> = {
    StorefrontCoverPhotoSet: e => this.handleStorefrontCoverPhotoSet(e),
    StorefrontInformationEdited: e => this.handleStorefrontInformationEdited(e)
  };

  constructor(private readonly store: VendorStorefrontViewStore) {}

  handle(event: StoredEvent): Promise<void> {
    return this._handlers[event.type as StorefrontEvent['type']](event);
  }

  eventTypes(): string[] {
    return Object.keys(this._handlers);
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
