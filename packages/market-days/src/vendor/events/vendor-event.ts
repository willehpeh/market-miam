import { VendorRegistered } from './vendor-registered';
import { VendorLegalIdentityRecorded } from './vendor-legal-identity-recorded';

export type VendorEvent = |
  VendorRegistered |
  VendorLegalIdentityRecorded;
