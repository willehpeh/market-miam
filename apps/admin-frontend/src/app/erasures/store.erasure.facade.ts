import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { ErasureFacade } from './erasure.facade';
import { EraseVendor, erasureFeature } from './erasure.state';

@Injectable()
export class StoreErasureFacade implements ErasureFacade {
  private readonly store = inject(Store);

  readonly erasing = this.store.selectSignal(erasureFeature.selectErasing);
  readonly failed = this.store.selectSignal(erasureFeature.selectFailed);

  erase(vendorId: string): void {
    this.store.dispatch(EraseVendor({ vendorId }));
  }
}
