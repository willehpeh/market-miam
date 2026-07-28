import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CloudinaryUrlPipe } from '../core/cloudinary-url.pipe';
import { CatalogueFacade } from './catalogue.facade';
import { formatEuros } from './money';

const DISH_THUMBNAIL_TRANSFORMATION = 'c_fill,w_200,h_200,q_auto,f_webp';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CloudinaryUrlPipe],
  template: `
    <div class="mt-4 flex flex-wrap gap-2">
      <a routerLink="/dashboard/catalogue/new" class="btn-link">
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
        Ajouter
      </a>
      @if (dishes().length > 1) {
        <a routerLink="/dashboard/catalogue/order" class="btn-link-alt">
          <i class="fa-solid fa-list-ol" aria-hidden="true"></i>
          Changer l'ordre
        </a>
      }
    </div>

    <ul class="mt-6 space-y-3">
      @for (dish of dishes(); track dish.itemId) {
        <li>
          <a
            [routerLink]="['/dashboard/catalogue', dish.itemId, 'edit']"
            class="block rounded-card border border-line bg-surface p-3 no-underline"
          >
            <div class="flex items-center gap-4">
              @if (dish.imageReference) {
                <img
                  class="size-16 shrink-0 rounded-field object-cover"
                  [src]="dish.imageReference | cloudinaryUrl: thumbnailTransformation"
                  alt=""
                >
              } @else {
                <span class="hatch grid size-16 shrink-0 place-items-center rounded-field text-lg text-line-strong">
                  <i class="fa-solid fa-camera" aria-hidden="true"></i>
                </span>
              }
              <div class="min-w-0 flex-1">
                <p class="break-words text-sm font-bold text-ink">{{ dish.name }}</p>
                @if (dish.formats) {
                  <p class="font-mono text-xs uppercase tracking-label text-muted">{{ dish.formats.length }} formats</p>
                }
              </div>
              <p class="font-mono text-sm font-bold text-ink text-right">{{ dish.priceLabel }}</p>
            </div>
            @if (dish.formats) {
              <ul class="mt-3 space-y-1 border-t border-line pt-3">
                @for (format of dish.formats; track format.name) {
                  <li class="flex justify-between gap-3 text-sm">
                    <span class="min-w-0 break-words text-ink-soft">{{ format.name }}</span>
                    <span class="shrink-0 font-mono text-ink-soft">{{ format.priceLabel }}</span>
                  </li>
                }
              </ul>
            }
          </a>
        </li>
      } @empty {
        <li class="text-sm text-ink-soft">Votre carte est vide pour l'instant.</li>
      }
    </ul>
  `,
})
export class CatalogueList {
  private readonly catalogue = inject(CatalogueFacade);

  readonly thumbnailTransformation = DISH_THUMBNAIL_TRANSFORMATION;
  readonly dishes = computed(() =>
    this.catalogue.items().map((item) => item.variants
      ? {
          itemId: item.itemId,
          name: item.name,
          imageReference: item.imageReference,
          priceLabel: `dès\n${formatEuros(Math.min(...item.variants.map((v) => v.price)))}`,
          formats: item.variants.map((v) => ({ name: v.name, priceLabel: formatEuros(v.price) })),
        }
      : {
          itemId: item.itemId,
          name: item.name,
          imageReference: item.imageReference,
          priceLabel: formatEuros(item.price ?? 0),
          formats: null as { name: string; priceLabel: string }[] | null,
        },
    ),
  );

  constructor() {
    // ponytail: load only when cold, so an optimistic insert (from adding a dish) isn't
    // clobbered by a re-GET. Dashboard warms the store.
    if (!this.catalogue.items().length) {
      this.catalogue.load();
    }
  }
}
