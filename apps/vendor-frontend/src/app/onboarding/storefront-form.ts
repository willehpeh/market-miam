import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { CloudinaryUrlPipe } from '../core/cloudinary-url.pipe';
import { Card } from '../core/card';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'mm-storefront-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, FormField, CloudinaryUrlPipe],
  template: `
    <mm-card>
      <form (submit)="submit($event)">
        <p class="kicker">Votre vitrine</p>
        <h1 class="mt-2 text-2xl leading-tight">Présentez votre stand</h1>
        <p class="mt-2 text-sm text-ink-soft">C'est ce que vos clients voient en premier.</p>

        <div class="mt-5 rounded-card border border-dashed border-line-strong bg-surface-sunk p-4 text-center">
          @if (view()?.imageReference; as ref) {
            <img
              [src]="ref | cloudinaryUrl: 'c_fill,w_400,h_300'"
              alt="Photo de votre stand"
              class="mx-auto h-32 w-full max-w-xs rounded-card object-cover"
            />
          } @else {
            <div class="mx-auto grid size-11 place-items-center rounded-full bg-brand-soft text-lg">📷</div>
          }
          <p class="mt-2 text-sm font-bold text-ink">Photo de votre stand</p>
          <p class="text-xs text-muted">Une belle photo donne envie de s'arrêter.</p>
          <input #photoInput type="file" accept="image/*" hidden (change)="selectPhoto($event)" />
          <div class="mt-3 flex justify-center gap-2">
            <button type="button" (click)="photoInput.click()" [disabled]="uploading()">
              {{ uploading() ? 'Envoi…' : (view()?.imageReference ? 'Changer la photo' : 'Ajouter photo') }}
            </button>
          </div>
          @if (tooLarge()) {
            <p class="mt-2 text-xs text-danger">La photo dépasse 10 Mo. Choisissez-en une plus légère.</p>
          }
          @if (uploadError()) {
            <p class="mt-2 text-xs text-danger">L'envoi de la photo a échoué. Réessayez.</p>
          }
        </div>

        <div class="mt-5 space-y-4">
          <div>
            <label for="name" class="field-label">Nom du stand</label>
            <input id="name" type="text" class="mt-1" [formField]="fields.name" placeholder="La Table de Margaux" />
            @if (fields.name().touched() && fields.name().invalid()) {
              <p class="mt-1 text-xs text-danger">Le nom du stand est requis.</p>
            }
          </div>
          <div>
            <label for="slogan" class="field-label">Slogan · optionnel</label>
            <input
              id="slogan"
              type="text"
              class="mt-1"
              [formField]="fields.description"
              placeholder="Cuisine de marché, mijotée maison."
            />
          </div>
          <div>
            <label for="phone" class="field-label">Téléphone · optionnel</label>
            <input id="phone" type="tel" class="mt-1" [formField]="fields.phone" placeholder="06 12 34 56 78" />
          </div>
        </div>

        <button type="submit" class="mt-6 flex w-full max-w-xs mx-auto" [disabled]="fields().invalid()">Continuer →</button>
      </form>
    </mm-card>
  `,
})
export class StorefrontForm {
  private readonly storefront = inject(StorefrontFacade);

  protected readonly view = this.storefront.view;
  protected readonly uploading = this.storefront.coverPhotoUploading;
  protected readonly uploadError = this.storefront.coverPhotoError;
  protected readonly tooLarge = signal(false);

  private readonly model = linkedSignal(() => {
    const view = this.storefront.view();
    return {
      name: view?.name ?? '',
      description: view?.description ?? '',
      phone: view?.phone ?? '',
    };
  });

  protected readonly fields = form(this.model, (path) => {
    required(path.name);
  });

  protected selectPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      this.tooLarge.set(true);
      return;
    }
    this.tooLarge.set(false);
    this.storefront.uploadCoverPhoto(file);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const { name, description, phone } = this.fields().value();
    this.storefront.save(name, description, phone);
  }
}
