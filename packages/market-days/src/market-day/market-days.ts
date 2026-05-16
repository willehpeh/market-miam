import { EventStore } from '@market-monster/event-sourcing';
import { MarketId } from '@market-monster/shared-kernel';
import { MarketDay } from './market-day';

export class MarketDays {
  constructor(private readonly store: EventStore) {
  }

  async forMarketOn(marketId: MarketId, date: string): Promise<MarketDay> {
    const events = await this.store.load(this.streamIdFor(marketId, date));
    return new MarketDay().rehydrate(events);
  }

  async save(marketDay: MarketDay, marketId: MarketId, date: string): Promise<void> {
    const envelopes = marketDay.raisedEvents().map(event => ({ event }));
    await this.store.append(this.streamIdFor(marketId, date), envelopes, marketDay.currentStreamPosition);
  }

  private streamIdFor(marketId: MarketId, date: string) {
    return `market-day-${marketId.value()}-${date}`;
  }
}
