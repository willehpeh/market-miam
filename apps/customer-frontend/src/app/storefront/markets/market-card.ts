import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MarketViewModel } from '../storefront-view-model';

@Component({
  selector: 'app-market-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div
      class="flex items-stretch gap-4 rounded-card p-4 shadow-soft"
      [class.bg-surface]="!market().cancelled"
      [class.bg-neutral-100]="market().cancelled"
      [class.grayscale]="market().cancelled"
    >
      <span class="flex w-16 shrink-0 flex-col items-center justify-center rounded-card bg-brand/10 px-2 py-2 text-center">
        <span class="kicker" [class.text-neutral-500]="market().cancelled">{{ market().weekday }}</span>
        <span class="text-2xl font-bold leading-tight" [class.text-ink]="!market().cancelled" [class.text-neutral-500]="market().cancelled">{{ market().day }}</span>
        <span class="kicker" [class.text-neutral-500]="market().cancelled">{{ market().month }}</span>
      </span>
      <span class="min-w-0 flex-1 pt-1">
        <span class="flex items-baseline gap-2">
          <span class="truncate text-lg font-bold" [class.text-ink]="!market().cancelled" [class.text-neutral-500]="market().cancelled" [class.line-through]="market().cancelled">{{ market().marketName }}</span>
          @if (market().cancelled) {
            <span class="kicker shrink-0 rounded-pill bg-line-strong px-2 py-0.5 normal-case text-neutral-500">Annulé</span>
          }
        </span>
        <span class="mt-1 block" [class.text-ink-soft]="!market().cancelled" [class.text-neutral-500]="market().cancelled">
          @if (market().hours) {
            <span class="block">{{ market().hours }}</span>
          }
          @if (market().address) {
            <span class="block">{{ market().address }}</span>
          }
        </span>
      </span>
    </div>
  `,
})
export class MarketCard {
  readonly market = input.required<MarketViewModel>();
}
