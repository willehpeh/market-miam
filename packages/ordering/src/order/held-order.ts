import { OrderLine } from './order-line';

export type HeldOrder = {
  orderId: string;
  marketId: string;
  date: string;
  lines: OrderLine[];
  paymentId: string;
};
