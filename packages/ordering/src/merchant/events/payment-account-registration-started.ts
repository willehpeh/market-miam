import { DomainEvent } from '@market-miam/event-sourcing';

export type PaymentAccountRegistrationStarted = DomainEvent<'PaymentAccountRegistrationStarted', {
  vendorId: string;
  registrationId: string;
  accountToken: string;
  startedAt: string;
}>
