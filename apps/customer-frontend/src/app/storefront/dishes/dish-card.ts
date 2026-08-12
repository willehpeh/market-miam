import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DishViewModel } from '../storefront-view-model';

@Component({
  selector: 'app-dish-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <!-- h-full so a row of cards shares one height, and the price line sits on the
         baseline of the tallest rather than wherever its own text happens to end. -->
    <button
      type="button"
      [attr.data-dish]="dish().itemId"
      class="flex h-full w-full flex-col rounded-card bg-surface p-4 text-left shadow-soft justify-start"
      (click)="chosen.emit(dish())"
    >
      @if (dish().photo; as photo) {
        <img [src]="photo.cardUrl" alt="" class="mb-3 aspect-16/10 w-full rounded-card object-cover" />
      } @else {
        <!-- Dish photos are optional, so a real carte mixes the two. The canvas keeps the
             card's shape without pretending a photo is loading. -->
        <span class="mb-3 grid aspect-16/10 w-full place-items-center rounded-card bg-canvas text-2xl text-line-strong">
          <i class="fa-solid fa-utensils" aria-hidden="true"></i>
        </span>
      }
      <span class="block w-full">
        <span class="flex justify-between gap-3 w-full">
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
