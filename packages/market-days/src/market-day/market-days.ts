import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { Clock, LocalDate } from '@market-miam/common';
import { MarketDay } from './market-day';
import { VendorScopedEvents } from '../vendor-scoped-events';

export class MarketDays {
  constructor(private readonly vendorEvents: VendorScopedEvents,
              private readonly clock: Clock) {
  }

  async forVendorAtMarketOn(vendorId: VendorId, marketId: MarketId, date: LocalDate): Promise<MarketDay> {
    const events = await this.vendorEvents.load(this.streamIdFor(vendorId, marketId, date));
    return new MarketDay(marketId, date, this.clock.today()).rehydrate(events);
  }

  save(marketDay: MarketDay, vendorId: VendorId, marketId: MarketId, date: LocalDate): Promise<void> {
    return this.vendorEvents.save(this.streamIdFor(vendorId, marketId, date), marketDay, vendorId);
  }

  private streamIdFor(vendorId: VendorId, marketId: MarketId, date: LocalDate): string {
    return `market-day-${date.value()}-${vendorId.value()}-${marketId.value()}`;
  }
}
