import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { longDate } from '../core/french-date';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { CatalogueItemView } from '../catalogue/catalogue';
import { MarketPricesFacade } from '../market-prices/market-prices.facade';
import { PriceList } from '../market-prices/market-prices';
import { formatEuros } from '../catalogue/money';
import { MarketDayFacade } from './market-day.facade';
import { hasLiveScreen } from './live-status';
import { ClosedNotice } from './closed-notice';
import { ReopenStand } from './reopen-stand';

@Component({
  selector: 'mm-menu-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, ClosedNotice, ReopenStand, RouterLink, Spinner],
  template: `
    <mm-card [back]="back()">
      @if (loading()) {
        <div class="mx-auto grid h-32 place-items-center">
          <mm-spinner label="Chargement du marché…" />
        </div>
      } @else if (day(); as marketDay) {
        <h1 class="text-xl leading-tight">{{ marketDay.label }}</h1>
        <p class="mt-3 text-sm text-ink-soft">{{ marketDay.marketName }}</p>
        <a
          [routerLink]="['/dashboard/market-prices', marketId]"
          class="mt-1 inline-block text-sm font-bold text-brand no-underline"
        >
          Tarifs de ce marché →
        </a>

        @if (marketDay.closed) {
          <mm-closed-notice />
        <mm-reopen-stand [marketId]="marketId" [date]="date" />
        } @else {
          <ul class="mt-6 space-y-2">
            @for (item of items(); track item.itemId) {
              <li>
                <label class="flex items-center gap-3 rounded-card border border-line bg-surface p-3">
                  <input
                    type="checkbox"
                    class="size-5 shrink-0"
                    [checked]="item.chosen"
                    (change)="toggle(item.itemId)"
                  />
                  <span class="min-w-0 flex-1 break-words font-bold text-ink">{{ item.name }}</span>
                  @if (item.atMarketPrice) {
                    <span class="shrink-0 text-xs font-bold text-brand">Tarif marché</span>
                  }
                  <span class="shrink-0 font-mono text-sm text-muted">{{ item.priceLabel }}</span>
                </label>
              </li>
            } @empty {
              <li class="text-sm text-ink-soft">Votre carte est vide pour l'instant.</li>
            }
          </ul>

          <button type="button" class="mt-6 flex w-full max-w-xs mx-auto justify-center" (click)="save()">
            Enregistrer
          </button>
        }
      } @else {
        <p class="text-sm text-ink-soft">Ce marché n'est plus programmé.</p>
        <a routerLink="/dashboard" class="mt-4 inline-block font-bold text-brand no-underline">
          Retour au tableau de bord
        </a>
      }
    </mm-card>
  `,
})
export class MenuEditor {
  private readonly marketDays = inject(MarketDayFacade);
  private readonly catalogue = inject(CatalogueFacade);
  private readonly prices = inject(MarketPricesFacade);
  private readonly route = inject(ActivatedRoute);

  // Params are read once, and `touched` below is keyed to them. Both ways in — the
  // dashboard card and the live screen (decision 10) — arrive from another route, so the
  // component is built fresh each time. An editor→editor link is the one that arms this:
  // go reactive first, or day A's ticks silently become day B's saved menu on a param-only
  // navigation. VENDOR-FRONTEND-FOLLOWUPS.md §3.
  readonly marketId = this.route.snapshot.paramMap.get('marketId') ?? '';
  readonly date = this.route.snapshot.paramMap.get('date') ?? '';

  // Every feed gates the spinner: days can land before the carte, and rendering on days
  // alone would briefly claim an empty carte while the catalogue is still on the wire.
  // Prices landing last would quote every dish at its carte price for a frame — the very
  // number this screen exists to stop showing.
  readonly loading = computed(
    () => this.marketDays.loading() || this.catalogue.loading() || this.prices.loading(),
  );

  private readonly occurrence = computed(() =>
    this.marketDays.days().find((candidate) => candidate.marketId === this.marketId && candidate.date === this.date),
  );

  // Back to the day, not always to the dashboard: the card's own gate picks, so a vendor
  // who came from the live screen to add a tray is put back on it.
  readonly back = computed(() =>
    hasLiveScreen(this.occurrence()) ? `/dashboard/live/${this.marketId}/${this.date}` : '/dashboard',
  );

  readonly day = computed(() => {
    const occurrence = this.occurrence();
    return occurrence
      ? { label: longDate(occurrence.day, occurrence.date), marketName: occurrence.market.name, closed: occurrence.closed }
      : undefined;
  });

  // Seeded from the day whenever it lands, and owned by the vendor from their first tick:
  // once touched is set, a store update — the optimistic patch, say — cannot take their
  // choices back.
  private readonly touched = signal<ReadonlySet<string> | null>(null);
  private readonly selected = computed(() => this.touched() ?? new Set(this.occurrence()?.itemIds ?? []));

  // What this market charges, not what the carte says: quoting the carte price here names
  // a number the customer will not be charged (decision 8).
  private readonly set = computed<PriceList>(
    () => this.prices.markets().find((market) => market.marketId === this.marketId)?.prices ?? {},
  );

  readonly items = computed(() =>
    this.catalogue.items().map((item) => ({
      itemId: item.itemId,
      name: item.name,
      ...quote(item, this.set()[item.itemId]),
      chosen: this.selected().has(item.itemId),
    })),
  );

  constructor() {
    this.marketDays.load();
    this.catalogue.load();
    this.prices.load();
  }

  toggle(itemId: string): void {
    const next = new Set(this.selected());
    if (!next.delete(itemId)) {
      next.add(itemId);
    }
    this.touched.set(next);
  }

  save(): void {
    this.marketDays.setMenu(this.marketId, this.date, [...this.selected()]);
  }
}

// The cue describes the figure beside it and nothing else: a market price on a dearer
// variant leaves the row uncued, because the `dès` shown is still the carte's.
function quote(
  item: CatalogueItemView,
  set: number | Record<string, number> | undefined,
): { priceLabel: string; atMarketPrice: boolean } {
  if (!item.variants) {
    const market = typeof set === 'number' ? set : undefined;
    return { priceLabel: formatEuros(market ?? item.price ?? 0), atMarketPrice: market !== undefined };
  }
  const variants = item.variants.map((variant) => {
    const market = typeof set === 'object' ? set[variant.name] : undefined;
    return { price: market ?? variant.price, atMarketPrice: market !== undefined };
  });
  const cheapest = variants.reduce((lowest, variant) => (variant.price < lowest.price ? variant : lowest));
  return { priceLabel: `dès ${formatEuros(cheapest.price)}`, atMarketPrice: cheapest.atMarketPrice };
}
