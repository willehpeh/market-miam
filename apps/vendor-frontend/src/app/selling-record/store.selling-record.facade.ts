import { inject, Injectable, Signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { SellingRecordFacade } from './selling-record.facade';
import { Bilan } from './selling-record';
import { LoadSellingRecord, selectBilansFor, sellingRecordFeature } from './selling-record.state';

@Injectable()
export class StoreSellingRecordFacade implements SellingRecordFacade {
  private readonly store = inject(Store);

  readonly loading = this.store.selectSignal(sellingRecordFeature.selectLoading);
  private readonly fresh = this.store.selectSignal(sellingRecordFeature.selectFresh);

  bilansFor(marketId: string): Signal<Record<string, Bilan[]>> {
    return this.store.selectSignal(selectBilansFor(marketId));
  }

  // Every menu editor opened asks for this, and the set is the largest of that screen's
  // four feeds. A failed load leaves the cache stale on purpose: the next screen retries.
  load(): void {
    if (!this.fresh()) {
      this.store.dispatch(LoadSellingRecord());
    }
  }
}
