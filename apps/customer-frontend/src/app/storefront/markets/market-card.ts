import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ItemViewModel, MarketViewModel } from '../storefront-view-model';
import { ItemCard } from '../items/item-card';

@Component({
  selector: 'app-market-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemCard],
  host: { class: 'contents' },
  template: `
    @let day = market();
    <div
      class="rounded-card p-4 shadow-soft"
      [class.bg-surface]="!day.cancelled"
      [class.bg-neutral-100]="day.cancelled"
      [class.grayscale]="day.cancelled"
    >
      <!-- items-start, not items-stretch: the date badge is as tall as its three lines,
           not as tall as whatever menu happens to sit in the row below. -->
      <div class="flex items-start gap-4">
        <span class="flex w-16 shrink-0 flex-col items-center justify-center rounded-card bg-brand/10 px-2 py-2 text-center">
          <span class="kicker" [class.text-neutral-500]="day.cancelled">{{ day.weekday }}</span>
          <span class="text-2xl font-bold leading-tight" [class.text-ink]="!day.cancelled" [class.text-neutral-500]="day.cancelled">{{ day.day }}</span>
          <span class="kicker" [class.text-neutral-500]="day.cancelled">{{ day.month }}</span>
        </span>
        <span class="min-w-0 flex-1 pt-1">
          <span class="flex items-baseline gap-2">
            <span class="truncate text-lg font-bold" [class.text-ink]="!day.cancelled" [class.text-neutral-500]="day.cancelled" [class.line-through]="day.cancelled">{{ day.marketName }}</span>
            @if (day.cancelled) {
              <span class="kicker shrink-0 rounded-pill bg-line-strong px-2 py-0.5 normal-case text-neutral-500">Annulé</span>
            } @else if (day.inProgress) {
              <span class="kicker shrink-0 rounded-pill bg-brand px-2 py-0.5 normal-case text-white">En cours</span>
            }
          </span>
          <span class="mt-1 block" [class.text-ink-soft]="!day.cancelled" [class.text-neutral-500]="day.cancelled">
            @if (day.hours) {
              <span class="block">{{ day.hours }}</span>
            }
            @if (day.address) {
              <span class="block">{{ day.address }}</span>
            }
          </span>
        </span>
      </div>

      @if (day.items.length) {
        @if (featured()) {
          <!-- The featured day is browsable like the carte: same cards, same sheet. The
               upcoming list stays on names, or one page would carry the same
               item cards once per market. aria-live on the list only (decision 20): the
               poll greys rows with no user action, and scoping it wider would re-announce
               everything around them. -->
          <ul data-menu aria-live="polite" class="mt-4 grid gap-4 border-t border-line pt-4 lg:grid-cols-2">
            @for (item of day.items; track item.itemId) {
              <li><app-item-card [item]="item" (chosen)="chosen.emit($event)" /></li>
            }
          </ul>
        } @else {
          <ul data-menu class="mt-3 border-t border-line pt-3">
            @for (item of day.items; track item.itemId) {
              <li class="flex justify-between gap-3 py-0.5 text-sm">
                <span class="min-w-0 break-words text-ink">{{ item.name }}</span>
                @if (item.priceLabel) {
                  <span class="shrink-0 font-mono text-ink-soft">{{ item.priceLabel }}</span>
                }
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
  readonly chosen = output<ItemViewModel>();
}
