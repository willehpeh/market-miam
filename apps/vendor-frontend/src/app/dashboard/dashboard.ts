import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { StorefrontFacade } from '../storefront/storefront.facade';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card],
  template: `
    <mm-card>
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-ink">Terminez votre installation</h2>
          <p class="mt-1 text-sm text-muted">Vous pourrez publier votre vitrine dès que ce sera fait.</p>
        </div>
        <p aria-hidden="true" class="shrink-0 text-3xl font-bold text-brand">
          {{ doneCount() }}<span class="text-lg font-normal text-muted">/{{ steps().length }}</span>
        </p>
      </div>

      <div
        class="mt-4 h-1.5 overflow-hidden rounded-pill bg-surface-sunk"
        role="progressbar"
        aria-label="Étapes terminées"
        aria-valuemin="0"
        [attr.aria-valuemax]="steps().length"
        [attr.aria-valuenow]="doneCount()"
      >
        <div class="h-full rounded-pill bg-brand transition-all" [style.width.%]="doneCount() / steps().length * 100"></div>
      </div>

      <ul class="mt-2 divide-y divide-line">
        @for (step of steps(); track step.title) {
          <li>
            @if (step.done) {
              <a [routerLink]="step.link" class="flex items-center gap-4 py-5 no-underline">
                <span aria-hidden="true" class="grid size-9 shrink-0 place-items-center rounded-field border border-brand text-brand">✓</span>
                <div class="flex-1">
                  <p class="text-lg font-bold text-ink">{{ step.title }}</p>
                  <p class="text-sm text-muted">{{ step.detail }}</p>
                </div>
                <span class="inline-flex items-center gap-1.5 rounded-pill bg-success-soft px-3 py-1 text-xs font-bold uppercase tracking-label text-success">
                  <span aria-hidden="true" class="size-1.5 rounded-full bg-success"></span> Fait
                </span>
              </a>
            } @else {
              <a [routerLink]="step.link" class="flex items-center gap-4 py-5 no-underline">
                <span
                  aria-hidden="true"
                  class="grid size-9 shrink-0 place-items-center rounded-field text-sm font-bold"
                  [class.bg-brand]="step.active"
                  [class.text-white]="step.active"
                  [class.border]="!step.active"
                  [class.border-line-strong]="!step.active"
                  [class.text-muted]="!step.active"
                >
                  {{ step.number }}
                </span>
                <div class="flex-1">
                  <p class="text-lg font-bold text-ink">{{ step.title }}</p>
                  <p class="text-sm text-muted">{{ step.detail }}</p>
                </div>
                <span aria-hidden="true" class="text-2xl leading-none text-muted">›</span>
              </a>
            }
          </li>
        }
      </ul>
    </mm-card>
  `,
})
export class Dashboard {
  private readonly storefront = inject(StorefrontFacade);

  readonly steps = computed(() => {
    const view = this.storefront.view();
    const fields = [
      { label: 'nom', set: !!view?.name },
      { label: 'description', set: !!view?.description },
      { label: 'photo', set: !!view?.imageReference },
    ];
    const present = fields.filter((field) => field.set).map((field) => field.label);
    const missing = fields.filter((field) => !field.set).map((field) => field.label);
    const steps = [
      { number: 1, title: 'Informations de la vitrine', detail: summarise(present, missing), done: missing.length === 0, link: '/onboarding/storefront' },
      { number: 2, title: 'Composez votre catalogue', detail: 'Ajoutez au moins un plat à proposer.', done: false, link: '/dashboard/catalogue' },
      { number: 3, title: 'Indiquez vos marchés', detail: 'Où et quand vous vendez.', done: false, link: '/dashboard/markets' },
    ];
    const nextIndex = steps.findIndex((step) => !step.done);
    return steps.map((step, index) => ({ ...step, active: index === nextIndex }));
  });

  readonly doneCount = computed(() => this.steps().filter((step) => step.done).length);
}

function summarise(present: string[], missing: string[]): string {
  const parts: string[] = [];
  if (present.length) {
    parts.push(`Renseigné${present.length > 1 ? 's' : ''} : ${present.join(', ')}`);
  }
  if (missing.length) {
    parts.push(`Manquant${missing.length > 1 ? 's' : ''} : ${missing.join(', ')}`);
  }
  return parts.join(' · ');
}
