import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { Card } from '../core/card';
import { MarketScheduleFacade } from './market-schedule.facade';

const DAYS = [
  { code: 'MON', short: 'L', label: 'Lundi' },
  { code: 'TUE', short: 'M', label: 'Mardi' },
  { code: 'WED', short: 'M', label: 'Mercredi' },
  { code: 'THU', short: 'J', label: 'Jeudi' },
  { code: 'FRI', short: 'V', label: 'Vendredi' },
  { code: 'SAT', short: 'S', label: 'Samedi' },
  { code: 'SUN', short: 'D', label: 'Dimanche' },
];
const DAY_ORDER = DAYS.map((day) => day.code);

type DayEntry = { day: string; startTime: string; endTime: string };

@Component({
  selector: 'mm-add-schedule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, FormField],
  template: `
    <mm-card>
      <form (submit)="submit($event)">
        <div class="flex items-center justify-between">
          <p class="kicker">Nouveau marché</p>
          <a routerLink="/dashboard/markets" class="text-sm font-bold text-brand no-underline">Annuler</a>
        </div>
        <h1 class="mt-2 text-2xl leading-tight">Où et quand ?</h1>
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
              class="flex-1 rounded-field border border-line px-3 py-2 text-muted opacity-60"
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
            <input id="streetAddress" type="text" class="mt-1" [formField]="fields.streetAddress" placeholder="ex. Place du Prado" />
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
                  placeholder="69008"
                  [attr.aria-invalid]="fields.codePostal().touched() && codePostalInvalid()"
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
            @if (fields.codePostal().touched() && codePostalInvalid()) {
              <p role="alert" class="mt-1 text-xs text-danger">Code postal à 5 chiffres.</p>
            }
          </div>
        </div>

        <div class="mt-5">
          <p class="field-label">Jours de la semaine · un ou plusieurs</p>
          <div class="mt-1 flex gap-2">
            @for (day of allDays; track day.code) {
              <button
                type="button"
                [attr.aria-pressed]="selected(day.code)"
                [attr.aria-label]="day.label"
                (click)="toggleDay(day.code)"
                class="grid size-11 place-items-center rounded-field font-bold"
                [class.bg-brand]="selected(day.code)"
                [class.text-white]="selected(day.code)"
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
                  <button type="button" [attr.aria-label]="'Retirer ' + row.label" (click)="toggleDay(row.day)" class="px-1 text-xl text-muted">×</button>
                </div>
              }
            </div>
          </div>
        }

        <div class="mt-4">
          <label for="pitch" class="field-label">Emplacement · optionnel</label>
          <input id="pitch" type="text" class="mt-1" [formField]="fields.pitch" placeholder="ex. Allée centrale, stand 24" />
        </div>

        <button type="submit" class="mt-6 flex w-full max-w-xs mx-auto justify-center" [disabled]="cannotSubmit()">
          Ajouter le marché ✓
        </button>
      </form>
    </mm-card>
  `,
})
export class AddSchedule {
  private readonly markets = inject(MarketScheduleFacade);

  protected readonly allDays = DAYS;
  protected readonly days = signal<DayEntry[]>([]);

  protected readonly fields = form(signal({ name: '', streetAddress: '', codePostal: '', town: '', pitch: '' }), (path) => {
    required(path.name);
    required(path.town);
  });

  protected readonly rows = computed(() =>
    [...this.days()]
      .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
      .map((entry) => ({ ...entry, label: DAYS.find((day) => day.code === entry.day)!.label })),
  );

  private readonly codePostalValid = computed(() => /^\d{5}$/.test(this.fields().value().codePostal.trim()));
  protected readonly codePostalInvalid = computed(() => !this.codePostalValid());

  private readonly daysValid = computed(() => {
    const days = this.days();
    return (
      days.length > 0 &&
      days.every((day) => !(day.endTime && !day.startTime) && !(day.startTime && day.endTime && day.endTime <= day.startTime))
    );
  });

  protected readonly cannotSubmit = computed(
    () => this.fields().invalid() || !this.codePostalValid() || !this.daysValid(),
  );

  protected selected(code: string): boolean {
    return this.days().some((day) => day.day === code);
  }

  protected toggleDay(code: string): void {
    const current = this.days();
    this.days.set(
      this.selected(code)
        ? current.filter((day) => day.day !== code)
        : [...current, { day: code, startTime: '08:00', endTime: '13:00' }],
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
    this.markets.registerSchedule({
      market: {
        name: name.trim(),
        streetAddress: streetAddress.trim() || undefined,
        codePostal: codePostal.trim(),
        town: town.trim(),
        pitch: pitch.trim() || undefined,
      },
      days: this.rows().map((day) => ({
        day: day.day,
        startTime: day.startTime || undefined,
        endTime: day.endTime || undefined,
      })),
      frequency: { weeks: 1 },
    });
  }
}
