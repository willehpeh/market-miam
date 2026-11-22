import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChildren } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card } from '../../core/card';
import { Spinner } from '../../core/spinner';
import { CatalogueFacade } from '../../catalogue/catalogue.facade';
import { MarketDayFacade } from '../market-day.facade';
import { ClosedNotice } from '../closed-notice';
import { ReopenStand } from '../reopen-stand';
import { Dish } from '../../catalogue/dish';

@Component({
  selector: 'mm-live-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, ClosedNotice, ReopenStand, RouterLink, Spinner],
  template: `
    <mm-card back="/dashboard">
      @if (loading()) {
        <div class="mx-auto grid h-32 place-items-center">
          <mm-spinner label="Chargement du marché…" />
        </div>
      } @else if (day(); as marketDay) {
        <h1 class="text-xl leading-tight">{{ marketDay.label() }}</h1>
        <p class="mt-3 text-sm text-ink-soft">{{ marketDay.marketName() }}</p>

        <!-- One slot, three server-said states (decisions 27, 37, 38): the stated boundary
             while waiting, the broadcast receipt once live, and the closed state that
             outranks both — a closed day leaves the customer's list entirely. Never a countdown. -->
        @if (marketDay.isClosed()) {
          <mm-closed-notice />
        } @else if (marketDay.isAfterHours()) {
          <div class="mt-4 rounded-card bg-surface-sunk p-3">
            <p class="font-bold text-ink">Marché terminé</p>
          </div>
        } @else if (marketDay.isBroadcasting()) {
          <div class="mt-4 rounded-card border border-brand bg-surface p-3">
            <p class="font-bold text-brand">En direct</p>
            <p class="text-sm text-ink-soft">Vos clients voient ce menu.</p>
          </div>
        } @else if (marketDay.isAwaitingStart()) {
          <div class="mt-4 rounded-card bg-surface-sunk p-3">
            <p class="text-sm text-ink-soft">Vos clients verront ce menu à partir de {{ marketDay.opensAt() }}.</p>
          </div>
        }

        <!-- One fast tap on a full-width row; the row moving into the épuisé group is the
             receipt — no toast, no confirm (decision 7). A closed stand sinks the rows onto
             the canvas and drops their border — the raised card is what says *tappable*, so
             that is what goes, not the legibility. Decision 48 keeps them as rows, split into
             the same two groups — and decision 70 left them there when the bilan took its
             own route, so nothing but availability has ever landed on them. -->
        <ul class="mt-6 space-y-2">
          @for (item of active(); track item.itemId()) {
            <li>
              <button
                #row
                type="button"
                class="w-full rounded-card border p-3 text-left font-bold text-ink disabled:opacity-100"
                [class]="marketDay.hasEnded() ? 'border-transparent bg-canvas' : 'border-line bg-surface'"
                [attr.data-item]="item.itemId()"
                [disabled]="marketDay.hasEnded()"
                (click)="markSoldOut(item)"
              >
                {{ item.name() }}
              </button>
            </li>
          }
        </ul>

        @if (epuises().length) {
          <section class="mt-8" aria-labelledby="epuises-heading">
            <h2 id="epuises-heading" class="text-sm font-bold uppercase tracking-wide text-muted">Épuisés</h2>
            <ul class="mt-3 space-y-2">
              @for (item of epuises(); track item.itemId()) {
                <li>
                  <button
                    #row
                    type="button"
                    class="w-full rounded-card border p-3 text-left font-bold text-muted disabled:opacity-100"
                    [class]="marketDay.hasEnded() ? 'border-transparent bg-canvas' : 'border-line bg-surface-sunk'"
                    [attr.data-item]="item.itemId()"
                    [disabled]="marketDay.hasEnded()"
                    (click)="markAvailable(item)"
                  >
                    {{ item.name() }}
                  </button>
                </li>
              }
            </ul>
          </section>
        }

        <!-- Decision 38: no confirm dialog. The protection is the placement — the foot of
             the page, furthest from the rows tapped all morning. -->
        <!-- Decision 10: discreet, because the rows are what this screen is for — but the
             editor stays open all market, since a vendor who brought one more tray must
             be able to say so. It closes with the market (decision 63): an edit at 15h
             rewrites the set 2b is about to ask the vendor to judge. The screen declines
             it, the domain still accepts it — same split as the rows above. -->
        @if (!marketDay.hasEnded()) {
          <a [routerLink]="editorLink" class="mt-8 block text-center text-sm font-bold text-brand no-underline">
            Modifier le menu
          </a>
        }

        <!-- Decision 52: one slot, one verb, flipping at startTime. Keyed to the phase
             alone rather than to broadcasting: the banner above claims something about a menu,
             this offers to call the day off, which needs none. -->
        <!-- Decision 60: an ended day has no close verb, because ADR 0049 defines a close
             as an early endTime and the clock already ran out; and no Rouvrir, because
             decision 50 refuses one past endTime and the failure path is a silent
             snap-back. What lands here is the bilan's door, below. -->
        @if (!marketDay.isAfterHours()) {
          @if (marketDay.isClosed()) {
            <mm-reopen-stand [marketId]="marketId" [date]="date" />
          } @else {
            <button type="button" class="quiet mt-8 flex w-full max-w-xs mx-auto justify-center" (click)="closeStand()">
              @if (marketDay.isTrading()) {
                Fermer le stand
              } @else {
                Je ne peux pas venir aujourd'hui
              }
            </button>
          }
        }

        <!-- Decision 70: reckoning is its own route, so the foot carries a door rather
             than a tenth state on this screen. Below the close verb, not above it, so
             Rouvrir keeps standing exactly where Fermer stood (decision 38) — and on an
             ended day it is the only thing here. Nearly the flag the rows read, except for
             the day called off before it opened: inert like any closed stand, but never
             traded, so there is nothing to look back on (decision 75). -->
        @if (marketDay.canBeJudged()) {
          <a [routerLink]="bilanLink" class="btn-link mt-8 flex w-full max-w-xs mx-auto">Faire le bilan</a>
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

  readonly marketId = this.route.snapshot.paramMap.get('marketId') ?? '';
  readonly date = this.route.snapshot.paramMap.get('date') ?? '';

  readonly editorLink = ['/dashboard/market', this.marketId, this.date, 'menu'];
  readonly bilanLink = ['/dashboard/market', this.marketId, this.date, 'bilan'];

  // The slot's own state, not the list's: *not fetched yet* has to outrank the guard
  // branch, or the screen says "pas aujourd'hui" for one frame on every entry.
  readonly loading = computed(() => this.marketDays.day().status === 'loading' || this.catalogue.loading());

  private readonly occurrence = computed(() => {
    const slot = this.marketDays.day();
    return slot.status === 'found' ? slot.day : undefined;
  });

  // Only today: the commands this screen fires are refused for any other day.
  readonly day = computed(() => (this.occurrence()?.isToday() ? this.occurrence() : undefined));

  // The rows are the day's menu, not the catalogue: what the vendor brought.
  private readonly planned = computed(() => this.occurrence()?.menuOf(this.catalogue.items()) ?? []);

  readonly active = computed(() => this.planned().filter((item) => !this.isSoldOut(item)));
  readonly epuises = computed(() => this.planned().filter((item) => this.isSoldOut(item)));

  // The duration alone, not the day it came from: the day object changes on every
  // optimistic tap, and re-arming the timer there would push the boundary further away
  // with each one — a vendor marking dishes all morning would never be re-asked.
  private readonly countdown = computed(() => this.occurrence()?.nextPhaseInMs());

  readonly note = signal('');

  // Both row lists in one query, in DOM order — how a moved row is found again after the
  // render that moved it.
  private readonly rows = viewChildren<ElementRef<HTMLButtonElement>>('row');
  private readonly pendingFocus = signal<string | null>(null);

  constructor() {
    this.reask();
    this.catalogue.load();
    // Decision 59: one timer, set from the server's own duration, instead of asking every
    // 60s all morning. It decides when to ask and nothing else — the phase stays
    // server-said, so a timer that fires early or late corrects itself on the next answer.
    effect((onCleanup) => {
      const countdown = this.countdown();
      if (countdown === undefined) {
        return;
      }
      const timer = setTimeout(() => this.reask(), countdown);
      onCleanup(() => clearTimeout(timer));
    });
    // A backgrounded phone fires no timer, so the tab coming back asks for itself.
    fromEvent(document, 'visibilitychange')
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (document.visibilityState === 'visible') {
          this.reask();
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

  private isSoldOut(item: Dish): boolean {
    return this.occurrence()?.isSoldOut(item.itemId()) ?? false;
  }

  private reask(): void {
    this.marketDays.loadDay(this.marketId, this.date);
  }

  closeStand(): void {
    this.marketDays.close(this.marketId, this.date);
  }

  markSoldOut(item: Dish): void {
    this.marketDays.markSoldOut(this.marketId, this.date, item.itemId());
    this.moved(`${item.name()} épuisé`, item.itemId());
  }

  markAvailable(item: Dish): void {
    this.marketDays.markAvailable(this.marketId, this.date, item.itemId());
    this.moved(`${item.name()} disponible`, item.itemId());
  }

  private moved(note: string, itemId: string): void {
    this.note.set(note);
    this.pendingFocus.set(itemId);
  }
}
