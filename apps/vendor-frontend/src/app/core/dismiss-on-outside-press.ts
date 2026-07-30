import { Directive, ElementRef, inject, output } from '@angular/core';

@Directive({
  selector: '[mmDismissOnOutsidePress]',
  host: {
    // pointerdown rather than click: iOS Safari withholds click from anything that is not
    // itself interactive, so a tap on a bare label or on the card's padding — the most
    // natural way to back out of a confirmation — would never reach a click listener.
    '(document:pointerdown)': 'onPress($event)',
    '(document:keydown.escape)': 'dismissed.emit()',
  },
})
export class DismissOnOutsidePress {
  readonly dismissed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onPress(event: PointerEvent): void {
    // contains(), not a target check: the host is usually a button wrapping an icon, and the
    // icon is what the press lands on.
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.dismissed.emit();
    }
  }
}
