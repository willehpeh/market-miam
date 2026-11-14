import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { ErasureFacade } from './erasure.facade';
import { EraseVendor } from './erasure.state';

@Injectable()
export class StoreErasureFacade implements ErasureFacade {
  private readonly store = inject(Store);

  erase(vendorId: string): void {
    this.store.dispatch(EraseVendor({ vendorId }));
  }
}
