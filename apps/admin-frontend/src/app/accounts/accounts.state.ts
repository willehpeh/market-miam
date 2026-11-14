import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { AccountListing } from './accounts';

export const LoadAccounts = createAction('[Accounts] Load');
export const LoadAccountsSuccess = createAction('[Accounts] Load Success', props<{ accounts: AccountListing[] }>());

export interface AccountsState {
  loading: boolean;
  accounts: AccountListing[];
}

export const initialState: AccountsState = {
  loading: false,
  accounts: [],
};

export const accountsFeature = createFeature({
  name: 'accounts',
  reducer: createReducer<AccountsState>(
    initialState,
    on(LoadAccounts, (state): AccountsState => ({ ...state, loading: true })),
    on(LoadAccountsSuccess, (state, { accounts }): AccountsState => ({ ...state, loading: false, accounts })),
  ),
});
