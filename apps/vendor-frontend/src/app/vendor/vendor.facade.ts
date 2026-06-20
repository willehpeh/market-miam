import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { vendorFeature } from './vendor.state';

@Injectable()
export class VendorFacade {
  private readonly store = inject(Store);

  readonly loading = this.store.selectSignal(vendorFeature.selectLoading);
}
