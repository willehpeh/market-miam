import { Signal } from '@angular/core';
import { Bilan } from './selling-record';

export abstract class SellingRecordFacade {
  abstract readonly loading: Signal<boolean>;

  abstract bilansFor(marketId: string): Signal<Record<string, Bilan[]>>;
  abstract load(): void;
}
