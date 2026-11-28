import { DomainEvent } from '@market-miam/event-sourcing';
import { OrderLine } from '../order-line';

export type OrderPlaced = DomainEvent<'OrderPlaced', {
  vendorId: string;
  orderId: string;
  marketId: string;
  date: string;
  lines: OrderLine[];
  paymentId: string;
  placedAt: string;
}>
