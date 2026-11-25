import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogueFacade } from './catalogue.facade';
import { DishThumbnail } from './dish-thumbnail';
import { StorefrontFacade } from '../storefront/storefront.facade';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DishThumbnail],
  template: `
    <!-- The choice lives here, not on the page above it: it governs the whole carte, so it
         has no business on the screens for one dish or for the ordering. Rendered only once
         the vitrine has loaded — a switch that guesses would tell a vendor who hid their
         prices that they are showing, and their first tap would save over it. -->
    @if (storefrontView(); as vitrine) {
      <div class="mt-4 flex items-center gap-4 rounded-field border border-line bg-surface-sunk px-3 py-2.5">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold text-ink">Prix sur la page&nbsp;Carte</p>
          <span class="font-mono text-[0.65rem] font-bold uppercase tracking-label text-muted">
            {{ vitrine.cartePricesVisible ? 'Affichés' : 'Masqués' }}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Prix sur la page Carte"
          [attr.aria-checked]="vitrine.cartePricesVisible"
          (click)="setCartePricesVisible(!vitrine.cartePricesVisible)"
          class="relative h-[30px] w-[52px] shrink-0 rounded-pill border p-0 shadow-none"
          [class.bg-brand]="vitrine.cartePricesVisible"
          [class.border-brand]="vitrine.cartePricesVisible"
          [class.bg-line-strong]="!vitrine.cartePricesVisible"
          [class.border-line-strong]="!vitrine.cartePricesVisible"
        >
          <span
            class="absolute top-[2px] size-[22px] rounded-pill bg-surface shadow-soft transition-[left]"
            [class.left-[26px]]="vitrine.cartePricesVisible"
            [class.left-[2px]]="!vitrine.cartePricesVisible"
          ></span>
        </button>
      </div>
      @if (!vitrine.cartePricesVisible) {
        <p class="mt-2 flex items-start gap-1.5 px-1 text-xs leading-snug text-muted">
          <i class="fa-solid fa-circle-info mt-0.5 shrink-0 text-brand" aria-hidden="true"></i>
          Sur votre vitrine, « Prochain marché » affiche toujours ses prix.
        </p>
      }
    }

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
      @for (dish of dishes(); track dish.itemId()) {
        @let pricing = dish.pricing();
        <li>
          <a
            [routerLink]="['/dashboard/catalogue', dish.itemId(), 'edit']"
            class="block rounded-card border border-line bg-surface p-3 no-underline"
          >
            <div class="flex items-center gap-4">
              <mm-dish-thumbnail [dish]="dish" />
              <div class="min-w-0 flex-1">
                <p class="break-words text-sm font-bold text-ink">{{ dish.name() }}</p>
                @if (pricing.isSoldByVariant()) {
                  <p class="font-mono text-xs uppercase tracking-label text-muted">{{ pricing.variants().length }} formats</p>
                }
                @if (!dish.allergensDeclared()) {
                  <p class="mt-1 flex items-center gap-1.5 text-xs font-bold text-danger">
                    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    Allergènes à renseigner
                  </p>
                }
              </div>
              <p class="shrink-0 whitespace-pre text-right font-mono text-sm font-bold text-ink">{{ pricing.label() }}</p>
            </div>
            @if (pricing.isSoldByVariant()) {
              <ul class="mt-3 space-y-1 border-t border-line pt-3">
                @for (variant of pricing.variants(); track variant.name()) {
                  <li class="flex justify-between gap-3 text-sm">
                    <span class="min-w-0 break-words text-ink-soft">{{ variant.name() }}</span>
                    <span class="shrink-0 font-mono text-ink-soft">{{ variant.price().label() }}</span>
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
  private readonly storefront = inject(StorefrontFacade);

  readonly storefrontView = this.storefront.view;

  setCartePricesVisible(visible: boolean): void {
    this.storefront.setCartePricesVisible(visible);
  }

  readonly dishes = this.catalogue.items;

  constructor() {
    this.catalogue.load();
    this.storefront.load();
  }
}
