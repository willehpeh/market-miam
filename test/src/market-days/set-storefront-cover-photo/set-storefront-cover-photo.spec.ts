import { InMemoryEventStore } from '../../in-memory.event-store';
import { Aggregate, DomainEvent, EventStore } from '@market-monster/event-sourcing';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TestSetStorefrontCoverPhoto } from './test-data';
import { VendorId } from '@market-monster/shared-kernel';
import { ImageReference } from '@market-monster/common';

export type StorefrontCoverPhotoSet = DomainEvent<
  'StorefrontCoverPhotoSet',
  { imageReference: string }
>;

export type StorefrontEvent = StorefrontCoverPhotoSet;

export abstract class CoverPhoto {
  abstract sameAs(imageReference: ImageReference): boolean;
}

export class SetCoverPhoto implements CoverPhoto {
  constructor(private _imageReference: ImageReference) {}

  sameAs(imageReference: ImageReference): boolean {
    return this._imageReference.value() === imageReference.value();
  }
}

export class NoCoverPhoto {
  sameAs(): boolean {
    return false;
  }
}

export class Storefront extends Aggregate {

  private _coverPhoto: CoverPhoto = new NoCoverPhoto();

  apply(event: StorefrontEvent): void {
    switch (event.type) {
      case 'StorefrontCoverPhotoSet':
        this._coverPhoto = new SetCoverPhoto(new ImageReference(event.payload.imageReference));
        break;
    }
  }

  setCoverPhoto(imageReference: ImageReference) {
    if (this._coverPhoto.sameAs(imageReference)) {
      return;
    }
    const event: StorefrontCoverPhotoSet = {
      type: 'StorefrontCoverPhotoSet',
      payload: { imageReference: imageReference.value() }
    };
    this.raise(event);
  }
}

export class StoreFronts {
  constructor(private readonly store: EventStore) {
  }

  async forVendor(vendorId: VendorId) {
    const events = await this.store.load(this.streamIdFor(vendorId));
    return new Storefront().rehydrate(events);
  }

  async save(storefront: Storefront, vendorId: VendorId) {
    await this.store.append(
      this.streamIdFor(vendorId),
      storefront.raisedEvents(),
      storefront.currentStreamPosition(),
      { vendorId: vendorId.value() }
    );
  }

  private streamIdFor(vendorId: VendorId) {
    return `storefront-${ vendorId.value() }`;
  }
}

export class SetStorefrontCoverPhoto extends Command<void> {
  constructor(public readonly vendorId: string,
              public readonly imageReference: string) {
    super();
  }
}

@CommandHandler(SetStorefrontCoverPhoto)
export class SetStorefrontCoverPhotoHandler implements ICommandHandler<SetStorefrontCoverPhoto> {
  constructor(private readonly storefronts: StoreFronts) {

  }

  async execute(command: SetStorefrontCoverPhoto): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const storefront = await this.storefronts.forVendor(vendorId);
    storefront.setCoverPhoto(new ImageReference(command.imageReference));
    await this.storefronts.save(storefront, vendorId);
  }


}

describe('Set Storefront Cover Photo', () => {
  let store: InMemoryEventStore;
  let storefronts: StoreFronts;
  let handler: SetStorefrontCoverPhotoHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    storefronts = new StoreFronts(store);
    handler = new SetStorefrontCoverPhotoHandler(storefronts);
  });

  it('should set the cover photo for the given vendor', async () => {
    const command = TestSetStorefrontCoverPhoto.valid();
    await handler.execute(command);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'StorefrontCoverPhotoSet',
      payload: {
        imageReference: command.imageReference
      }
    })]);
  });

  it('should do nothing if the same image is submitted', async () => {
    const command = TestSetStorefrontCoverPhoto.valid();
    await handler.execute(command);
    await handler.execute(command);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'StorefrontCoverPhotoSet',
      payload: {
        imageReference: command.imageReference
      }
    })]);
  });
});
