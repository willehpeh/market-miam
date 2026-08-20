import { LocalDate } from '@market-miam/common';
import { MarketId, VendorId } from '@market-miam/shared-kernel';

export type MarketDayIdSnapshot = {
  marketId: string;
  date: string;
};

// A market day is never created by a command — the calendar's recurrence implies it — so
// there is no moment to mint a surrogate id. Vendor, market and date are the only handle a
// caller has, which makes this a derived natural key, and the derivation is what addresses
// the day's stream.
export class MarketDayId {
  constructor(private readonly _marketId: MarketId, private readonly _date: LocalDate) {}

  streamIdFor(vendorId: VendorId): string {
    return ['market-day', vendorId.value(), this._marketId.value(), this._date.value()].join('/');
  }

  isBefore(date: LocalDate): boolean {
    return this._date.isBefore(date);
  }

  isOn(date: LocalDate): boolean {
    return this._date.equals(date);
  }

  value(): MarketDayIdSnapshot {
    return { marketId: this._marketId.value(), date: this._date.value() };
  }
}
