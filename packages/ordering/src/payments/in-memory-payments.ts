import { CompletedCheckout, NewCheckout, Payments } from './payments';

export class InMemoryPayments extends Payments {
  private readonly completedCheckouts = new Map<string, CompletedCheckout>();
  private readonly startedCheckouts = new Map<string, NewCheckout>();

  complete(checkoutId: string, checkout: CompletedCheckout): void {
    this.completedCheckouts.set(checkoutId, checkout);
  }

  async startCheckout(checkout: NewCheckout): Promise<string> {
    const address = `https://checkout.stripe.test/${this.startedCheckouts.size + 1}`;
    this.startedCheckouts.set(address, checkout);
    return address;
  }

  checkoutAt(address: string): NewCheckout | undefined {
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
