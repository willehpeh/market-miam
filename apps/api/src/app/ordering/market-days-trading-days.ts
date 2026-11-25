import { Injectable } from '@nestjs/common';
import { QueryGateway } from '@market-miam/event-sourcing';
import { FindLiveMarketDay } from '@market-miam/market-days';
import { ScheduledTradingDay, TradingDay, TradingDays } from '@market-miam/ordering';
import { VendorId } from '@market-miam/shared-kernel';

@Injectable()
export class MarketDaysTradingDays extends TradingDays {
  constructor(private readonly queries: QueryGateway) {
    super();
  }

  async forVendorAtMarketOn(vendorId: VendorId, marketId: string, date: string): Promise<TradingDay> {
    const liveDay = await this.queries.execute(new FindLiveMarketDay(vendorId.value(), marketId, date));
    if (!liveDay) {
      throw new Error(`Market Days has no live day for vendor ${vendorId.value()} at market ${marketId} on ${date}`);
    }
    return new ScheduledTradingDay({
      menuDishIds: liveDay.itemIds,
      soldOutDishIds: liveDay.soldOutItemIds,
      closed: liveDay.closed,
      ended: liveDay.phase === 'over' || liveDay.phase === 'past',
    });
  }
}
