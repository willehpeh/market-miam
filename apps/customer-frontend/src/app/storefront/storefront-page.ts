import { ChangeDetectionStrategy, Component, computed, effect, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorefrontHost } from '../core/storefront-host';
import { ItemViewModel } from './storefront-view-model';
import { StorefrontFeed } from './storefront-feed';
import { StorefrontMetadata } from './storefront-metadata';
import { ComingSoonPage } from './coming-soon/coming-soon-page';
import { StorefrontHero } from './layout/storefront-hero';
import { ItemSheet } from './items/item-sheet';
import { MarketCard } from './markets/market-card';
import { StorefrontFooter } from './layout/storefront-footer';

@Component({
  selector: 'app-storefront-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ComingSoonPage, StorefrontHero, ItemSheet, MarketCard, StorefrontFooter],
  template: `
    @if (storefront(); as storefront) {
      @switch (storefront.status) {
        @case ('published') {
          <main class="mx-auto min-h-dvh max-w-xl bg-surface-sunk lg:max-w-6xl">
            <header class="flex items-center gap-3 bg-surface px-5 py-4 lg:px-8">
              <img src="logo-transparent.png" alt="Market Miam" class="h-6 w-auto" />
            </header>

            <app-storefront-hero [coverReference]="storefront.coverReference" [name]="storefront.name" />

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
                     can buy at the next market, where the carte is everything ever made.
                     Marchés suivants below starts after it — hence the name. -->
                @if (nextMarket(); as market) {
                  <section>
                    <h2 class="kicker">Prochain marché</h2>
                    <div class="mt-5">
                      <app-market-card [market]="market" [featured]="true" (chosen)="openItem($event)" />
                    </div>
                  </section>
                }

                <!-- The carte has its own page — this one answers "should I go", the carte
                     answers "what can they make". It costs a tap, so the way in is a full
                     row rather than a link in the footer. -->
                <a
                  routerLink="/carte"
                  queryParamsHandling="preserve"
                  class="flex items-center gap-4 rounded-card bg-surface p-4 shadow-soft"
                >
                  <span class="grid size-12 shrink-0 place-items-center rounded-card bg-brand/10 text-brand">
                    <i class="fa-solid fa-book-open" aria-hidden="true"></i>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block font-bold text-ink">Notre carte</span>
                    <span class="block text-sm text-ink-soft">Tous les plats que nous préparons</span>
                  </span>
                  <i class="fa-solid fa-chevron-right text-line-strong" aria-hidden="true"></i>
                </a>
              </div>

              @if (followingMarkets().length) {
                <aside class="mt-6 lg:sticky lg:top-6 lg:mt-0">
                  <h2 class="kicker">Marchés suivants</h2>
                  <ul class="mt-5 space-y-4">
                    @for (market of followingMarkets(); track market.date + market.marketName) {
                      <li><app-market-card [market]="market" /></li>
                    }
                  </ul>
                </aside>
              }
            </div>

            <app-item-sheet />

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
  // Read from the feed, not the resolve snapshot: while the vendor is broadcasting, the
  // feed's re-asks land here without a navigation (decision 8).
  protected readonly storefront = inject(StorefrontFeed).view;

  // Cancelled days are not skipped, unlike the vendor's card: a customer heading out needs
  // to know the next market is off more than they need the one after it.
  protected readonly nextMarket = computed(() => {
    const storefront = this.storefront();
    return storefront?.status === 'published' ? storefront.upcomingMarkets[0] : undefined;
  });
  // The list is whatever comes after the card above it. Repeating the promoted day was the
  // earlier rule, from when a long carte separated the two and the featured card carried a
  // menu; with the carte a single button, the same market reads twice in one screen.
  protected readonly followingMarkets = computed(() => {
    const storefront = this.storefront();
    return storefront?.status === 'published' ? storefront.upcomingMarkets.slice(1) : [];
  });
  private readonly sheet = viewChild.required(ItemSheet);

  constructor() {
    // Meta and Title are imperative services with no signal input, so mirroring the feed
    // into them is what effect() is for. It runs inside the SSR render pass, which is what
    // puts the finished card in the HTML a crawler reads.
    const metadata = inject(StorefrontMetadata);
    const origin = inject(StorefrontHost).origin;
    effect(() => metadata.set(this.storefront(), origin));
  }

  protected openItem(item: ItemViewModel): void {
    this.sheet().open(item);
  }
}
