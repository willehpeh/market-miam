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
            <header class="flex items-center gap-3 bg-surface px-5 py-4">
              <img src="logo-transparent.png" alt="Market Miam" class="h-6 w-auto" />
              <span class="text-xl font-bold tracking-tight text-ink">{{ storefront.name }}</span>
            </header>

            <section class="relative">
              @if (storefront.coverUrl; as cover) {
                <img [src]="cover" alt="" class="aspect-16/10 w-full object-cover" />
              } @else {
                <div class="hatch aspect-16/10 w-full"></div>
                <span class="kicker absolute left-5 top-5 rounded-pill bg-surface/85 px-3 py-1">photo du stand</span>
              }
              <div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/65 via-black/25 to-transparent px-5 pb-5 pt-16">
                <h1 class="text-4xl font-bold tracking-tight text-white">{{ storefront.name }}</h1>
                <p class="mt-1 text-lg text-white/85">{{ storefront.description }}</p>
              </div>
            </section>

            <section class="px-5 py-8">
              <h2 class="kicker">Notre carte</h2>
              <ul class="mt-5 space-y-4">
                @for (dish of storefront.dishes; track dish.itemId) {
                  <li>
                    <button
                      type="button"
                      [attr.data-dish]="dish.itemId"
                      class="flex w-full items-start gap-4 rounded-card bg-surface p-4 text-left shadow-soft"
                      (click)="selected.set(dish); sheet.showModal()"
                    >
                      @if (dish.photo; as photo) {
                        <img [src]="photo.cardUrl" alt="" class="size-24 shrink-0 rounded-card object-cover" />
                      } @else {
                        <span class="hatch grid size-24 shrink-0 place-items-center rounded-card">
                          <span class="kicker rounded-pill bg-surface/85 px-2.5 py-1 normal-case">plat</span>
                        </span>
                      }
                      <span class="min-w-0 flex-1 pt-1">
                        <span class="flex items-baseline justify-between gap-3">
                          <span class="truncate text-lg font-bold text-ink">{{ dish.name }}</span>
                          <span class="shrink-0 text-lg font-bold text-ink">{{ dish.priceLabel }}</span>
                        </span>
                        <span class="mt-1 line-clamp-2 block text-ink-soft">{{ dish.description }}</span>
                      </span>
                    </button>
                  </li>
                }
              </ul>
            </section>

            @if (storefront.upcomingMarkets.length) {
              <section class="px-5 pb-8">
                <h2 class="kicker">Prochains marchés</h2>
                <ul class="mt-5 space-y-4">
                  @for (market of storefront.upcomingMarkets; track $index) {
                    <li
                      class="flex items-stretch gap-4 rounded-card p-4 shadow-soft"
                      [class.bg-surface]="!market.cancelled"
                      [class.bg-neutral-100]="market.cancelled"
                      [class.grayscale]="market.cancelled"
                    >
                      <span class="flex w-16 shrink-0 flex-col items-center justify-center rounded-card bg-brand/10 px-2 py-2 text-center">
                        <span class="kicker" [class.text-neutral-500]="market.cancelled">{{ market.weekday }}</span>
                        <span class="text-2xl font-bold leading-tight" [class.text-ink]="!market.cancelled" [class.text-neutral-500]="market.cancelled">{{ market.day }}</span>
                        <span class="kicker" [class.text-neutral-500]="market.cancelled">{{ market.month }}</span>
                      </span>
                      <span class="min-w-0 flex-1 pt-1">
                        <span class="flex items-baseline gap-2">
                          <span class="truncate text-lg font-bold" [class.text-ink]="!market.cancelled" [class.text-neutral-500]="market.cancelled" [class.line-through]="market.cancelled">{{ market.marketName }}</span>
                          @if (market.cancelled) {
                            <span class="kicker shrink-0 rounded-pill bg-line-strong px-2 py-0.5 normal-case text-neutral-500">Annulé</span>
                          }
                        </span>
                        <span class="mt-1 block" [class.text-ink-soft]="!market.cancelled" [class.text-neutral-500]="market.cancelled">
                          @if (market.hours) {
                            <span class="block">{{ market.hours }}</span>
                          }
                          @if (market.address) {
                            <span class="block">{{ market.address }}</span>
                          }
                        </span>
                      </span>
                    </li>
                  }
                </ul>
              </section>
            }

            <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- native dialog closes on Escape; click is backdrop-dismiss only -->
            <dialog
              #sheet
              class="mx-auto mb-0 mt-auto w-full max-w-xl rounded-t-3xl bg-canvas p-0 backdrop:bg-black/50"
              (click)="$event.target === sheet && sheet.close()"
            >
              @if (selected(); as dish) {
                <div class="p-5 pt-3">
                  <span class="mx-auto mb-3 block h-1.5 w-10 rounded-pill bg-line-strong"></span>
                  @if (dish.photo; as photo) {
                    <img [src]="photo.sheetUrl" alt="" class="aspect-4/3 w-full rounded-card object-cover" />
                  } @else {
                    <span class="hatch grid aspect-4/3 w-full place-items-center rounded-card">
                      <span class="kicker rounded-pill bg-surface/85 px-3 py-1">photo du plat</span>
                    </span>
                  }
                  <div class="mt-5 flex items-baseline justify-between gap-3">
                    <h3 class="text-2xl font-bold text-ink">{{ dish.name }}</h3>
                    <p class="shrink-0 text-2xl font-bold text-ink">{{ dish.priceLabel }}</p>
                  </div>
                  <p class="mt-3 text-lg text-ink-soft">{{ dish.description }}</p>
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
