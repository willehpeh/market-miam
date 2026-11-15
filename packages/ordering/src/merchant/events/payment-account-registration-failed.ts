import { DomainEvent } from '@market-miam/event-sourcing';

export type PaymentAccountRegistrationFailed = DomainEvent<'PaymentAccountRegistrationFailed', {
  vendorId: string;
  registrationId: string;
  failedAt: string;
}>
