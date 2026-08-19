import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MarketDayFacade } from './market-day.facade';

// Separate from the notice because the live screen keeps its rows (decision 48) and so must
// keep its shape: banner, then menu, then the action. Decision 38 puts this exactly where
// *Fermer le stand* stood, at the foot — the card and the editor, whose closed state replaces
// everything, simply render it under the notice.
@Component({
  selector: 'mm-reopen-stand',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="quiet mt-8 flex w-full max-w-xs mx-auto justify-center" (click)="reopen()">
      Rouvrir le stand
    </button>
  `,
})
export class ReopenStand {
  private readonly marketDays = inject(MarketDayFacade);

  readonly marketId = input.required<string>();
  readonly date = input.required<string>();

  reopen(): void {
    this.marketDays.reopen(this.marketId(), this.date());
  }
}
