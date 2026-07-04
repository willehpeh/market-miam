import { createAction, createFeature, createReducer, on } from '@ngrx/store';
import { LoginSuccess } from '../core/auth/auth.state';
import { RegisterVendorFailure } from '../vendor/vendor.state';
import { LoadStorefrontFailure, LoadStorefrontSuccess } from '../storefront/storefront.state';

export const RetryOnboarding = createAction('[Onboarding] Retry');

export interface OnboardingState {
  errorCode: number | undefined;
}

export const initialState: OnboardingState = {
  errorCode: undefined,
};

export const onboardingFeature = createFeature({
  name: 'onboarding',
  reducer: createReducer<OnboardingState>(
    initialState,
    on(LoginSuccess, RetryOnboarding, LoadStorefrontSuccess, (): OnboardingState => ({ errorCode: undefined })),
    on(RegisterVendorFailure, LoadStorefrontFailure, (_state, { status }): OnboardingState => ({ errorCode: status })),
  ),
});
