import { InMemoryEventStore } from '../../in-memory.event-store';
import {
  EditStorefrontInformationHandler,
  SetStorefrontCoverPhotoHandler,
  StorefrontCoverPhotoSet,
  StorefrontEvent,
  StorefrontInformationEdited,
  Storefronts
} from '@market-monster/market-days';
import { InMemorySubscription } from '../../in-memory.subscription';
import { EventHandlerMap, Projection, StoredEvent } from '@market-monster/event-sourcing';
import { TestEditStorefrontInformation } from '../edit-storefront-information/test-data';
import { TestSetStorefrontCoverPhoto } from '../set-storefront-cover-photo/test-data';
import { vendorIdFrom } from '@market-monster/shared-kernel';

export abstract class StorefrontViews {
  abstract findOrCreateForVendor(vendorId: string): Promise<StorefrontView>;
}

export abstract class StorefrontViewStore {
  abstract setCoverPhoto(vendorId: string, imageReference: string): Promise<void>;
  abstract editInformation(vendorId: string, information: { name: string, description: string }): Promise<void>;
}

export class InMemoryStorefrontViews implements StorefrontViews, StorefrontViewStore {

  private readonly _storefronts: Map<string, StorefrontView> = new Map<string, StorefrontView>();

  async setCoverPhoto(vendorId: string, imageReference: string): Promise<void> {
    const storefront = await this.findOrCreateForVendor(vendorId);
    this._storefronts.set(vendorId, { ...storefront, imageReference });
  }

  async editInformation(vendorId: string, information: { name: string; description: string }): Promise<void> {
    const storefront = await this.findOrCreateForVendor(vendorId);
    this._storefronts.set(vendorId, { ...storefront, ...information });
  }

  findOrCreateForVendor(vendorId: string): Promise<StorefrontView> {
    const storefront = this._storefronts.get(vendorId);
    if (!storefront) {
      const newStorefront = {
        name: '',
        description: '',
        imageReference: ''
      };
      this._storefronts.set(vendorId, newStorefront);
      return Promise.resolve(newStorefront);
    }
    return Promise.resolve(storefront);
  }

}

class StorefrontViewProjection implements Projection {

  private readonly _handlers: EventHandlerMap<StorefrontEvent> = {
    StorefrontCoverPhotoSet: e => this.handleStorefrontCoverPhotoSet(e),
    StorefrontInformationEdited: e => this.handleStorefrontInformationEdited(e)
  };

  constructor(private readonly store: StorefrontViewStore) {

  }

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

export type StorefrontView = {
  name: string;
  description: string;
  imageReference: string;
}

describe('StorefrontView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryStorefrontViews;
  let storefronts: Storefronts;
  let subscription: InMemorySubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryStorefrontViews();
    storefronts = new Storefronts(store);
    subscription = new InMemorySubscription('storefront-view', store, new StorefrontViewProjection(views));
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
