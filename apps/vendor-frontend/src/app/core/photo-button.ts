import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';

// A button that opens the device's photo picker and hands on the photo chosen. The file
// input behind it stays hidden, as a native picker cannot be styled.
@Component({
  selector: 'mm-photo-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  styles: `
    .outlined {
      background: transparent;
      color: var(--color-brand);
      border: 1px solid var(--color-brand);
      box-shadow: none;
    }
    .outlined:hover:not(:disabled),
    .outlined:active:not(:disabled) {
      background: var(--color-brand-soft);
    }
  `,
  template: `
    <input
      #picker
      type="file"
      accept="image/*"
      hidden
      [attr.capture]="camera() ? 'environment' : null"
      (change)="handOn(picker)"
    />
    <button type="button" [class.outlined]="outlined()" [disabled]="disabled()" (click)="picker.click()">
      <ng-content />
    </button>
  `,
})
export class PhotoButton {
  // Opens the camera rather than the photo roll.
  readonly camera = input(false, { transform: booleanAttribute });
  readonly outlined = input(false, { transform: booleanAttribute });
  readonly disabled = input(false);

  readonly picked = output<File>();

  protected handOn(picker: HTMLInputElement): void {
    const photo = picker.files?.[0];
    if (photo) {
      this.picked.emit(photo);
    }
  }
}
