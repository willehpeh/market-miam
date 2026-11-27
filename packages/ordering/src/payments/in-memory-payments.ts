import { CompletedCheckout, Payments } from './payments';

export class InMemoryPayments extends Payments {
  private readonly completedCheckouts = new Map<string, CompletedCheckout>();
  private readonly startedCheckouts = new Map<string, unknown>();

  complete(checkoutId: string, checkout: CompletedCheckout): void {
    this.completedCheckouts.set(checkoutId, checkout);
  }

  checkoutAt(address: string): unknown {
    return this.startedCheckouts.get(address);
  }

  async completedCheckout(checkoutId: string): Promise<CompletedCheckout> {
    const checkout = this.completedCheckouts.get(checkoutId);
    if (!checkout) {
      throw new Error(`No completed checkout ${checkoutId}`);
    }
    return checkout;
  }
}
