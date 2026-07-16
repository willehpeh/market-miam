import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CustomerStorefront } from './customer-storefront';

@Component({
  selector: 'app-storefront-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (storefront(); as storefront) {
      <main class="mx-auto min-h-dvh max-w-xl bg-surface-sunk">
        <header class="px-5 py-4">
          <img src="logo-transparent.png" alt="Market Miam" class="h-6 w-auto" />
        </header>

        <section class="relative">
          <!-- ponytail: cover <img> + Cloudinary loader lands with a seedable demo cover; placeholder is the demo's real state -->
          <div class="hatch aspect-[16/10] w-full"></div>
          <span class="kicker absolute left-5 top-5 rounded-pill bg-surface/85 px-3 py-1">photo du stand</span>
          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-5 pb-5 pt-16">
            <h1 class="text-4xl font-bold tracking-tight text-white">{{ storefront.name }}</h1>
            <p class="mt-1 text-lg text-white/85">{{ storefront.description }}</p>
          </div>
        </section>

        <footer class="mt-4 border-t border-line px-5 py-8">
          <p class="text-xl font-bold text-ink">{{ storefront.name }}</p>
          <p class="mt-1 text-ink-soft">
            Réservations &amp; commandes :
            <a class="text-brand" [href]="'tel:' + storefront.phone">{{ storefront.phone }}</a>
          </p>
        </footer>
      </main>
    } @else {
      <main class="grid min-h-dvh place-items-center bg-surface-sunk p-8 text-center">
        <p class="text-ink-soft">Boutique introuvable</p>
      </main>
    }
  `,
})
export class StorefrontPage {
  readonly storefront = input<CustomerStorefront | null>(null);
}
