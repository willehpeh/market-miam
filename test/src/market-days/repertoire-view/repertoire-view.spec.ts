import {
  AddItemToRepertoireHandler,
  Repertoires,
  RepertoireView,
  RepertoireViewItem,
  RepertoireViewProjection,
  RepertoireViews
} from '@market-monster/market-days';
import { Subscription } from '@market-monster/event-sourcing';
import { InMemoryEventStore } from '../../in-memory.event-store';
import { InMemoryCheckpoint } from '../../in-memory.checkpoint';
import { TestAddItemToRepertoire } from '../add-item-to-repertoire/test-data';


class InMemoryRepertoireViews implements RepertoireViews {
  private readonly items = new Map<string, RepertoireViewItem[]>();

  async add(vendorId: string, item: RepertoireViewItem): Promise<void> {
    const existing = this.items.get(vendorId) ?? [];
    existing.push(item);
    this.items.set(vendorId, existing);
  }

  async clear(): Promise<void> {
    this.items.clear();
  }

  async forVendor(vendorId: string): Promise<RepertoireView> {
    const item = TestAddItemToRepertoire.valid();
    return {
      items: [{
        itemId: item.itemId,
        name: item.name,
        description: item.description,
        price: item.price,
        photoUrl: item.photoUrl
      }]
    };
  }
}

describe('RepertoireView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryRepertoireViews;
  let subscription: Subscription;
  let addItemHandler: AddItemToRepertoireHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryRepertoireViews();
    const projection = new RepertoireViewProjection(views);
    const checkpoint = new InMemoryCheckpoint('repertoire-view');
    subscription = new Subscription('repertoire-view', store, projection, checkpoint);
    const repertoires = new Repertoires(store);
    addItemHandler = new AddItemToRepertoireHandler(repertoires);
  });

  it('projects an item added to the repertoire', async () => {
    const command = TestAddItemToRepertoire.valid();
    await addItemHandler.execute(command);

    await subscription.poll();

    const view = await views.forVendor('vendor-id');
    expect(view).toEqual({
      items: [{
        itemId: command.itemId,
        name: command.name,
        description: command.description,
        price: command.price,
        photoUrl: command.photoUrl
      }]
    });
  });
});
