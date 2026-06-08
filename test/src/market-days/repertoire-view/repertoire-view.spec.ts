import {
  AddItemToRepertoireHandler,
  ChangeItemPrice,
  ChangeItemPriceHandler,
  Catalogues,
  CatalogueViewProjection
} from '@market-monster/market-days';
import { InMemoryEventStore } from '../../in-memory.event-store';
import { InMemorySubscription } from '../../in-memory.subscription';
import { TestAddItemToRepertoire } from '../add-item-to-repertoire/test-data';
import { InMemoryRepertoireViews } from './in-memory-repertoire.views';


describe('RepertoireView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryRepertoireViews;
  let repertoires: Catalogues;
  let subscription: InMemorySubscription;
  let addItemHandler: AddItemToRepertoireHandler;
  let changeItemPriceHandler: ChangeItemPriceHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryRepertoireViews();
    subscription = new InMemorySubscription('repertoire-view', store, new CatalogueViewProjection(views));
    repertoires = new Catalogues(store);
    addItemHandler = new AddItemToRepertoireHandler(repertoires);
    changeItemPriceHandler = new ChangeItemPriceHandler(repertoires);
  });

  it('should return an empty repertoire when none are added', async () => {
    await subscription.poll();
    const view = await views.forVendor('vendor-id');
    expect(view).toEqual({ items: [] });
  });

  it('should project items added to the repertoire', async () => {
    const { first, second } = await addTwoItems(addItemHandler);

    await subscription.poll();

    const view = await views.forVendor('vendor-id');
    expect(view).toEqual({
      items: [
        { itemId: first.itemId, name: first.name, description: first.description, price: first.price, photoUrl: first.photoUrl },
        { itemId: second.itemId, name: second.name, description: second.description, price: second.price, photoUrl: second.photoUrl },
      ],
    });
  });

  it('should show the latest price', async () => {
    const newItemCommand = TestAddItemToRepertoire.valid();
    await addItemHandler.execute(newItemCommand);
    await changeItemPriceHandler.execute(new ChangeItemPrice(newItemCommand.itemId, newItemCommand.price + 300, newItemCommand.vendorId));

    await subscription.poll();
    const view = await views.forVendor('vendor-id');
    expect(view).toEqual({
      items: [
        { itemId: newItemCommand.itemId, name: newItemCommand.name, description: newItemCommand.description, price: newItemCommand.price + 300, photoUrl: newItemCommand.photoUrl },
      ],
    });
  });
});

async function addTwoItems(addItemHandler: AddItemToRepertoireHandler) {
  const first = TestAddItemToRepertoire.valid();
  const second = TestAddItemToRepertoire.with({ itemId: 'second-item', name: 'Second Item' });
  await addItemHandler.execute(first);
  await addItemHandler.execute(second);
  return { first, second };
}
