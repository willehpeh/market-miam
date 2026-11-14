import { Signal } from '@angular/core';
import { AccountListing } from './accounts';

export abstract class AccountsFacade {
  abstract readonly accounts: Signal<AccountListing[]>;

  abstract load(): void;
}
