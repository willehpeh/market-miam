import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { OnboardingFacade } from './onboarding.facade';
import { onboardingFeature, RetryOnboarding } from './onboarding.state';

@Injectable()
export class StoreOnboardingFacade implements OnboardingFacade {
  private readonly store = inject(Store);

  readonly errorCode = this.store.selectSignal(onboardingFeature.selectErrorCode);

  retry(): void {
    this.store.dispatch(RetryOnboarding());
  }
}
