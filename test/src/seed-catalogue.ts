import { ItemAddedToCatalogue } from '@market-monster/market-days';
import { InMemoryEventStore } from '@market-monster/event-sourcing';

export function seedCatalogue(store: InMemoryEventStore, vendorId: string, ...itemIds: string[]) {
  const events: ItemAddedToCatalogue[] = itemIds.map(itemId => ({
    type: 'ItemAddedToCatalogue',
    payload: {
      itemId,
      name: `Name for ${itemId}`,
      description: '',
      price: 500,
      imageReference: 'market-monster/items/item-photo'
    }
  }));
  store.seedWith(`catalogue-${vendorId}`, events, { vendorId });
}
