import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { Card } from '../core/card';
import { CloudinaryUrlPipe } from '../core/cloudinary-url.pipe';
import { CatalogueFacade } from './catalogue.facade';
import { centsToEuros, parseEurosToCents } from './money';

const DISH_PREVIEW_TRANSFORMATION = 'c_fill,w_600,h_400,q_auto,f_webp';

@Component({
  selector: 'mm-add-dish',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, FormField, CloudinaryUrlPipe],
  styles: `
    .segment {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: 1px solid transparent;
      border-radius: var(--radius-field);
      padding: 0.3rem 0.5rem;
      font-size: 0.875rem;
      font-weight: 700;
      background: transparent;
      color: var(--color-ink-soft);
      box-shadow: none;
    }
    .segment:hover:not(.active) {
      color: var(--color-ink);
    }
    .segment:active:not(.active) {
      background: var(--color-brand-soft);
    }
    .segment.active {
      background: var(--color-canvas);
      border-color: var(--color-brand);
      color: var(--color-ink);
      box-shadow: 0 0 5px var(--color-brand);
    }
    .add-format {
      width: 100%;
      background: transparent;
      color: var(--color-brand);
      border: 1px dashed var(--color-line-strong);
      box-shadow: none;
      border-radius: var(--radius-card);
      padding: 0.75rem;
      font-weight: 700;
    }
    .add-format:hover,
    .add-format:active {
      background: var(--color-surface-sunk);
    }
    .photo-alt {
      background: transparent;
      color: var(--color-brand);
      border: 1px solid var(--color-brand);
      box-shadow: none;
    }
    .photo-alt:hover:not(:disabled),
    .photo-alt:active:not(:disabled) {
      background: var(--color-brand-soft);
    }
    .retire {
      background: transparent;
      color: var(--color-danger);
      border: 1px solid var(--color-danger);
      box-shadow: none;
    }
    .retire:hover,
    .retire:active {
      background: var(--color-danger-soft);
    }
    .retire-confirm {
      background: var(--color-danger);
      border: 1px solid var(--color-danger);
      color: white;
    }
    .retire-confirm:hover,
    .retire-confirm:active {
      background: var(--color-danger);
    }
    .quiet {
      background: transparent;
      color: var(--color-ink-soft);
      border: 1px solid var(--color-line-strong);
      box-shadow: none;
    }
    .quiet:hover,
    .quiet:active {
      background: var(--color-surface-sunk);
    }
  `,
  template: `
    <mm-card>
      <form (submit)="submit($event)">
        <div class="flex items-center justify-between">
          <p class="kicker">{{ isEditing ? 'Modifier le plat' : 'Nouveau plat' }}</p>
          <a routerLink="/dashboard/catalogue" class="text-sm font-bold text-brand no-underline">Annuler</a>
        </div>

        <div class="mt-4 overflow-hidden rounded-card border border-dashed border-line-strong bg-surface-sunk text-center">
          @if (uploading()) {
            <div class="grid h-48 place-items-center">
              <div
                role="status"
                aria-label="Envoi de la photo…"
                class="size-8 animate-spin rounded-full border-4 border-line-strong border-t-brand"
              ></div>
            </div>
          } @else if (previewRef(); as ref) {
            <img [src]="ref | cloudinaryUrl: previewTransformation" alt="Photo du plat" class="h-48 w-full object-cover" />
          } @else {
            <div class="hatch grid h-48 place-items-center text-3xl text-brand">
              <i class="fa-solid fa-camera" aria-hidden="true"></i>
            </div>
          }
          <!-- Two inputs, not one: capture keeps the camera a single tap away for a vendor
               standing at their stall, and its absence is the only way to reach the photo roll. -->
          <input #cameraInput type="file" accept="image/*" capture="environment" hidden (change)="selectPhoto($event)" />
          <input #rollInput type="file" accept="image/*" hidden (change)="selectPhoto($event)" />
          <div class="flex justify-center gap-2 p-3">
            <button type="button" (click)="cameraInput.click()" [disabled]="uploading()">
              <i class="fa-solid fa-camera" aria-hidden="true"></i>
              {{ previewRef() ? 'Reprendre' : 'Prendre en photo' }}
            </button>
            <button type="button" class="photo-alt" (click)="rollInput.click()" [disabled]="uploading()">
              <i class="fa-solid fa-images" aria-hidden="true"></i>
              Choisir une photo
            </button>
          </div>
          @if (tooLarge()) {
            <p role="alert" class="px-3 pb-3 text-xs text-danger">Cette photo est trop lourde. Choisissez-en une plus légère.</p>
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
              placeholder="ex. Parmentier de canard"
            />
            @if (fields.name().touched() && fields.name().invalid()) {
              <p id="name-error" role="alert" class="mt-1 text-xs text-danger">Le nom du plat est requis.</p>
            }
          </div>
          <div>
            <label for="description" class="field-label">Description · optionnel</label>
            <textarea
              id="description"
              rows="5"
              class="mt-1"
              [formField]="fields.description"
              placeholder="ex. Confit de canard effiloché, purée de rattes au beurre."
            ></textarea>
          </div>
          <div class="flex gap-1 rounded-card bg-surface-sunk p-1">
            <button type="button" class="segment" [class.active]="mode() === 'single'" (click)="mode.set('single')">
              <i class="fa-solid fa-tag" aria-hidden="true"></i> Prix unique
            </button>
            <button type="button" class="segment" [class.active]="mode() === 'variants'" (click)="mode.set('variants')">
              <i class="fa-solid fa-list" aria-hidden="true"></i> Plusieurs formats
            </button>
          </div>

          @if (mode() === 'single') {
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
                  placeholder="ex. 12,00"
                />
                <span class="text-sm text-muted">EUR</span>
              </div>
              @if (fields.price().touched() && priceInvalid()) {
                <p id="price-error" role="alert" class="mt-1 text-xs text-danger">Indiquez un prix, par exemple 12,00.</p>
              }
            </div>
          } @else {
            <div>
              <p class="field-label">Formats</p>
              <div class="mt-2 space-y-4">
                @for (format of fields.variants().value(); track $index) {
                  <div class="rounded-card border border-line bg-surface p-4">
                    <div class="mb-4 flex items-center gap-2">
                      <span class="grid size-7 shrink-0 place-items-center rounded-card bg-brand-soft text-sm font-bold text-ink">{{ $index + 1 }}</span>
                      <button
                        type="button"
                        class="icon-btn"
                        [attr.aria-label]="'Monter le format ' + ($index + 1)"
                        [disabled]="$index === 0"
                        (click)="moveFormatUp($index)"
                      >
                        <i class="fa-solid fa-chevron-up" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        class="icon-btn"
                        [attr.aria-label]="'Descendre le format ' + ($index + 1)"
                        [disabled]="$index === fields.variants().value().length - 1"
                        (click)="moveFormatDown($index)"
                      >
                        <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
                      </button>
                      <span class="flex-1 truncate font-bold text-ink">{{ format.name }}</span>
                      <button
                        type="button"
                        class="icon-btn"
                        [attr.aria-label]="'Supprimer le format ' + ($index + 1)"
                        [disabled]="fields.variants().value().length <= 2"
                        (click)="removeFormat($index)"
                      >
                        <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                      </button>
                    </div>
                    <div class="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-3">
                      <label [attr.for]="'format-name-' + $index" class="field-label">Format</label>
                      <input [id]="'format-name-' + $index" type="text" [formField]="fields.variants[$index].name" placeholder="ex. Petite" />

                      <label [attr.for]="'format-price-' + $index" class="field-label">Prix</label>
                      <div class="flex items-center gap-2">
                        <input [id]="'format-price-' + $index" type="text" inputmode="decimal" class="flex-1" [formField]="fields.variants[$index].price" placeholder="ex. 9,50" />
                        <span class="text-sm text-muted">EUR</span>
                      </div>

                      <label [attr.for]="'format-detail-' + $index" class="field-label pt-2">Détail<span class="block font-sans font-normal normal-case tracking-normal text-muted">optionnel</span></label>
                      <textarea [id]="'format-detail-' + $index" rows="2" [formField]="fields.variants[$index].description" placeholder="ex. 250 g · pour une personne"></textarea>
                    </div>
                  </div>
                }
              </div>
              <button type="button" class="add-format mt-4" (click)="addFormat()">
                <i class="fa-solid fa-plus" aria-hidden="true"></i> Ajouter un format
              </button>
            </div>
          }
        </div>

        <button type="submit" class="mt-6 flex w-full max-w-xs mx-auto justify-center" [disabled]="cannotSubmit()">
          {{ isEditing ? 'Enregistrer' : 'Ajouter à ma carte ✓' }}
        </button>

        <!-- Every button here is type="button": a stray Enter in the name field submits the
             form's default button, and none of these should be the one that answers it. -->
        @if (isEditing) {
          @if (confirmingRetire()) {
            <div class="mt-3 mx-auto w-full max-w-xs">
              <p role="alert" class="text-center text-sm text-ink">Supprimer ce plat de votre carte ?</p>
              <div class="mt-2 flex gap-2">
                <button type="button" class="quiet flex-1" (click)="confirmingRetire.set(false)">Annuler</button>
                <button type="button" class="retire-confirm flex-1" (click)="retire()">
                  <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                  Confirmer
                </button>
              </div>
            </div>
          } @else {
            <button type="button" class="retire mt-3 flex w-full max-w-xs mx-auto justify-center" (click)="confirmingRetire.set(true)">
              <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
              Supprimer
            </button>
          }
        }
      </form>
    </mm-card>
  `,
})
export class AddDish {
  private readonly catalogue = inject(CatalogueFacade);
  private readonly route = inject(ActivatedRoute);

