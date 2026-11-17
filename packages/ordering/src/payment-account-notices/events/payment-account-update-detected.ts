import { DomainEvent } from '@market-miam/event-sourcing';

export type PaymentAccountUpdateDetected = DomainEvent<'PaymentAccountUpdateDetected', {
  noticeId: string;
  accountId: string;
}>
