import { CatalogueItemView } from './catalogue';

// The house bourguignon, overridable per spec. imageReference follows the itemId so a
// list of distinct items carries distinct renditions without each spec deriving them.
export const catalogueItem = (overrides: Partial<CatalogueItemView> = {}): CatalogueItemView => {
  const itemId = overrides.itemId ?? 'item-1';
  return {
    itemId,
    name: 'Bœuf bourguignon',
    description: 'Mijoté maison',
    price: 1300,
    imageReference: `v1/items/acme/${itemId}`,
    ...overrides,
  };
};
