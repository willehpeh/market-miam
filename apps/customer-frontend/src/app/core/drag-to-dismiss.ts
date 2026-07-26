import { Directive, ElementRef, inject, input, output, signal } from '@angular/core';

// How far the finger has to travel before a gesture is claimed as a drag rather than a scroll.
const SLOP_PX = 6;
// Fraction of the sheet's height a drag has to cover to dismiss it.
const DISMISS_RATIO = 0.1;

@Directive({
  selector: '[appDragToDismiss]',
  host: {
    // pan-y leaves the vertical scrolling of the host to the browser; the drag only takes the
    // gesture over when there is nothing left to scroll up to.
    '[style.touch-action]': "'pan-y'",
    '[style.user-select]': "dragging() ? 'none' : null",
    '(pointerdown)': 'onDown($event)',
    '(pointermove)': 'onMove($event)',
    '(pointerup)': 'onUp($event)',
    '(pointercancel)': 'reset()',
    '(touchmove)': 'onTouchMove($event)',
  },
})
export class DragToDismiss {
  readonly sheet = input.required<HTMLDialogElement>({ alias: 'appDragToDismiss' });
  readonly dragTo = output<number | null>();
  readonly dismissed = output<void>();
  protected readonly dragging = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private startY = 0;
  private pending = false;

  protected onDown(event: PointerEvent): void {
    // Dragging competes with scrolling, so it only starts from the top of the content — anywhere
    // else the gesture belongs to the scroller.
    if (this.host.nativeElement.scrollTop > 0) {
      return;
    }
    this.pending = true;
    this.startY = event.clientY;
  }

  protected onMove(event: PointerEvent): void {
    const offset = event.clientY - this.startY;
    if (this.pending) {
      if (offset <= -SLOP_PX) {
        this.pending = false; // upward: the content scrolls instead
        return;
      }
      if (offset < SLOP_PX) {
        return;
      }
      this.pending = false;
      this.dragging.set(true);
      this.host.nativeElement.setPointerCapture?.(event.pointerId);
    }
    if (this.dragging()) {
      this.dragTo.emit(Math.max(0, offset));
    }
  }

  protected onUp(event: PointerEvent): void {
    this.pending = false;
    if (!this.dragging()) {
      return;
    }
    this.dragging.set(false);
    if (event.clientY - this.startY > this.sheet().offsetHeight * DISMISS_RATIO) {
      this.dismissed.emit();
    } else {
      this.dragTo.emit(null);
    }
  }

  // Once the drag has the gesture, stop the browser from also scrolling (or rubber-banding) the
  // content under the finger. Only the first touchmove of a gesture is cancellable, which is why
  // the drag is claimed on the matching pointermove — that fires first.
  protected onTouchMove(event: TouchEvent): void {
    if (this.dragging() && event.cancelable) {
      event.preventDefault();
    }
  }

  protected reset(): void {
    this.pending = false;
    this.dragging.set(false);
    this.dragTo.emit(null);
  }
}
