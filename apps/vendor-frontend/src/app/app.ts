import { Component, inject } from '@angular/core';
import { LoginButton } from './auth/login-button';
import { Auth } from './auth/auth';
import { LogoutButton } from './auth/logout-button';

@Component({
  selector: 'mm-root',
  template: `
    @if (isAuthenticated()) {
      <mm-logout-button />
    } @else {
      <mm-login-button />
    }
  `,
  styleUrl: './app.scss',
  imports: [
    LoginButton,
    LogoutButton
  ]
})
export class App {
  private readonly auth = inject(Auth);
  protected readonly isAuthenticated = this.auth.isAuthenticated();
}
