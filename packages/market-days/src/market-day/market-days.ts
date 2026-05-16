import { EventStore } from '@market-monster/event-sourcing';
import { MarketId, VendorId } from '@market-monster/shared-kernel';
import { MarketDay } from './market-day';

export class MarketDays {
  constructor(private readonly store: EventStore) {
  }

  forVendorAtMarket(vendorId: VendorId, marketId: MarketId) {
    return {
      on: async (date: string): Promise<MarketDay> => {
        const events = await this.store.load(this.streamIdFor(vendorId, marketId, date));
        return new MarketDay().rehydrate(events);
      }
    };
  }

  async save(marketDay: MarketDay, vendorId: VendorId, marketId: MarketId, date: string): Promise<void> {
    const envelopes = marketDay.raisedEvents().map(event => ({ event }));
    await this.store.append(this.streamIdFor(vendorId, marketId, date), envelopes, marketDay.currentStreamPosition);
  }

  private streamIdFor(vendorId: VendorId, marketId: MarketId, date: string) {
    return `market-day-${vendorId.value()}-${marketId.value()}-${date}`;
  }
}
