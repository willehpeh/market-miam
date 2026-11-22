import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { applyEach, form, FormField, validate } from '@angular/forms/signals';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { MarketScheduleFacade } from '../markets/market-schedule.facade';
import { Dish } from '../catalogue/dish';
import { Euros } from '../core/euros';
import { MarketPricesFacade } from './market-prices.facade';
import { MarketPrice, PriceList } from './market-prices';

// `stored` is what this market charges as last saved; `price` is what the field holds.
// Their difference is the whole of the two row states (decision 7).
type RowModel = { label: string; carte: string; stored: string; price: string };
type DishModel = { itemId: string; name: string; rows: RowModel[] };

@Component({
  selector: 'mm-price-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, FormField, Spinner],
  template: `
    <mm-card back="/dashboard/markets">
      <h1 class="text-xl leading-tight">Tarifs</h1>

      @if (loading()) {
        <div class="mx-auto grid h-32 place-items-center">
          <mm-spinner label="Chargement des tarifs…" />
        </div>
      } @else if (marketName(); as name) {
        <p class="mt-3 text-sm text-ink-soft">{{ name }}</p>

        <ul class="mt-6 space-y-3">
          @for (dish of fields.dishes; track d; let d = $index) {
            <li class="rounded-card border border-line bg-surface p-3">
              <!-- ponytail: the heading marks a dish sold by variant, and the domain gives
                   such a dish at least two. A one-variant dish would render its rows
                   without the name above them. -->
              @if (dish.rows.length > 1) {
                <h2 class="mb-2 font-bold text-ink">{{ dish.name().value() }}</h2>
              }
              @for (row of dish.rows; track r; let r = $index) {
                <div
                  class="relative rounded-card border-l-4 p-2"
                  [class.mt-3]="r > 0"
                  [class.bg-brand-soft]="row.stored().value()"
                  [class.border-transparent]="row.price().value() === row.stored().value()"
                  [class.border-brand]="row.price().value() !== row.stored().value()"
                >
                  <!-- pr-24 holds the corner open: the cue is out of the flow, so nothing
                       else stops an uppercase variant label running underneath it. -->
                  <label [attr.for]="'price-' + d + '-' + r" class="field-label block pr-24">
                    {{ row.label().value() }}
                  </label>
                  @if (row.stored().value()) {
                    <!-- Pinned top-right and out of the flow, as on the menu editor, so the
                         cue stops shortening the label beside it. It does not straddle the
                         edge the way that one does, because this block has no top border to
                         notch and is bg-brand-soft on a bg-surface card: a cue crossing that
                         boundary would be half white, half tint. Inside the corner it sits
                         wholly on the tint, which is painted under exactly the condition
                         that shows it. -->
                    <span class="absolute right-2 top-2 text-xs font-bold text-brand">Tarif marché</span>
                  }
                  <div class="mt-1 flex items-baseline gap-3">
                    <input
                      [id]="'price-' + d + '-' + r"
                      type="text"
                      inputmode="decimal"
                      class="min-w-0 flex-1"
                      [formField]="row.price"
                    />
                    <span class="shrink-0 text-sm text-muted">{{ row.carte().value() }}</span>
                  </div>
                  @if (row.price().invalid()) {
                    <p role="alert" class="mt-1 text-xs text-danger">
                      Indiquez un prix, par exemple 12,00, ou laissez vide pour le prix de la carte.
                    </p>
                  }
                </div>
              }
            </li>
          } @empty {
            <li class="text-sm text-ink-soft">Votre carte est vide pour l'instant.</li>
          }
        </ul>

        @if (fields.dishes.length > 0) {
          <button
            type="button"
            class="mt-6 flex w-full max-w-xs mx-auto justify-center"
            [disabled]="fields().invalid()"
            (click)="save()"
          >
            Enregistrer @if (changed(); as count) { ({{ count }}) }
          </button>
        }
      } @else {
        <p class="mt-3 text-sm text-ink-soft">Ce marché n'est plus programmé.</p>
      }
    </mm-card>
  `,
})
export class PriceEditor {
  private readonly catalogue = inject(CatalogueFacade);
  private readonly prices = inject(MarketPricesFacade);
  private readonly schedules = inject(MarketScheduleFacade);
  private readonly route = inject(ActivatedRoute);

  readonly marketId = this.route.snapshot.paramMap.get('marketId') ?? '';

  // Every feed gates the screen. Schedules arriving late would state that a market the
  // vendor stands at weekly is no longer programmed; prices arriving late would seed every
  // row at its carte price, and a vendor typing into that saves over what they never saw.
  protected readonly loading = computed(
    () => this.schedules.loading() || this.catalogue.loading() || this.prices.loading(),
  );

  // Named from the schedules, which is also what says the market is still stood at: the
  // domain refuses prices for a market the vendor has stopped scheduling.
  protected readonly marketName = computed(
    () => this.schedules.schedules().find((schedule) => schedule.marketId === this.marketId)?.market.name,
  );

  private readonly marketPrices = this.prices.pricesFor(this.marketId);

  private readonly model = linkedSignal<{ dishes: Dish[]; marketPrices: PriceList }, { dishes: DishModel[] }>({
    source: () => ({ dishes: this.catalogue.items(), marketPrices: this.marketPrices() }),
    computation: ({ dishes, marketPrices }) => ({
      dishes: dishes.map((dish) => this.modelOf(dish, marketPrices[dish.itemId()])),
    }),
  });

  // Blank is a valid answer here — it is the dish selling at its carte price — so only a
  // filled field that will not parse is an error, and it says so without waiting for a blur.
  protected readonly fields = form(this.model, (path) => {
    applyEach(path.dishes, (dish) => {
      applyEach(dish.rows, (row) => {
        validate(row.price, ({ value }) =>
          value() !== '' && Euros.parse(value()) === null ? { kind: 'price' } : undefined,
        );
      });
    });
  });

  constructor() {
    this.catalogue.load();
    this.prices.load();
    this.schedules.load();
  }

  // How many rows differ from what this market charges today — the cue a vendor forty rows
  // down needs to know there is unsaved work, and the only one a row cleared back to the
  // carte price can show.
  protected readonly changed = computed(
    () =>
      this.fields()
        .value()
        .dishes.flatMap((dish) => dish.rows)
        .filter((row) => row.price !== row.stored).length,
  );

  // The whole list, every time: a row left blank is not an omission to merge over the
  // stored one, it is the dish going back to its carte price.
  save(): void {
    if (this.fields().invalid()) {
      return;
    }
    this.prices.setPrices(this.marketId, this.priceListOf(this.fields().value().dishes));
  }

  private priceListOf(typed: DishModel[]): PriceList {
    const list: PriceList = {};
    for (const { itemId, rows } of typed) {
      const dish = this.catalogue.items().find((candidate) => candidate.hasId(itemId));
      const price = dish?.pricing().marketPriceFrom(rows.map((row) => Euros.parse(row.price)));
      if (price !== undefined) {
        list[itemId] = price;
      }
    }
    return list;
  }

  private modelOf(dish: Dish, market: MarketPrice | undefined): DishModel {
    const rows = dish.pricing().marketRows(market).map((row) => {
      const stored = row.market()?.asTyped() ?? '';
      return { label: row.variant() ?? dish.name(), carte: `carte ${row.carte().label()}`, stored, price: stored };
    });
    return { itemId: dish.itemId(), name: dish.name(), rows };
  }
}
