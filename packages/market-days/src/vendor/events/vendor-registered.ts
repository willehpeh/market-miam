import { DomainEvent } from '@market-monster/event-sourcing';

export type VendorRegistered = DomainEvent<'VendorRegistered', {
  vendorId: string;
  registeredAt: string;
  email: string;
}>
