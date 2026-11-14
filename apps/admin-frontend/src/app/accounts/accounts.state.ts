import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { AccountListing } from './accounts';
import { InviteVendorSuccess } from '../invitations/invitation.state';
import { EraseVendorAccepted } from '../erasures/erasure.state';

export const LoadAccounts = createAction('[Accounts] Load');
export const LoadAccountsSuccess = createAction('[Accounts] Load Success', props<{ accounts: AccountListing[] }>());
export const LoadAccountsFailure = createAction('[Accounts] Load Failure');
export const LoadAccountsRefused = createAction('[Accounts] Load Refused');

export interface AccountsState {
  loading: boolean;
  failed: boolean;
  // The api turned the sign-in away.
  refused: boolean;
  accounts: AccountListing[];
}

export const initialState: AccountsState = {
  loading: false,
  failed: false,
  refused: false,
  accounts: [],
};

export const accountsFeature = createFeature({
  name: 'accounts',
  reducer: createReducer<AccountsState>(
    initialState,
    on(LoadAccounts, (state): AccountsState => ({ ...state, loading: true, failed: false, refused: false })),
    on(LoadAccountsSuccess, (state, { accounts }): AccountsState => ({ ...state, loading: false, accounts })),
    on(LoadAccountsFailure, (state): AccountsState => ({ ...state, loading: false, failed: true })),
    on(LoadAccountsRefused, (state): AccountsState => ({ ...state, loading: false, refused: true })),
    on(InviteVendorSuccess, (state, { email, vendorId }): AccountsState => ({
      ...state,
      accounts: [...state.accounts, { email, vendorId, subdomain: null, invited: true as const }].sort(byEmail),
    })),
    on(EraseVendorAccepted, (state, { vendorId }): AccountsState => ({
      ...state,
      accounts: state.accounts.map(markedErased(vendorId)),
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

// The vendor's row marked erased, every other row as it was.
function markedErased(vendorId: string): (account: AccountListing) => AccountListing {
  return (account) => (account.vendorId === vendorId ? { ...account, erased: true } : account);
}
