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
              <div class="flex items-center gap-4 py-5">
                <span aria-hidden="true" class="grid size-9 shrink-0 place-items-center rounded-field bg-brand text-white">✓</span>
                <div class="flex-1">
                  <p class="text-lg font-bold text-ink">{{ step.title }}</p>
                  <p class="text-sm text-muted">{{ step.detail }}</p>
                </div>
                <span class="inline-flex items-center gap-1.5 rounded-pill bg-success-soft px-3 py-1 text-xs font-bold uppercase tracking-label text-success">
                  <span aria-hidden="true" class="size-1.5 rounded-full bg-success"></span> Fait
                </span>
              </div>
            } @else {
              <a [routerLink]="step.link" class="flex items-center gap-4 py-5 no-underline">
                <span aria-hidden="true" class="grid size-9 shrink-0 place-items-center rounded-field border border-line-strong text-sm font-bold text-muted">
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
    const storefrontDone = !!(view?.name && view?.description && view?.imageReference);
    return [
      { number: 1, title: 'Informations de la vitrine', detail: 'Nom, description, photo et emplacement renseignés.', done: storefrontDone, link: '/onboarding/storefront' },
      { number: 2, title: 'Composez votre catalogue', detail: 'Ajoutez au moins un plat à proposer.', done: false, link: '/dashboard/catalogue' },
      { number: 3, title: 'Indiquez vos marchés', detail: 'Où et quand vous vendez.', done: false, link: '/dashboard/markets' },
    ];
  });

  readonly doneCount = computed(() => this.steps().filter((step) => step.done).length);
}
