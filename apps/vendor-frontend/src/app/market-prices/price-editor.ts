import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { Card } from '../core/card';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { CatalogueItemView } from '../catalogue/catalogue';
import { centsToEuros, formatEuros } from '../catalogue/money';
import { MarketPricesFacade } from './market-prices.facade';
import { PriceList } from './market-prices';

type RowModel = { label: string; carte: string; price: string };
type DishModel = { name: string; rows: RowModel[] };

@Component({
  selector: 'mm-price-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, FormField],
  template: `
    <mm-card back="/dashboard/markets">
      <h1 class="text-xl leading-tight">Tarifs</h1>

      <ul class="mt-6 space-y-3">
        @for (dish of fields.dishes; track d; let d = $index) {
          <li class="rounded-card border border-line bg-surface p-3">
            <!-- ponytail: the heading marks a dish sold by variant, and the domain gives
                 such a dish at least two. A one-variant dish would render its rows without
                 the name above them. -->
            @if (dish.rows.length > 1) {
              <h2 class="mb-2 font-bold text-ink">{{ dish.name().value() }}</h2>
            }
            @for (row of dish.rows; track r; let r = $index) {
              <div [class.mt-3]="r > 0">
                <label [attr.for]="'price-' + d + '-' + r" class="field-label">{{ row.label().value() }}</label>
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
              </div>
            }
          </li>
        }
      </ul>
    </mm-card>
  `,
})
export class PriceEditor {
  private readonly catalogue = inject(CatalogueFacade);
  private readonly prices = inject(MarketPricesFacade);
  private readonly route = inject(ActivatedRoute);

  readonly marketId = this.route.snapshot.paramMap.get('marketId') ?? '';

  private readonly set = computed<PriceList>(
    () => this.prices.markets().find((market) => market.marketId === this.marketId)?.prices ?? {},
  );

  private readonly model = linkedSignal<{ items: CatalogueItemView[]; set: PriceList }, { dishes: DishModel[] }>({
    source: () => ({ items: this.catalogue.items(), set: this.set() }),
    computation: ({ items, set }) => ({ dishes: items.map((item) => dishModel(item, set[item.itemId])) }),
  });

  protected readonly fields = form(this.model);

  constructor() {
    this.catalogue.load();
    this.prices.load();
  }
}

// A set whose shape disagrees with the dish is ignored rather than rendered, the answer
// the read side already gives it: the vendor sees the carte price and can retype.
function dishModel(item: CatalogueItemView, set: number | Record<string, number> | undefined): DishModel {
  const rows = item.variants
    ? item.variants.map((variant) => row(variant.name, variant.price, pricedVariant(set, variant.name)))
    : [row(item.name, item.price ?? 0, typeof set === 'number' ? set : undefined)];
  return { name: item.name, rows };
}

function pricedVariant(set: number | Record<string, number> | undefined, variant: string): number | undefined {
  return typeof set === 'object' ? set[variant] : undefined;
}

function row(label: string, catalogue: number, set: number | undefined): RowModel {
  return {
    label,
    carte: `carte ${formatEuros(catalogue)}`,
    price: set === undefined ? '' : centsToEuros(set),
  };
}
