import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChild, ViewEncapsulation } from '@angular/core';
import { DishViewModel } from '../storefront-view-model';
import { DragToDismiss } from '../../core/drag-to-dismiss';

@Component({
  selector: 'app-dish-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'contents' },
  imports: [DragToDismiss],
  styles: `
    .dish-sheet {
      transform: translateY(100%);
      transition-property: transform, overlay, display;
      transition-duration: 0.3s;
      transition-timing-function: ease-out;
      transition-behavior: allow-discrete;
    }
    .dish-sheet[open] {
      transform: translateY(0);
    }
    .dish-sheet.closing {
      transform: translateY(100%);
    }
    @starting-style {
      .dish-sheet[open] {
        transform: translateY(100%);
      }
    }
    .dish-sheet::backdrop {
      background-color: rgb(0 0 0 / 0);
      transition-property: background-color, overlay, display;
      transition-duration: 0.3s;
      transition-timing-function: ease-out;
      transition-behavior: allow-discrete;
    }
    .dish-sheet[open]::backdrop {
      background-color: rgb(0 0 0 / 0.5);
    }
    .dish-sheet.closing::backdrop {
      background-color: rgb(0 0 0 / 0);
    }
    @starting-style {
      .dish-sheet[open]::backdrop {
        background-color: rgb(0 0 0 / 0);
      }
    }
    @media (min-width: 40rem) {
      .dish-sheet {
        transform: scale(0.96);
        opacity: 0;
        transition-property: transform, opacity, overlay, display;
      }
      .dish-sheet[open] {
        transform: scale(1);
        opacity: 1;
      }
      .dish-sheet.closing {
        transform: scale(0.96);
        opacity: 0;
      }
      @starting-style {
        .dish-sheet[open] {
          transform: scale(0.96);
          opacity: 0;
        }
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .dish-sheet,
      .dish-sheet::backdrop {
        transition: none;
      }
    }
  `,
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- native dialog closes on Escape; click is backdrop-dismiss only -->
    <dialog
      #dialog
      class="dish-sheet mx-auto mb-0 mt-auto w-full max-w-xl rounded-t-3xl bg-canvas p-0 sm:mb-auto sm:mt-auto sm:rounded-3xl"
      [class.closing]="closing()"
      [style.transform]="dragOffset() !== null ? 'translateY(' + dragOffset() + 'px)' : null"
      [style.transition]="dragOffset() !== null ? 'none' : null"
      (click)="dismissOnBackdrop($event)"
      (close)="onClosed()"
      (transitionend)="onSlideEnd($event)"
    >
      @if (dish(); as dish) {
        <div
          class="h-[80dvh] overflow-y-auto overscroll-y-none p-5 pt-2 sm:h-auto sm:max-h-[85dvh] sm:pt-5"
          [appDragToDismiss]="dialog"
          (dragTo)="dragOffset.set($event)"
          (dismissed)="dismiss()"
        >
          <div class="-mt-1 mb-2 flex cursor-grab justify-center py-2 sm:hidden">
            <span class="h-1.5 w-10 rounded-pill bg-line-strong"></span>
          </div>
          @if (dish.photo; as photo) {
            <!-- Same srcset as the card, so this is usually a cache hit on the photo the
                 card already loaded. sizes: the sheet's max-w-xl minus its p-5. -->
            <img
              [src]="photo.src"
              [srcset]="photo.srcset"
              sizes="(min-width: 36rem) 33.5rem, calc(100vw - 2.5rem)"
              alt=""
              class="aspect-4/3 w-full rounded-card object-cover"
            />
          } @else {
            <!-- Surface here, canvas on the card: the placeholder is the quiet panel against
                 whatever it sits on, and the sheet itself is canvas. -->
            <span class="grid aspect-4/3 w-full place-items-center rounded-card bg-surface text-4xl text-line-strong">
              <i class="fa-solid fa-utensils" aria-hidden="true"></i>
            </span>
          }
          <div class="mt-5 flex items-baseline justify-between gap-3">
            <h3 class="text-2xl font-bold text-ink">{{ dish.name }}</h3>
            <p class="shrink-0 text-2xl font-bold text-ink">{{ dish.priceLabel }}</p>
          </div>
          <p class="mt-3 whitespace-pre-line text-lg text-ink-soft">{{ dish.description }}</p>
          @if (dish.variants; as variants) {
            <p class="field-label mt-5 border-t border-line pt-4">Formats</p>
            <ul class="mt-1">
              @for (variant of variants; track variant.name) {
                <li class="border-t border-line py-3">
                  <span class="flex items-baseline justify-between gap-3">
                    <span class="text-lg font-bold text-ink">{{ variant.name }}</span>
                    <span class="shrink-0 text-lg font-semibold text-ink">{{ variant.priceLabel }}</span>
                  </span>
                  @if (variant.description) {
                    <span class="mt-1 block whitespace-pre-line text-base text-ink-soft">{{ variant.description }}</span>
                  }
                </li>
              }
            </ul>
          }
        </div>
      }
    </dialog>
  `,
})
export class DishSheet {
  protected readonly dish = signal<DishViewModel | null>(null);
  protected readonly dragOffset = signal<number | null>(null);
  protected readonly closing = signal(false);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(dish: DishViewModel): void {
    this.dish.set(dish);
    this.dialog().nativeElement.showModal();
  }

  // The dialog element survives between dishes, and an <img> keeps its old pixels on a src
  // change until the new photo decodes. Tearing the content down on close means the next
  // open builds a fresh <img> and a fresh scroller — no previous dish's photo while the new
  // one loads, no inherited scroll offset. The close event also covers Escape, which the
  // native dialog handles without going through dismiss().
  protected onClosed(): void {
    this.dish.set(null);
  }

  protected dismissOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.dismiss();
    }
  }

  // Slide the sheet out via the `.closing` class while it stays in the top layer, then close on
  // transitionend — WebKit doesn't animate the native `overlay`/top-layer exit, so a plain close()
  // vanishes. Reduced-motion (and non-browser/test) skips straight to close.
  protected dismiss(): void {
    this.dragOffset.set(null);
    if (typeof matchMedia === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.closing.set(true);
    } else {
      this.dialog().nativeElement.close();
    }
  }

  protected onSlideEnd(event: TransitionEvent): void {
    if (event.propertyName === 'transform' && this.closing()) {
      this.closing.set(false);
      this.dialog().nativeElement.close();
    }
  }
}
