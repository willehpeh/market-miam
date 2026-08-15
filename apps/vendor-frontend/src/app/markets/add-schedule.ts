import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { form, FormField, required, validate } from '@angular/forms/signals';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { MarketScheduleFacade } from './market-schedule.facade';
import { MarketScheduleView } from './market-schedules';

const DAYS = [
  { code: 'MON', short: 'L', label: 'Lundi' },
  { code: 'TUE', short: 'M', label: 'Mardi' },
  { code: 'WED', short: 'M', label: 'Mercredi' },
  { code: 'THU', short: 'J', label: 'Jeudi' },
  { code: 'FRI', short: 'V', label: 'Vendredi' },
  { code: 'SAT', short: 'S', label: 'Samedi' },
  { code: 'SUN', short: 'D', label: 'Dimanche' }
];
type DayEntry = { day: string; startTime: string; endTime: string };
// Named for the same reason as the dish form's: the model is a linkedSignal whose
// computation returns its own previous value, which inference cannot unpick alone.
type MarketModel = { name: string; streetAddress: string; codePostal: string; town: string; pitch: string };

@Component({
  selector: 'mm-add-schedule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, FormField, Spinner],
  template: `
    <mm-card>
      @if (loading()) {
        <div class="mx-auto grid h-32 place-items-center">
          <mm-spinner label="Chargement du marché…" />
        </div>
      } @else if (missing()) {
        <!-- Save only exists inside the branch that found the market, so a cold refresh
             cannot render an empty form and write it back over the real one. -->
        <p class="text-sm text-ink-soft">Ce marché n'est plus dans votre calendrier.</p>
        <a routerLink="/dashboard/markets" class="mt-4 inline-block font-bold text-brand no-underline">
          Retour à vos marchés
        </a>
      } @else {
      <form (submit)="submit($event)">
        <div class="flex items-center justify-between">
          <h1 class="text-xl leading-tight">{{ isEditing ? 'Modifier le marché' : 'Nouveau marché' }}</h1>
          <a routerLink="/dashboard/markets" class="text-sm font-bold text-brand no-underline">Annuler</a>
        </div>
        <p class="mt-2 text-sm text-ink-soft">Ces informations disent à vos clients où vous retrouver.</p>

        <div class="mt-5">
          <p class="field-label">Fréquence</p>
          <div class="mt-1 flex gap-2">
            <button
              type="button"
              aria-pressed="true"
              class="flex-1 rounded-field border border-brand bg-brand-soft px-3 py-2 font-bold text-brand"
            >
              <i class="fa-solid fa-calendar-days mr-2" aria-hidden="true"></i>Chaque semaine
            </button>
            <button
              type="button"
              disabled
              class="flex-1 rounded-field border border-line bg-transparent px-3 py-2 text-muted opacity-60"
            >
              <i class="fa-solid fa-location-dot mr-2" aria-hidden="true"></i>Une seule fois
            </button>
          </div>
          <p class="mt-1 text-xs text-muted">Le marché reviendra automatiquement chaque semaine à ce jour.</p>
        </div>

        <div class="mt-5 space-y-4">
          <div>
            <label for="name" class="field-label">Nom du marché</label>
            <input
              id="name"
              type="text"
              class="mt-1"
              [formField]="fields.name"
              placeholder="ex. Marché de Monplaisir"
              [attr.aria-invalid]="fields.name().touched() && fields.name().invalid()"
            />
            @if (fields.name().touched() && fields.name().invalid()) {
              <p role="alert" class="mt-1 text-xs text-danger">Le nom du marché est requis.</p>
            }
          </div>

          <div>
            <label for="streetAddress" class="field-label">Adresse · optionnel</label>
            <input id="streetAddress" type="text" class="mt-1" [formField]="fields.streetAddress"
                   placeholder="ex. Place du Prado" />
          </div>

          <div>
            <div class="flex gap-3">
              <div class="w-1/3">
                <label for="codePostal" class="field-label">Code postal</label>
                <input
                  id="codePostal"
                  type="text"
                  inputmode="numeric"
                  class="mt-1"
                  [formField]="fields.codePostal"
                  placeholder="ex. 69008"
                  [attr.aria-invalid]="fields.codePostal().touched() && fields.codePostal().invalid()"
                />
              </div>
              <div class="flex-1">
                <label for="town" class="field-label">Ville</label>
                <input
                  id="town"
                  type="text"
                  class="mt-1"
                  [formField]="fields.town"
                  placeholder="ex. Lyon"
                  [attr.aria-invalid]="fields.town().touched() && fields.town().invalid()"
                />
              </div>
            </div>
            @if (fields.codePostal().touched() && fields.codePostal().invalid()) {
              <p role="alert" class="mt-1 text-xs text-danger">Code postal à 5 chiffres.</p>
            }
          </div>
        </div>

        <div class="mt-5">
          <p class="field-label">Jours de la semaine · un ou plusieurs</p>
          <div class="mt-1 flex gap-1.5">
            @for (day of allDays; track day.code) {
              <button
                type="button"
                [attr.aria-pressed]="selected(day.code)"
                [attr.aria-label]="day.label"
                (click)="toggleDay(day.code)"
                class="h-10 flex-1 rounded-field p-0 text-sm font-bold"
                [class.bg-brand]="selected(day.code)"
                [class.text-white]="selected(day.code)"
                [class.bg-surface]="!selected(day.code)"
                [class.border]="!selected(day.code)"
                [class.border-line-strong]="!selected(day.code)"
                [class.text-ink]="!selected(day.code)"
              >
                {{ day.short }}
              </button>
            }
          </div>
        </div>

        @if (rows().length) {
          <div class="mt-5">
            <p class="field-label">Horaires par jour</p>
            <div class="mt-1 space-y-2">
              @for (row of rows(); track row.day) {
                <div class="flex items-center gap-2 rounded-card border border-line p-3">
                  <span class="w-10 shrink-0 font-bold text-ink">{{ row.label.slice(0, 3) }}</span>
                  <input
                    type="time"
                    class="flex-1"
                    [attr.aria-label]="'Début ' + row.label"
                    [value]="row.startTime"
                    (input)="setTime(row.day, 'startTime', asValue($event))"
                  />
                  <span aria-hidden="true" class="text-muted">–</span>
                  <input
                    type="time"
                    class="flex-1"
                    [attr.aria-label]="'Fin ' + row.label"
                    [value]="row.endTime"
                    (input)="setTime(row.day, 'endTime', asValue($event))"
                  />
                </div>
              }
            </div>
          </div>
        }

        <div class="mt-4">
          <label for="pitch" class="field-label">Emplacement · optionnel</label>
          <input id="pitch" type="text" class="mt-1" [formField]="fields.pitch"
                 placeholder="ex. Allée centrale, stand 24" />
        </div>

        <button type="submit" class="mt-6 flex w-full max-w-xs mx-auto justify-center" [disabled]="cannotSubmit()">
          {{ isEditing ? 'Enregistrer' : 'Ajouter le marché ✓' }}
        </button>
      </form>
      }
    </mm-card>
  `
})
export class AddSchedule {
  protected readonly allDays = DAYS;
  protected readonly rows = computed(() => {
    const entries = this.days();
    return DAYS.flatMap((day) => {
      const entry = entries.find((e) => e.day === day.code);
      return entry ? [{ ...entry, label: day.label }] : [];
    });
  });
  private readonly markets = inject(MarketScheduleFacade);
  private readonly route = inject(ActivatedRoute);

