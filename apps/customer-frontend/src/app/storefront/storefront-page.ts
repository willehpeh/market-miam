import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, viewChild } from '@angular/core';
import { DishViewModel, StorefrontViewModel } from './storefront-view-model';
import { StorefrontMetadata } from './storefront-metadata';
import { currentOrigin } from '../core/request-url';
import { ComingSoonPage } from './coming-soon/coming-soon-page';
import { StorefrontHero } from './layout/storefront-hero';
import { DishRow } from './dishes/dish-row';
import { DishSheet } from './dishes/dish-sheet';
import { MarketCard } from './markets/market-card';
import { StorefrontFooter } from './layout/storefront-footer';

@Component({
  selector: 'app-storefront-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComingSoonPage, StorefrontHero, DishRow, DishSheet, MarketCard, StorefrontFooter],
  template: `
    @if (storefront(); as storefront) {
      @switch (storefront.status) {
        @case ('published') {
          <main class="mx-auto min-h-dvh max-w-xl bg-surface-sunk lg:max-w-6xl">
            <header class="flex items-center gap-3 bg-surface px-5 py-4 lg:px-8">
              <img src="logo-transparent.png" alt="Market Miam" class="h-6 w-auto" />
            </header>

            <app-storefront-hero [coverUrl]="storefront.coverUrl" [name]="storefront.name" />

            <div class="px-5 py-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-10 lg:px-8 lg:py-10">
              <div class="space-y-6 lg:col-span-2 lg:space-y-8">
                @if (storefront.description) {
                  <section>
                    <!-- pre-line, not pre-wrap: honours the paragraph breaks a vendor typed
                         without also preserving stray runs of spaces from a paste. -->
                    <p class="whitespace-pre-line text-ink-soft">{{ storefront.description }}</p>
                  </section>
                }

                <!-- The day's offering sits above the standing carte: it is what a customer
                     can buy at the next market, where the carte is everything ever made. The
                     same day repeats in Prochains marchés below, which keeps that list whole. -->
                @if (nextMarket(); as market) {
                  <section>
                    <h2 class="kicker">Prochain marché</h2>
                    <div class="mt-5">
                      <app-market-card [market]="market" [featured]="true" (chosen)="openDish($event)" />
                    </div>
                  </section>
                }

                <section>
                  <h2 class="kicker">Notre carte</h2>
                  <ul class="mt-5 grid gap-3 lg:grid-cols-2">
                    @for (dish of storefront.dishes; track dish.itemId) {
                      <li><app-dish-row [dish]="dish" (chosen)="openDish($event)" /></li>
                    }
                  </ul>
                </section>
              </div>

              @if (storefront.upcomingMarkets.length) {
                <aside class="mt-6 lg:sticky lg:top-6 lg:mt-0">
                  <h2 class="kicker">Prochains marchés</h2>
                  <ul class="mt-5 space-y-4">
                    @for (market of storefront.upcomingMarkets; track $index) {
                      <li><app-market-card [market]="market" /></li>
                    }
                  </ul>
                </aside>
              }
            </div>

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
export class StorefrontPage implements OnInit {
  readonly storefront = input<StorefrontViewModel | null>(null);

  // Cancelled days are not skipped, unlike the vendor's card: a customer heading out needs
  // to know the next market is off more than they need the one after it.
  protected readonly nextMarket = computed(() => {
    const storefront = this.storefront();
    return storefront?.status === 'published' ? storefront.upcomingMarkets[0] : undefined;
  });
  private readonly sheet = viewChild.required(DishSheet);
  private readonly metadata = inject(StorefrontMetadata);
  // Captured here in the injection context; read in ngOnInit.
  private readonly origin = currentOrigin();

  // The router binds `storefront` before ngOnInit, which runs inside the SSR
  // render pass — so the tags reach the serialized <head>. The resolved
  // storefront is set once (one vendor per subdomain, no in-app navigation
  // swaps it), so a lifecycle hook suffices; no reactive effect is needed.
  ngOnInit(): void {
    this.metadata.set(this.storefront(), this.origin);
  }

  protected openDish(dish: DishViewModel): void {
    this.sheet().open(dish);
  }
}
