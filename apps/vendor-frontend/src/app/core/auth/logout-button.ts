import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthFacade } from './auth.facade';

@Component({
  selector: 'mm-logout-button',
  template: `<button id="logout-button" (click)="onClick()">Se déconnecter</button>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogoutButton {

  private readonly auth = inject(AuthFacade);

  onClick(): void {
    this.auth.logout();
  }
}
