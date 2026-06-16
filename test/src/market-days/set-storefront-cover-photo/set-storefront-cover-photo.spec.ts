import { InMemoryEventStore } from '../../in-memory.event-store';
import { EventStore } from '@market-monster/event-sourcing';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TestSetStorefrontCoverPhoto } from './test-data';

export class StoreFronts {
  constructor(private readonly store: EventStore) {}
}

export class SetStorefrontCoverPhoto extends Command<void> {
  constructor(public readonly vendorId: string,
              public readonly imageReference: string) {
    super();
  }
}

@CommandHandler(SetStorefrontCoverPhoto)
export class SetStorefrontCoverPhotoHandler implements ICommandHandler<SetStorefrontCoverPhoto> {
  constructor(private readonly storefronts: StoreFronts,
              private readonly store: EventStore) {

  }

  async execute(command: SetStorefrontCoverPhoto): Promise<void> {
    return this.store.append(
      command.vendorId,
      [{ type: 'StorefrontCoverPhotoSet', payload: { imageReference: command.imageReference } }],
      0
    );
  }


}

describe('Set Storefront Cover Photo', () => {
  let store: InMemoryEventStore;
  let storefronts: StoreFronts;
  let handler: SetStorefrontCoverPhotoHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    storefronts = new StoreFronts(store);
    handler = new SetStorefrontCoverPhotoHandler(storefronts, store);
  });

  it('should set the cover photo for the given vendor', async () => {
    const command = TestSetStorefrontCoverPhoto.valid();
    await handler.execute(command);

    const event = store.newEvents()[0];
    expect(event).toEqual(expect.objectContaining({
      type: 'StorefrontCoverPhotoSet',
      payload: {
        imageReference: command.imageReference
      }
    }));
  });
});
