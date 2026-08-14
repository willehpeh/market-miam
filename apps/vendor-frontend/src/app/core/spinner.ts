import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// The one loading indicator, labelled per context — role and aria-label live here, so a
// spinner cannot ship silent.
@Component({
  selector: 'mm-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="status"
      [attr.aria-label]="label()"
      class="size-8 animate-spin rounded-full border-4 border-line-strong border-t-brand"
    ></div>
  `,
})
export class Spinner {
  readonly label = input.required<string>();
}
