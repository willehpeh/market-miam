import { CheckpointedProcessor, DataKeys, Processor, StoredEvent } from '@market-miam/event-sourcing';
import { VendorErased } from '../vendor/events';
import { vendorPiiKeyScopes } from '../vendor/vendor-pii-fields';
import { SubdomainRegistry } from '../subdomain-registry';

// Décret 2021-1362: the host keeps the publisher's civil identity this long after the
// account closes (ADR 0056).
const LEGAL_IDENTITY_RETENTION_YEARS = 5;

// Carries out an erasure once it is on the log (ADR 0025, 0056): the vendor's PII dies
// with their key now, their legal identity's key on its date, and the subdomain is freed
// so the public storefront 404s. Every step is safe to repeat, so a retried poll redoes
// nothing harmful. Deleting the Auth0 user stays a manual operator step.
@CheckpointedProcessor('erases-vendors')
export class ErasesVendors implements Processor {
  constructor(
    private readonly keys: DataKeys,
    private readonly subdomains: SubdomainRegistry,
  ) {}

  async handle(event: StoredEvent<VendorErased>): Promise<void> {
    const { vendorId, erasedAt } = event.payload;
    await this.keys.shred(vendorId);
    await this.keys.scheduleShred(`${vendorId}:${vendorPiiKeyScopes['VendorLegalIdentityProvided']}`, endOfLegalRetention(erasedAt));
    await this.subdomains.removeFor(vendorId);
  }

  eventTypes(): string[] {
    return ['VendorErased'];
  }
}

function endOfLegalRetention(erasedAt: string): Date {
  const end = new Date(erasedAt);
  end.setUTCFullYear(end.getUTCFullYear() + LEGAL_IDENTITY_RETENTION_YEARS);
  return end;
}
