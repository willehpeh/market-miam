import { DomainEvent } from '@market-miam/event-sourcing';
import { OrderLine } from '../order-line';
import { RefusalReason } from '../refusal-reason';

export type OrderRefused = DomainEvent<'OrderRefused', {
  vendorId: string;
  orderId: string;
  marketId: string;
  date: string;
  lines: OrderLine[];
  paymentId: string;
  reason: RefusalReason;
  refusedAt: string;
}>
