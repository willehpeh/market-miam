import { ItemAddedToCatalogue } from '@market-miam/market-days';
import { InMemoryEventStore } from '@market-miam/event-sourcing';

export function seedCatalogue(store: InMemoryEventStore, vendorId: string, ...itemIds: string[]) {
  const events: ItemAddedToCatalogue[] = itemIds.map(itemId => ({
    type: 'ItemAddedToCatalogue',
    payload: {
      itemId,
      name: `Name for ${itemId}`,
      description: '',
      price: 500,
      imageReference: 'market-miam/items/item-photo'
    },
    version: 1
  }));
  store.seedWith(`catalogue-${vendorId}`, events, { vendorId });
}
