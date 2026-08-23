import { Injectable, signal } from '@angular/core';
import { SellingRecordFacade } from './selling-record.facade';
import { MarketRecord } from './selling-record';

@Injectable()
export class FakeSellingRecordFacade implements SellingRecordFacade {
  readonly markets = signal<MarketRecord[]>([]);
  readonly loading = signal(false);
  loaded = false;

  load(): void {
    this.loaded = true;
  }
}
