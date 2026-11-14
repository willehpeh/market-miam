import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Accounts } from './accounts';
import { HttpAccounts } from './http.accounts';
import { accountsFeature } from './accounts.state';
import { AccountsEffects } from './accounts.effects';
import { AccountsFacade } from './accounts.facade';
import { StoreAccountsFacade } from './store.accounts.facade';

export function provideAccounts(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Accounts, useClass: HttpAccounts },
    provideState(accountsFeature),
    provideEffects(AccountsEffects),
    { provide: AccountsFacade, useClass: StoreAccountsFacade },
  ]);
}
