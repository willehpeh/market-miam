import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { longDate, timeRange } from '../core/french-date';
import { MarketDayFacade } from './market-day.facade';
import { hasLiveScreen } from './live-status';

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

        <a [routerLink]="day.link" class="btn-link mt-4">
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
    // The doorway flips on planning plus the server-said today, never the clock alone
    // (decisions 27, 42) — so it leads to the live screen from midnight, not from startTime.
    const live = hasLiveScreen(day);
    return {
      label: longDate(day.day, day.date),
      marketName: day.market.name,
      hours: timeRange(day),
      menu: items ? `${items} plat${items > 1 ? 's' : ''} au menu` : 'Aucun plat au menu',
      action: live ? 'Suivre le marché' : items ? 'Modifier le menu' : 'Planifier le menu',
      link: [live ? '/dashboard/live' : '/dashboard/menus', day.marketId, day.date],
    };
  });

  constructor() {
    this.marketDays.load();
  }
}
