import { AccountCreation, PaymentAccount, PaymentAccounts, Registration } from './payment-accounts';

export class InMemoryPaymentAccounts extends PaymentAccounts {
  private readonly created: Registration[] = [];
  private readonly accountsById: Map<string, PaymentAccount>;

  static accountIdFor(registrationId: string): string {
    return `acct_${registrationId}`;
  }

  constructor(existing: PaymentAccount[] = []) {
    super();
    this.accountsById = new Map(existing.map((account) => [account.accountId, account]));
  }

  createFor({ vendorId, registrationId, accountToken }: Registration): Promise<AccountCreation> {
    this.created.push({ vendorId, registrationId, accountToken });
    const accountId = InMemoryPaymentAccounts.accountIdFor(registrationId);
    this.accountsById.set(accountId, { accountId, vendorId, registrationId });
    return Promise.resolve('created');
  }

  find(accountId: string): Promise<PaymentAccount | undefined> {
    return Promise.resolve(this.accountsById.get(accountId));
  }

  all(): Registration[] {
    return this.created.slice();
  }
}
