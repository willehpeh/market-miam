import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { MarketScheduleFacade } from './market-schedule.facade';
import { MarketScheduleView } from './market-schedules';

const DAY_LABELS: Record<string, string> = {
  MON: 'Lundi',
  TUE: 'Mardi',
  WED: 'Mercredi',
  THU: 'Jeudi',
  FRI: 'Vendredi',
  SAT: 'Samedi',
  SUN: 'Dimanche',
};

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

type DayLine = { day: string; label: string; time: string };
type ScheduleCard = { scheduleId: string; marketName: string; cadence: string; days: DayLine[] };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card],
  template: `
    <mm-card>
      <p class="kicker">Votre calendrier</p>
      <h1 class="mt-2 text-2xl leading-tight">Vos marchés</h1>
      <p class="mt-3 text-sm text-ink-soft">Où et quand vos clients vous trouvent.</p>
    </mm-card>

    <div class="mt-4 space-y-3">
      @for (card of scheduleCards(); track card.scheduleId) {
        <mm-card>
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
        </mm-card>
      }

      <a
        routerLink="/dashboard/markets/new"
        class="flex items-center gap-4 rounded-card border border-dashed border-line-strong bg-surface-sunk p-4 no-underline"
      >
        <span class="grid size-11 shrink-0 place-items-center rounded-field bg-brand-soft text-xl text-brand">+</span>
        <div class="flex-1">
          <p class="font-bold text-ink">Ajouter un marché</p>
          <p class="text-xs text-muted">Récurrent chaque semaine ou date ponctuelle.</p>
        </div>
        <span aria-hidden="true" class="text-2xl leading-none text-muted">›</span>
      </a>
    </div>

    <button type="button" routerLink="/dashboard" class="mt-6 flex w-full max-w-xs mx-auto justify-center">
      {{ continueLabel() }}
    </button>
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
    })),
  );

  readonly continueLabel = computed(() => {
    const count = this.markets.schedules().length;
    return count ? `Continuer · ${count} marché${count > 1 ? 's' : ''}` : 'Continuer';
  });

  constructor() {
    this.markets.load();
  }
}

function cadenceLabel(weeks: number): string {
  return weeks === 1 ? 'chaque semaine' : `toutes les ${weeks} semaines`;
}

function sortedDays(days: MarketScheduleView['days']): MarketScheduleView['days'] {
  return [...days].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
}

function timeRange(day: { startTime?: string; endTime?: string }): string {
  if (!day.startTime) {
    return '';
  }
  const start = formatTime(day.startTime);
  return day.endTime ? `${start} – ${formatTime(day.endTime)}` : start;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = String(Number(hours));
  return minutes === '00' ? `${hour}h` : `${hour}h${minutes}`;
}
