import { SignInAddress } from '@market-miam/common';
import { Account, Accounts } from '../ops/accounts/accounts';

export class FakeAccounts extends Accounts {
  constructor(private readonly accounts: Account[] = []) {
    super();
  }

  all(): Promise<Account[]> {
    return Promise.resolve(this.accounts);
  }

  contains(address: SignInAddress): Promise<boolean> {
    return Promise.resolve(this.accounts.some(({ email }) => email !== null && address.equals(new SignInAddress(email))));
  }
}
