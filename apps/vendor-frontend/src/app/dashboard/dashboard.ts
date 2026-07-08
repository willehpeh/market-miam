import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { CloudinaryUrlPipe } from '../core/cloudinary-url.pipe';
import { COVER_PHOTO_DISPLAY_TRANSFORMATION } from '../storefront/cover-photo-transformation';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CloudinaryUrlPipe],
  template: `
    @if (view(); as storefront) {
      <section>
        <h2 id="storefront-name">{{ storefront.name }}</h2>
        <p id="storefront-description">{{ storefront.description }}</p>
        @if (storefront.imageReference) {
          <img [src]="storefront.imageReference | cloudinaryUrl: coverPhotoTransformation" [alt]="storefront.name">
        }
      </section>
    }
  `
})
export class Dashboard {
  private readonly storefront = inject(StorefrontFacade);

  readonly view = this.storefront.view;
  readonly coverPhotoTransformation = COVER_PHOTO_DISPLAY_TRANSFORMATION;
}
