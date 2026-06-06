import { AddItemToRepertoireHandler, Repertoires, RepertoireViewProjection } from '@market-monster/market-days';
import { InMemoryEventStore } from '../../in-memory.event-store';
import { InMemorySubscription } from '../../in-memory.subscription';
import { TestAddItemToRepertoire } from '../add-item-to-repertoire/test-data';
import { InMemoryRepertoireViews } from './in-memory-repertoire.views';


describe('RepertoireView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryRepertoireViews;
  let subscription: InMemorySubscription;
  let addItemHandler: AddItemToRepertoireHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryRepertoireViews();
    subscription = new InMemorySubscription('repertoire-view', store, new RepertoireViewProjection(views));
    addItemHandler = new AddItemToRepertoireHandler(new Repertoires(store));
  });

  it('projects items added to the repertoire', async () => {
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
});

async function addTwoItems(addItemHandler: AddItemToRepertoireHandler) {
  const first = TestAddItemToRepertoire.valid();
  const second = TestAddItemToRepertoire.with({ itemId: 'second-item', name: 'Second Item' });
  await addItemHandler.execute(first);
  await addItemHandler.execute(second);
  return { first, second };
}
