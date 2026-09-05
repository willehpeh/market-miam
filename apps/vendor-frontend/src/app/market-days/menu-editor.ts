import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { longDate } from '../core/french-date';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { CatalogueItemView } from '../catalogue/catalogue';
import { MarketPricesFacade } from '../market-prices/market-prices.facade';
import { PriceList } from '../market-prices/market-prices';
import { SellingRecordFacade } from '../selling-record/selling-record.facade';
import { pile, PileName } from '../selling-record/pile';
import { formatEuros } from '../catalogue/money';
import { MarketDayFacade } from './market-day.facade';
import { hasLiveScreen } from './live-screen/live-status';
import { ClosedNotice } from './closed-notice';
import { ReopenStand } from './reopen-stand';

const TONES: Record<PileName, string> = {
  'Toujours épuisé': 'font-bold text-warn',
  'Ça part bien': 'font-bold text-success',
  'Il en reste': 'font-bold text-danger',
  'Ça dépend des jours': 'text-muted',
  'Trop tôt pour dire': 'text-muted',
};

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
          <ul class="mt-6 space-y-3">
            @for (item of items(); track item.itemId) {
              <li class="relative rounded-card border border-line bg-surface">
                <label class="flex items-center gap-3 p-3">
                  <input
                    type="checkbox"
                    class="size-5 shrink-0"
                    [checked]="item.chosen"
                    (change)="toggle(item.itemId)"
                  />
                  <span class="min-w-0 flex-1 break-words font-bold text-ink">{{ item.name }}</span>
                  @if (item.atMarketPrice) {
                    <span class="absolute -top-2 right-3 bg-surface px-1.5 text-xs font-bold text-brand">
                      Tarif marché
                    </span>
                  }
                  <span class="shrink-0 text-sm text-muted">{{ item.priceLabel }}</span>
                </label>
                @if (item.pile) {
                  <p class="-mt-1 pb-3 pl-11 pr-3 text-xs {{ item.pileTone }}">{{ item.pile }}</p>
                }
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
  private readonly record = inject(SellingRecordFacade);
  private readonly route = inject(ActivatedRoute);

  readonly marketId = this.route.snapshot.paramMap.get('marketId') ?? '';
  readonly date = this.route.snapshot.paramMap.get('date') ?? '';

  readonly loading = computed(
    () =>
      this.marketDays.loading() ||
      this.catalogue.loading() ||
      this.prices.loading() ||
      this.record.loading(),
  );

  private readonly occurrence = computed(() =>
    this.marketDays.days().find((candidate) => candidate.marketId === this.marketId && candidate.date === this.date),
  );

  readonly back = computed(() =>
    hasLiveScreen(this.occurrence()) ? `/dashboard/market/${this.marketId}/${this.date}/live` : '/dashboard',
  );

  readonly day = computed(() => {
    const occurrence = this.occurrence();
    return occurrence
      ? { label: longDate(occurrence.day, occurrence.date), marketName: occurrence.market.name, closed: occurrence.closed }
      : undefined;
  });

  private readonly touched = signal<ReadonlySet<string> | null>(null);
  private readonly selected = computed(() => this.touched() ?? new Set(this.occurrence()?.itemIds ?? []));

  private readonly set = computed<PriceList>(
    () => this.prices.markets().find((market) => market.marketId === this.marketId)?.prices ?? {},
  );

  private readonly bilans = this.record.bilansFor(this.marketId);

  readonly items = computed(() => {
    const bilans = this.bilans();
    return this.catalogue.items().map((item) => {
      const pileName = pile(bilans[item.itemId] ?? []);
      return {
        itemId: item.itemId,
        name: item.name,
        ...quote(item, this.set()[item.itemId]),
        pile: pileName,
        pileTone: pileName ? TONES[pileName] : '',
        chosen: this.selected().has(item.itemId),
      };
    });
  });

  constructor() {
    this.marketDays.load();
    this.catalogue.load();
    this.prices.load();
    this.record.load();
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
