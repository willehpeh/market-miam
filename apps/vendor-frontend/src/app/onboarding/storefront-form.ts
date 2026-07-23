import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { CloudinaryUrlPipe } from '../core/cloudinary-url.pipe';
import { Card } from '../core/card';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'mm-storefront-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, FormField, CloudinaryUrlPipe, RouterLink],
  template: `
    <mm-card>
      <form class="relative" (submit)="submit($event)">
        @if (view()?.published) {
          <a
            routerLink="/dashboard"
            aria-label="Fermer"
            class="absolute right-0 top-0 grid place-items-center rounded-full text-brand"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </a>
        }
        <p class="kicker">Votre vitrine</p>
        <h1 class="mt-2 text-2xl leading-tight">Présentez votre stand</h1>
        <p class="mt-2 text-sm text-ink-soft">C'est ce que vos clients voient en premier.</p>

        <div class="mt-5 rounded-card border border-dashed border-line-strong bg-surface-sunk p-4 text-center">
          @if (uploading()) {
            <div class="mx-auto grid h-32 place-items-center">
              <div
                role="status"
                aria-label="Envoi de la photo…"
                class="size-8 animate-spin rounded-full border-4 border-line-strong border-t-brand"
              ></div>
            </div>
          } @else if (view()?.imageReference; as ref) {
            <img
              [src]="ref | cloudinaryUrl: 'c_fill,w_400,h_300'"
              alt="Photo de votre stand"
              class="mx-auto h-32 w-full max-w-xs rounded-card object-cover"
            />
          } @else {
            <div class="mx-auto grid size-11 place-items-center rounded-full bg-brand-soft text-lg text-brand">
              <i class="fa-solid fa-camera" aria-hidden="true"></i>
            </div>
          }
          <p class="mt-2 font-bold text-ink">Image de votre stand</p>
          <p class="text-sm text-muted">Une photo de votre activité ou votre logo</p>
          <input #photoInput type="file" accept="image/*" hidden (change)="selectPhoto($event)" />
          <div class="mt-3 flex justify-center gap-2">
            <button type="button" (click)="photoInput.click()" [disabled]="uploading()">
              {{ view()?.imageReference ? 'Changer la photo' : 'Ajouter image' }}
            </button>
          </div>
          @if (tooLarge()) {
            <p role="alert" class="mt-2 text-xs text-danger">La photo dépasse 10 Mo. Choisissez-en une plus légère.</p>
          }
          @if (uploadError()) {
            <p role="alert" class="mt-2 text-xs text-danger">L'envoi de la photo a échoué. Réessayez.</p>
          }
        </div>

        <div class="mt-5 space-y-4">
          <div>
            <label for="name" class="field-label">Nom du stand</label>
            <input
              id="name"
              type="text"
              class="mt-1"
              [formField]="fields.name"
              [attr.aria-invalid]="fields.name().touched() && fields.name().invalid()"
              [attr.aria-describedby]="fields.name().touched() && fields.name().invalid() ? 'name-error' : null"
              placeholder="La Table de Margaux"
            />
            @if (fields.name().touched() && fields.name().invalid()) {
              <p id="name-error" role="alert" class="mt-1 text-xs text-danger">Le nom du stand est requis.</p>
            }
          </div>
          <div>
            <label for="description" class="field-label">Description · optionnel</label>
            <textarea
              id="description"
              rows="3"
              class="mt-1"
              [formField]="fields.description"
              placeholder="Cuisine de marché mijotée maison, à base de produits locaux et de saison. Plats à emporter et sur commande."
            ></textarea>
          </div>
          <div>
            <label for="phone" class="field-label">Téléphone · optionnel</label>
            <input id="phone" type="tel" class="mt-1" [formField]="fields.phone" placeholder="06 12 34 56 78" />
          </div>
        </div>

        @if (!view()?.published) {
          <button type="submit" class="mt-6 flex w-full max-w-xs mx-auto" [disabled]="fields().invalid()">Continuer →
          </button>
        }
      </form>
    </mm-card>

    @if (saved()) {
      <div role="status" class="fixed inset-0 m-auto h-fit w-fit rounded-card bg-surface p-6 text-center shadow-frame">
        <div aria-hidden="true" class="mx-auto grid size-11 place-items-center rounded-full bg-brand-soft text-lg">✓
        </div>
        <p class="mt-3 font-bold text-ink">Informations sauvegardées</p>
      </div>
    }
  `,
})
export class StorefrontForm {
  private readonly storefront = inject(StorefrontFacade);

  protected readonly view = this.storefront.view;
  protected readonly saved = this.storefront.saved;
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
