import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthFacade } from '../core/auth/auth.facade';
import { OnboardingFacade } from '../onboarding/onboarding.facade';
import { LoginButton } from '../core/auth/login-button';

@Component({
  selector: 'mm-landing',
  host: { class: 'grid min-h-full place-items-center' },
  template: `
    @if (status() === 'anonymous') {
      <mm-login-button />
    } @else if (errorCode() !== undefined) {
      <section class="w-full max-w-sm rounded-card bg-surface p-6 text-center shadow-frame">
        <h1 class="text-xl">Impossible de préparer votre stand</h1>
        <p class="mt-2 text-sm text-ink-soft">
          Une erreur est survenue (code {{ errorCode() }}). Réessayez, et si le problème persiste,
          contactez votre contact chez Miam.
        </p>
        <button class="mt-5" (click)="retry()">Réessayer</button>
      </section>
    } @else {
      <p class="kicker">Nous préparons votre stand…</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoginButton]
})
export class Landing {
  private readonly auth = inject(AuthFacade);
  private readonly onboarding = inject(OnboardingFacade);

  protected readonly status = this.auth.status;
  protected readonly errorCode = this.onboarding.errorCode;

  protected retry(): void {
    this.onboarding.retry();
  }
}
