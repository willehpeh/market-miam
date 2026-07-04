import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';

@Component({
  selector: 'mm-welcome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card],
  template: `
    <mm-card>
      <p class="kicker">Bienvenue sur Market Miam</p>
      <h1 class="mt-2 text-2xl leading-tight">Votre stand de marché, en ligne en 10 minutes.</h1>
      <p class="mt-3 text-sm text-ink-soft">
        Depuis votre téléphone — on vous guide pas à pas, photo après photo.
      </p>

      <ul class="mt-6 divide-y divide-line max-w-lg mx-auto">
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

      <button type="button" class="mt-6 flex w-full max-w-xs mx-auto" routerLink="/onboarding/storefront">Créer ma vitrine →</button>
    </mm-card>
  `,
})
export class Welcome {
  protected readonly features = [
    { icon: '📷', title: 'Photographiez vos plats', detail: 'Vos clients mangent d\'abord avec les yeux.' },
    { icon: '🔗', title: 'Une vitrine en ligne', detail: 'Partageable par lien ou QR code.' },
    { icon: '📅', title: 'Votre calendrier de marchés', detail: 'Vos clients sauront toujours où vous trouver.' },
  ];
}
