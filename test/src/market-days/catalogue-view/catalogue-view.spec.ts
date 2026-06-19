import {
  AddItemToCatalogueHandler,
  ChangeItemPrice,
  ChangeItemPriceHandler,
  Catalogues,
  CatalogueViewProjection, RetireItemHandler
} from '@market-monster/market-days';
import { InMemoryEventStore } from '../../in-memory.event-store';
import { InMemorySubscription } from '../../in-memory.subscription';
import { TestAddItemToCatalogue } from '../add-item-to-catalogue/test-data';
import { InMemoryCatalogueViews } from './in-memory-catalogue.views';


describe('CatalogueView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryCatalogueViews;
  let catalogues: Catalogues;
  let subscription: InMemorySubscription;
  let addItemHandler: AddItemToCatalogueHandler;
  let changeItemPriceHandler: ChangeItemPriceHandler;
  let retireItemHandler: RetireItemHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryCatalogueViews();
    subscription = new InMemorySubscription('catalogue-view', store, new CatalogueViewProjection(views));
    catalogues = new Catalogues(store);
    addItemHandler = new AddItemToCatalogueHandler(catalogues);
    changeItemPriceHandler = new ChangeItemPriceHandler(catalogues);
    retireItemHandler = new RetireItemHandler(catalogues);
  });

  it('should return an empty catalogue when none are added', async () => {
    await subscription.poll();
    const view = await views.forVendor('vendor-id');
    expect(view).toEqual({ items: [] });
  });

  it('should project items added to the catalogue', async () => {
    const { first, second } = await addTwoItems(addItemHandler);

    await subscription.poll();

    const view = await views.forVendor('vendor-id');
    expect(view).toEqual({
      items: [
        { itemId: first.itemId, name: first.name, description: first.description, price: first.price, imageReference: first.imageReference },
        { itemId: second.itemId, name: second.name, description: second.description, price: second.price, imageReference: second.imageReference },
      ],
    });
  });

  it('should show the latest price', async () => {
    const newItemCommand = TestAddItemToCatalogue.valid();
    await addItemHandler.execute(newItemCommand);
    await changeItemPriceHandler.execute(new ChangeItemPrice(newItemCommand.itemId, newItemCommand.price + 300, newItemCommand.vendorId));

    await subscription.poll();
    const view = await views.forVendor(newItemCommand.vendorId);
    expect(view).toEqual({
      items: [
        { itemId: newItemCommand.itemId, name: newItemCommand.name, description: newItemCommand.description, price: newItemCommand.price + 300, imageReference: newItemCommand.imageReference },
      ],
    });
  });

  it('should retire the item', async () => {
    const { first, second } = await addTwoItems(addItemHandler);
    await retireItemHandler.execute(first);

    await subscription.poll();
    const view = await views.forVendor(first.vendorId);
    expect(view).toEqual({
      items: [
        { itemId: second.itemId, name: second.name, description: second.description, price: second.price, imageReference: second.imageReference }
      ],
    })
  });
});

async function addTwoItems(addItemHandler: AddItemToCatalogueHandler) {
  const first = TestAddItemToCatalogue.valid();
  const second = TestAddItemToCatalogue.with({ itemId: 'second-item', name: 'Second Item' });
  await addItemHandler.execute(first);
  await addItemHandler.execute(second);
  return { first, second };
}
