import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { Vendor } from './vendor';
import { HttpVendor } from './http.vendor';
import { VendorEffects } from './vendor.effects';

export function provideVendor(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Vendor, useClass: HttpVendor },
    provideEffects(VendorEffects),
  ]);
}
