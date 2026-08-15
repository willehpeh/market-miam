import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChildren } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { formatTime, longDate } from '../core/french-date';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { MarketDayFacade } from './market-day.facade';
import { awaitingStart, broadcasting } from './live-status';

const WAITING_POLL_MS = 60_000;

type Row = { itemId: string; name: string };

@Component({
  selector: 'mm-live-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, RouterLink, Spinner],
  template: `
    <mm-card back="/dashboard">
      @if (loading()) {
        <div class="mx-auto grid h-32 place-items-center">
          <mm-spinner label="Chargement du marché…" />
        </div>
      } @else if (day(); as marketDay) {
        <h1 class="text-xl leading-tight">{{ marketDay.label }}</h1>
        <p class="mt-3 text-sm text-ink-soft">{{ marketDay.marketName }}</p>

        <!-- One slot, two server-said states (decisions 27, 37): the stated boundary
             while waiting, the broadcast receipt once live. Never a countdown. -->
        @if (live()) {
          <div class="mt-4 rounded-card border border-brand bg-surface p-3">
            <p class="font-bold text-brand">En direct</p>
            <p class="text-sm text-ink-soft">Vos clients voient ce menu.</p>
          </div>
        } @else if (waiting()) {
          <div class="mt-4 rounded-card bg-surface-sunk p-3">
            <p class="text-sm text-ink-soft">Vos clients verront ce menu à partir de {{ startLabel() }}.</p>
          </div>
        }

        <!-- One fast tap on a full-width row; the row moving into the épuisé group is the
             receipt — no toast, no confirm (decision 7). -->
        <ul class="mt-6 space-y-2">
          @for (item of active(); track item.itemId) {
            <li>
              <button
                #row
                type="button"
                class="w-full rounded-card border border-line bg-surface p-3 text-left font-bold text-ink"
                [attr.data-item]="item.itemId"
                (click)="markSoldOut(item)"
              >
                {{ item.name }}
              </button>
            </li>
          }
        </ul>

        @if (epuises().length) {
          <section class="mt-8" aria-labelledby="epuises-heading">
            <h2 id="epuises-heading" class="text-sm font-bold uppercase tracking-wide text-muted">Épuisé</h2>
            <ul class="mt-3 space-y-2">
              @for (item of epuises(); track item.itemId) {
                <li>
                  <button
                    #row
                    type="button"
                    class="w-full rounded-card border border-line bg-surface-sunk p-3 text-left font-bold text-muted"
                    [attr.data-item]="item.itemId"
                    (click)="markAvailable(item)"
                  >
                    {{ item.name }}
                  </button>
                </li>
              }
            </ul>
          </section>
        }

        <p aria-live="polite" class="sr-only">{{ note() }}</p>
      } @else {
        <!-- Decision 41: the commands this screen fires are refused for any day but
             today, so the screen declines the same thing — no route guard. -->
        <p class="text-sm text-ink-soft">Ce marché n'a pas lieu aujourd'hui.</p>
        <a routerLink="/dashboard" class="mt-4 inline-block font-bold text-brand no-underline">
          Retour au tableau de bord
        </a>
      }
    </mm-card>
  `,
})
export class LiveScreen {
  private readonly marketDays = inject(MarketDayFacade);
  private readonly catalogue = inject(CatalogueFacade);
  private readonly route = inject(ActivatedRoute);

  private readonly marketId = this.route.snapshot.paramMap.get('marketId') ?? '';
  private readonly date = this.route.snapshot.paramMap.get('date') ?? '';

  readonly loading = computed(() => this.marketDays.loading() || this.catalogue.loading());

  private readonly occurrence = computed(() =>
    this.marketDays.days().find((candidate) => candidate.marketId === this.marketId && candidate.date === this.date),
  );

  readonly day = computed(() => {
    const occurrence = this.occurrence();
    return occurrence?.today
      ? { label: longDate(occurrence.day, occurrence.date), marketName: occurrence.market.name }
      : undefined;
  });

  // The rows are the day's menu, not the catalogue: what the vendor brought, in
  // catalogue order — same join the editor makes, narrowed to the planned set.
  private readonly planned = computed(() => {
    const onMenu = new Set(this.occurrence()?.itemIds ?? []);
    return this.catalogue.items().filter((item) => onMenu.has(item.itemId));
  });

  private readonly soldOut = computed(() => new Set(this.occurrence()?.soldOutItemIds ?? []));

  readonly active = computed(() => this.planned().filter((item) => !this.soldOut().has(item.itemId)));
  readonly epuises = computed(() => this.planned().filter((item) => this.soldOut().has(item.itemId)));

  readonly live = computed(() => broadcasting(this.occurrence()));
  readonly waiting = computed(() => awaitingStart(this.occurrence()));
  readonly startLabel = computed(() => {
    const startTime = this.occurrence()?.startTime;
    return startTime ? formatTime(startTime) : '';
  });

  readonly note = signal('');

  // Both row lists in one query, in DOM order — how a moved row is found again after the
  // render that moved it.
  private readonly rows = viewChildren<ElementRef<HTMLButtonElement>>('row');
  private readonly pendingFocus = signal<string | null>(null);

  constructor() {
    this.marketDays.load();
    this.catalogue.load();
    // Decision 8's mechanism gated on waiting (decision 27): each tick asks the gate, so
    // the re-asks stop the moment the server says live — and the gate, not the interval,
    // is the part under test (decision 32b).
    interval(WAITING_POLL_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (awaitingStart(this.occurrence())) {
          this.marketDays.refresh();
        }
      });
    // Decision 20: the tapped row's element is destroyed when it changes group, which
    // strands keyboard and switch-control focus — so focus follows the row once the
    // render that moved it has run. Focus is a DOM write, hence the write phase.
    afterRenderEffect({
      write: () => {
        const itemId = this.pendingFocus();
        if (!itemId) {
          return;
        }
        this.rows().find(row => row.nativeElement.dataset['item'] === itemId)?.nativeElement.focus();
        this.pendingFocus.set(null);
      },
    });
  }

  markSoldOut(item: Row): void {
    this.marketDays.markSoldOut(this.marketId, this.date, item.itemId);
    this.moved(`${item.name} épuisé`, item.itemId);
  }

  markAvailable(item: Row): void {
    this.marketDays.markAvailable(this.marketId, this.date, item.itemId);
    this.moved(`${item.name} disponible`, item.itemId);
  }

  private moved(note: string, itemId: string): void {
    this.note.set(note);
    this.pendingFocus.set(itemId);
  }
}
