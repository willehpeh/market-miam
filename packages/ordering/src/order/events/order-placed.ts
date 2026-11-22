import { DomainEvent } from '@market-miam/event-sourcing';
import { OrderLine } from '../held-order';

export type OrderPlaced = DomainEvent<'OrderPlaced', {
  vendorId: string;
  orderId: string;
  marketId: string;
  date: string;
  lines: OrderLine[];
  paymentIntentId: string;
  placedAt: string;
}>
