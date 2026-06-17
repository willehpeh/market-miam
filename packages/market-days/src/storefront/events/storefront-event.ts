import { StorefrontCoverPhotoSet } from './storefront-cover-photo-set';
import { StorefrontInformationEdited } from './storefront-information-edited';

export type StorefrontEvent = |
  StorefrontCoverPhotoSet |
  StorefrontInformationEdited;
