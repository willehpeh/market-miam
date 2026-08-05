import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card],
  template: `
    <mm-card back="/dashboard">
      <h1 class="text-2xl leading-tight">Ma vitrine</h1>

      <ul class="mt-2 divide-y divide-line">
        @for (destination of destinations; track destination.title) {
          <li>
            <a [routerLink]="destination.link" class="flex items-center gap-4 py-5 no-underline">
              <p class="flex-1 text-lg font-bold text-ink">{{ destination.title }}</p>
              <span aria-hidden="true" class="text-2xl leading-none text-muted">›</span>
            </a>
          </li>
        }
      </ul>
    </mm-card>
  `,
})
export class ManageStorefront {
  protected readonly destinations = [
    { title: 'Informations', link: '/dashboard/information' },
    { title: 'Mon catalogue', link: '/dashboard/catalogue' },
    { title: 'Mes marchés', link: '/dashboard/markets' },
  ];
}
