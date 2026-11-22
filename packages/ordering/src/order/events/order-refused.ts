import { DomainEvent } from '@market-miam/event-sourcing';
import { OrderLine } from '../held-order';
import { RefusalReason } from '../refusal-reason';

export type OrderRefused = DomainEvent<'OrderRefused', {
  vendorId: string;
  orderId: string;
  marketId: string;
  date: string;
  lines: OrderLine[];
  paymentIntentId: string;
  reason: RefusalReason;
  refusedAt: string;
}>
