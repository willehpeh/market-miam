import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { longDate } from '../core/french-date';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { MarketDayFacade } from './market-day.facade';

@Component({
  selector: 'mm-live-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, RouterLink, Spinner],
  template: `
    <mm-card back="/dashboard">
      @if (loading()) {
        <div class="mx-auto grid h-32 place-items-center">
          <mm-spinner label="Chargement du marché…" />
        </div>
      } @else if (day(); as marketDay) {
        <h1 class="text-xl leading-tight">{{ marketDay.label }}</h1>
        <p class="mt-3 text-sm text-ink-soft">{{ marketDay.marketName }}</p>

        <ul class="mt-6 space-y-2">
          @for (item of items(); track item.itemId) {
            <li class="rounded-card border border-line bg-surface p-3 font-bold text-ink">
              {{ item.name }}
            </li>
          }
        </ul>
      } @else {
        <!-- Decision 41: the commands this screen fires are refused for any day but
             today, so the screen declines the same thing — no route guard. -->
        <p class="text-sm text-ink-soft">Ce marché n'a pas lieu aujourd'hui.</p>
        <a routerLink="/dashboard" class="mt-4 inline-block font-bold text-brand no-underline">
          Retour au tableau de bord
        </a>
      }
    </mm-card>
  `,
})
export class LiveScreen {
  private readonly marketDays = inject(MarketDayFacade);
  private readonly catalogue = inject(CatalogueFacade);
  private readonly route = inject(ActivatedRoute);

  private readonly marketId = this.route.snapshot.paramMap.get('marketId') ?? '';
  private readonly date = this.route.snapshot.paramMap.get('date') ?? '';

  readonly loading = computed(() => this.marketDays.loading() || this.catalogue.loading());

  private readonly occurrence = computed(() =>
    this.marketDays.days().find((candidate) => candidate.marketId === this.marketId && candidate.date === this.date),
  );

  readonly day = computed(() => {
    const occurrence = this.occurrence();
    return occurrence?.today
      ? { label: longDate(occurrence.day, occurrence.date), marketName: occurrence.market.name }
      : undefined;
  });

  // The rows are the day's menu, not the catalogue: what the vendor brought, in
  // catalogue order — same join the editor makes, narrowed to the planned set.
  readonly items = computed(() => {
    const planned = new Set(this.occurrence()?.itemIds ?? []);
    return this.catalogue.items().filter((item) => planned.has(item.itemId));
  });

  constructor() {
    this.marketDays.load();
    if (!this.catalogue.items().length) {
      this.catalogue.load();
    }
  }
}
