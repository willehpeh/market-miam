import { VendorInvited } from './vendor-invited';
import { VendorRegistered } from './vendor-registered';
import { VendorLegalIdentityProvided } from './vendor-legal-identity-provided';
import { VendorErased } from './vendor-erased';
import { VendorAccountOpened } from './vendor-account-opened';
import { VendorAccountClosed } from './vendor-account-closed';

export type VendorEvent = |
  VendorInvited |
  VendorRegistered |
  VendorLegalIdentityProvided |
  VendorErased |
  VendorAccountOpened |
  VendorAccountClosed;
