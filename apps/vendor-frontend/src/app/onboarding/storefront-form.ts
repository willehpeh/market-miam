import { ChangeDetectionStrategy, Component, inject, linkedSignal } from '@angular/core';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { Card } from '../core/card';

@Component({
  selector: 'mm-storefront-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card],
  template: `
    <mm-card>
      <form (submit)="submit($event)">
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
          <p class="mt-2 text-xs font-mono uppercase tracking-widest text-muted">Bientôt</p>
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

        <button type="submit" class="mt-6 flex w-full max-w-xs mx-auto">Continuer →</button>
      </form>
    </mm-card>
  `,
})
export class StorefrontForm {
  private readonly storefront = inject(StorefrontFacade);

  protected readonly name = linkedSignal(() => this.storefront.view()?.name ?? '');
  protected readonly description = linkedSignal(() => this.storefront.view()?.description ?? '');

  protected submit(event: Event): void {
    event.preventDefault();
    this.storefront.save(this.name(), this.description());
  }
}
