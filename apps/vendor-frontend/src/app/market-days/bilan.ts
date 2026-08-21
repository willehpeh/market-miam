import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { longDate } from '../core/french-date';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { MarketDayFacade } from './market-day.facade';
import { hasLiveScreen, isFinished } from './live-status';
import { ItemOutcome } from './market-days';

// Worst to best, and the order the vendor reads them in. Working copy, not settled
// vocabulary: *moins bien vendu* over *mal vendu* because the comparative is a fact about
// the tray where *mal* is a verdict on the vendor, and this is a screen they meet in the
// rain after a bad morning.
const CHOICES: { outcome: ItemOutcome; label: string }[] = [
  { outcome: 'did_not_do_well', label: 'Moins bien vendu' },
  { outcome: 'did_well', label: 'Bien vendu' },
  { outcome: 'sold_out', label: 'Épuisé' },
];

@Component({
  selector: 'mm-bilan',
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

        @if (marketDay.finished) {
          <!-- Decision 64: one word. The three answers already say what is being asked,
               and a question above them states at day scale what the control answers at
               dish scale. -->
          <h2 class="mt-6 text-sm font-bold uppercase tracking-wide text-muted">Bilan</h2>

          <!-- Decision 68: a flat list in catalogue order, no épuisés split and no
               reordering as answers land — a list that rearranges itself under the thumb
               that just answered it is worse than one that does not. Native radios, so
               arrow-within-row and Tab-between-rows come for nothing. -->
          <ul class="mt-3 space-y-3">
            @for (row of rows(); track row.itemId) {
              <li>
                <fieldset>
                  <legend class="font-bold text-ink">{{ row.name }}</legend>
                  <div class="mt-1 flex gap-1.5">
                    @for (choice of choices; track choice.outcome) {
                      <label
                        class="flex-1 rounded-field p-2 text-center text-xs font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
                        [class]="
                          row.outcome === choice.outcome
                            ? 'bg-brand text-white'
                            : 'border border-line-strong bg-surface text-ink'
                        "
                      >
                        <input
                          type="radio"
                          class="sr-only"
                          [name]="row.itemId"
                          [checked]="row.outcome === choice.outcome"
                          (change)="choose(row.itemId, choice.outcome)"
                        />
                        {{ choice.label }}
                      </label>
                    }
                  </div>
                </fieldset>
              </li>
            } @empty {
              <!-- Decision 71: the *je ne peux pas venir* close leaves a real day with
                   nothing to judge, and *ce marché n'a pas lieu* would be false. -->
              <li class="text-sm text-ink-soft">Aucun plat à ce marché.</li>
            }
          </ul>

          <!-- Decision 72: the foot is the save, and it carries the whole set — the rows
               prefilled from the service log included. Decision 71: it does not appear or
               rename itself as the last row lands, because a bilan is finished when the
               vendor says it is. -->
          <button type="button" class="mt-8 flex w-full max-w-xs mx-auto justify-center" (click)="finish()">
            Terminer le bilan
          </button>
        } @else {
          <!-- Decision 71: the screen declines what the domain declines, and says why.
               Refusing a day still being traded is the screen agreeing with decision 54
               rather than second-guessing it. Decision 75 adds the second reason, and it is
               not a matter of waiting: a market called off before it opened never happened,
               and *pas encore* would promise a bilan that never comes. -->
          <p class="mt-6 text-sm text-ink-soft">
            {{ marketDay.calledOff ? "Ce marché n'a pas eu lieu." : "Ce marché n'est pas encore terminé." }}
          </p>
          @if (marketDay.live) {
            <a [routerLink]="liveLink" class="mt-4 inline-block font-bold text-brand no-underline">
              Voir le marché en direct
            </a>
          } @else {
            <a routerLink="/dashboard" class="mt-4 inline-block font-bold text-brand no-underline">
              Retour au tableau de bord
            </a>
          }
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
export class Bilan {
  private readonly marketDays = inject(MarketDayFacade);
  private readonly catalogue = inject(CatalogueFacade);
  private readonly route = inject(ActivatedRoute);

  readonly marketId = this.route.snapshot.paramMap.get('marketId') ?? '';
  readonly date = this.route.snapshot.paramMap.get('date') ?? '';

  readonly choices = CHOICES;
  readonly liveLink = ['/dashboard/live', this.marketId, this.date];

  readonly loading = computed(() => this.marketDays.day().status === 'loading' || this.catalogue.loading());

  private readonly occurrence = computed(() => {
    const slot = this.marketDays.day();
    return slot.status === 'found' ? slot.day : undefined;
  });

  readonly day = computed(() => {
    const occurrence = this.occurrence();
    return occurrence
      ? {
          label: longDate(occurrence.day, occurrence.date),
          marketName: occurrence.market.name,
          finished: isFinished(occurrence),
          calledOff: occurrence.calledOff,
          // Only a day the live screen would accept gets a link to it: a February market
          // is unfinished too, and that door opens onto a refusal.
          live: hasLiveScreen(occurrence),
        }
      : undefined;
  });

  // What the vendor answered this sitting, over what the day already knows. Owned from
  // the first tap, exactly as the menu editor's ticks are.
  private readonly answered = signal<Record<string, ItemOutcome>>({});

  // The prefill is the service log, and a recorded bilan outranks it: a vendor who
  // already overrode a mark should not meet the mark again on their second visit
  // (decisions 49, 72).
  private readonly recorded = computed<Record<string, ItemOutcome>>(() => {
    const occurrence = this.occurrence();
    const soldOut = Object.fromEntries(
      (occurrence?.soldOutItemIds ?? []).map(itemId => [itemId, 'sold_out' as ItemOutcome]),
    );
    return { ...soldOut, ...occurrence?.outcomes };
  });

  // The day's menu joined to the catalogue, in catalogue order — the same join the live
  // screen and the editor make.
  readonly rows = computed(() => {
    const onMenu = new Set(this.occurrence()?.itemIds ?? []);
    const outcomes = { ...this.recorded(), ...this.answered() };
    return this.catalogue
      .items()
      .filter(item => onMenu.has(item.itemId))
      .map(item => ({ itemId: item.itemId, name: item.name, outcome: outcomes[item.itemId] }));
  });

  constructor() {
    this.marketDays.loadDay(this.marketId, this.date);
    this.catalogue.load();
  }

  choose(itemId: string, outcome: ItemOutcome): void {
    this.answered.update(answered => ({ ...answered, [itemId]: outcome }));
  }

  finish(): void {
    const outcomes = Object.fromEntries(
      this.rows()
        .filter(row => row.outcome)
        .map(row => [row.itemId, row.outcome as ItemOutcome]),
    );
    this.marketDays.recordBilan(this.marketId, this.date, outcomes);
  }
}
