import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// A form's submit button, with what still stops it said underneath: a disabled button is
// not an explanation. The reasons describe the button, so a screen reader announces them
// with it.
@Component({
  selector: 'mm-submit-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <button
      type="submit"
      class="mt-6 flex w-full max-w-xs mx-auto justify-center"
      [disabled]="disabled()"
      [attr.aria-describedby]="reasons().length ? 'submit-reasons' : null"
    >
      <ng-content />
    </button>
    @if (reasons().length) {
      <ul id="submit-reasons" class="mt-2 space-y-0.5 text-center text-xs text-muted">
        @for (reason of reasons(); track reason) {
          <li>{{ reason }}</li>
        }
      </ul>
    }
  `,
})
export class SubmitButton {
  readonly disabled = input.required<boolean>();
  readonly reasons = input.required<readonly string[]>();
}
