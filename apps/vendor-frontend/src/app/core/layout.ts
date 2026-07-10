import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthFacade } from './auth/auth.facade';
import { NotificationsFacade } from './notifications/notifications.facade';
import { LogoutButton } from './auth/logout-button';

@Component({
  selector: 'mm-layout',
  template: `
    <div class="grid min-h-svh grid-rows-[auto_1fr]">
      <header class="flex h-15 items-center justify-between px-6 bg-surface">
        <img src="assets/logo-transparent.png" alt="Market Miam" class="h-6 w-auto rounded-2xl">
        @if (authenticated()) {
          <mm-logout-button />
        }
      </header>
      <main class="px-6 py-3 bg-canvas">
        @if (errorMessage(); as message) {
          <div role="alert" class="mb-3 flex items-center justify-between gap-4 rounded-card bg-surface p-4 text-sm shadow-frame">
            <span>{{ message }}</span>
            <button type="button" aria-label="Fermer" (click)="dismiss()">×</button>
          </div>
        }
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, LogoutButton]
})
export class Layout {
  private readonly auth = inject(AuthFacade);
  private readonly notifications = inject(NotificationsFacade);

  protected readonly authenticated = computed(() => this.auth.status() === 'authenticated');
  protected readonly errorMessage = this.notifications.message;

  protected dismiss(): void {
    this.notifications.dismiss();
  }
}
