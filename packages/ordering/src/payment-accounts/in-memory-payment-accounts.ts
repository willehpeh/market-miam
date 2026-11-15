import { PaymentAccounts, Registration } from './payment-accounts';

export class InMemoryPaymentAccounts extends PaymentAccounts {
  private readonly created: Registration[] = [];

  createFor({ vendorId, registrationId, accountToken }: Registration): Promise<void> {
    this.created.push({ vendorId, registrationId, accountToken });
    return Promise.resolve();
  }

  all(): Registration[] {
    return this.created.slice();
  }
}
