import { ChangeDetectionStrategy, Component, input, viewChild } from '@angular/core';
import { DishViewModel, StorefrontViewModel } from './storefront-view-model';
import { ComingSoonPage } from './coming-soon-page';
import { StorefrontHero } from './storefront-hero';
import { DishCard } from './dish-card';
import { DishSheet } from './dish-sheet';
import { MarketCard } from './market-card';
import { StorefrontFooter } from './storefront-footer';

@Component({
  selector: 'app-storefront-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComingSoonPage, StorefrontHero, DishCard, DishSheet, MarketCard, StorefrontFooter],
  template: `
    @if (storefront(); as storefront) {
      @switch (storefront.status) {
        @case ('published') {
          <main class="mx-auto min-h-dvh max-w-xl bg-surface-sunk">
            <header class="flex items-center gap-3 bg-surface px-5 py-4">
              <img src="logo-transparent.png" alt="Market Miam" class="h-6 w-auto" />
            </header>

            <app-storefront-hero [coverUrl]="storefront.coverUrl" [name]="storefront.name" />

            @if (storefront.description) {
              <section class="px-5 pt-6">
                <p class="text-ink-soft">{{ storefront.description }}</p>
              </section>
            }

            <section class="px-5 py-8">
              <h2 class="kicker">Notre carte</h2>
              <ul class="mt-5 space-y-4">
                @for (dish of storefront.dishes; track dish.itemId) {
                  <li><app-dish-card [dish]="dish" (chosen)="openDish($event)" /></li>
                }
              </ul>
            </section>

            @if (storefront.upcomingMarkets.length) {
              <section class="px-5 pb-8">
                <h2 class="kicker">Prochains marchés</h2>
                <ul class="mt-5 space-y-4">
                  @for (market of storefront.upcomingMarkets; track $index) {
                    <li><app-market-card [market]="market" /></li>
                  }
                </ul>
              </section>
            }

            <app-dish-sheet />

            <app-storefront-footer [name]="storefront.name" [phone]="storefront.phone" />
          </main>
        }
        @case ('coming-soon') {
          <app-coming-soon [name]="storefront.name" />
        }
      }
    } @else {
      <main class="grid min-h-dvh place-items-center bg-surface-sunk p-8 text-center">
        <p class="text-ink-soft">Boutique introuvable</p>
      </main>
    }
  `,
})
export class StorefrontPage {
  readonly storefront = input<StorefrontViewModel | null>(null);
  private readonly sheet = viewChild.required(DishSheet);

  protected openDish(dish: DishViewModel): void {
    this.sheet().open(dish);
  }
}
