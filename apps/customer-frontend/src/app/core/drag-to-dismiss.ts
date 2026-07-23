import { Directive, input } from '@angular/core';

@Directive({
  selector: '[appDragToDismiss]',
  host: {
    '[style.touchAction]': "'none'",
    '[style.cursor]': "'grab'",
    '(pointerdown)': 'onDown($event)',
    '(pointermove)': 'onMove($event)',
    '(pointerup)': 'onUp($event)',
    '(pointercancel)': 'reset()',
  },
})
export class DragToDismiss {
  readonly sheet = input.required<HTMLDialogElement>({ alias: 'appDragToDismiss' });
  private startY = 0;
  private dragging = false;

  protected onDown(event: PointerEvent): void {
    this.dragging = true;
    this.startY = event.clientY;
    this.sheet().style.transition = 'none';
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
  }

  protected onMove(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    const offset = Math.max(0, event.clientY - this.startY);
    this.sheet().style.transform = `translateY(${offset}px)`;
  }

  protected onUp(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    const sheet = this.sheet();
    const offset = Math.max(0, event.clientY - this.startY);
    this.reset();
    if (offset > sheet.offsetHeight * 0.1) {
      sheet.close();
    }
  }

  protected reset(): void {
    this.dragging = false;
    const sheet = this.sheet();
    sheet.style.transition = '';
    sheet.style.transform = '';
  }
}
