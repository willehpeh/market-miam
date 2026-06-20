import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthFacade } from './auth.facade';

@Component({
  selector: 'mm-login-button',
  template: `
    @if (!isLoading()) {
      <button id="login-button" (click)="onClick()">SE CONNECTER</button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginButton {

  private readonly auth = inject(AuthFacade);
  protected readonly isLoading = this.auth.isLoading;

  onClick(): void {
    this.auth.login();
  }
}
