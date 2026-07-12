import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthFacade } from './auth.facade';

@Component({
  selector: 'mm-logout-button',
  template: `
    <button
      id="logout-button"
      aria-label="Se déconnecter"
      title="Se déconnecter"
      class="bg-transparent text-brand shadow-none text-lg hover:bg-transparent hover:text-brand-deep active:bg-transparent p-0"
      (click)="onClick()"
    >
      <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogoutButton {

  private readonly auth = inject(AuthFacade);

  onClick(): void {
    this.auth.logout();
  }
}
