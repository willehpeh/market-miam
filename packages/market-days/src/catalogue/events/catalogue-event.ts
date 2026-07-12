import { ItemAddedToCatalogue } from './item-added-to-catalogue';
import { ItemPriceChanged } from './item-price-changed';
import { ItemRetired } from './item-retired';
import { ItemRevised } from './item-revised';

export type CatalogueEvent = |
  ItemAddedToCatalogue |
  ItemPriceChanged |
  ItemRetired |
  ItemRevised;
