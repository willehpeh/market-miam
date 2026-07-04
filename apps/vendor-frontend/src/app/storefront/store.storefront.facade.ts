import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { StorefrontFacade } from './storefront.facade';
import { EditStorefront, storefrontFeature } from './storefront.state';

@Injectable()
export class StoreStorefrontFacade implements StorefrontFacade {
  private readonly store = inject(Store);

  readonly view = this.store.selectSignal(storefrontFeature.selectView);
  readonly loading = this.store.selectSignal(storefrontFeature.selectLoading);

  save(name: string, description: string, phone: string): void {
    this.store.dispatch(EditStorefront({ name, description, phone }));
  }
}
