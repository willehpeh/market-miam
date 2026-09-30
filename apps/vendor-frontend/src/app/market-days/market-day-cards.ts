import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { longDate, timeRange } from '../core/french-date';
import { MarketDayFacade } from './market-day.facade';
import { hasLiveScreen, isToday } from './live-screen/live-status';
import { MarketDayView } from './market-days';
import { ClosedNotice } from './closed-notice';
import { ReopenStand } from './reopen-stand';

@Component({
  selector: 'mm-market-day-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ClosedNotice, ReopenStand, RouterLink, Card],
  host: { class: 'contents' },
  styles: `
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
    @for (day of cards(); track day.marketId + day.date) {
      <mm-card>
        <h2 class="text-xl leading-tight">{{ day.heading }}</h2>

        <p class="mt-4 font-bold text-ink">{{ day.label }}</p>
        <p class="text-sm text-muted">{{ day.marketName }}</p>
        @if (day.hours) {
          <p class="text-sm text-muted">{{ day.hours }}</p>
        }
        <p class="mt-3 text-sm text-ink-soft">{{ day.menu }}</p>
        
        @if (day.closed) {
          <mm-closed-notice />
          <mm-reopen-stand [marketId]="day.marketId" [date]="day.date" />
        } @else {
          <a [routerLink]="day.link" class="btn-link mt-4">
            <i class="fa-solid fa-calendar-check" aria-hidden="true"></i>
            {{ day.action }}
          </a>
          
          @if (day.today) {
            <button type="button" class="plain mt-4 flex w-full justify-center text-sm" (click)="callOff(day)">
              Je ne peux pas venir aujourd'hui
            </button>
          }
        }
      </mm-card>
    } @empty {
      <mm-card>
        <h2 class="text-xl leading-tight">Prochain marché</h2>
        <p class="mt-3 text-sm text-ink-soft">Aucun marché dans les 8 prochaines semaines.</p>
      </mm-card>
    }
  `,
})
export class MarketDayCards {
  private readonly marketDays = inject(MarketDayFacade);

  // Two cards, not one (decision 76): today is a market to run and the next one is a market
  // to plan, and while a closed or trading today held the single card, the day after it was
  // reachable from nowhere in the app. Today first — a vendor opening the app on a market
  // morning wants the morning.
  readonly cards = computed(() => {
    const days = this.marketDays.days().filter(day => !day.absent);
    const today = days.find(isToday);
    const next = days.find(day => !isToday(day));
    return [
      ...(today ? [this.cardFor("Aujourd'hui", today)] : []),
      ...(next ? [this.cardFor('Prochain marché', next)] : []),
    ];
  });

  callOff(day: { marketId: string; date: string }): void {
    this.marketDays.close(day.marketId, day.date);
  }

  constructor() {
    this.marketDays.load();
  }

  private cardFor(heading: string, day: MarketDayView) {
    const items = day.itemIds.length;
    // The doorway flips on planning plus the server-said today, never the clock alone
    // (decisions 27, 42) — so it leads to the live screen from midnight, not from startTime.
    const live = hasLiveScreen(day);
    return {
      heading,
      label: longDate(day.day, day.date),
      marketName: day.market.name,
      hours: timeRange(day),
      menu: items ? `${items} plat${items > 1 ? 's' : ''} au menu` : 'Aucun plat au menu',
      action: live ? 'Suivre le marché' : items ? 'Modifier le menu' : 'Planifier le menu',
      link: ['/dashboard/market', day.marketId, day.date, live ? 'live' : 'menu'],
      marketId: day.marketId,
      date: day.date,
      today: isToday(day),
      closed: day.closed,
    };
  }
}
