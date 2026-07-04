import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'mm-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block max-w-4xl mx-auto py-4' },
  template: `
    <section class="rounded-card bg-surface p-6 shadow-frame">
      <ng-content />
    </section>
  `,
})
export class Card {}
