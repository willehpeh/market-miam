import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Auth } from './auth';

@Component({
  selector: 'mm-login-button',
  template: `
    <button id="login-button" (click)="onClick()">Login</button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginButton {

  private readonly auth = inject(Auth);

  onClick(): void {
    this.auth.login();
  }
}
