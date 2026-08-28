import { StorefrontCoverPhotoSet } from './storefront-cover-photo-set';
import { StorefrontInformationEdited } from './storefront-information-edited';
import { StorefrontOpened } from './storefront-opened';
import { StorefrontPublished } from './storefront-published';
import { CartePricesHidden } from './carte-prices-hidden';

export type StorefrontEvent = |
  StorefrontOpened |
  StorefrontCoverPhotoSet |
  StorefrontInformationEdited |
  StorefrontPublished |
  CartePricesHidden;
