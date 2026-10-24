import { DomainEvent } from '@market-miam/event-sourcing';

// PII-free: it must stay readable after the shred it precedes.
export type VendorErased = DomainEvent<'VendorErased', {
  vendorId: string;
  erasedAt: string;
}>
