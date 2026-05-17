import { EventStore } from '@market-monster/event-sourcing';
import { MarketId, VendorId } from '@market-monster/shared-kernel';
import { LocalDate } from '@market-monster/common';
import { MarketDay } from './market-day';

export class MarketDays {
  constructor(private readonly store: EventStore) {
  }

  forVendorAtMarket(vendorId: VendorId, marketId: MarketId) {
    return {
      on: async (date: LocalDate): Promise<MarketDay> => {
        const streamId = this.streamIdFor(vendorId.value(), marketId.value(), date.value());
        const events = await this.store.load(streamId);
        return new MarketDay(marketId, date, LocalDate.today()).rehydrate(events);
      }
    };
  }

  async save(marketDay: MarketDay, vendorId: VendorId): Promise<void> {
    const snapshot = marketDay.snapshot();
    const streamId = this.streamIdFor(vendorId.value(), snapshot.marketId, snapshot.date);
    const envelopes = marketDay.raisedEvents().map(event => ({ event }));
    await this.store.append(streamId, envelopes, marketDay.currentStreamPosition);
  }

  private streamIdFor(vendorId: string, marketId: string, date: string) {
    return `market-day-${date}-${vendorId}-${marketId}`;
  }
}
