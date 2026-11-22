import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

// One row's down and up buttons, in that order, each named for what it moves. Neither moves
// a row off the end of its list.
@Component({
  selector: 'mm-move-buttons',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <button
      type="button"
      class="icon-btn shrink-0"
      [attr.aria-label]="'Descendre ' + label()"
      [disabled]="last()"
      (click)="moveDown.emit()"
    >
      <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
    </button>
    <button
      type="button"
      class="icon-btn shrink-0"
      [attr.aria-label]="'Monter ' + label()"
      [disabled]="first()"
      (click)="moveUp.emit()"
    >
      <i class="fa-solid fa-chevron-up" aria-hidden="true"></i>
    </button>
  `,
})
export class MoveButtons {
  // What the row is, as the buttons' names say it: "Bœuf bourguignon", "le format 2".
  readonly label = input.required<string>();
  readonly first = input.required<boolean>();
  readonly last = input.required<boolean>();

  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
}
