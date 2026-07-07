import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { VendorScopedEvents } from '@market-miam/market-days';
import {
  AddItemToCatalogueHandler,
  ChangeItemPrice,
  ChangeItemPriceHandler,
  ItemPriceChanged,
  NoSuchItemError,
  Catalogues
} from '@market-miam/market-days';
import { TestAddItemToCatalogue } from '../add-item-to-catalogue/test-data';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Change Item Price', () => {
  let store: InMemoryEventStore;
  let catalogues: Catalogues;
  let handler: ChangeItemPriceHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    catalogues = new Catalogues(new VendorScopedEvents(store));
    handler = new ChangeItemPriceHandler(catalogues);
  });

  it('should change the price of an existing item', async () => {
    const baseItem = TestAddItemToCatalogue.valid();
    await new AddItemToCatalogueHandler(catalogues).execute(baseItem);

    const command = new ChangeItemPrice(baseItem.itemId, baseItem.price + 20, baseItem.vendorId);
    await handler.execute(command);

    const actual = store.lastEvent();
    const expected: ItemPriceChanged = {
      type: 'ItemPriceChanged',
      payload: {
        itemId: baseItem.itemId,
        price: baseItem.price + 20
      },
      version: 1
    };
    expect(actual).toEqual(expect.objectContaining(expected));
  });

  it('stamps the vendor id into the event metadata', async () => {
    const baseItem = TestAddItemToCatalogue.valid();
    await new AddItemToCatalogueHandler(catalogues).execute(baseItem);
    await handler.execute(new ChangeItemPrice(baseItem.itemId, baseItem.price + 20, baseItem.vendorId));

    expectVendorScopedEvents(store.newEvents(), 'vendor-id');
  });

  it('should change the price multiple times', async () => {
    const baseItem = TestAddItemToCatalogue.valid();
    await new AddItemToCatalogueHandler(catalogues).execute(baseItem);

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
      },
      version: 1
    };
    expect(actual).toEqual(expect.objectContaining(expected));
  });

  it('should reject an inexistent item', async () => {
    const baseItem = TestAddItemToCatalogue.valid();
    await new AddItemToCatalogueHandler(catalogues).execute(baseItem);

    const command = new ChangeItemPrice('incorrect-id', baseItem.price + 20, baseItem.vendorId);
    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
  });
});

