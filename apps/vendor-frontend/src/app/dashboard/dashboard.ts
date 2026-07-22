import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../core/card';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { MarketScheduleFacade } from '../markets/market-schedule.facade';
import { environment } from '../../environments/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card],
  template: `
    @if (!loaded()) {
      <mm-card>
        <div class="mx-auto grid h-32 place-items-center">
          <div
            role="status"
            aria-label="Chargement de votre stand…"
            class="size-8 animate-spin rounded-full border-4 border-line-strong border-t-brand"
          ></div>
        </div>
      </mm-card>
    } @else if (published()) {
      <mm-card>
        <h2 class="text-2xl font-bold tracking-tight text-ink">
          <span aria-hidden="true" class="text-brand">✓</span> Votre vitrine est en ligne
        </h2>
        @if (storefrontUrl(); as url) {
          <a [href]="url.href" target="_blank" rel="noopener" class="mt-1 inline-block font-bold text-brand">
            {{ url.label }}<span aria-hidden="true"> ↗</span>
          </a>
        }

        <ul class="mt-2 divide-y divide-line">
          @for (destination of destinations; track destination.title) {
            <li>
              <a [routerLink]="destination.link" class="flex items-center gap-4 py-5 no-underline">
                <p class="flex-1 text-lg font-bold text-ink">{{ destination.title }}</p>
                <span aria-hidden="true" class="text-2xl leading-none text-muted">›</span>
              </a>
            </li>
          }
        </ul>
      </mm-card>
    } @else {
      <mm-card>
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-ink">{{ title() }}</h2>
            <p class="mt-1 text-sm text-muted">{{ subtitle() }}</p>
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
  
        @if (allDone()) {
          @if (storefrontUrl(); as url) {
            <p class="mt-6 text-center text-ink">
              Votre vitrine sera publiée à
              <a [href]="url.href" target="_blank" rel="noopener" class="font-bold text-brand">{{ url.label }}</a>
            </p>
            @if (publishError()) {
              <p class="mt-4 text-center text-sm text-danger">La publication a échoué. Veuillez réessayer.</p>
            }
            <button
              type="button"
              class="mt-4 flex w-full max-w-xs mx-auto justify-center"
              [disabled]="publishing()"
              (click)="publish()"
            >
              {{ publishing() ? 'Publication…' : 'Publier' }}
            </button>
          } @else {
            <p class="mt-6 text-center text-sm text-muted">
              Votre adresse web est en cours d'attribution. Vous pourrez publier votre vitrine dès qu'elle sera prête.
            </p>
          }
        }
      </mm-card>
    }
  `,
})
export class Dashboard {
  private readonly storefront = inject(StorefrontFacade);
  private readonly catalogue = inject(CatalogueFacade);
  private readonly markets = inject(MarketScheduleFacade);

  readonly steps = computed(() => {
    const view = this.storefront.view();
    const fields = [
      { label: 'nom', set: !!view?.name },
      { label: 'description', set: !!view?.description },
      { label: 'photo', set: !!view?.imageReference },
    ];
    const present = fields.filter((field) => field.set).map((field) => field.label);
    const missing = fields.filter((field) => !field.set).map((field) => field.label);
    const dishCount = this.catalogue.items().length;
    const scheduleCount = this.markets.schedules().length;
    const steps = [
      { number: 1, title: 'Informations de la vitrine', detail: summarise(present, missing), done: missing.length === 0, link: '/onboarding/storefront' },
      { number: 2, title: 'Composez votre catalogue', detail: dishCount ? dishesAdded(dishCount) : 'Ajoutez au moins un plat à proposer.', done: dishCount > 0, link: '/dashboard/catalogue' },
      { number: 3, title: 'Indiquez vos marchés', detail: scheduleCount ? marketsAdded(scheduleCount) : 'Où et quand vous vendez.', done: scheduleCount > 0, link: '/dashboard/markets' },
    ];
    const nextIndex = steps.findIndex((step) => !step.done);
    return steps.map((step, index) => ({ ...step, active: index === nextIndex }));
  });

  readonly doneCount = computed(() => this.steps().filter((step) => step.done).length);

  readonly allDone = computed(() => this.doneCount() === this.steps().length);

  readonly title = computed(() => this.allDone() ? 'Votre vitrine est prête !' : 'Terminez votre installation');

  readonly subtitle = computed(() =>
    this.allDone()
      ? 'Si vous êtes satisfait·e de votre configuration, cliquez sur Publier.'
      : 'Vous pourrez publier votre vitrine dès que ce sera fait.',
  );

  readonly storefrontUrl = computed(() => {
    const subdomain = this.storefront.view()?.subdomain;
    if (!subdomain) return null;
    const domain = `${subdomain}.${environment.storefrontBaseDomain}`;
    return { href: `https://${domain}`, label: domain };
  });

  readonly loaded = computed(() => !!this.storefront.view());

  readonly published = computed(() => this.storefront.view()?.published === true);

  readonly destinations = [
    { title: 'Ma vitrine', link: '/onboarding/storefront' },
    { title: 'Mon catalogue', link: '/dashboard/catalogue' },
    { title: 'Mes marchés', link: '/dashboard/markets' },
  ];

  readonly publishing = this.storefront.publishing;
  readonly publishError = this.storefront.publishError;

  publish(): void {
    this.storefront.publish();
  }

  constructor() {
    this.catalogue.load();
    this.markets.load();
  }
}

function dishesAdded(count: number): string {
  const plural = count > 1 ? 's' : '';
  return `${count} plat${plural} ajouté${plural}`;
}

function marketsAdded(count: number): string {
  const plural = count > 1 ? 's' : '';
  return `${count} marché${plural} ajouté${plural}`;
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
