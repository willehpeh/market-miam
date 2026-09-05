import { computed, Injectable, Signal, signal } from '@angular/core';
import { SellingRecordFacade } from './selling-record.facade';
import { Bilan } from './selling-record';

@Injectable()
export class FakeSellingRecordFacade implements SellingRecordFacade {
  readonly bilans = signal<Record<string, Record<string, Bilan[]>>>({});
  readonly loading = signal(false);
  loaded = false;

  bilansFor(marketId: string): Signal<Record<string, Bilan[]>> {
    return computed(() => this.bilans()[marketId] ?? {});
  }

  load(): void {
    this.loaded = true;
  }
}
