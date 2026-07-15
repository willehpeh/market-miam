import { Injectable } from '@nestjs/common';
import { DataKeys } from '@market-miam/event-sourcing';
import { SubdomainRegistry } from '@market-miam/market-days';
import { Subscriptions } from '../event-sourcing/subscriptions';

// Right-to-be-forgotten for a vendor: delete the data key (its PII fields now
// decrypt to the SHREDDED sentinel) then rebuild the read model so the plaintext
// PII held there — model A decrypts on load — is replaced by the sentinel. The
// subdomain mapping is deleted too, so the public storefront 404s rather than
// serving the sentinel. The event log is untouched (ADR 0025). Deleting the
// vendor's Auth0 user is a manual operator step for now.
// ponytail: rebuilds only the one PII-bearing projection; add others here if a
// future projection caches vendor PII.
@Injectable()
export class VendorErasure {
  constructor(
    private readonly keys: DataKeys,
    private readonly subscriptions: Subscriptions,
    private readonly subdomains: SubdomainRegistry,
  ) {}

  async erase(vendorId: string): Promise<void> {
    await this.keys.shred(vendorId);
    await this.subscriptions.rebuild('vendor-storefront-view');
    await this.subdomains.removeFor(vendorId);
  }
}
