import { DomainEvent } from '@market-miam/event-sourcing';

// PII-free: it follows the shred, and proves the erasure finished (ADR 0063).
export type VendorAccountClosed = DomainEvent<'VendorAccountClosed', {
  vendorId: string;
  closedAt: string;
}>
