import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { Card } from '../core/card';
import { CloudinaryUrlPipe } from '../core/cloudinary-url.pipe';
import { CatalogueFacade } from './catalogue.facade';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const DISH_PREVIEW_TRANSFORMATION = 'c_fill,w_600,h_400,q_auto,f_webp';

@Component({
  selector: 'mm-add-dish',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, FormField, CloudinaryUrlPipe],
  template: `
    <mm-card>
      <form (submit)="submit($event)">
        <div class="flex items-center justify-between">
          <p class="kicker">Nouveau plat</p>
          <a routerLink="/dashboard/catalogue" class="text-sm font-bold text-brand no-underline">Annuler</a>
        </div>

        <div class="mt-4 overflow-hidden rounded-card border border-dashed border-line-strong bg-surface-sunk text-center">
          @if (photoReference(); as ref) {
            <img [src]="ref | cloudinaryUrl: previewTransformation" alt="Photo du plat" class="h-48 w-full object-cover" />
          } @else {
            <div class="grid h-48 place-items-center">
              <div aria-hidden="true" class="grid size-11 place-items-center rounded-full bg-brand-soft text-lg">📷</div>
            </div>
          }
          <input #photoInput type="file" accept="image/*" capture="environment" hidden (change)="selectPhoto($event)" />
          <div class="p-3">
            <button type="button" (click)="photoInput.click()" [disabled]="uploading()">
              {{ uploading() ? 'Envoi…' : (photoReference() ? 'Reprendre' : 'Prendre en photo') }}
            </button>
          </div>
          @if (tooLarge()) {
            <p role="alert" class="px-3 pb-3 text-xs text-danger">La photo dépasse 10 Mo. Choisissez-en une plus légère.</p>
          }
          @if (uploadError()) {
            <p role="alert" class="px-3 pb-3 text-xs text-danger">L'envoi de la photo a échoué. Réessayez.</p>
          }
        </div>

        <div class="mt-5 space-y-4">
          <div>
            <label for="name" class="field-label">Nom du plat</label>
            <input
              id="name"
              type="text"
              class="mt-1"
              [formField]="fields.name"
              [attr.aria-invalid]="fields.name().touched() && fields.name().invalid()"
              [attr.aria-describedby]="fields.name().touched() && fields.name().invalid() ? 'name-error' : null"
              placeholder="Parmentier de canard"
            />
            @if (fields.name().touched() && fields.name().invalid()) {
              <p id="name-error" role="alert" class="mt-1 text-xs text-danger">Le nom du plat est requis.</p>
            }
          </div>
          <div>
            <label for="price" class="field-label">Prix</label>
            <div class="mt-1 flex items-center gap-2">
              <input
                id="price"
                type="text"
                inputmode="decimal"
                class="flex-1"
                [formField]="fields.price"
                [attr.aria-invalid]="fields.price().touched() && priceInvalid()"
                [attr.aria-describedby]="fields.price().touched() && priceInvalid() ? 'price-error' : null"
                placeholder="12,00"
              />
              <span class="text-sm text-muted">EUR</span>
            </div>
            @if (fields.price().touched() && priceInvalid()) {
              <p id="price-error" role="alert" class="mt-1 text-xs text-danger">Indiquez un prix, par exemple 12,00.</p>
            }
          </div>
          <div>
            <label for="description" class="field-label">Description · optionnel</label>
            <textarea
              id="description"
              rows="3"
              class="mt-1"
              [formField]="fields.description"
              placeholder="Confit de canard effiloché, purée de rattes au beurre."
            ></textarea>
          </div>
        </div>

        <button type="submit" class="mt-6 flex w-full max-w-xs mx-auto justify-center" [disabled]="cannotSubmit()">
          Ajouter à ma carte ✓
        </button>
      </form>
    </mm-card>
  `,
})
export class AddDish {
  private readonly catalogue = inject(CatalogueFacade);
  private readonly itemId = crypto.randomUUID();

  protected readonly previewTransformation = DISH_PREVIEW_TRANSFORMATION;
  protected readonly photoReference = this.catalogue.newPhotoReference;
  protected readonly uploading = this.catalogue.photoUploading;
  protected readonly uploadError = this.catalogue.photoError;
  protected readonly tooLarge = signal(false);

  protected readonly fields = form(signal({ name: '', price: '', description: '' }), (path) => {
    required(path.name);
  });

  private readonly priceCents = computed(() => parseEurosToCents(this.fields().value().price));
  protected readonly priceInvalid = computed(() => this.priceCents() === null);
  protected readonly cannotSubmit = computed(
    () => this.fields().invalid() || this.priceInvalid() || this.uploading() || !this.photoReference(),
  );

  constructor() {
    this.catalogue.beginDish();
  }

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
    this.catalogue.uploadDishPhoto(this.itemId, file);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const cents = this.priceCents();
    if (cents === null || !this.photoReference()) {
      return;
    }
    const { name, description } = this.fields().value();
    this.catalogue.addDish({
      itemId: this.itemId,
      name,
      description,
      price: cents,
      imageReference: this.photoReference(),
    });
  }
}

function parseEurosToCents(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  return Math.round(parseFloat(normalized) * 100);
}
