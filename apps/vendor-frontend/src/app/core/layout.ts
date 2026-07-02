import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthFacade } from './auth/auth.facade';
import { LogoutButton } from './auth/logout-button';

@Component({
  selector: 'mm-layout',
  template: `
    <div class="grid min-h-svh grid-rows-[auto_1fr]">
      <header class="flex h-15 items-center justify-between px-6 bg-surface">
        <img src="assets/logo-transparent.png" alt="Market Miam" class="h-6 w-auto rounded-2xl">
        @if (status() === 'authenticated') {
          <mm-logout-button />
        }
      </header>
      <main class="px-6 py-3">
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, LogoutButton]
})
export class Layout {
  private readonly auth = inject(AuthFacade);
  protected readonly status = this.auth.status;
}
