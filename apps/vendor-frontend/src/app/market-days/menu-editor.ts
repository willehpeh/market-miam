import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { MarketPricesFacade } from '../market-prices/market-prices.facade';
import { SellingRecordFacade } from '../selling-record/selling-record.facade';
import { pile, PileName } from '../selling-record/pile';
import { MarketDayFacade } from './market-day.facade';
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
        <h1 class="text-xl leading-tight">{{ marketDay.label() }}</h1>
        <p class="mt-3 text-sm text-ink-soft">{{ marketDay.marketName() }}</p>
        <a
          [routerLink]="['/dashboard/market-prices', marketId]"
          class="mt-1 inline-block text-sm font-bold text-brand no-underline"
        >
          Tarifs de ce marché →
        </a>

        @if (marketDay.isClosed()) {
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

  readonly day = computed(() => this.marketDays.days().find((day) => day.isOn(this.marketId, this.date)));

  readonly back = computed(() =>
    this.day()?.hasLiveScreen() ? `/dashboard/market/${this.marketId}/${this.date}/live` : '/dashboard',
  );

  private readonly touched = signal<ReadonlySet<string> | null>(null);
  private readonly selected = computed(() => this.touched() ?? new Set(this.day()?.menuItemIds()));

  private readonly marketPrices = this.prices.pricesFor(this.marketId);

  private readonly bilans = this.record.bilansFor(this.marketId);

  readonly items = computed(() => {
    const bilans = this.bilans();
    return this.catalogue.items().map((dish) => {
      const pileName = pile(bilans[dish.itemId()] ?? []);
      const quote = dish.pricing().quoteAt(this.marketPrices()[dish.itemId()]);
      return {
        itemId: dish.itemId(),
        name: dish.name(),
        priceLabel: quote.label,
        atMarketPrice: quote.setByMarket,
        pile: pileName,
        pileTone: pileName ? TONES[pileName] : '',
        chosen: this.selected().has(dish.itemId()),
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
