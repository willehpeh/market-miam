import { DomainEvent } from '@market-miam/event-sourcing';

export type VendorRegistered = DomainEvent<'VendorRegistered', {
  vendorId: string;
  registeredAt: string;
  email: string;
}>
