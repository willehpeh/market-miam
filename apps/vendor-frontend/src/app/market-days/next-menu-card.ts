import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { longDate, timeRange } from '../core/french-date';
import { MarketDayFacade } from './market-day.facade';

@Component({
  selector: 'mm-next-menu-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card],
  template: `
    <mm-card>
      <h2 class="text-xl leading-tight">Prochain marché</h2>

      @if (next(); as day) {
        <p class="mt-4 font-bold text-ink">{{ day.label }}</p>
        <p class="text-sm text-muted">{{ day.marketName }}</p>
        @if (day.hours) {
          <p class="text-sm text-muted">{{ day.hours }}</p>
        }
        <!-- Stated either way: an unplanned day and a deliberately cleared one are both
             legal, and without this line they look identical. -->
        <p class="mt-3 text-sm text-ink-soft">{{ day.menu }}</p>

        <a [routerLink]="['/dashboard/menus', day.marketId, day.date]" class="btn-link mt-4">
          <i class="fa-solid fa-calendar-check" aria-hidden="true"></i>
          {{ day.action }}
        </a>
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
    const items = day.itemIds.length;
    return {
      marketId: day.marketId,
      date: day.date,
      label: longDate(day.day, day.date),
      marketName: day.market.name,
      hours: timeRange(day),
      menu: items ? `${items} plat${items > 1 ? 's' : ''} au menu` : 'Aucun plat au menu',
      action: items ? 'Modifier le menu' : 'Planifier le menu',
    };
  });

  constructor() {
    this.marketDays.load();
  }
}
