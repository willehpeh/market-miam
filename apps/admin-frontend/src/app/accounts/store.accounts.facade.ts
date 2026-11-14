import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AccountsFacade } from './accounts.facade';
import { accountsFeature, LoadAccounts } from './accounts.state';

@Injectable()
export class StoreAccountsFacade implements AccountsFacade {
  private readonly store = inject(Store);

  readonly accounts = this.store.selectSignal(accountsFeature.selectAccounts);

  load(): void {
    this.store.dispatch(LoadAccounts());
  }
}
