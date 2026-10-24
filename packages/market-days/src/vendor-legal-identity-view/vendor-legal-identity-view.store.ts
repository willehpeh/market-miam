import { VendorLegalIdentityView } from './vendor-legal-identity-view';

export abstract class VendorLegalIdentityViewStore {
  abstract provide(vendorId: string, identity: VendorLegalIdentityView): Promise<void>;
  abstract remove(vendorId: string): Promise<void>;
  abstract clear(): Promise<void>;
}
