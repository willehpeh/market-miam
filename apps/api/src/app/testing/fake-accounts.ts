import { Account, Accounts } from '../ops/accounts/accounts';

export class FakeAccounts extends Accounts {
  constructor(private readonly accounts: Account[] = []) {
    super();
  }

  all(): Promise<Account[]> {
    return Promise.resolve(this.accounts);
  }
}
