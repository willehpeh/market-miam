import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { StoredEvent } from '@market-miam/event-sourcing';
import { LocalDate } from '@market-miam/common';
import { MarketId, VendorId, VendorScopedEvents } from '@market-miam/shared-kernel';
import { MarketDayEvent, MarketDayId } from '../market-day';
import { FindLiveMarketDay } from './find-live-market-day';
import { LiveMarketDay } from './live-market-day';
import { MarketDayOnRecord } from './market-day-on-record';

@QueryHandler(FindLiveMarketDay)
export class FindLiveMarketDayHandler implements IQueryHandler<FindLiveMarketDay> {
  constructor(private readonly vendorEvents: VendorScopedEvents) {}

  async execute({ vendorId, marketId, date }: FindLiveMarketDay): Promise<LiveMarketDay> {
    const id = new MarketDayId(new MarketId(marketId), new LocalDate(date));
    const events = (await this.vendorEvents.load(id.streamIdFor(new VendorId(vendorId)))) as StoredEvent<MarketDayEvent>[];
    return events.reduce((day, event) => day.with(event), new MarketDayOnRecord()).answer();
  }
}
