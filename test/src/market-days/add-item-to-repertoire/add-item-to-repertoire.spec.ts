import {
  AddItemToRepertoireHandler,
  InvalidPriceError,
  ItemAddedToCatalogue,
  Catalogues
} from '@market-monster/market-days';
import { EmptyValueError } from '@market-monster/common';
import { InMemoryEventStore } from '../../in-memory.event-store';
import { TestAddItemToRepertoire } from './test-data';

describe('AddItemToRepertoire', () => {
  let store: InMemoryEventStore;
  let handler: AddItemToRepertoireHandler;
  let repertoires: Catalogues;

  beforeEach(() => {
    store = new InMemoryEventStore();
    repertoires = new Catalogues(store);
    handler = new AddItemToRepertoireHandler(repertoires);
  });

  it('should add the item to the repertoire', async () => {
    const command = TestAddItemToRepertoire.valid();

    await handler.execute(command);

    const expectedEvent: ItemAddedToCatalogue = {
      type: 'ItemAddedToRepertoire',
      payload: {
        itemId: command.itemId,
        name: command.name,
        description: command.description,
        price: command.price,
        photoUrl: command.photoUrl,
      },
    };
    expect(store.newEvents()).toEqual([expect.objectContaining(expectedEvent)]);
  });

  it('should allow free items', async () => {
    await handler.execute(TestAddItemToRepertoire.with({ price: 0 }));

    expect(store.newEvents()).toHaveLength(1);
    expect(store.newEvents()[0].payload['price']).toBe(0);
  });

  it('should allow an empty description', async () => {
    await handler.execute(TestAddItemToRepertoire.with({ description: '' }));

    expect(store.newEvents()).toHaveLength(1);
    expect(store.newEvents()[0].payload['description']).toBe('');
  });

  it('should add a new item to an existing repertoire', async () => {
    await handler.execute(TestAddItemToRepertoire.valid());
    await handler.execute(TestAddItemToRepertoire.with({ name: 'new-name' }));

    expect(store.newEvents()).toHaveLength(2);
    expect(store.newEvents()[1].payload['name']).toBe('new-name');
  });

  describe('rejects invalid input', () => {
    it.each([
      '',
      '   ',
    ])('should reject an empty item ID: "%s"', async (itemId) => {
      await expect(handler.execute(TestAddItemToRepertoire.with({ itemId }))).rejects.toThrow(EmptyValueError);
    });

    it.each([
      '',
      '   ',
    ])('should reject an empty item name: "%s"', async (name) => {
      await expect(handler.execute(TestAddItemToRepertoire.with({ name }))).rejects.toThrow(EmptyValueError);
    });

    it('should reject a negative price', async () => {
      await expect(handler.execute(TestAddItemToRepertoire.with({ price: -100 }))).rejects.toThrow(InvalidPriceError);
    });

  });
});
