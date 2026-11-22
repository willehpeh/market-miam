import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { MarketDayFacade } from './market-day.facade';
import { UnratedMarketDay } from './unrated-market-day';

// Decision 65: the vendor this exists for is the one packing up and driving home, and they
// are exactly the vendor who never judges the morning from the stall. The upcoming list
// drops a day at endTime, so without this a finished market is in nothing their app reads.
@Component({
  selector: 'mm-bilan-prompt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, RouterLink],
  host: { class: 'contents' },
  template: `
    @if (dayToJudge(); as day) {
      <mm-card>
        <h2 class="text-xl leading-tight">Bilan à faire</h2>
        <p class="mt-4 font-bold text-ink">{{ day.label() }}</p>
        <p class="text-sm text-muted">{{ day.marketName() }}</p>
        <a [routerLink]="['/dashboard/market', day.marketId(), day.date(), 'bilan']" class="btn-link mt-4">
          <i class="fa-solid fa-clipboard-check" aria-hidden="true"></i>
          Faire le bilan
        </a>
      </mm-card>
    }
  `,
})
export class BilanPrompt {
  private readonly marketDays = inject(MarketDayFacade);

  // One day, never a list: a backlog is the cross-month retrospective this slice defers,
  // and the query answers oldest first, so this is the one about to fall out of the window.
  readonly dayToJudge = computed((): UnratedMarketDay | undefined => this.marketDays.unrated()[0]);
}
