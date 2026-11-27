import { HeldOrder, OrderLine } from '../order';

export type CompletedCheckout = {
  vendorId: string;
  order: HeldOrder;
};

export type NewCheckout = {
  accountId: string;
  orderId: string;
  vendorId: string;
  marketId: string;
  date: string;
  lines: OrderLine[];
  expiresAt: string;
};

export abstract class Payments {
  abstract startCheckout(checkout: NewCheckout): Promise<string>;
  abstract completedCheckout(checkoutId: string, accountId: string): Promise<CompletedCheckout>;
}
