import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { AccountListing } from './accounts';
import { InviteVendorSuccess } from '../invitations/invitation.state';

export const LoadAccounts = createAction('[Accounts] Load');
export const LoadAccountsSuccess = createAction('[Accounts] Load Success', props<{ accounts: AccountListing[] }>());
export const LoadAccountsFailure = createAction('[Accounts] Load Failure');

export interface AccountsState {
  loading: boolean;
  failed: boolean;
  accounts: AccountListing[];
}

export const initialState: AccountsState = {
  loading: false,
  failed: false,
  accounts: [],
};

export const accountsFeature = createFeature({
  name: 'accounts',
  reducer: createReducer<AccountsState>(
    initialState,
    on(LoadAccounts, (state): AccountsState => ({ ...state, loading: true, failed: false })),
    on(LoadAccountsSuccess, (state, { accounts }): AccountsState => ({ ...state, loading: false, accounts })),
    on(LoadAccountsFailure, (state): AccountsState => ({ ...state, loading: false, failed: true })),
    on(InviteVendorSuccess, (state, { email, vendorId }): AccountsState => ({
      ...state,
      accounts: [...state.accounts, { email, vendorId, subdomain: null, invited: true as const }].sort(byEmail),
    })),
  ),
});

// The api's order: by email, accounts without one last.
function byEmail(a: AccountListing, b: AccountListing): number {
  if (a.email === b.email) return 0;
  if (a.email === null) return 1;
  if (b.email === null) return -1;
  return a.email < b.email ? -1 : 1;
}
