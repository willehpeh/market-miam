import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Auth } from './auth';

@Component({
  selector: 'mm-login-button',
  template: `
    @if (!isLoading()) {
      <button id="login-button" (click)="onClick()">Login</button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginButton {

  private readonly auth = inject(Auth);
  protected readonly isLoading = this.auth.isLoading();

  onClick(): void {
    this.auth.login();
  }
}
