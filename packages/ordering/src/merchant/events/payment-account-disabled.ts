import { DomainEvent } from '@market-miam/event-sourcing';

export type PaymentAccountDisabled = DomainEvent<'PaymentAccountDisabled', {
  vendorId: string;
  disabledAt: string;
}>
