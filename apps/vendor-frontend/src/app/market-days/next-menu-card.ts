import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { longDate, timeRange } from '../core/french-date';
import { MarketDayFacade } from './market-day.facade';
import { hasLiveScreen } from './live-status';
import { ClosedNotice } from './closed-notice';
import { ReopenStand } from './reopen-stand';

@Component({
  selector: 'mm-next-menu-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ClosedNotice, ReopenStand, RouterLink, Card],
  styles: `
    /* A door, not a call to action — it sits under the card's action and must not compete
       with it (decision 55). */
    .plain {
      background: transparent;
      color: var(--color-ink-soft);
      box-shadow: none;
      padding: 0;
      text-decoration: underline;
    }
    .plain:hover,
    .plain:active {
      background: transparent;
      color: var(--color-ink);
    }
  `,
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

        <!-- Decision 51: closed is read before the menu is, or a closed day still offers
             the planning verb and a save decision 29 refuses. -->
        @if (day.closed) {
          <mm-closed-notice />
          <mm-reopen-stand [marketId]="day.marketId" [date]="day.date" />
        } @else {
          <a [routerLink]="day.link" class="btn-link mt-4">
            <i class="fa-solid fa-calendar-check" aria-hidden="true"></i>
            {{ day.action }}
          </a>

          <!-- Decision 55: the vendor who cannot come opens the app to this screen, so the
               call-off is here rather than behind a verb about planning. -->
          @if (day.today) {
            <button type="button" class="plain mt-4 flex w-full justify-center text-sm" (click)="callOff(day)">
              Je ne peux pas venir aujourd'hui
            </button>
          }
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
      marketId: day.marketId,
      date: day.date,
      today: day.today,
      closed: day.closed,
    };
  });

  callOff(day: { marketId: string; date: string }): void {
    this.marketDays.close(day.marketId, day.date);
  }

  constructor() {
    this.marketDays.load();
  }
}
