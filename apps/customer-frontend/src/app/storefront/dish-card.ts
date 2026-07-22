import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DishViewModel } from './storefront-view-model';

@Component({
  selector: 'app-dish-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <button
      type="button"
      [attr.data-dish]="dish().itemId"
      class="block w-full rounded-card bg-surface p-4 text-left shadow-soft"
      (click)="chosen.emit(dish())"
    >
      @if (dish().photo; as photo) {
        <img [src]="photo.cardUrl" alt="" class="mb-3 aspect-16/10 w-full rounded-card object-cover" />
      }
      <span class="block">
        <span class="flex items-baseline justify-between gap-3">
          <span class="line-clamp-2 text-lg font-bold text-ink">{{ dish().name }}</span>
          <span class="shrink-0 text-lg font-bold text-ink">{{ dish().priceLabel }}</span>
        </span>
      </span>
    </button>
  `,
})
export class DishCard {
  readonly dish = input.required<DishViewModel>();
  readonly chosen = output<DishViewModel>();
}
