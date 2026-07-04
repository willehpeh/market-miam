import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { StorefrontFacade } from '../storefront/storefront.facade';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (view(); as storefront) {
      <section>
        <h2 id="storefront-name">{{ storefront.name }}</h2>
        <p id="storefront-description">{{ storefront.description }}</p>
        @if (storefront.imageReference) {
          <img [src]="storefront.imageReference" alt="">
        }
      </section>
    }
  `
})
export class Dashboard {
  private readonly storefront = inject(StorefrontFacade);

  readonly view = this.storefront.view;
}