  // The route decides which screen this is, not the store: a link naming a market is an
  // edit even before the market has arrived.
  private readonly routeScheduleId = this.route.snapshot.paramMap.get('scheduleId');
  protected readonly isEditing = this.routeScheduleId !== null;

  protected readonly editing = computed(() =>
    this.routeScheduleId === null
      ? undefined
      : this.markets.schedules().find((schedule) => schedule.scheduleId === this.routeScheduleId)
  );
  protected readonly loading = computed(() => this.isEditing && this.markets.loading());
  protected readonly missing = computed(() => this.isEditing && !this.loading() && this.editing() === undefined);

  // Both seeded on the market's identity, not its contents: a linkedSignal recomputes
  // whenever its source's dependencies change rather than comparing source values, so
  // the check is made here — otherwise any store update retypes the form under the
  // vendor.
  protected readonly days = linkedSignal<MarketScheduleView | undefined, DayEntry[]>({
    source: () => this.editing(),
    computation: (schedule, previous) =>
      previous && previous.source?.scheduleId === schedule?.scheduleId
        ? previous.value
        : schedule?.days.map((day) => ({
            day: day.day,
            startTime: day.startTime ?? '',
            endTime: day.endTime ?? ''
          })) ?? []
  });
  protected readonly fields = form(
    linkedSignal<MarketScheduleView | undefined, MarketModel>({
      source: () => this.editing(),
      computation: (schedule, previous) =>
        previous && previous.source?.scheduleId === schedule?.scheduleId
          ? previous.value
          : {
              name: schedule?.market.name ?? '',
              streetAddress: schedule?.market.streetAddress ?? '',
              codePostal: schedule?.market.codePostal ?? '',
              town: schedule?.market.town ?? '',
              pitch: schedule?.market.pitch ?? ''
            }
    }),
    (path) => {
      required(path.name);
      required(path.town);
      // Trimmed rather than `pattern`, so a code pasted with stray spaces is judged on
      // its digits — which is what the vendor meant by it.
      validate(path.codePostal, ({ value }) =>
        /^\d{5}$/.test(value().trim()) ? undefined : { kind: 'codePostal' }
      );
    }
  );

