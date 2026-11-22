import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { MarketScheduleFacade } from '../markets/market-schedule.facade';
import { MarketDayFacade } from '../market-days/market-day.facade';
import { LegalIdentityFacade } from '../legal-identity/legal-identity.facade';
import { MarketDay } from '../market-days/market-day';
import { MarketDayCards } from '../market-days/market-day-cards';
import { BilanPrompt } from '../market-days/bilan-prompt';
import { StorefrontHome } from './storefront-home';
import { SetupSteps } from './setup-steps';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, StorefrontHome, SetupSteps, MarketDayCards, BilanPrompt, Spinner, RouterLink],
  template: `
    @if (!loaded()) {
      <mm-card>
        <div class="mx-auto grid h-32 place-items-center">
          <mm-spinner label="Chargement de votre stand…" />
        </div>
      </mm-card>
    } @else if (view(); as storefront) {
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
        <mm-market-day-cards [days]="days()" (callOff)="callOff($event)" (reopen)="reopen($event)" />
        <mm-bilan-prompt [unrated]="unrated()" />
        <mm-storefront-home [storefront]="storefront" />
      } @else {
        <mm-setup-steps
          [storefront]="storefront"
          [dishCount]="dishCount()"
          [marketCount]="marketCount()"
          [legalIdentityProvided]="legalIdentityProvided()"
          [publishing]="publishing()"
          [publishFailed]="publishFailed()"
          (publish)="publish()"
        />
      }
    }
  `
})
export class Dashboard {
  private readonly storefront = inject(StorefrontFacade);
  private readonly catalogue = inject(CatalogueFacade);
  private readonly markets = inject(MarketScheduleFacade);
  private readonly marketDays = inject(MarketDayFacade);
  private readonly legalIdentity = inject(LegalIdentityFacade);

  // The next-menu card's empty state is a warning, so the whole home waits for the days
  // rather than letting the card paint "aucun marché" and take it back a moment later.
  // The bilan prompt joins the gate for the same reason: a card appearing a moment late
  // shifts everything under it out from beneath the vendor's thumb.
  readonly loaded = computed(
    () =>
      !!this.storefront.view() &&
      !this.marketDays.loading() &&
      !this.marketDays.unratedLoading() &&
      !this.legalIdentity.loading(),
  );
  protected readonly view = this.storefront.view;
  readonly published = computed(() => this.storefront.view()?.published === true);
  // Null, not merely absent: an identity that failed to load says nothing about the vendor.
  // Published homes only: before publication, the setup steps ask for it.
  readonly legalIdentityMissing = computed(() => this.published() && this.legalIdentity.identity() === null);

  protected readonly days = this.marketDays.days;
  protected readonly unrated = this.marketDays.unrated;

  protected readonly dishCount = computed(() => this.catalogue.items().length);
  protected readonly marketCount = computed(() => this.markets.schedules().length);
  protected readonly legalIdentityProvided = computed(() => !!this.legalIdentity.identity());
  protected readonly publishing = this.storefront.publishing;
  protected readonly publishFailed = this.storefront.publishError;

  constructor() {
    // Every read the home and its cards make, asked here once: nothing under this page asks
    // for itself, so nothing it renders can reopen the gate above.
    this.catalogue.load();
    this.markets.load();
    this.marketDays.load();
    this.marketDays.loadUnrated();
    this.legalIdentity.load();
  }

  protected publish(): void {
    this.storefront.publish();
  }

  protected callOff(day: MarketDay): void {
    this.marketDays.close(day.marketId(), day.date());
  }

  protected reopen(day: MarketDay): void {
    this.marketDays.reopen(day.marketId(), day.date());
  }
}
