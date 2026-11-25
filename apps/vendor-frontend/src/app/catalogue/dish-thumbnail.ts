import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ITEM_PHOTO_THUMBNAIL_TRANSFORMATION } from '@market-miam/common';
import { CloudinaryUrlPipe } from '../core/cloudinary-url.pipe';
import { Dish } from './dish';

// The dish's photo at list size, or a camera where there is none yet.
@Component({
  selector: 'mm-dish-thumbnail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CloudinaryUrlPipe],
  host: { class: 'contents' },
  template: `
    @if (dish().imageReference(); as reference) {
      <img
        class="size-16 shrink-0 rounded-field object-cover"
        [src]="reference | cloudinaryUrl: transformation"
        alt=""
      >
    } @else {
      <span class="hatch grid size-16 shrink-0 place-items-center rounded-field text-lg text-line-strong">
        <i class="fa-solid fa-camera" aria-hidden="true"></i>
      </span>
    }
  `,
})
export class DishThumbnail {
  readonly dish = input.required<Dish>();

  protected readonly transformation = ITEM_PHOTO_THUMBNAIL_TRANSFORMATION;
}
