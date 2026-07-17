import { StorefrontCoverPhotoSet } from './storefront-cover-photo-set';
import { StorefrontInformationEdited } from './storefront-information-edited';
import { StorefrontOpened } from './storefront-opened';
import { StorefrontPublished } from './storefront-published';

export type StorefrontEvent = |
  StorefrontOpened |
  StorefrontCoverPhotoSet |
  StorefrontInformationEdited |
  StorefrontPublished;
