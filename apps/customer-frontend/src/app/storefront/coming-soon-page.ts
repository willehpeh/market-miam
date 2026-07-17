import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-coming-soon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto grid min-h-dvh max-w-xl place-items-center bg-surface-sunk p-8 text-center">
      <div>
        <img src="logo-transparent.png" alt="Market Miam" class="mx-auto h-7 w-auto" />
        <p class="kicker mt-8">Bientôt en ligne</p>
        @if (name(); as name) {
          <h1 class="mt-2 text-3xl font-bold tracking-tight text-ink">{{ name }}</h1>
        }
        <p class="mx-auto mt-3 max-w-sm text-ink-soft">
          Cette vitrine n'est pas encore ouverte. Revenez bientôt !
        </p>
      </div>
    </main>
  `,
})
export class ComingSoonPage {
  readonly name = input<string | null>(null);

  constructor() {
    inject(Meta).updateTag({ name: 'robots', content: 'noindex' });
  }
}
