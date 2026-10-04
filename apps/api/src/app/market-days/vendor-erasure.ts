import { Injectable } from '@nestjs/common';
import { Clock } from '@market-miam/common';
import { DataKeys } from '@market-miam/event-sourcing';
import { SubdomainRegistry, vendorPiiKeyScopes } from '@market-miam/market-days';
import { Subscriptions } from '../event-sourcing/subscriptions';

// Décret 2021-1362: the host keeps the publisher's civil identity this long after the
// account closes (ADR 0056).
const LEGAL_IDENTITY_RETENTION_YEARS = 5;

// Right-to-be-forgotten for a vendor: shred the data key (its PII fields now decrypt
// to the SHREDDED sentinel) then rebuild the read model so the plaintext PII held
// there — model A decrypts on load — is replaced by the sentinel. The legal identity
// sits under its own key, which is only scheduled for shredding: ShredSweep ends it
// five years on. The subdomain mapping is deleted too, so the public storefront 404s
// rather than serving the sentinel. The event log is untouched (ADR 0025). Deleting
// the vendor's Auth0 user is a manual operator step for now.
// ponytail: rebuilds only the one PII-bearing projection; add others here if a
// future projection caches vendor PII.
@Injectable()
export class VendorErasure {
  constructor(
    private readonly keys: DataKeys,
    private readonly subscriptions: Subscriptions,
    private readonly subdomains: SubdomainRegistry,
    private readonly clock: Clock,
  ) {}

  async erase(vendorId: string): Promise<void> {
    await this.keys.shred(vendorId);
    await this.keys.scheduleShred(`${vendorId}:${vendorPiiKeyScopes['VendorLegalIdentityProvided']}`, this.endOfLegalRetention());
    await this.subscriptions.rebuild('vendor-storefront-view');
    await this.subdomains.removeFor(vendorId);
  }

  private endOfLegalRetention(): Date {
    const end = new Date(this.clock.now().value());
    end.setUTCFullYear(end.getUTCFullYear() + LEGAL_IDENTITY_RETENTION_YEARS);
    return end;
  }
}
