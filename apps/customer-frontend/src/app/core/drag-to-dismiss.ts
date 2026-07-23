import { Directive, input, output } from '@angular/core';

@Directive({
  selector: '[appDragToDismiss]',
  host: {
    '[style.touch-action]': "'none'",
    '[style.cursor]': "'grab'",
    '(pointerdown)': 'onDown($event)',
    '(pointermove)': 'onMove($event)',
    '(pointerup)': 'onUp($event)',
    '(pointercancel)': 'reset()',
  },
})
export class DragToDismiss {
  readonly sheet = input.required<HTMLDialogElement>({ alias: 'appDragToDismiss' });
  readonly dragTo = output<number | null>();
  readonly dismissed = output<void>();
  private startY = 0;
  private dragging = false;

  protected onDown(event: PointerEvent): void {
    this.dragging = true;
    this.startY = event.clientY;
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
  }

  protected onMove(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    this.dragTo.emit(Math.max(0, event.clientY - this.startY));
  }

  protected onUp(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    this.dragging = false;
    if (event.clientY - this.startY > this.sheet().offsetHeight * 0.1) {
      this.dismissed.emit();
    } else {
      this.dragTo.emit(null);
    }
  }

  protected reset(): void {
    this.dragging = false;
    this.dragTo.emit(null);
  }
}
