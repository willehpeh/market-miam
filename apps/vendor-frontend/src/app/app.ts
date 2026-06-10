import { Component, inject } from '@angular/core';
import { LoginButton } from './auth/login-button';
import { LogoutButton } from './auth/logout-button';
import { AuthFacade } from './auth/auth.facade';

@Component({
  selector: 'mm-root',
  template: `
    <div class="grid min-h-svh place-items-center">
      @if (isAuthenticated()) {
        <mm-logout-button />
      } @else {
        <mm-login-button />
      }
    </div>
  `,
  styleUrl: './app.scss',
  imports: [
    LoginButton,
    LogoutButton
  ]
})
export class App {
  private readonly auth = inject(AuthFacade);
  protected readonly isAuthenticated = this.auth.isAuthenticated;
}
