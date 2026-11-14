import { VendorInvited } from './vendor-invited';
import { VendorRegistered } from './vendor-registered';
import { VendorLegalIdentityProvided } from './vendor-legal-identity-provided';
import { VendorErased } from './vendor-erased';
import { VendorAccountOpened } from './vendor-account-opened';
import { VendorSubdomainAssigned } from './vendor-subdomain-assigned';
import { VendorAccountClosed } from './vendor-account-closed';

export type VendorEvent = |
  VendorInvited |
  VendorRegistered |
  VendorLegalIdentityProvided |
  VendorErased |
  VendorAccountOpened |
  VendorSubdomainAssigned |
  VendorAccountClosed;
