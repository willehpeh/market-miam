import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AccountsFacade } from './accounts.facade';
import { accountsFeature, LoadAccounts } from './accounts.state';

@Injectable()
export class StoreAccountsFacade implements AccountsFacade {
  private readonly store = inject(Store);

  readonly accounts = this.store.selectSignal(accountsFeature.selectAccounts);
  readonly loading = this.store.selectSignal(accountsFeature.selectLoading);
  readonly failed = this.store.selectSignal(accountsFeature.selectFailed);

  load(): void {
    this.store.dispatch(LoadAccounts());
  }
}
