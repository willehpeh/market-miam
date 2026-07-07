import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { Clock, LocalDate } from '@market-miam/common';
import { MarketDay } from './market-day';
import { VendorScopedEvents } from '../vendor-scoped-events';

export class MarketDays {
  constructor(private readonly vendorEvents: VendorScopedEvents,
              private readonly clock: Clock) {
  }

  forVendorAtMarket(vendorId: VendorId, marketId: MarketId) {
    return {
      on: async (date: LocalDate): Promise<MarketDay> => {
        const streamId = this.streamIdFor(vendorId.value(), marketId.value(), date.value());
        const events = await this.vendorEvents.load(streamId);
        return new MarketDay(marketId, date, this.clock.today()).rehydrate(events);
      }
    };
  }

  async save(marketDay: MarketDay, vendorId: VendorId): Promise<void> {
    const snapshot = marketDay.snapshot();
    const streamId = this.streamIdFor(vendorId.value(), snapshot.marketId, snapshot.date);
    await this.vendorEvents.save(streamId, marketDay, vendorId);
  }

  private streamIdFor(vendorId: string, marketId: string, date: string) {
    return `market-day-${date}-${vendorId}-${marketId}`;
  }
}
