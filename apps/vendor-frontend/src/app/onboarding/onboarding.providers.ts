import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { onboardingFeature } from './onboarding.state';
import { OnboardingEffects } from './onboarding.effects';
import { OnboardingFacade } from './onboarding.facade';
import { StoreOnboardingFacade } from './store.onboarding.facade';

export function provideOnboarding(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideState(onboardingFeature),
    provideEffects(OnboardingEffects),
    { provide: OnboardingFacade, useClass: StoreOnboardingFacade },
  ]);
}
