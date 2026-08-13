import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { longDate } from '../core/french-date';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { formatEuros } from '../catalogue/money';
import { MarketDayFacade } from './market-day.facade';

@Component({
  selector: 'mm-menu-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, RouterLink],
  template: `
    <mm-card back="/dashboard">
      @if (loading()) {
        <div class="mx-auto grid h-32 place-items-center">
          <div
            role="status"
            aria-label="Chargement du marché…"
            class="size-8 animate-spin rounded-full border-4 border-line-strong border-t-brand"
          ></div>
        </div>
      } @else if (day(); as marketDay) {
        <h1 class="text-xl leading-tight">{{ marketDay.label }}</h1>
        <p class="mt-3 text-sm text-ink-soft">{{ marketDay.marketName }}</p>

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
  private readonly route = inject(ActivatedRoute);

  // One entry point (the dashboard card), so params are read once — and `touched` below
  // is keyed to them. Before adding any second link to this route, go reactive:
  // toSignal(paramMap) + a linkedSignal reset, or day A's ticks silently become day B's
  // saved menu on a param-only navigation. VENDOR-FRONTEND-FOLLOWUPS.md §3.
  private readonly marketId = this.route.snapshot.paramMap.get('marketId') ?? '';
  private readonly date = this.route.snapshot.paramMap.get('date') ?? '';

  // Both feeds gate the spinner: days can land before the carte, and rendering on days
  // alone would briefly claim an empty carte while the catalogue is still on the wire.
  readonly loading = computed(() => this.marketDays.loading() || this.catalogue.loading());

  private readonly occurrence = computed(() =>
    this.marketDays.days().find((candidate) => candidate.marketId === this.marketId && candidate.date === this.date),
  );

  readonly day = computed(() => {
    const occurrence = this.occurrence();
    return occurrence
      ? { label: longDate(occurrence.day, occurrence.date), marketName: occurrence.market.name }
      : undefined;
  });

  // Seeded from the day whenever it lands, and owned by the vendor from their first tick:
  // once touched is set, a store update — the optimistic patch, say — cannot take their
  // choices back.
  private readonly touched = signal<ReadonlySet<string> | null>(null);
  private readonly selected = computed(() => this.touched() ?? new Set(this.occurrence()?.itemIds ?? []));

  readonly items = computed(() =>
    this.catalogue.items().map((item) => ({
      itemId: item.itemId,
      name: item.name,
      priceLabel: item.variants
        ? `dès ${formatEuros(Math.min(...item.variants.map((variant) => variant.price)))}`
        : formatEuros(item.price ?? 0),
      chosen: this.selected().has(item.itemId),
    })),
  );

  constructor() {
    this.marketDays.load();
    // ponytail: warm-only at the call site, as CatalogueList does — the catalogue facade
    // does not own this yet. See VENDOR-FRONTEND-FOLLOWUPS.md.
    if (!this.catalogue.items().length) {
      this.catalogue.load();
    }
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
