import { Component, inject } from '@angular/core';
import { Auth } from './auth';

@Component({
  selector: 'mm-logout-button',
  template: `
    @if (!isLoading()) {
      <button id="logout-button" (click)="onClick()">Logout</button>
    }
  `
})
export class LogoutButton {
  private readonly auth = inject(Auth);
  protected readonly isLoading = this.auth.isLoading();

  onClick(): void {
    this.auth.logout();
  }
}
