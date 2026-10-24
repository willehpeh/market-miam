import { VendorRegistered } from './vendor-registered';
import { VendorLegalIdentityProvided } from './vendor-legal-identity-provided';
import { VendorErased } from './vendor-erased';

export type VendorEvent = |
  VendorRegistered |
  VendorLegalIdentityProvided |
  VendorErased;
