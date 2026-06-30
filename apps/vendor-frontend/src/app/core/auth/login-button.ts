import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthFacade } from './auth.facade';

@Component({
  selector: 'mm-login-button',
  template: `<button id="login-button" (click)="onClick()">Se connecter</button>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginButton {

  private readonly auth = inject(AuthFacade);

  onClick(): void {
    this.auth.login();
  }
}
