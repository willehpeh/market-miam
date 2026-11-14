import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { AccountListing } from './accounts';

export const LoadAccounts = createAction('[Accounts] Load');
export const LoadAccountsSuccess = createAction('[Accounts] Load Success', props<{ accounts: AccountListing[] }>());

export interface AccountsState {
  accounts: AccountListing[];
}

export const initialState: AccountsState = {
  accounts: [],
};

export const accountsFeature = createFeature({
  name: 'accounts',
  reducer: createReducer<AccountsState>(
    initialState,
    on(LoadAccountsSuccess, (state, { accounts }): AccountsState => ({ ...state, accounts })),
  ),
});
