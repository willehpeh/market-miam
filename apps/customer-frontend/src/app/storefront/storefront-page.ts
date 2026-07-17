import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { DishViewModel, StorefrontViewModel } from './storefront-view-model';
import { ComingSoonPage } from './coming-soon-page';

@Component({
  selector: 'app-storefront-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComingSoonPage],
  template: `
    @if (storefront(); as storefront) {
      @switch (storefront.status) {
        @case ('published') {
          <main class="mx-auto min-h-dvh max-w-xl bg-surface-sunk">
            <header class="px-5 py-4">
              <img src="logo-transparent.png" alt="Market Miam" class="h-6 w-auto" />
            </header>

            <section class="relative">
              @if (storefront.coverUrl; as cover) {
                <img [src]="cover" alt="" class="aspect-[16/10] w-full object-cover" />
              } @else {
                <div class="hatch aspect-[16/10] w-full"></div>
                <span class="kicker absolute left-5 top-5 rounded-pill bg-surface/85 px-3 py-1">photo du stand</span>
              }
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-5 pb-5 pt-16">
                <h1 class="text-4xl font-bold tracking-tight text-white">{{ storefront.name }}</h1>
                <p class="mt-1 text-lg text-white/85">{{ storefront.description }}</p>
              </div>
            </section>

            <section class="px-5 py-8">
              <h2 class="kicker">Notre carte</h2>
              <ul class="mt-4 divide-y divide-line">
                @for (dish of storefront.dishes; track dish.itemId) {
                  <li>
                    <button
                      type="button"
                      [attr.data-dish]="dish.itemId"
                      class="flex w-full items-center gap-4 py-4 text-left"
                      (click)="selected.set(dish); sheet.showModal()"
                    >
                      <span class="min-w-0 flex-1">
                        <span class="block font-bold text-ink">{{ dish.name }}</span>
                        <span class="mt-0.5 block truncate text-ink-soft">{{ dish.description }}</span>
                        <span class="mt-1 block font-bold text-brand">{{ dish.priceLabel }}</span>
                      </span>
                      @if (dish.photo; as photo) {
                        <img [src]="photo.cardUrl" alt="" class="size-20 shrink-0 rounded-lg object-cover" />
                      }
                    </button>
                  </li>
                }
              </ul>
            </section>

            <dialog #sheet class="m-auto w-full max-w-md rounded-xl p-0 backdrop:bg-black/50">
              @if (selected(); as dish) {
                @if (dish.photo; as photo) {
                  <img [src]="photo.sheetUrl" alt="" class="aspect-[4/3] w-full object-cover" />
                }
                <div class="p-5">
                  <h3 class="text-2xl font-bold text-ink">{{ dish.name }}</h3>
                  <p class="mt-2 text-ink-soft">{{ dish.description }}</p>
                  <p class="mt-3 text-xl font-bold text-brand">{{ dish.priceLabel }}</p>
                  <p class="mt-3 text-sm text-ink-soft">Disponible les jours de marché, dans la limite des stocks.</p>
                  <button type="button" class="mt-5 w-full rounded-pill border border-line py-2 text-ink" (click)="sheet.close()">
                    Fermer
                  </button>
                </div>
              }
            </dialog>

            <footer class="mt-4 border-t border-line px-5 py-8">
              <p class="text-xl font-bold text-ink">{{ storefront.name }}</p>
              <p class="mt-1 text-ink-soft">
                Réservations &amp; commandes :
                <a class="text-brand" [href]="'tel:' + storefront.phone">{{ storefront.phone }}</a>
              </p>
            </footer>
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
  protected readonly selected = signal<DishViewModel | null>(null);
}
