import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ItemViewModel } from '../storefront-view-model';
import { StorefrontFeed } from '../storefront-feed';
import { ComingSoonPage } from '../coming-soon/coming-soon-page';
import { ItemCard } from '../items/item-card';
import { ItemSheet } from '../items/item-sheet';
import { StorefrontFooter } from '../layout/storefront-footer';

// Everything the vendor ever makes, on its own page: the home page answers "should I go",
// this one answers "what can they make". Same resolve as the home page, inherited from the
// parent route — no second fetch.
@Component({
  selector: 'app-carte-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ComingSoonPage, ItemCard, ItemSheet, StorefrontFooter],
  template: `
    @if (storefront(); as storefront) {
      @switch (storefront.status) {
        @case ('published') {
          <main class="mx-auto min-h-dvh max-w-xl bg-surface-sunk lg:max-w-6xl">
            <!-- The link names the vendor rather than saying "retour": most visitors will
                 arrive here from a search result, with nothing to go back to. -->
            <header class="flex items-center gap-3 bg-surface px-5 py-4 lg:px-8">
              <a
                routerLink="/"
                queryParamsHandling="preserve"
                class="flex min-w-0 items-center gap-2 font-bold text-brand"
              >
                <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                <span class="truncate">{{ storefront.name }}</span>
              </a>
              <img src="logo-transparent.png" alt="Market Miam" class="ml-auto h-6 w-auto" />
            </header>

            <div class="px-5 py-6 lg:px-8 lg:py-10">
              <h1 class="text-3xl font-bold tracking-tight text-ink lg:text-4xl">Notre carte</h1>
              <ul class="mt-6 grid gap-4 lg:grid-cols-3">
                @for (item of storefront.items; track item.itemId) {
                  <li><app-item-card [item]="item" (chosen)="openItem($event)" /></li>
                }
              </ul>
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
export class CartePage {
  protected readonly storefront = inject(StorefrontFeed).view;

  private readonly sheet = viewChild.required(ItemSheet);

  protected openItem(item: ItemViewModel): void {
    this.sheet().open(item);
  }
}
