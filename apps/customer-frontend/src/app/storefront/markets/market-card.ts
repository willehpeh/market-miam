import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DishViewModel, MarketViewModel } from '../storefront-view-model';
import { DishCard } from '../dishes/dish-card';

@Component({
  selector: 'app-market-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DishCard],
  host: { class: 'contents' },
  template: `
    <div
      class="rounded-card p-4 shadow-soft"
      [class.bg-surface]="!market().cancelled"
      [class.bg-neutral-100]="market().cancelled"
      [class.grayscale]="market().cancelled"
    >
      <!-- items-start, not items-stretch: the date badge is as tall as its three lines,
           not as tall as whatever menu happens to sit in the row below. -->
      <div class="flex items-start gap-4">
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
            } @else if (market().inProgress) {
              <span class="kicker shrink-0 rounded-pill bg-brand px-2 py-0.5 normal-case text-white">En cours</span>
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

      @if (market().dishes.length) {
        @if (featured()) {
          <!-- The featured day is browsable like the carte: same cards, same sheet. The
               upcoming list stays on names and prices, or one page would carry the same
               dish cards once per market. -->
          <ul data-menu class="mt-4 grid gap-4 border-t border-line pt-4 lg:grid-cols-2">
            @for (dish of market().dishes; track dish.itemId) {
              <li><app-dish-card [dish]="dish" (chosen)="chosen.emit($event)" /></li>
            }
          </ul>
        } @else {
          <ul data-menu class="mt-3 border-t border-line pt-3">
            @for (dish of market().dishes; track dish.itemId) {
              <li class="flex justify-between gap-3 py-0.5 text-sm">
                <span class="min-w-0 break-words text-ink">{{ dish.name }}</span>
                <span class="shrink-0 font-mono text-ink-soft">{{ dish.priceLabel }}</span>
              </li>
            }
          </ul>
        }
      }
    </div>
  `,
})
export class MarketCard {
  readonly market = input.required<MarketViewModel>();
  readonly featured = input(false);
  readonly chosen = output<DishViewModel>();
}
