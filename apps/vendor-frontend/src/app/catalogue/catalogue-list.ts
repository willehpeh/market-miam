import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { CloudinaryUrlPipe } from '../core/cloudinary-url.pipe';
import { CatalogueFacade } from './catalogue.facade';

const DISH_THUMBNAIL_TRANSFORMATION = 'c_fill,w_200,h_200,q_auto,f_webp';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, CloudinaryUrlPipe],
  template: `
    <mm-card>
      <p class="kicker">Votre catalogue</p>
      <h1 class="mt-2 text-2xl leading-tight">Ajoutez vos plats</h1>
      <p class="mt-3 text-sm text-ink-soft">Constituez votre carte. Chaque plat prend 30 secondes.</p>

      <ul class="mt-6 space-y-3">
        @for (dish of dishes(); track dish.itemId) {
          <li class="flex items-center gap-4 rounded-card border border-line bg-surface p-3">
            @if (dish.imageReference) {
              <img
                class="size-16 shrink-0 rounded-field object-cover"
                [src]="dish.imageReference | cloudinaryUrl: thumbnailTransformation"
                [alt]="dish.name"
              >
            } @else {
              <span class="hatch grid size-16 shrink-0 place-items-center rounded-field text-lg text-line-strong">
                <i class="fa-solid fa-camera" aria-hidden="true"></i>
              </span>
            }
            <p class="flex-1 font-bold text-ink">{{ dish.name }}</p>
            <p class="shrink-0 font-mono font-bold text-ink">{{ dish.priceLabel }}</p>
          </li>
        }

        <li>
          <a
            routerLink="/dashboard/catalogue/new"
            class="flex items-center gap-4 rounded-card border border-dashed border-line-strong bg-surface-sunk p-3 no-underline"
          >
            <span class="grid size-16 shrink-0 place-items-center rounded-field bg-brand-soft text-xl text-brand">
            <i class="fa-solid fa-camera" aria-hidden="true"></i>
          </span>
            <div class="flex-1">
              <p class="font-bold text-ink">Ajouter un plat</p>
              <p class="text-xs text-muted">Prenez-le en photo, on remplit le reste.</p>
            </div>
            <span aria-hidden="true" class="text-2xl leading-none text-brand">+</span>
          </a>
        </li>
      </ul>

      <button type="button" routerLink="/dashboard" class="mt-6 flex w-full max-w-xs mx-auto justify-center">
        {{ continueLabel() }}
      </button>
    </mm-card>
  `,
})
export class CatalogueList {
  private readonly catalogue = inject(CatalogueFacade);

  readonly thumbnailTransformation = DISH_THUMBNAIL_TRANSFORMATION;
  readonly dishes = computed(() =>
    this.catalogue.items().map((item) => ({ ...item, priceLabel: formatEuros(item.price) })),
  );
  readonly continueLabel = computed(() => {
    const count = this.dishes().length;
    return count ? `Continuer · ${count} plat${count > 1 ? 's' : ''}` : 'Continuer';
  });

  constructor() {
    // ponytail: load only when cold, so an optimistic insert (from adding a dish) isn't
    // clobbered by a re-GET. Dashboard warms the store.
    if (!this.catalogue.items().length) {
      this.catalogue.load();
    }
  }
}

function formatEuros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}
