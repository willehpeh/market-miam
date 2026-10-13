import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { MarketScheduleFacade } from '../markets/market-schedule.facade';
import { MarketDayFacade } from '../market-days/market-day.facade';
import { StorefrontHome } from './storefront-home';
import { SetupSteps } from './setup-steps';
import { RouterLink } from '@angular/router';
import { LegalIdentityFacade } from '../legal-identity/legal-identity.facade';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, StorefrontHome, SetupSteps, Spinner, RouterLink],
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
      @if (legalIdentityMissing()) {
        <mm-card>
          <a routerLink="/dashboard/legal-identity" class="flex items-center gap-4 no-underline">
            <i class="fa-solid fa-scale-balanced w-5 shrink-0 text-center text-brand" aria-hidden="true"></i>
            <div class="flex-1">
              <p class="font-bold text-ink">Complétez vos mentions légales</p>
              <p class="text-sm text-muted">La loi les demande sur votre vitrine.</p>
            </div>
            <span aria-hidden="true" class="text-2xl leading-none text-muted">›</span>
          </a>
        </mm-card>
      }
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
  // The bilan prompt joins the gate for the same reason: a card appearing a moment late
  // shifts everything under it out from beneath the vendor's thumb.
  private readonly legalIdentity = inject(LegalIdentityFacade);
  readonly loaded = computed(
    () =>
      !!this.storefront.view() &&
      !this.marketDays.loading() &&
      !this.marketDays.unratedLoading() &&
      !this.legalIdentity.loading(),
  );
  // Null, not merely absent: an identity that failed to load says nothing about the vendor.
  readonly legalIdentityMissing = computed(() => this.legalIdentity.identity() === null);
  readonly published = computed(() => this.storefront.view()?.published === true);
  private readonly catalogue = inject(CatalogueFacade);
  private readonly markets = inject(MarketScheduleFacade);

  constructor() {
    this.catalogue.load();
    this.markets.load();
    // Both warmed here, ahead of the cards that read them: asking from inside the published
    // branch flips loaded() back to false, and the branch that asked is destroyed with it.
    // The days survived that as a flicker, being gated on freshness; the unrated days are
    // deliberately not, so the response re-creates the card, which asks again, for ever.
    this.marketDays.load();
    this.marketDays.loadUnrated();
    this.legalIdentity.load();
  }
}
