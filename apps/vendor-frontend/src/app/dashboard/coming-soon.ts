import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card } from '../core/card';

@Component({
  selector: 'mm-coming-soon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card],
  template: `
    <mm-card>
      <p class="kicker">Bientôt disponible</p>
      <h1 class="mt-2 text-2xl leading-tight">{{ title }}</h1>
      <p class="mt-3 text-sm text-ink-soft">Cette étape arrive très prochainement.</p>
      <a class="mt-6 inline-block text-sm font-bold text-brand no-underline" routerLink="/dashboard">← Retour à mon installation</a>
    </mm-card>
  `,
})
export class ComingSoon {
  protected readonly title = inject(ActivatedRoute).snapshot.data['title'] as string;
}
