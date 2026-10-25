import { ItemAddedToCatalogue, ItemPhotoChanged, ItemRetired, ItemRevised, ItemsReordered } from '@market-miam/market-days';

// The events a catalogue spec seeds as its Given, typed against the domain's event types
// (see market-day-events.ts for the stance). Defaults match TestAddItemToCatalogue.simple():
// vendor-id's catalogue, item-id, a flat price of 500. Seed them on `catalogueStream(vendorId)`.
export const catalogueStream = (vendorId = 'vendor-id'): string => `catalogue-${vendorId}`;

type Item = ItemAddedToCatalogue['payload'];

export const itemAdded = (itemId = 'item-id', overrides: Partial<Item> = {}): ItemAddedToCatalogue => ({
  type: 'ItemAddedToCatalogue',
  payload: {
    itemId,
    name: 'Item Name',
    description: 'Item Description',
    price: 500,
    imageReference: 'market-miam/items/item-photo',
    allergens: ['gluten', 'milk'],
    ...overrides,
  },
  version: 1,
});

export const itemRevised = (itemId = 'item-id', overrides: Partial<ItemRevised['payload']> = {}): ItemRevised => ({
  type: 'ItemRevised',
  payload: { itemId, name: 'Item Name', description: 'Item Description', price: 500, allergens: ['gluten', 'milk'], ...overrides },
  version: 1,
});

export const itemPhotoChanged = (itemId = 'item-id', imageReference = 'market-miam/items/new-photo'): ItemPhotoChanged =>
  ({ type: 'ItemPhotoChanged', payload: { itemId, imageReference }, version: 1 });

export const itemRetired = (itemId = 'item-id'): ItemRetired =>
  ({ type: 'ItemRetired', payload: { itemId }, version: 1 });

export const itemsReordered = (...itemIds: string[]): ItemsReordered =>
  ({ type: 'ItemsReordered', payload: { itemIds }, version: 1 });