  private readonly editing = this.catalogue
    .items()
    .find((item) => item.itemId === this.route.snapshot.paramMap.get('itemId'));
  protected readonly isEditing = this.editing !== undefined;
  private readonly itemId = this.editing?.itemId ?? crypto.randomUUID();
  private readonly existingImage = this.editing?.imageReference ?? '';

  protected readonly previewTransformation = DISH_PREVIEW_TRANSFORMATION;
  protected readonly photoReference = this.catalogue.newPhotoReference;
  protected readonly previewRef = computed(() => this.photoReference() || this.existingImage);
  protected readonly uploading = this.catalogue.photoUploading;
  protected readonly uploadError = this.catalogue.photoError;
  protected readonly tooLarge = this.catalogue.photoTooLarge;

  protected readonly mode = signal<'single' | 'variants'>(this.editing?.variants ? 'variants' : 'single');
  // Annuler puts this back rather than leaving the screen, so backing out of a deletion
  // costs nothing the vendor typed.
  protected readonly confirmingRetire = signal(false);

  private readonly model = signal({
    name: this.editing?.name ?? '',
    price: this.editing && this.editing.price !== undefined ? centsToEuros(this.editing.price) : '',
    description: this.editing?.description ?? '',
    variants: this.editing?.variants
      ? this.editing.variants.map((v) => ({ name: v.name, price: centsToEuros(v.price), description: v.description }))
      : [emptyFormat(), emptyFormat()],
  });

