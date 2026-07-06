import { PiiFields } from '@market-monster/event-sourcing';

export const vendorPiiFields: PiiFields = {
  VendorRegistered: ['email'],
  StorefrontInformationEdited: ['name', 'description', 'phone'],
};
