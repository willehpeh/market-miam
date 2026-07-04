import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'mm-welcome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full max-w-sm mx-auto py-4' },
  imports: [RouterLink],
  template: `
    <section class="rounded-card bg-surface p-6 shadow-frame">
      <div class="mb-5 grid size-9 place-items-center rounded-field bg-brand">
        <span class="block size-4 rounded-full bg-white/90"></span>
      </div>
      <p class="kicker">Bienvenue sur Miam</p>
      <h1 class="mt-2 text-2xl leading-tight">Votre stand de marché,<br />en ligne en 10 minutes.</h1>
      <p class="mt-3 text-sm text-ink-soft">
        Sortez votre téléphone — on vous guide pas à pas, photo après photo.
      </p>

      <ul class="mt-6 divide-y divide-line">
        @for (feature of features; track feature.title) {
          <li class="flex gap-3 py-3">
            <span class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-field bg-brand-soft">
              {{ feature.icon }}
            </span>
            <div>
              <p class="text-sm font-bold text-ink">{{ feature.title }}</p>
              <p class="text-xs text-muted">{{ feature.detail }}</p>
            </div>
          </li>
        }
      </ul>

      <button type="button" class="mt-6 w-full" routerLink="/onboarding/storefront">Créer ma vitrine →</button>
    </section>
  `,
})
export class Welcome {
  protected readonly features = [
    { icon: '📷', title: 'Photographiez vos plats', detail: 'Vos photos depuis votre téléphone, recadrées automatiquement.' },
    { icon: '🔗', title: 'Une vitrine en ligne', detail: 'Partageable par lien, QR code ou Instagram.' },
    { icon: '📅', title: 'Votre calendrier de marchés', detail: 'Vos clients savent toujours où vous trouver.' },
  ];
}
