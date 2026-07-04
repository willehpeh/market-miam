import { Signal } from '@angular/core';

export abstract class OnboardingFacade {
  abstract readonly errorCode: Signal<number | undefined>;

  abstract retry(): void;
}
