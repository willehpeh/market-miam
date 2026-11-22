import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { MarketDay } from './market-day';
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
    @for (card of cards(); track card.heading) {
      <mm-card>
        <h2 class="text-xl leading-tight">{{ card.heading }}</h2>

        <p class="mt-4 font-bold text-ink">{{ card.day.label() }}</p>
        <p class="text-sm text-muted">{{ card.day.marketName() }}</p>
        @if (card.day.hours(); as hours) {
          <p class="text-sm text-muted">{{ hours }}</p>
        }
        <p class="mt-3 text-sm text-ink-soft">{{ card.menu }}</p>

        @if (card.day.isClosed()) {
          <mm-closed-notice />
          <mm-reopen-stand (reopen)="reopen.emit(card.day)" />
        } @else {
          <a [routerLink]="card.link" class="btn-link mt-4">
            <i class="fa-solid fa-calendar-check" aria-hidden="true"></i>
            {{ card.action }}
          </a>

          @if (card.day.isToday()) {
            <button type="button" class="plain mt-4 flex w-full justify-center text-sm" (click)="callOff.emit(card.day)">
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
  readonly days = input.required<MarketDay[]>();

  readonly callOff = output<MarketDay>();
  readonly reopen = output<MarketDay>();

  // Two cards, not one (decision 76): today is a market to run and the next one is a market
  // to plan, and while a closed or trading today held the single card, the day after it was
  // reachable from nowhere in the app. Today first — a vendor opening the app on a market
  // morning wants the morning.
  readonly cards = computed(() => {
    const days = this.days().filter(day => !day.isAbsent());
    const today = days.find(day => day.isToday());
    const next = days.find(day => !day.isToday());
    return [
      ...(today ? [this.cardFor("Aujourd'hui", today)] : []),
      ...(next ? [this.cardFor('Prochain marché', next)] : []),
    ];
  });

  private cardFor(heading: string, day: MarketDay) {
    const items = day.menuItemIds().length;
    // The doorway flips on planning plus the server-said today, never the clock alone
    // (decisions 27, 42) — so it leads to the live screen from midnight, not from startTime.
    const live = day.hasLiveScreen();
    return {
      heading,
      day,
      menu: items ? `${items} plat${items > 1 ? 's' : ''} au menu` : 'Aucun plat au menu',
      action: live ? 'Suivre le marché' : items ? 'Modifier le menu' : 'Planifier le menu',
      link: ['/dashboard/market', day.marketId(), day.date(), live ? 'live' : 'menu'],
    };
  }
}
