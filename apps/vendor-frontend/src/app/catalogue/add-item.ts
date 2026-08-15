import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { applyEach, applyWhen, form, FormField, required, validate } from '@angular/forms/signals';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { CloudinaryUrlPipe } from '../core/cloudinary-url.pipe';
import { DismissOnOutsidePress } from '../core/dismiss-on-outside-press';
import { CatalogueFacade } from './catalogue.facade';
import { CatalogueItemView } from './catalogue';
import { centsToEuros, parseEurosToCents } from './money';

const ITEM_PREVIEW_TRANSFORMATION = 'c_fill,w_600,h_400,q_auto,f_webp';

type FormatModel = { name: string; price: string; description: string };
// Named because the model signal below is a linkedSignal whose computation returns its
// own previous value — inference has nothing to bite on without it.
type ItemModel = { name: string; price: string; description: string; variants: FormatModel[] };

@Component({
  selector: 'mm-add-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, FormField, CloudinaryUrlPipe, DismissOnOutsidePress, Spinner],
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
    /* the row-scale twin of .retire-confirm — compact enough to sit in a format header
       without growing the row it replaces the arrows in */
    .format-confirm {
      background: var(--color-danger);
      border: 1px solid var(--color-danger);
      color: white;
      padding: 0.375rem 0.75rem;
    }
    .format-confirm:hover,
    .format-confirm:active {
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
      @if (loading()) {
        <div class="mx-auto grid h-32 place-items-center">
          <mm-spinner label="Chargement du plat…" />
        </div>
      } @else if (missing()) {
        <!-- Save only exists inside the branch that found the dish, so a cold refresh
             cannot render an empty form and write it back over the real one. -->
        <p class="text-sm text-ink-soft">Ce plat n'est plus à votre carte.</p>
        <a routerLink="/dashboard/catalogue" class="mt-4 inline-block font-bold text-brand no-underline">
          Retour au catalogue
        </a>
      } @else {
      <form (submit)="submit($event)">
        <div class="flex items-center justify-between">
          <h1 class="text-xl leading-tight">{{ isEditing ? 'Modifier le plat' : 'Nouveau plat' }}</h1>
          <a routerLink="/dashboard/catalogue" class="text-sm font-bold text-brand no-underline">Annuler</a>
        </div>

        <div class="mt-4 overflow-hidden rounded-card border border-dashed border-line-strong bg-surface-sunk text-center">
          @if (uploading()) {
            <div class="grid h-48 place-items-center">
              <mm-spinner label="Envoi de la photo…" />
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
                  [attr.aria-invalid]="fields.price().touched() && fields.price().invalid()"
                  [attr.aria-describedby]="fields.price().touched() && fields.price().invalid() ? 'price-error' : null"
                  placeholder="ex. 12,00"
                />
                <span class="text-sm text-muted">EUR</span>
              </div>
              @if (fields.price().touched() && fields.price().invalid()) {
                <p id="price-error" role="alert" class="mt-1 text-xs text-danger">Indiquez un prix, par exemple 12,00.</p>
              }
            </div>
          } @else {
            <div>
              <p class="field-label">Formats</p>
              <div class="mt-2 space-y-4">
                @for (format of fields.variants; track $index) {
                  <div class="rounded-card border border-line bg-surface p-4">
                    <div class="mb-4 flex items-center gap-2">
                      <span class="grid size-7 shrink-0 place-items-center rounded-card bg-brand-soft text-sm font-bold text-ink">{{ $index + 1 }}</span>
                      <span class="min-w-0 flex-1 truncate font-bold text-ink">{{ format.name().value() }}</span>
                      <!-- Deleting a format throws away what the vendor typed into it, so it asks
                           first. The arrows stand down while it does: they make room for the wider
                           button, and reordering a row that is halfway to being deleted is not a
                           gesture worth honouring. -->
                      @if (confirmingFormat() === $index) {
                        <button
                          type="button"
                          class="format-confirm shrink-0"
                          mmDismissOnOutsidePress
                          (dismissed)="confirmingFormat.set(null)"
                          [attr.aria-label]="'Confirmer la suppression du format ' + ($index + 1)"
                          (click)="removeFormat($index)"
                        >
                          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                          Supprimer
                        </button>
                      } @else {
                        <button
                          type="button"
                          class="icon-btn shrink-0"
                          [attr.aria-label]="'Descendre le format ' + ($index + 1)"
                          [disabled]="$index === fields.variants.length - 1"
                          (click)="moveFormatDown($index)"
                        >
                          <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          class="icon-btn shrink-0"
                          [attr.aria-label]="'Monter le format ' + ($index + 1)"
                          [disabled]="$index === 0"
                          (click)="moveFormatUp($index)"
                        >
                          <i class="fa-solid fa-chevron-up" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          class="icon-btn shrink-0"
                          [attr.aria-label]="'Supprimer le format ' + ($index + 1)"
                          [disabled]="fields.variants.length <= 2"
                          (click)="confirmingFormat.set($index)"
                        >
                          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                        </button>
                      }
                    </div>
                    <div class="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-3">
                      <label [attr.for]="'format-name-' + $index" class="field-label">Format</label>
                      <input [id]="'format-name-' + $index" type="text" [formField]="format.name" placeholder="ex. Petite" />

                      <label [attr.for]="'format-price-' + $index" class="field-label">Prix</label>
                      <div class="flex items-center gap-2">
                        <input [id]="'format-price-' + $index" type="text" inputmode="decimal" class="flex-1" [formField]="format.price" placeholder="ex. 9,50" />
                        <span class="text-sm text-muted">EUR</span>
                      </div>

                      <label [attr.for]="'format-detail-' + $index" class="field-label pt-2">Détail<span class="block font-sans font-normal normal-case tracking-normal text-muted">optionnel</span></label>
                      <textarea [id]="'format-detail-' + $index" rows="2" [formField]="format.description" placeholder="ex. 250 g · pour une personne"></textarea>
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

        <button
          type="submit"
          class="mt-6 flex w-full max-w-xs mx-auto justify-center"
          [disabled]="cannotSubmit()"
          [attr.aria-describedby]="blockers().length ? 'submit-blockers' : null"
        >
          {{ isEditing ? 'Enregistrer' : 'Ajouter à ma carte ✓' }}
        </button>
        @if (blockers().length) {
          <ul id="submit-blockers" class="mt-2 space-y-0.5 text-center text-xs text-muted">
            @for (blocker of blockers(); track blocker) {
              <li>{{ blocker }}</li>
            }
          </ul>
        }

        <!-- Every button here is type="button": a stray Enter in the name field submits the
             form's default button, and none of these should be the one that answers it. -->
        @if (isEditing) {
          @if (confirmingRetire()) {
            <div class="mt-3 mx-auto w-full max-w-xs" mmDismissOnOutsidePress (dismissed)="confirmingRetire.set(false)">
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
      }
    </mm-card>
  `,
})
export class AddItem {
  private readonly catalogue = inject(CatalogueFacade);
  private readonly route = inject(ActivatedRoute);

  // The route decides which screen this is, not the store: a link naming a dish is an
  // edit even before the dish has arrived. Deciding it from store contents is what let a
  // cold refresh mint a new id, pick create-mode, and save a second copy of the dish.
  private readonly routeItemId = this.route.snapshot.paramMap.get('itemId');
  protected readonly isEditing = this.routeItemId !== null;
  private readonly newItemId = crypto.randomUUID();

  private readonly editing = computed(() =>
    this.routeItemId === null
      ? undefined
      : this.catalogue.items().find((item) => item.itemId === this.routeItemId),
  );
  // A new dish has nothing to wait for; an edit link waits for the dish it names, and
  // says so if the catalogue settles without it.
  protected readonly loading = computed(() => this.isEditing && this.catalogue.loading());
  protected readonly missing = computed(() => this.isEditing && !this.loading() && this.editing() === undefined);
  protected readonly itemId = computed(() => this.editing()?.itemId ?? this.newItemId);

  protected readonly previewTransformation = ITEM_PREVIEW_TRANSFORMATION;
  protected readonly photoReference = this.catalogue.newPhotoReference;
  protected readonly previewRef = computed(() => this.photoReference() || this.editing()?.imageReference || '');
  protected readonly uploading = this.catalogue.photoUploading;
  protected readonly uploadError = this.catalogue.photoError;
  protected readonly tooLarge = this.catalogue.photoTooLarge;

  // Re-seeds on the dish's identity, not on its contents. A linkedSignal recomputes
  // whenever its source's dependencies change — it does not compare source values — so
  // the identity check is made here against `previous.source`. Without it, a photo
  // finishing its upload patches the dish in the store and retypes the form under the
  // vendor.
  protected readonly mode = linkedSignal<CatalogueItemView | undefined, 'single' | 'variants'>({
    source: () => this.editing(),
    computation: (item, previous) =>
      previous && previous.source?.itemId === item?.itemId
        ? previous.value
        : item?.variants
          ? 'variants'
          : 'single',
  });
  // Annuler puts this back rather than leaving the screen, so backing out of a deletion
  // costs nothing the vendor typed.
  protected readonly confirmingRetire = signal(false);
  // Which format row is asking to be confirmed, by index. Every edit to the list clears it:
  // the index is only meaningful against the list it was taken from.
  protected readonly confirmingFormat = signal<number | null>(null);

  // Same identity guard as `mode`, for the same reason.
  private readonly model = linkedSignal<CatalogueItemView | undefined, ItemModel>({
    source: () => this.editing(),
    computation: (item, previous) =>
      previous && previous.source?.itemId === item?.itemId ? previous.value : modelOf(item),
  });

  // Every rule lives in the schema, so `fields().invalid()` is the whole answer and each
  // field carries its own error. Both modes' inputs stay in the model across a switch —
  // whatever was typed before is still there — so each mode's rules are applied only while
  // that mode is showing, or the hidden half would hold the form invalid.
  protected readonly fields = form(this.model, (path) => {
    required(path.name);
    applyWhen(
      path,
      () => this.mode() === 'single',
      (single) => {
        validate(single.price, ({ value }) => (parseEurosToCents(value()) === null ? { kind: 'price' } : undefined));
      },
    );
    applyWhen(
      path,
      () => this.mode() === 'variants',
      (formats) => {
        applyEach(formats.variants, (format) => {
          // Trimmed, not `required`: a name of spaces is a blank name on the storefront.
          validate(format.name, ({ value }) => (value().trim() === '' ? { kind: 'required' } : undefined));
          validate(format.price, ({ value }) => (parseEurosToCents(value()) === null ? { kind: 'price' } : undefined));
        });
        // On the list itself: uniqueness is a property of the set, not of any one row.
        validate(formats.variants, ({ value }) => {
          const names = value().map((format) => format.name.trim());
          return new Set(names).size === names.length ? undefined : { kind: 'duplicateFormat' };
        });
      },
    );
  });

  private readonly priceCents = computed(() => parseEurosToCents(this.fields().value().price));
  protected readonly cannotSubmit = computed(() => this.uploading() || this.fields().invalid());

  // A disabled button is not an explanation. These read the form's own state rather than
  // re-deriving the rules — the schema owns those — and are tied to the button by
  // aria-describedby, so a screen reader announces the reason with it.
  protected readonly blockers = computed(() => {
    const reasons: string[] = [];
    if (this.uploading()) {
      reasons.push("Attendez la fin de l'envoi de la photo.");
    }
    if (this.fields.name().invalid()) {
      reasons.push('Indiquez le nom du plat.');
    }
    if (this.mode() === 'single') {
      if (this.fields.price().invalid()) {
        reasons.push('Indiquez le prix.');
      }
      return reasons;
    }
    // Row count off the value, so adding or removing a format re-runs this; the verdict
    // per row still comes from the field.
    const rows = this.fields.variants().value();
    if (rows.some((_, index) => this.fields.variants[index]().invalid())) {
      reasons.push('Complétez chaque format.');
    }
    if (this.fields.variants().errors().some(error => error.kind === 'duplicateFormat')) {
      reasons.push('Donnez un nom différent à chaque format.');
    }
    return reasons;
  });

  constructor() {
    this.catalogue.beginItem();
    // Warm-only in the facade. No guard does this for the screen any more.
    this.catalogue.load();
  }

  protected addFormat(): void {
    this.confirmingFormat.set(null);
    this.model.update((m) => ({ ...m, variants: [...m.variants, emptyFormat()] }));
  }

  protected removeFormat(index: number): void {
    this.confirmingFormat.set(null);
    this.model.update((m) => ({ ...m, variants: m.variants.filter((_, i) => i !== index) }));
  }

  protected moveFormatUp(index: number): void {
    this.swapFormats(index, index - 1);
  }

  protected moveFormatDown(index: number): void {
    this.swapFormats(index, index + 1);
  }

  private swapFormats(a: number, b: number): void {
    this.confirmingFormat.set(null);
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
    this.catalogue.uploadItemPhoto(this.itemId(), file);
  }

  protected retire(): void {
    this.catalogue.retireItem(this.itemId());
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
        this.catalogue.reviseItem({ itemId: this.itemId(), name, description, variants });
      } else {
        this.catalogue.addItem({ itemId: this.itemId(), name, description, variants, imageReference: this.photoReference() || undefined });
      }
      return;
    }
    const cents = this.priceCents();
    if (cents === null) {
      return;
    }
    if (this.isEditing) {
      this.catalogue.reviseItem({ itemId: this.itemId(), name, description, price: cents });
    } else {
      this.catalogue.addItem({
        itemId: this.itemId(),
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

function emptyFormat(): FormatModel {
  return { name: '', price: '', description: '' };
}

function modelOf(item: CatalogueItemView | undefined): ItemModel {
  return {
    name: item?.name ?? '',
    price: item && item.price !== undefined ? centsToEuros(item.price) : '',
    description: item?.description ?? '',
    variants: item?.variants
      ? item.variants.map((v) => ({ name: v.name, price: centsToEuros(v.price), description: v.description }))
      : [emptyFormat(), emptyFormat()],
  };
}