  // The one rule the form cannot own: `days` is not a form field but a set of custom
  // toggles and time inputs, so its validity is still combined here.
  private readonly daysValid = computed(() => {
    const days = this.days();
    return days.length > 0 && this.allDaysHaveStartAndEndTimes(days);
  });

  protected readonly cannotSubmit = computed(() => this.fields().invalid() || !this.daysValid());

  protected selected(code: string): boolean {
    return this.days().some((day) => day.day === code);
  }

  protected toggleDay(code: string): void {
    const current = this.days();
    this.days.set(
      this.selected(code)
        ? current.filter((day) => day.day !== code)
        : [...current, { day: code, startTime: '08:00', endTime: '13:00' }]
    );
  }

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected setTime(code: string, field: 'startTime' | 'endTime', value: string): void {
    this.days.set(this.days().map((day) => (day.day === code ? { ...day, [field]: value } : day)));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.cannotSubmit()) {
      return;
    }
    const { name, streetAddress, codePostal, town, pitch } = this.fields().value();
    const schedule = {
      market: {
        name: name.trim(),
        streetAddress: streetAddress.trim() || undefined,
        codePostal: codePostal.trim(),
        town: town.trim(),
        pitch: pitch.trim() || undefined
      },
      days: this.rows().map((day) => ({
        day: day.day,
        startTime: day.startTime || undefined,
        endTime: day.endTime || undefined
      })),
      frequency: this.editing()?.frequency ?? { weeks: 1 }
    };
    const editing = this.editing();
    if (editing) {
      this.markets.amendSchedule(editing.scheduleId, schedule);
    } else {
      this.markets.registerSchedule(schedule);
    }
  }

  constructor() {
    // Warm-only in the facade. No guard does this for the screen any more.
    this.markets.load();
  }

  private allDaysHaveStartAndEndTimes(days: DayEntry[]) {
    return days.every((day) => !!day.startTime && !!day.endTime && day.endTime > day.startTime);
  }
}
