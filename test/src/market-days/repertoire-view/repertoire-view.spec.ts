import {
  AddItemToRepertoireHandler,
  Repertoires,
  RepertoireView,
  RepertoireViewItem,
  RepertoireViewProjection,
  RepertoireViews
} from '@market-monster/market-days';
import { InMemoryEventStore } from '../../in-memory.event-store';
import { InMemorySubscription } from '../../in-memory.subscription';
import { TestAddItemToRepertoire } from '../add-item-to-repertoire/test-data';


class InMemoryRepertoireViews implements RepertoireViews {
  private readonly items = new Map<string, RepertoireViewItem[]>();

  async addItemToRepertoire(item: RepertoireViewItem, vendorId: string): Promise<void> {
    const existing = this.items.get(vendorId) ?? [];
    existing.push(item);
    this.items.set(vendorId, existing);
  }

  async clear(): Promise<void> {
    this.items.clear();
  }

  async forVendor(vendorId: string): Promise<RepertoireView> {
    return { items: this.items.get(vendorId) ?? [] };
  }
}

describe('RepertoireView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryRepertoireViews;
  let subscription: InMemorySubscription;
  let addItemHandler: AddItemToRepertoireHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryRepertoireViews();
    const projection = new RepertoireViewProjection(views);
    subscription = new InMemorySubscription('repertoire-view', store, projection);
    const repertoires = new Repertoires(store);
    addItemHandler = new AddItemToRepertoireHandler(repertoires);
  });

  it('projects items added to the repertoire', async () => {
    const first = TestAddItemToRepertoire.valid();
    const second = TestAddItemToRepertoire.with({ itemId: 'second-item', name: 'Second Item' });
    await addItemHandler.execute(first);
    await addItemHandler.execute(second);

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
