import { AccountCreation, PaymentAccounts, Registration } from './payment-accounts';

export class InMemoryPaymentAccounts extends PaymentAccounts {
  private readonly created: Registration[] = [];

  createFor({ vendorId, registrationId, accountToken }: Registration): Promise<AccountCreation> {
    this.created.push({ vendorId, registrationId, accountToken });
    return Promise.resolve('created');
  }

  all(): Registration[] {
    return this.created.slice();
  }
}
