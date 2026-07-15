import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CustomerStorefront } from './customer-storefront';

@Component({
  selector: 'app-storefront-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (storefront(); as storefront) {
      <main>
        <header>
          <h1>{{ storefront.name }}</h1>
          <p>{{ storefront.description }}</p>
        </header>
        <footer>
          <a [href]="'tel:' + storefront.phone">{{ storefront.phone }}</a>
        </footer>
      </main>
    } @else {
      <p>Boutique introuvable</p>
    }
  `,
})
export class StorefrontPage {
  readonly storefront = input<CustomerStorefront | null>(null);
}
