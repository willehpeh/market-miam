import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Card } from '../core/card';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { MarketScheduleFacade } from '../markets/market-schedule.facade';
import { StorefrontHome } from './storefront-home';
import { SetupSteps } from './setup-steps';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, StorefrontHome, SetupSteps],
  template: `
    @if (!loaded()) {
      <mm-card>
        <div class="mx-auto grid h-32 place-items-center">
          <div
            role="status"
            aria-label="Chargement de votre stand…"
            class="size-8 animate-spin rounded-full border-4 border-line-strong border-t-brand"
          ></div>
        </div>
      </mm-card>
    } @else if (published()) {
      <mm-storefront-home />
    } @else {
      <mm-setup-steps />
    }
  `
})
export class Dashboard {
  private readonly storefront = inject(StorefrontFacade);
  readonly loaded = computed(() => !!this.storefront.view());
  readonly published = computed(() => this.storefront.view()?.published === true);
  private readonly catalogue = inject(CatalogueFacade);
  private readonly markets = inject(MarketScheduleFacade);

  constructor() {
    this.catalogue.load();
    this.markets.load();
  }
}
