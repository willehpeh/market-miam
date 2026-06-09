import { Component, inject } from '@angular/core';
import { LoginButton } from './auth/login-button';
import { Auth } from './auth/auth';

@Component({
  selector: 'mm-root',
  template: `
    @if (isAuthenticated()) {

    } @else {
      <mm-login-button />
    }
  `,
  styleUrl: './app.scss',
  imports: [
    LoginButton
  ]
})
export class App {
  private readonly auth = inject(Auth);
  protected readonly isAuthenticated = this.auth.isAuthenticated();
}
