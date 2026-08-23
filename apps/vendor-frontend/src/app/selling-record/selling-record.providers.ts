import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { SellingRecord } from './selling-record';
import { HttpSellingRecord } from './http.selling-record';
import { sellingRecordFeature } from './selling-record.state';
import { SellingRecordEffects } from './selling-record.effects';
import { SellingRecordFacade } from './selling-record.facade';
import { StoreSellingRecordFacade } from './store.selling-record.facade';

export function provideSellingRecord(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: SellingRecord, useClass: HttpSellingRecord },
    provideState(sellingRecordFeature),
    provideEffects(SellingRecordEffects),
    { provide: SellingRecordFacade, useClass: StoreSellingRecordFacade },
  ]);
}
