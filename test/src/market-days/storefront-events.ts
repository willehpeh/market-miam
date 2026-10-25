import {
  CartePricesHidden,
  CartePricesShown,
  StorefrontCoverPhotoSet,
  StorefrontInformationEdited,
  StorefrontOpened,
  StorefrontPublished,
} from '@market-miam/market-days';

// The events a storefront spec seeds as its Given, typed against the domain's event types
// (see market-day-events.ts for the stance). Defaults match TestOpenStorefront.valid(),
// TestEditStorefrontInformation.valid() and TestSetStorefrontCoverPhoto.valid(): vendor-id's
// storefront. Seed them on `storefrontStream(vendorId)`.
export const storefrontStream = (vendorId = 'vendor-id'): string => `storefront-${vendorId}`;

export const storefrontOpened = (vendorId = 'vendor-id'): StorefrontOpened =>
  ({ type: 'StorefrontOpened', payload: { vendorId }, version: 1 });

export const storefrontInformationEdited = (overrides: Partial<StorefrontInformationEdited['payload']> = {}): StorefrontInformationEdited => ({
  type: 'StorefrontInformationEdited',
  payload: { name: 'Jimmy\'s Sandwiches', description: 'The best you ever had', phone: '01234 567890', ...overrides },
  version: 1,
});

export const storefrontCoverPhotoSet = (imageReference = 'storefronts/vendor-id/cover-photo'): StorefrontCoverPhotoSet =>
  ({ type: 'StorefrontCoverPhotoSet', payload: { imageReference }, version: 1 });

export const storefrontPublished = (): StorefrontPublished =>
  ({ type: 'StorefrontPublished', payload: {}, version: 1 });

export const cartePricesHidden = (): CartePricesHidden =>
  ({ type: 'CartePricesHidden', payload: {}, version: 1 });

export const cartePricesShown = (): CartePricesShown =>
  ({ type: 'CartePricesShown', payload: {}, version: 1 });
