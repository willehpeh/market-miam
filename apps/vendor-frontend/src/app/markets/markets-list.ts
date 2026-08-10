import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { DAY_LABELS, timeRange } from '../core/french-date';
import { MarketScheduleFacade } from './market-schedule.facade';
import { MarketScheduleView } from './market-schedules';

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

type DayLine = { day: string; label: string; time: string };
type ScheduleCard = { scheduleId: string; marketName: string; cadence: string; days: DayLine[] };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card],
  template: `
    <mm-card back="/dashboard">
      <h1 class="text-xl leading-tight">Vos marchés</h1>
      <p class="mt-3 text-sm text-ink-soft">Où et quand vos clients vous trouvent.</p>

      <div class="mt-4 flex flex-wrap gap-2">
        <a routerLink="/dashboard/markets/new" class="btn-link">
          <i class="fa-solid fa-plus" aria-hidden="true"></i>
          Ajouter
        </a>
      </div>

      <ul class="mt-6 space-y-3">
        @for (card of scheduleCards(); track card.scheduleId) {
          <li>
            <a
              [routerLink]="['/dashboard/markets', card.scheduleId, 'edit']"
              class="block rounded-card border border-line bg-surface p-3 no-underline"
            >
              <div class="flex items-start justify-between gap-3">
                <h2 class="font-bold text-ink">{{ card.marketName }}</h2>
                <span aria-hidden="true" class="text-xl leading-none text-muted">›</span>
              </div>
              <p class="text-xs text-muted">{{ card.cadence }}</p>
              <dl class="mt-3 space-y-1.5">
                @for (day of card.days; track day.day) {
                  <div class="flex items-baseline justify-between gap-4 text-sm">
                    <dt class="font-bold text-ink">{{ day.label }}</dt>
                    <dd class="text-muted">{{ day.time }}</dd>
                  </div>
                }
              </dl>
            </a>
          </li>
        } @empty {
          <li class="text-sm text-ink-soft">Votre calendrier est vide pour l'instant.</li>
        }
      </ul>
    </mm-card>
  `,
})
export class MarketsList {
  private readonly markets = inject(MarketScheduleFacade);

  readonly scheduleCards = computed<ScheduleCard[]>(() =>
    this.markets.schedules().map((schedule) => ({
      scheduleId: schedule.scheduleId,
      marketName: schedule.market.name,
      cadence: cadenceLabel(schedule.frequency.weeks),
      days: sortedDays(schedule.days).map((day) => ({
        day: day.day,
        label: DAY_LABELS[day.day] ?? day.day,
        time: timeRange(day),
      })),
    })).reverse(),
  );

  constructor() {
    // ponytail: load only when cold, so an optimistic insert (from adding a schedule)
    // isn't clobbered by a re-GET while the projection lags. Dashboard warms the store.
    if (!this.markets.schedules().length) {
      this.markets.load();
    }
  }
}

function cadenceLabel(weeks: number): string {
  return weeks === 1 ? 'chaque semaine' : `toutes les ${weeks} semaines`;
}

function sortedDays(days: MarketScheduleView['days']): MarketScheduleView['days'] {
  return [...days].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
}

