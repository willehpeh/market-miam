import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { LegalIdentityView } from './legal-identity';
import { RegisteredCompany } from './company-registry';

export const LoadLegalIdentity = createAction('[Legal Identity] Load Legal Identity');
export const LoadLegalIdentitySuccess = createAction(
  '[Legal Identity] Load Legal Identity Success',
  props<{ identity: LegalIdentityView | null }>(),
);
export const LoadLegalIdentityFailure = createAction('[Legal Identity] Load Legal Identity Failure');

export const ProvideLegalIdentity = createAction(
  '[Legal Identity] Provide Legal Identity',
  props<{ identity: LegalIdentityView }>(),
);
export const ProvideLegalIdentitySuccess = createAction(
  '[Legal Identity] Provide Legal Identity Success',
  props<{ identity: LegalIdentityView }>(),
);
export const ProvideLegalIdentityFailure = createAction('[Legal Identity] Provide Legal Identity Failure');
export const HideLegalIdentitySaved = createAction('[@Effect navigateHomeOnProvided$] Hide Legal Identity Saved');

export const LookUpCompany = createAction('[Legal Identity] Look Up Company', props<{ siret: string }>());
export const LookUpCompanyDone = createAction(
  '[Legal Identity] Look Up Company Done',
  props<{ company: RegisteredCompany | null }>(),
);

export interface LegalIdentityState {
  identity: LegalIdentityView | null | undefined;
  loading: boolean;
  company: RegisteredCompany | null | undefined;
  saved: boolean;
  saveFailed: boolean;
}

export const initialState: LegalIdentityState = {
  identity: undefined,
  loading: false,
  company: undefined,
  saved: false,
  saveFailed: false,
};

export const legalIdentityFeature = createFeature({
  name: 'legalIdentity',
  reducer: createReducer<LegalIdentityState>(
    initialState,
    on(LoadLegalIdentity, (state): LegalIdentityState => ({ ...state, loading: true })),
    on(LoadLegalIdentitySuccess, (state, { identity }): LegalIdentityState => ({ ...state, loading: false, identity })),
    // Left unknown, so the next screen visit asks again.
    on(LoadLegalIdentityFailure, (state): LegalIdentityState => ({ ...state, loading: false })),
    on(ProvideLegalIdentity, (state): LegalIdentityState => ({ ...state, saved: false, saveFailed: false })),
    on(ProvideLegalIdentitySuccess, (state, { identity }): LegalIdentityState => ({
      ...state,
      identity,
      company: undefined,
      saved: true,
    })),
    on(ProvideLegalIdentityFailure, (state): LegalIdentityState => ({ ...state, saveFailed: true })),
    on(HideLegalIdentitySaved, (state): LegalIdentityState => ({ ...state, saved: false })),
    on(LookUpCompany, (state): LegalIdentityState => ({ ...state, company: undefined })),
    on(LookUpCompanyDone, (state, { company }): LegalIdentityState => ({ ...state, company })),
  ),
});
