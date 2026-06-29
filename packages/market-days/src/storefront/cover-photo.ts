import { ImageReference } from '@market-monster/common';

export abstract class CoverPhoto {
  abstract sameAs(imageReference: ImageReference): boolean;
}

export class SetCoverPhoto implements CoverPhoto {
  constructor(private _imageReference: ImageReference) {
  }

  sameAs(imageReference: ImageReference): boolean {
    return this._imageReference.value() === imageReference.value();
  }
}

export class NoCoverPhoto implements CoverPhoto {
  sameAs(_imageReference: ImageReference): boolean {
    return false;
  }
}
