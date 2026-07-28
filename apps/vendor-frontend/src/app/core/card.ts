import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'mm-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: { class: 'block max-w-4xl mx-auto py-4' },
  template: `
    @if (back(); as destination) {
      <a [routerLink]="destination" class="mb-2 inline-block text-sm font-bold text-brand no-underline">← Retour</a>
    }
    <section class="rounded-card bg-surface p-6 shadow-frame">
      <ng-content />
    </section>
  `,
})
export class Card {
  readonly back = input<string>();
}
