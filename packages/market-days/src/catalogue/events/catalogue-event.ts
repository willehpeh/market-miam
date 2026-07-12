import { ItemAddedToCatalogue } from './item-added-to-catalogue';
import { ItemPriceChanged } from './item-price-changed';
import { ItemRetired } from './item-retired';
import { ItemRevised } from './item-revised';
import { ItemPhotoChanged } from './item-photo-changed';

export type CatalogueEvent = |
  ItemAddedToCatalogue |
  ItemPriceChanged |
  ItemRetired |
  ItemRevised |
  ItemPhotoChanged;
