import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { longDate } from '../core/french-date';
import { MarketDayFacade } from './market-day.facade';

@Component({
  selector: 'mm-next-menu-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card],
  template: `
    <mm-card>
      <h1 class="text-xl leading-tight">Prochain marché</h1>

      @if (next(); as day) {
        <a [routerLink]="['/dashboard/menus', day.marketId, day.date]" class="btn-link-alt mt-4">
          <i class="fa-solid fa-utensils" aria-hidden="true"></i>
          Planifier menu
        </a>

        <p class="mt-4 font-bold text-ink">{{ day.label }}</p>
        <p class="text-sm text-muted">{{ day.marketName }}</p>
        @if (day.dishCount) {
          <p class="mt-2 font-mono text-xs uppercase tracking-label text-brand-deep">{{ day.dishCount }}</p>
        }
      } @else {
        <p class="mt-3 text-sm text-ink-soft">Aucun marché dans les 8 prochaines semaines.</p>
      }
    </mm-card>
  `,
})
export class NextMenuCard {
  private readonly marketDays = inject(MarketDayFacade);

  readonly next = computed(() => {
    const day = this.marketDays.days().find((candidate) => !candidate.absent);
    if (!day) {
      return null;
    }
    return {
      marketId: day.marketId,
      date: day.date,
      label: longDate(day.day, day.date),
      marketName: day.market.name,
      dishCount: day.itemIds.length ? `${day.itemIds.length} plat${day.itemIds.length > 1 ? 's' : ''}` : '',
    };
  });

  constructor() {
    this.marketDays.load();
  }
}
