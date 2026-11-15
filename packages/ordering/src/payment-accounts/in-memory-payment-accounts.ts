import { AccountCreation, PaymentAccounts, Registration } from './payment-accounts';

export class InMemoryPaymentAccounts extends PaymentAccounts {
  private readonly created: Registration[];

  constructor(existing: Registration[] = []) {
    super();
    this.created = existing.slice();
  }

  createFor({ vendorId, registrationId, accountToken }: Registration): Promise<AccountCreation> {
    this.created.push({ vendorId, registrationId, accountToken });
    return Promise.resolve('created');
  }

  wasCreatedFor({ registrationId }: Registration): Promise<boolean> {
    return Promise.resolve(this.created.some((account) => account.registrationId === registrationId));
  }

  all(): Registration[] {
    return this.created.slice();
  }
}
