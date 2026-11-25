import { ChangeDetectionStrategy, Component, inject, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogueFacade } from './catalogue.facade';
import { DishThumbnail } from './dish-thumbnail';
import { MoveButtons } from '../core/move-buttons';
import { Arrangement } from '../core/arrangement';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DishThumbnail, MoveButtons],
  template: `
    <div class="mt-4 flex flex-wrap gap-2">
      <button type="button" (click)="save()">Enregistrer</button>
      <a routerLink="/dashboard/catalogue" class="btn-link-alt">Annuler</a>
    </div>

    <ul class="mt-6 divide-y divide-line">
      @for (dish of order(); track dish.itemId(); let index = $index) {
        <li class="flex items-center gap-2 py-2">
          <mm-dish-thumbnail [dish]="dish" />
          <span class="min-w-0 flex-1 break-words text-sm font-bold text-ink">{{ dish.name() }}</span>
          <mm-move-buttons
            [label]="dish.name()"
            [first]="$first"
            [last]="$last"
            (moveUp)="moveUp(index)"
            (moveDown)="moveDown(index)"
          />
        </li>
      }
    </ul>
  `,
})
export class ReorderItems {
  private readonly catalogue = inject(CatalogueFacade);

  // The vendor's order is theirs alone until they save it, so a failed save leaves what
  // they arranged on screen. It re-seeds from the store when the catalogue arrives cold.
  protected readonly order = linkedSignal(() => this.catalogue.items());

  constructor() {
    this.catalogue.load();
  }

  protected save(): void {
    this.catalogue.reorderItems(this.order().map((dish) => dish.itemId()));
  }

  protected moveUp(index: number): void {
    this.order.update((dishes) => new Arrangement(dishes).movedUp(index));
  }

  protected moveDown(index: number): void {
    this.order.update((dishes) => new Arrangement(dishes).movedDown(index));
  }
}
