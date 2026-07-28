import { ChangeDetectionStrategy, Component, inject, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CloudinaryUrlPipe } from '../core/cloudinary-url.pipe';
import { CatalogueFacade } from './catalogue.facade';

const DISH_ROW_TRANSFORMATION = 'c_fill,w_200,h_200,q_auto,f_webp';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CloudinaryUrlPipe],
  template: `
    <div class="mt-4 flex flex-wrap gap-2">
      <button type="button" (click)="save()">Enregistrer</button>
      <a routerLink="/dashboard/catalogue" class="btn-link-alt">Annuler</a>
    </div>

    <ul class="mt-6 divide-y divide-line">
      @for (dish of order(); track dish.itemId; let index = $index) {
        <li class="flex items-center gap-2 py-2">
          @if (dish.imageReference) {
            <img
              class="size-16 shrink-0 rounded-field object-cover"
              [src]="dish.imageReference | cloudinaryUrl: thumbnailTransformation"
              alt=""
            >
          } @else {
            <span class="hatch grid size-16 shrink-0 place-items-center rounded-field text-xs text-line-strong">
              <i class="fa-solid fa-camera" aria-hidden="true"></i>
            </span>
          }
          <span class="min-w-0 flex-1 break-words text-sm font-bold text-ink">{{ dish.name }}</span>
          <button
            type="button"
            class="icon-btn shrink-0"
            [attr.aria-label]="'Descendre ' + dish.name"
            [disabled]="index === order().length - 1"
            (click)="moveDown(index)"
          >
            <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="icon-btn shrink-0"
            [attr.aria-label]="'Monter ' + dish.name"
            [disabled]="index === 0"
            (click)="moveUp(index)"
          >
            <i class="fa-solid fa-chevron-up" aria-hidden="true"></i>
          </button>
        </li>
      }
    </ul>
  `,
})
export class ReorderDishes {
  private readonly catalogue = inject(CatalogueFacade);

  readonly thumbnailTransformation = DISH_ROW_TRANSFORMATION;
  // The vendor's order is theirs alone until they save it, so a failed save leaves what
  // they arranged on screen. It re-seeds from the store when the catalogue arrives cold.
  protected readonly order = linkedSignal(() => this.catalogue.items());

  constructor() {
    if (!this.catalogue.items().length) {
      this.catalogue.load();
    }
  }

  protected save(): void {
    this.catalogue.reorderDishes(this.order().map((dish) => dish.itemId));
  }

  protected moveUp(index: number): void {
    this.swap(index, index - 1);
  }

  protected moveDown(index: number): void {
    this.swap(index, index + 1);
  }

  private swap(a: number, b: number): void {
    this.order.update((dishes) => {
      if (b < 0 || b >= dishes.length) {
        return dishes;
      }
      const reordered = [...dishes];
      [reordered[a], reordered[b]] = [reordered[b], reordered[a]];
      return reordered;
    });
  }
}
