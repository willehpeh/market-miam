import { HeldOrder } from '../order';

export type CompletedCheckout = {
  vendorId: string;
  order: HeldOrder;
};

export abstract class Payments {
  abstract completedCheckout(checkoutId: string, accountId: string): Promise<CompletedCheckout>;
}
