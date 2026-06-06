import { EventStore } from '@market-monster/event-sourcing';
import { MarketId, VendorId } from '@market-monster/shared-kernel';
import { Clock, LocalDate } from '@market-monster/common';
import { MarketDay } from './market-day';

export class MarketDays {
  constructor(private readonly store: EventStore,
              private readonly clock: Clock) {
  }

  forVendorAtMarket(vendorId: VendorId, marketId: MarketId) {
    return {
      on: async (date: LocalDate): Promise<MarketDay> => {
        const streamId = this.streamIdFor(vendorId.value(), marketId.value(), date.value());
        const events = await this.store.load(streamId);
        return new MarketDay(marketId, date, this.clock.today()).rehydrate(events);
      }
    };
  }

  async save(marketDay: MarketDay, vendorId: VendorId): Promise<void> {
    const snapshot = marketDay.snapshot();
    const streamId = this.streamIdFor(vendorId.value(), snapshot.marketId, snapshot.date);
    await this.store.append(
      streamId,
      marketDay.raisedEvents(),
      marketDay.currentStreamPosition,
      { vendorId: vendorId.value() },
    );
  }

  private streamIdFor(vendorId: string, marketId: string, date: string) {
    return `market-day-${date}-${vendorId}-${marketId}`;
  }
}
