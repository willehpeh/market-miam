import { DomainEvent } from '@market-miam/event-sourcing';

// The subdomain can name a person, as `chez-mohamed` does: encrypted, and shredded with the
// vendor's key (ADR 0065).
export type VendorSubdomainAssigned = DomainEvent<'VendorSubdomainAssigned', {
  vendorId: string;
  subdomain: string;
  assignedAt: string;
}>
