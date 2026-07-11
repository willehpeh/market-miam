import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthFacade } from './auth/auth.facade';
import { NotificationsFacade } from './notifications/notifications.facade';
import { LogoutButton } from './auth/logout-button';

@Component({
  selector: 'mm-layout',
  template: `
    <div class="grid min-h-svh grid-rows-[auto_1fr]">
      <header class="sticky top-0 z-40 flex h-15 items-center justify-between px-6 bg-surface">
        <img src="assets/logo-transparent.png" alt="Market Miam" class="h-6 w-auto rounded-2xl">
        @if (authenticated()) {
          <mm-logout-button />
        }
      </header>
      <main class="px-6 py-3 bg-canvas">
        @if (errorMessage(); as message) {
          <div
            role="alert"
            animate.enter="error-enter"
            animate.leave="error-leave"
            class="fixed bottom-4 left-1/2 z-50 w-[calc(100%-3rem)] max-w-md -translate-x-1/2 flex items-center justify-between gap-4 rounded-card bg-surface p-4 text-sm shadow-frame border-2 border-danger"
          >
            <span>{{ message }}</span>
            <button type="button" aria-label="Fermer" (click)="dismiss()">×</button>
          </div>
        }
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, LogoutButton],
  styles: `
    @keyframes error-slide-up {
      from { transform: translate(0, calc(100% + 1rem)); opacity: 0; }
      to   { transform: translate(0, 0); opacity: 1; }
    }
    @keyframes error-slide-down {
      from { transform: translate(0, 0); opacity: 1; }
      to   { transform: translate(0, calc(100% + 1rem)); opacity: 0; }
    }
    .error-enter { animation: error-slide-up 260ms ease-out; }
    .error-leave { animation: error-slide-down 220ms ease-in; }
  `,
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
