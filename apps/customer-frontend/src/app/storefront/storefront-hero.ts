import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-storefront-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <section class="relative">
      @if (coverUrl(); as cover) {
        <img [src]="cover" alt="" class="aspect-16/10 w-full object-cover" />
      } @else {
        <div class="hatch aspect-16/10 w-full"></div>
        <span class="kicker absolute left-5 top-5 rounded-pill bg-surface/85 px-3 py-1">photo du stand</span>
      }
      <div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/65 via-black/25 to-transparent px-5 pb-5 pt-16">
        <h1 class="text-4xl font-bold tracking-tight text-white">{{ name() }}</h1>
      </div>
    </section>
  `,
})
export class StorefrontHero {
  readonly coverUrl = input<string | null>(null);
  readonly name = input.required<string>();
}
