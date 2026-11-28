import { Checkout, CompletedCheckout, Payments } from './payments';

type StartedCheckout = Checkout & { accountId: string };

export class InMemoryPayments implements Payments {
  private readonly completedCheckouts = new Map<string, CompletedCheckout>();
  private readonly startedCheckouts = new Map<string, StartedCheckout>();

  complete(checkoutId: string, checkout: CompletedCheckout): void {
    this.completedCheckouts.set(checkoutId, checkout);
  }

  async startCheckout(accountId: string, checkout: Checkout): Promise<string> {
    const address = `https://checkout.stripe.test/${this.startedCheckouts.size + 1}`;
    this.startedCheckouts.set(address, { ...checkout, accountId });
    return address;
  }

  checkoutAt(address: string): StartedCheckout | undefined {
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
