import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'mm-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-1.5 rounded-pill bg-success-soft px-3 py-1 text-xs font-bold uppercase tracking-label text-success">
      <span aria-hidden="true" class="size-1.5 rounded-full bg-success"></span>
      <ng-content />
    </span>
  `,
})
export class Badge {}
