import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { MarketScheduleFacade } from '../markets/market-schedule.facade';
import { MarketDayFacade } from '../market-days/market-day.facade';
import { StorefrontHome } from './storefront-home';
import { SetupSteps } from './setup-steps';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, StorefrontHome, SetupSteps, Spinner],
  template: `
    @if (!loaded()) {
      <mm-card>
        <div class="mx-auto grid h-32 place-items-center">
          <mm-spinner label="Chargement de votre stand…" />
        </div>
      </mm-card>
    } @else {
      <!-- The cards are siblings, so none of them is the page. Without this the document
           has two competing h1s and no name of its own. -->
      <h1 class="sr-only">Tableau de bord</h1>
      @if (published()) {
        <mm-storefront-home />
      } @else {
        <mm-setup-steps />
      }
    }
  `
})
export class Dashboard {
  private readonly storefront = inject(StorefrontFacade);
  private readonly marketDays = inject(MarketDayFacade);
  // The next-menu card's empty state is a warning, so the whole home waits for the days
  // rather than letting the card paint "aucun marché" and take it back a moment later.
  readonly loaded = computed(() => !!this.storefront.view() && !this.marketDays.loading());
  readonly published = computed(() => this.storefront.view()?.published === true);
  private readonly catalogue = inject(CatalogueFacade);
  private readonly markets = inject(MarketScheduleFacade);

  constructor() {
    this.catalogue.load();
    this.markets.load();
    // Warmed here, ahead of the card that reads it: asking from inside the published
    // branch would flip loaded() back to false on first paint and flicker the spinner.
    this.marketDays.load();
  }
}
