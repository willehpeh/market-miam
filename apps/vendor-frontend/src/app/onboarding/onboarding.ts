import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  OnInit,
  signal,
} from '@angular/core';
import { StorefrontFacade } from '../storefront/storefront.facade';

@Component({
  selector: 'mm-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full max-w-sm mx-auto py-4' },
  template: `
    @switch (screen()) {
      @case ('loading') {
        <p class="kicker py-10 text-center">Nous préparons votre stand…</p>
      }

      @case ('welcome') {
        <section class="rounded-card bg-surface p-6 shadow-frame">
          <div class="mb-5 grid size-9 place-items-center rounded-field bg-brand">
            <span class="block size-4 rounded-full bg-white/90"></span>
          </div>
          <p class="kicker">Bienvenue sur Miam</p>
          <h1 class="mt-2 text-2xl leading-tight">Votre stand de marché,<br />en ligne en 10 minutes.</h1>
          <p class="mt-3 text-sm text-ink-soft">
            Sortez votre téléphone — on vous guide pas à pas, photo après photo.
          </p>

          <ul class="mt-6 divide-y divide-line">
            @for (feature of features; track feature.title) {
              <li class="flex gap-3 py-3">
                <span class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-field bg-brand-soft">
                  {{ feature.icon }}
                </span>
                <div>
                  <p class="text-sm font-bold text-ink">{{ feature.title }}</p>
                  <p class="text-xs text-muted">{{ feature.detail }}</p>
                </div>
              </li>
            }
          </ul>

          <button type="button" class="mt-6 w-full" (click)="start()">Créer ma vitrine →</button>
        </section>
      }

      @case ('form') {
        <form class="rounded-card bg-surface p-6 shadow-frame" (submit)="submit($event)">
          <p class="kicker">Votre vitrine</p>
          <h1 class="mt-2 text-2xl leading-tight">Présentez votre stand</h1>
          <p class="mt-2 text-sm text-ink-soft">C'est ce que vos clients voient en premier.</p>

          <!-- ponytail: photo capture is design-only — imageReference isn't settable via PUT yet -->
          <div class="mt-5 rounded-card border border-dashed border-line-strong bg-surface-sunk p-4 text-center">
            <div class="mx-auto grid size-11 place-items-center rounded-full bg-brand-soft text-lg">📷</div>
            <p class="mt-2 text-sm font-bold text-ink">Photo de votre stand</p>
            <p class="text-xs text-muted">Une belle photo donne envie de s'arrêter.</p>
            <div class="mt-3 flex justify-center gap-2">
              <button type="button" disabled>Prendre</button>
              <button type="button" disabled>Galerie</button>
            </div>
            <p class="mt-2 text-[0.6rem] font-mono uppercase tracking-widest text-muted">Bientôt</p>
          </div>

          <div class="mt-5 space-y-4">
            <div>
              <label for="name" class="field-label">Nom du stand</label>
              <input
                id="name"
                type="text"
                class="mt-1"
                [value]="name()"
                (input)="name.set($any($event.target).value)"
                placeholder="La Table de Margaux"
              />
            </div>
            <div>
              <label for="slogan" class="field-label">Slogan · optionnel</label>
              <input
                id="slogan"
                type="text"
                class="mt-1"
                [value]="description()"
                (input)="description.set($any($event.target).value)"
                placeholder="Cuisine de marché, mijotée maison."
              />
            </div>
            <div>
              <label for="ville" class="field-label">Ville · bientôt</label>
              <input id="ville" type="text" class="mt-1" placeholder="Lyon" disabled />
            </div>
            <div>
              <label for="phone" class="field-label">Téléphone · bientôt</label>
              <input id="phone" type="tel" class="mt-1" disabled />
            </div>
          </div>

          <button type="submit" class="mt-6 w-full">Continuer →</button>
        </form>
      }
    }
  `,
})
export class Onboarding implements OnInit {
  private readonly storefront = inject(StorefrontFacade);

  protected readonly features = [
    { icon: '📷', title: 'Photographiez vos plats', detail: 'Vos photos depuis votre téléphone, recadrées automatiquement.' },
    { icon: '🔗', title: 'Une vitrine en ligne', detail: 'Partageable par lien, QR code ou Instagram.' },
    { icon: '📅', title: 'Votre calendrier de marchés', detail: 'Vos clients savent toujours où vous trouver.' },
  ];

  protected readonly name = linkedSignal(() => this.storefront.view()?.name ?? '');
  protected readonly description = linkedSignal(() => this.storefront.view()?.description ?? '');

  private readonly creating = signal(false);

  protected readonly screen = computed<'loading' | 'welcome' | 'form'>(() => {
    const view = this.storefront.view();
    if (this.creating()) return 'form';
    if (!view) return 'loading';
    return view.name || view.description || view.imageReference ? 'form' : 'welcome';
  });

  ngOnInit(): void {
    this.storefront.load();
  }

  protected start(): void {
    this.creating.set(true);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.storefront.save(this.name(), this.description());
  }
}
