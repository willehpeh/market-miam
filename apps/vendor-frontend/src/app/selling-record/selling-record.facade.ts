import { Signal } from '@angular/core';
import { MarketRecord } from './selling-record';

export abstract class SellingRecordFacade {
  abstract readonly markets: Signal<MarketRecord[]>;
  abstract readonly loading: Signal<boolean>;

  abstract load(): void;
}
