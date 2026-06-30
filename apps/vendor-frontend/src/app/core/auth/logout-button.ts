import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthFacade } from './auth.facade';

@Component({
  selector: 'mm-logout-button',
  template: `<button id="logout-button" (click)="onClick()">SE DÉCONNECTER</button>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogoutButton {

  private readonly auth = inject(AuthFacade);

  onClick(): void {
    this.auth.logout();
  }
}
