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
    @starting-style {
      .dish-sheet[open]::backdrop {
        background-color: rgb(0 0 0 / 0);
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
      class="dish-sheet mx-auto mb-0 mt-auto w-full max-w-xl rounded-t-3xl bg-canvas p-0"
      (click)="dismissOnBackdrop($event)"
    >
      @if (dish(); as dish) {
        <div class="p-5 pt-2">
          <div [appDragToDismiss]="dialog">
            <div class="-mt-1 mb-2 flex justify-center py-2">
              <span class="h-1.5 w-10 rounded-pill bg-line-strong"></span>
            </div>
            @if (dish.photo; as photo) {
              <img [src]="photo.sheetUrl" alt="" class="aspect-4/3 w-full rounded-card object-cover" />
            }
          </div>
          <div class="mt-5 flex items-baseline justify-between gap-3">
            <h3 class="text-2xl font-bold text-ink">{{ dish.name }}</h3>
            <p class="shrink-0 text-2xl font-bold text-ink">{{ dish.priceLabel }}</p>
          </div>
          <p class="mt-3 text-lg text-ink-soft">{{ dish.description }}</p>
        </div>
      }
    </dialog>
  `,
})
export class DishSheet {
  protected readonly dish = signal<DishViewModel | null>(null);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(dish: DishViewModel): void {
    this.dish.set(dish);
    this.dialog().nativeElement.showModal();
  }

  protected dismissOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.dialog().nativeElement.close();
    }
  }
}
