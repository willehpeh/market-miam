import { DomainEvent } from '@market-miam/event-sourcing';

export type PaymentAccountIssueResolved = DomainEvent<'PaymentAccountIssueResolved', {
  vendorId: string;
  resolvedAt: string;
}>
