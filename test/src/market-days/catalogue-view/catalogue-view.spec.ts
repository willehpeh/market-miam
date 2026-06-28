import { VendorScopedEvents } from '@market-monster/market-days';
import {
  AddItemToCatalogueHandler,
  Catalogues,
  CatalogueViewProjection,
  ChangeItemPrice,
  ChangeItemPriceHandler,
  RetireItemHandler
} from '@market-monster/market-days';
import {
  InMemoryCheckpoint,
  InMemoryEventStore,
  InMemorySubscription,
} from '@market-monster/event-sourcing';
import { TestAddItemToCatalogue } from '../add-item-to-catalogue/test-data';
import { InMemoryCatalogueViews } from './in-memory-catalogue.views';


describe('CatalogueView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryCatalogueViews;
  let catalogues: Catalogues;
  let subscription: InMemorySubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryCatalogueViews();
    subscription = new InMemorySubscription(store, new CatalogueViewProjection(views), new InMemoryCheckpoint('catalogue-view'));
    catalogues = new Catalogues(new VendorScopedEvents(store));
  });

  it('should return an empty catalogue when none are added', async () => {
    await subscription.poll();
    const view = await views.forVendor('vendor-id');
    expect(view).toEqual({ items: [] });
  });

  it('should project items added to the catalogue', async () => {
    const { first, second, vendorId } = await addTwoItems(catalogues);

    await subscription.poll();

    const view = await views.forVendor(vendorId);
    expect(view).toEqual({
      items: [
        { itemId: first.itemId, name: first.name, description: first.description, price: first.price, imageReference: first.imageReference },
        { itemId: second.itemId, name: second.name, description: second.description, price: second.price, imageReference: second.imageReference },
      ],
    });
  });

  it('should show the latest price', async () => {
    const newItemCommand = TestAddItemToCatalogue.valid();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);
    await new ChangeItemPriceHandler(catalogues).execute(new ChangeItemPrice(newItemCommand.itemId, newItemCommand.price + 300, newItemCommand.vendorId));

    await subscription.poll();
    const view = await views.forVendor(newItemCommand.vendorId);
    expect(view).toEqual({
      items: [
        { itemId: newItemCommand.itemId, name: newItemCommand.name, description: newItemCommand.description, price: newItemCommand.price + 300, imageReference: newItemCommand.imageReference },
      ],
    });
  });

  it('should retire the item', async () => {
    const { first, second, vendorId } = await addTwoItems(catalogues);
    await new RetireItemHandler(catalogues).execute(first);

    await subscription.poll();
    const view = await views.forVendor(vendorId);
    expect(view).toEqual({
      items: [
        { itemId: second.itemId, name: second.name, description: second.description, price: second.price, imageReference: second.imageReference }
      ],
    })
  });
});

async function addTwoItems(catalogues: Catalogues) {
  const first = TestAddItemToCatalogue.valid();
  const second = TestAddItemToCatalogue.with({ itemId: 'second-item', name: 'Second Item' });
  const vendorId = first.vendorId;
  const addItemHandler = new AddItemToCatalogueHandler(catalogues);
  await addItemHandler.execute(first);
  await addItemHandler.execute(second);
  return { first, second, vendorId };
}
