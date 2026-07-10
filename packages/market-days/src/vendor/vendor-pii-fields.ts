import { PiiFields } from '@market-miam/event-sourcing';

// The registry of which event payload fields hold PII, encrypted at rest and
// crypto-shredded on erasure. Any new event carrying PII MUST be added here — an
// event not listed is stored in plaintext, silently. There is no runtime check for
// this; the guard is this comment plus vendor-pii-fields.spec.ts (which only covers
// the events already listed).
export const vendorPiiFields: PiiFields = {
  VendorRegistered: ['email'],
  StorefrontInformationEdited: ['name', 'description', 'phone'],
};
