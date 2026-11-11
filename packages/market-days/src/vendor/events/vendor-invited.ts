import { DomainEvent } from '@market-miam/event-sourcing';

export type VendorInvited = DomainEvent<'VendorInvited', {
  vendorId: string;
  invitedAt: string;
  email: string;
}>
