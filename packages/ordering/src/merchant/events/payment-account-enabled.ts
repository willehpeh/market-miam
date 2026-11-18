import { DomainEvent } from '@market-miam/event-sourcing';

export type PaymentAccountEnabled = DomainEvent<'PaymentAccountEnabled', {
  vendorId: string;
  enabledAt: string;
}>
