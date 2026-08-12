import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DishViewModel } from '../storefront-view-model';

// The carte's form of a dish. DishCard is the other one, kept for the day's menu — a
// browse, where this is a list you scan. They share only the dish and the tap, so they
// are two small components rather than one with a mode.
@Component({
  selector: 'app-dish-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <button
      type="button"
      [attr.data-dish]="dish().itemId"
      class="flex h-full w-full items-center gap-4 rounded-card bg-surface p-3 text-left shadow-soft"
      (click)="chosen.emit(dish())"
    >
      @if (dish().photo; as photo) {
        <img [src]="photo.thumbUrl" alt="" class="size-16 shrink-0 rounded-card object-cover" />
      } @else {
        <!-- Dish photos are optional, so the square is held either way: rows that skipped
             it would start at a different left edge and read as broken rather than as
             "no photo". Quieter than the hatch, which is loud at 64px. -->
        <span class="grid size-16 shrink-0 place-items-center rounded-card bg-surface-sunk text-line-strong">
          <i class="fa-solid fa-utensils" aria-hidden="true"></i>
        </span>
      }
      <span class="min-w-0 flex-1">
        <span class="line-clamp-2 block font-bold text-ink">{{ dish().name }}</span>
      </span>
      <span class="shrink-0 font-bold text-ink">{{ dish().priceLabel }}</span>
    </button>
  `,
})
export class DishRow {
  readonly dish = input.required<DishViewModel>();
  readonly chosen = output<DishViewModel>();
}
