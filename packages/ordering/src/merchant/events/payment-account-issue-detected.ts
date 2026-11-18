import { DomainEvent } from '@market-miam/event-sourcing';

export type PaymentAccountIssueDetected = DomainEvent<'PaymentAccountIssueDetected', {
  vendorId: string;
  informationDueBy: string;
  detectedAt: string;
}>
