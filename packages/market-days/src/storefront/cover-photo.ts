import { ImageReference } from '@market-miam/common';

export abstract class CoverPhoto {
  abstract sameAs(imageReference: ImageReference): boolean;
  abstract isSet(): boolean;
}

export class SetCoverPhoto implements CoverPhoto {
  constructor(private _imageReference: ImageReference) {
  }

  sameAs(imageReference: ImageReference): boolean {
    return this._imageReference.value() === imageReference.value();
  }

  isSet(): boolean {
    return true;
  }
}

export class NoCoverPhoto implements CoverPhoto {
  sameAs(): boolean {
    return false;
  }

  isSet(): boolean {
    return false;
  }
}
