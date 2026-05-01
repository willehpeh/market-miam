import { AddItemToRepertoire, AddItemToRepertoireHandler, ItemAddedToRepertoire } from '@market-monster/market-days';
import { InMemoryEventStore } from './in-memory.event-store';

describe('AddItemToRepertoire', () => {
  let eventStore: InMemoryEventStore;
  let handler: AddItemToRepertoireHandler;
  let request: AddItemToRepertoire;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    handler = new AddItemToRepertoireHandler(eventStore);
  });

  it('should add the item to the repertoire', async () => {
    request = {
      id: 'item-id',
      repertoireId: 'repertoire-id',
      name: 'Item Name',
      description: 'Item Description',
      price: 500,
      photoUrl: 'https://example.com/item-photo.jpg'
    };

    await handler.handle(request);

    const expectedEvent: ItemAddedToRepertoire = {
      type: "ItemAddedToRepertoire",
      payload: {
        id: request.id,
        repertoireId: request.repertoireId,
        name: request.name,
        description: request.description,
        price: request.price,
        photoUrl: request.photoUrl
      }

    }
    expect(eventStore.events).toEqual([expectedEvent]);
  });

});
