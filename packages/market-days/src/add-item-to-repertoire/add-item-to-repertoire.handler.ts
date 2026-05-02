import { EventStore } from '@market-monster/event-sourcing';
import { Url } from '@market-monster/common';
import { AddItemToRepertoire } from './add-item-to-repertoire';
import { Repertoire } from '../repertoire/repertoire';
import { ItemDescription, ItemId, ItemName, ItemPrice } from '../repertoire/item';

export class AddItemToRepertoireHandler {
  constructor(private readonly eventStore: EventStore) {
  }

  async handle(request: AddItemToRepertoire): Promise<void> {
    const streamId = `repertoire-${ request.vendorId }`;
    const repertoire = new Repertoire();
    repertoire.addItem(
      new ItemId(request.itemId),
      new ItemName(request.name),
      new ItemDescription(request.description),
      new ItemPrice(request.price),
      new Url(request.photoUrl),
    );

    await this.eventStore.append(streamId, repertoire.raisedEvents(), 0);
  }
}
