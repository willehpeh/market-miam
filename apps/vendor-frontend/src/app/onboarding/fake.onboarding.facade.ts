import { Injectable, signal } from '@angular/core';
import { OnboardingFacade } from './onboarding.facade';

@Injectable()
export class FakeOnboardingFacade implements OnboardingFacade {
  readonly errorCode = signal<number | undefined>(undefined);
  retried = false;

  retry(): void {
    this.retried = true;
  }
}
