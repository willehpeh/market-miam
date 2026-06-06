import { ItemAddedToRepertoire } from './item-added-to-repertoire';
import { ItemPriceChanged } from './item-price-changed';

export type RepertoireEvent = |
  ItemAddedToRepertoire |
  ItemPriceChanged;
