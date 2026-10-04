import { VendorRegistered } from './vendor-registered';
import { VendorLegalIdentityProvided } from './vendor-legal-identity-provided';

export type VendorEvent = |
  VendorRegistered |
  VendorLegalIdentityProvided;
