import { Signal } from '@angular/core';
import { AccountListing } from './accounts';

export abstract class AccountsFacade {
  abstract readonly accounts: Signal<AccountListing[]>;
  abstract readonly loading: Signal<boolean>;
  abstract readonly failed: Signal<boolean>;

  abstract load(): void;
}
