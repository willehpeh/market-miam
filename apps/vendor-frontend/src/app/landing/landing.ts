import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthFacade } from '../auth/auth.facade';
import { LoginButton } from '../auth/login-button';

@Component({
  selector: 'mm-landing',
  host: { class: 'grid min-h-full place-items-center' },
  template: `
    @if (!isAuthenticated()) {
      <mm-login-button />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoginButton]
})
export class Landing {
  private readonly auth = inject(AuthFacade);
  protected readonly isAuthenticated = this.auth.isAuthenticated;
}
