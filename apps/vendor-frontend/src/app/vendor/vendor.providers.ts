import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Vendor } from './vendor';
import { HttpVendor } from './http.vendor';
import { vendorFeature } from './vendor.state';
import { VendorEffects } from './vendor.effects';
import { VendorFacade } from './vendor.facade';

export function provideVendor(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Vendor, useClass: HttpVendor },
    provideState(vendorFeature),
    provideEffects(VendorEffects),
    VendorFacade,
  ]);
}