  protected readonly fields = form(this.model, (path) => {
    required(path.name);
  });

  private readonly priceCents = computed(() => parseEurosToCents(this.fields().value().price));
  protected readonly priceInvalid = computed(() => this.priceCents() === null);
  private readonly formatsComplete = computed(() =>
    this.fields().value().variants.every((v) => v.name.trim() !== '' && parseEurosToCents(v.price) !== null),
  );
  private readonly formatsUnique = computed(() => {
    const names = this.fields().value().variants.map((v) => v.name.trim());
    return new Set(names).size === names.length;
  });
  protected readonly cannotSubmit = computed(() => {
    if (this.uploading() || this.fields().invalid()) {
      return true;
    }
    return this.mode() === 'single' ? this.priceInvalid() : !this.formatsComplete() || !this.formatsUnique();
  });

  constructor() {
    this.catalogue.beginDish();
  }

  protected addFormat(): void {
    this.model.update((m) => ({ ...m, variants: [...m.variants, emptyFormat()] }));
  }

  protected removeFormat(index: number): void {
    this.model.update((m) => ({ ...m, variants: m.variants.filter((_, i) => i !== index) }));
  }

  protected moveFormatUp(index: number): void {
    this.swapFormats(index, index - 1);
  }

  protected moveFormatDown(index: number): void {
    this.swapFormats(index, index + 1);
  }

  private swapFormats(a: number, b: number): void {
    this.model.update((m) => {
      if (a < 0 || b < 0 || a >= m.variants.length || b >= m.variants.length) {
        return m;
      }
      const variants = [...m.variants];
      [variants[a], variants[b]] = [variants[b], variants[a]];
      return { ...m, variants };
    });
  }

  protected selectPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.catalogue.uploadDishPhoto(this.itemId, file);
  }

  protected retire(): void {
    this.catalogue.retireDish(this.itemId);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const { name, description } = this.fields().value();
    if (this.mode() === 'variants') {
      const variants = this.parseVariants();
      if (variants === null) {
        return;
      }
      if (this.isEditing) {
        this.catalogue.reviseDish({ itemId: this.itemId, name, description, variants });
      } else {
        this.catalogue.addDish({ itemId: this.itemId, name, description, variants, imageReference: this.photoReference() || undefined });
      }
      return;
    }
    const cents = this.priceCents();
    if (cents === null) {
      return;
    }
    if (this.isEditing) {
      this.catalogue.reviseDish({ itemId: this.itemId, name, description, price: cents });
    } else {
      this.catalogue.addDish({
        itemId: this.itemId,
        name,
        description,
        price: cents,
        imageReference: this.photoReference() || undefined,
      });
    }
  }

  private parseVariants(): { name: string; description: string; price: number }[] | null {
    const rows = this.fields().value().variants.map((row) => ({
      name: row.name,
      description: row.description,
      price: parseEurosToCents(row.price),
    }));
    if (rows.some((row) => row.price === null)) {
      return null;
    }
    return rows.map((row) => ({ name: row.name, description: row.description, price: row.price as number }));
  }
}

function emptyFormat(): { name: string; price: string; description: string } {
  return { name: '', price: '', description: '' };
}
