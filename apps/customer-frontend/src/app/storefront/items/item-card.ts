import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ItemViewModel } from '../storefront-view-model';

@Component({
  selector: 'app-item-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <!-- h-full so a row of cards shares one height, and the price line sits on the
         baseline of the tallest rather than wherever its own text happens to end. -->
    <button
      type="button"
      [attr.data-item]="item().itemId"
      class="flex h-full w-full flex-col rounded-card bg-surface p-4 text-left shadow-soft justify-start"
      (click)="chosen.emit(item())"
    >
      @if (item().photo; as photo) {
        <!-- sizes mirrors the layout: ~20rem in a desktop grid column, otherwise the
             page's max-w-xl minus its px-5 and the card's p-4. -->
        <img
          [src]="photo.src"
          [srcset]="photo.srcset"
          sizes="(min-width: 1024px) 20rem, (min-width: 36rem) 31.5rem, calc(100vw - 4.5rem)"
          alt=""
          class="mb-3 aspect-16/10 w-full rounded-card object-cover"
          [class.grayscale]="item().soldOut"
        />
      } @else {
        <!-- Item photos are optional, so a real carte mixes the two. The canvas keeps the
             card's shape without pretending a photo is loading. -->
        <span class="mb-3 grid aspect-16/10 w-full place-items-center rounded-card bg-canvas text-2xl text-line-strong">
          <i class="fa-solid fa-utensils" aria-hidden="true"></i>
        </span>
      }
      <span class="block w-full">
        <span class="flex justify-between gap-3 w-full">
          <span class="line-clamp-2 text-lg font-bold" [class.text-ink]="!item().soldOut" [class.text-neutral-500]="item().soldOut">{{ item().name }}</span>
          <span class="shrink-0 text-lg font-bold" [class.text-ink]="!item().soldOut" [class.text-neutral-500]="item().soldOut">{{ item().priceLabel }}</span>
        </span>
      </span>
      <!-- Availability is the badge's text, never the greying alone (decision 20) — and
           the card stays tappable: a customer may still want to read what they missed. -->
      @if (item().soldOut) {
        <span class="kicker mt-2 inline-block self-start rounded-pill bg-line-strong px-2 py-0.5 normal-case text-neutral-600">Épuisé</span>
      }
    </button>
  `,
})
export class ItemCard {
  readonly item = input.required<ItemViewModel>();
  readonly chosen = output<ItemViewModel>();
}
