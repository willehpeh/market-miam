import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-storefront-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  host: { class: 'contents' },
  template: `
    <section class="relative">
      @if (coverReference(); as cover) {
        <!-- The cover is the LCP element on every storefront: priority emits the preload
             link and the high fetch priority during the server render. fill, because the
             box changes shape at lg and the crop is the box's business, not the image's. -->
        <span class="relative block aspect-16/10 w-full lg:aspect-3/1">
          <img
            [ngSrc]="cover"
            fill
            priority
            [loaderParams]="{ transform: 'c_fill,ar_16:10' }"
            sizes="100vw"
            alt=""
            class="object-cover"
          />
        </span>
      } @else {
        <div class="hatch aspect-16/10 w-full lg:aspect-3/1"></div>
        <span class="kicker absolute left-5 top-5 rounded-pill bg-surface/85 px-3 py-1 lg:left-8">photo du stand</span>
      }
      <div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/65 via-black/25 to-transparent px-5 pb-5 pt-16 lg:px-8 lg:pb-7">
        <h1 class="text-4xl font-bold tracking-tight text-white lg:text-5xl">{{ name() }}</h1>
      </div>
    </section>
  `,
})
export class StorefrontHero {
  readonly coverReference = input<string | null>(null);
  readonly name = input.required<string>();
}
