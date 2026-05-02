import { EventStore } from '@market-monster/event-sourcing';
import { AddItemToRepertoire } from './add-item-to-repertoire';
import { Repertoire } from '../repertoire/repertoire';

export class AddItemToRepertoireHandler {
  constructor(private readonly eventStore: EventStore) {
  }

  async handle(request: AddItemToRepertoire): Promise<void> {
    const streamId = `repertoire-${ request.vendorId }`;
    const repertoire = new Repertoire();
    repertoire.addItem(request.itemId, request.name, request.description, request.price, request.photoUrl);

    await this.eventStore.append(streamId, repertoire.raisedEvents(), 0);
  }
}
