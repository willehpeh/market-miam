import { ItemAddedToCatalogue } from '@market-miam/market-days';
import { InMemoryEventStore } from '@market-miam/event-sourcing';

// A plain id seeds a flat dish at 500; pass variants to seed the other kind (ADR 0033).
type SeedItem = string | { itemId: string; variants: { name: string; description: string; price: number }[] };

export function seedCatalogue(store: InMemoryEventStore, vendorId: string, ...items: SeedItem[]) {
  const events: ItemAddedToCatalogue[] = items.map(item => {
    const itemId = typeof item === 'string' ? item : item.itemId;
    return {
      type: 'ItemAddedToCatalogue',
      payload: {
        itemId,
        name: `Name for ${itemId}`,
        description: '',
        ...(typeof item === 'string' ? { price: 500 } : { variants: item.variants }),
        imageReference: 'market-miam/items/item-photo'
      },
      version: 1
    };
  });
  store.seedWith(`catalogue-${vendorId}`, events, { vendorId });
}
