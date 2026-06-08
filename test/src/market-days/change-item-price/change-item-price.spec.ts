import { InMemoryEventStore } from '../../in-memory.event-store';
import {
  AddItemToCatalogueHandler,
  ChangeItemPrice,
  ChangeItemPriceHandler,
  ItemPriceChanged,
  NoSuchItemError,
  Catalogues
} from '@market-monster/market-days';
import { TestAddItemToRepertoire } from '../add-item-to-repertoire/test-data';

describe('Change Item Price', () => {
  let store: InMemoryEventStore;
  let repertoires: Catalogues;
  let handler: ChangeItemPriceHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    repertoires = new Catalogues(store);
    handler = new ChangeItemPriceHandler(repertoires);
  });

  it('should change the price of an existing item', async () => {
    const baseItem = TestAddItemToRepertoire.valid();
    await new AddItemToCatalogueHandler(repertoires).execute(baseItem);

    const command = new ChangeItemPrice(baseItem.itemId, baseItem.price + 20, baseItem.vendorId);
    await handler.execute(command);

    const actual = store.lastEvent();
    const expected: ItemPriceChanged = {
      type: 'ItemPriceChanged',
      payload: {
        itemId: baseItem.itemId,
        price: baseItem.price + 20
      }
    };
    expect(actual).toEqual(expect.objectContaining(expected));
  });

  it('should change the price multiple times', async () => {
    const baseItem = TestAddItemToRepertoire.valid();
    await new AddItemToCatalogueHandler(repertoires).execute(baseItem);

    const command = new ChangeItemPrice(baseItem.itemId, baseItem.price + 20, baseItem.vendorId);
    await handler.execute(command);

    const newCommand = new ChangeItemPrice(baseItem.itemId, baseItem.price + 40, baseItem.vendorId);
    await handler.execute(newCommand);

    const actual = store.lastEvent();
    const expected: ItemPriceChanged = {
      type: 'ItemPriceChanged',
      payload: {
        itemId: baseItem.itemId,
        price: baseItem.price + 40
      }
    };
    expect(actual).toEqual(expect.objectContaining(expected));
  });

  it('should reject an inexistent item', async () => {
    const baseItem = TestAddItemToRepertoire.valid();
    await new AddItemToCatalogueHandler(repertoires).execute(baseItem);

    const command = new ChangeItemPrice('incorrect-id', baseItem.price + 20, baseItem.vendorId);
    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
  });
});

