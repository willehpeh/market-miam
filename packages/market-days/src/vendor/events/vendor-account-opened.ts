import { DomainEvent } from '@market-miam/event-sourcing';

// PII-free: when the vendor could first sign in, readable after any shred (ADR 0063).
export type VendorAccountOpened = DomainEvent<'VendorAccountOpened', {
  vendorId: string;
  openedAt: string;
}>
