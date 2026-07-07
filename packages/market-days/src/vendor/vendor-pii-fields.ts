import { PiiFields } from '@market-miam/event-sourcing';

export const vendorPiiFields: PiiFields = {
  VendorRegistered: ['email'],
  StorefrontInformationEdited: ['name', 'description', 'phone'],
};
