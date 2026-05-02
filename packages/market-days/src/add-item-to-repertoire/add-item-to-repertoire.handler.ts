import { EventStore } from '@market-monster/event-sourcing';
import { AddItemToRepertoire } from './add-item-to-repertoire';
import { ItemAddedToRepertoire } from './item-added-to-repertoire';

export class AddItemToRepertoireHandler {
  constructor(private readonly eventStore: EventStore) {
  }

  async handle(request: AddItemToRepertoire): Promise<void> {
    const streamId = `repertoire-${ request.vendorId }`;
    const event: ItemAddedToRepertoire = {
      type: 'ItemAddedToRepertoire',
      payload: {
        itemId: request.itemId,
        name: request.name,
        description: request.description,
        price: request.price,
        photoUrl: request.photoUrl
      }
    };

    await this.eventStore.append(streamId, event, 0);
  }
}
