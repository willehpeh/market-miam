import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { CloudinaryUrlPipe } from '../core/cloudinary-url.pipe';
import { Card } from '../core/card';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
// A freshly uploaded cover photo's derived transformation is generated lazily by
// Cloudinary, so its delivery URL can 404 for a moment on the very first request.
// Re-request a few times before giving up, cache-busting so the browser refetches.
const COVER_PHOTO_RETRY_DELAY_MS = 1000;
const COVER_PHOTO_MAX_RETRIES = 5;

@Component({
  selector: 'mm-storefront-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, FormField],
  template: `
    <mm-card>
      <form (submit)="submit($event)">
        <p class="kicker">Votre vitrine</p>
        <h1 class="mt-2 text-2xl leading-tight">Présentez votre stand</h1>
        <p class="mt-2 text-sm text-ink-soft">C'est ce que vos clients voient en premier.</p>

        <div class="mt-5 rounded-card border border-dashed border-line-strong bg-surface-sunk p-4 text-center">
          @if (coverPhotoSrc(); as src) {
            <img
              [src]="src"
              (error)="retryCoverPhoto()"
              alt="Photo de votre stand"
              class="mx-auto h-32 w-full max-w-xs rounded-card object-cover"
            />
          } @else {
            <div class="mx-auto grid size-11 place-items-center rounded-full bg-brand-soft text-lg">📷</div>
          }
          <p class="mt-2 font-bold text-ink">Image de votre stand</p>
          <p class="text-sm text-muted">Une photo de votre activité ou votre logo</p>
          <input #photoInput type="file" accept="image/*" hidden (change)="selectPhoto($event)" />
          <div class="mt-3 flex justify-center gap-2">
            <button type="button" (click)="photoInput.click()" [disabled]="uploading()">
              {{ uploading() ? 'Envoi…' : (view()?.imageReference ? 'Changer la photo' : 'Ajouter image') }}
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
  private readonly cloudinaryUrl = new CloudinaryUrlPipe();

  protected readonly view = this.storefront.view;
  protected readonly uploading = this.storefront.coverPhotoUploading;
  protected readonly uploadError = this.storefront.coverPhotoError;
  protected readonly tooLarge = signal(false);

  // Bumped each time the cover photo <img> fails to load, so its src changes and the
  // browser refetches — bridging the brief window where a just-uploaded photo's derived
  // transformation isn't generated yet.
  private readonly coverPhotoAttempt = signal(0);

  protected readonly coverPhotoSrc = computed(() => {
    const reference = this.view()?.imageReference;
    if (!reference) {
      return undefined;
    }
    const url = this.cloudinaryUrl.transform(reference, 'c_fill,w_400,h_300');
    const attempt = this.coverPhotoAttempt();
    return attempt === 0 ? url : `${url}?retry=${attempt}`;
  });

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
    this.coverPhotoAttempt.set(0);
    this.storefront.uploadCoverPhoto(file);
  }

  protected retryCoverPhoto(): void {
    if (this.coverPhotoAttempt() >= COVER_PHOTO_MAX_RETRIES) {
      return;
    }
    setTimeout(() => this.coverPhotoAttempt.update((attempt) => attempt + 1), COVER_PHOTO_RETRY_DELAY_MS);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const { name, description, phone } = this.fields().value();
    this.storefront.save(name, description, phone);
  }
}
