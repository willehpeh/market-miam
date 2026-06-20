import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthFacade } from './auth/auth.facade';
import { LogoutButton } from './auth/logout-button';

@Component({
  selector: 'mm-layout',
  template: `
    <div class="grid min-h-svh grid-rows-[auto_1fr]">
      <header class="flex h-15 items-center justify-between border-b border-gray-200 px-6">
        <span class="font-display text-lg font-bold tracking-tight">Market Miam</span>
        @if (isAuthenticated()) {
          <mm-logout-button />
        }
      </header>
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, LogoutButton]
})
export class Layout {
  private readonly auth = inject(AuthFacade);
  protected readonly isAuthenticated = this.auth.isAuthenticated;
}
