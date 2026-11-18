import { DomainEvent } from '@market-miam/event-sourcing';

export type PaymentAccountRegistrationConfirmed = DomainEvent<'PaymentAccountRegistrationConfirmed', {
  vendorId: string;
  registrationId: string;
  accountId: string;
  confirmedAt: string;
}>
