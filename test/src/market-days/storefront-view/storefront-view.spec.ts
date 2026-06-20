import { InMemoryEventStore } from '../../in-memory.event-store';
import {
  StorefrontCoverPhotoSet,
  StorefrontEvent,
  StorefrontInformationEdited,
  Storefronts
} from '@market-monster/market-days';
import { InMemorySubscription } from '../../in-memory.subscription';
import { EventHandlerMap, Projection, StoredEvent } from '@market-monster/event-sourcing';

export abstract class StorefrontViews {
  abstract forVendor(vendorId: string): Promise<StorefrontView>;
}
export abstract class StorefrontViewStore {
  abstract setCoverPhoto(): Promise<void>;
}

export class InMemoryStorefrontViews implements StorefrontViews, StorefrontViewStore {
  setCoverPhoto(): Promise<void> {
    return Promise.resolve();
  }

  forVendor(vendorId: string): Promise<StorefrontView> {
    return Promise.resolve({
      name: '',
      description: '',
      imageReference: ''
    });
  }

}

class StorefrontViewProjection implements Projection {

  private readonly _handlers: EventHandlerMap<StorefrontEvent> = {
    StorefrontCoverPhotoSet: e => this.handleStorefrontCoverPhotoSet(e),
    StorefrontInformationEdited: e => this.handleStorefrontInformationEdited(e)
  };

  handle(event: StoredEvent): Promise<void> {
    return Promise.resolve();
  }
  eventTypes(): string[] {
    return Object.keys(this._handlers);
  }
  constructor(private readonly store: StorefrontViewStore) {

  }

  private async handleStorefrontCoverPhotoSet(event: StoredEvent): Promise<void> {
    const payload = event.payload as StorefrontCoverPhotoSet['payload'];
    return Promise.resolve();
  }

  private async handleStorefrontInformationEdited(event: StoredEvent): Promise<void> {
    const payload = event.payload as StorefrontInformationEdited['payload'];
    return Promise.resolve();
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
    const view = await views.forVendor('vendor-id');
    expect(view).toEqual({
      name: '',
      description: '',
      imageReference: ''
    });
  });
});
