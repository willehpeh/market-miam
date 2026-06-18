import { ItemAddedToCatalogue } from './item-added-to-catalogue';
import { ItemPriceChanged } from './item-price-changed';
import { ItemRetired } from './item-retired';

export type CatalogueEvent = |
  ItemAddedToCatalogue |
  ItemPriceChanged |
  ItemRetired;
