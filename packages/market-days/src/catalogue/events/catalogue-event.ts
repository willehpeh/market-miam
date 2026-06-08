import { ItemAddedToCatalogue } from './item-added-to-catalogue';
import { ItemPriceChanged } from './item-price-changed';

export type CatalogueEvent = |
  ItemAddedToCatalogue |
  ItemPriceChanged;
